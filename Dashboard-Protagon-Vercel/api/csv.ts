import type { IncomingMessage, ServerResponse } from 'node:http';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { publishedSheetIds } from '../server/published-sheets.js';

const compress = promisify(gzip);
const allowedIds = new Set<string>(publishedSheetIds);

function sourceUrl(raw: unknown): URL | null {
  if (typeof raw !== 'string') return null;
  try {
    const url = new URL(raw);
    const match = /^\/spreadsheets\/d\/e\/([^/]+)\/(pub|pubhtml)$/.exec(url.pathname);
    if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' || url.port ||
        url.username || url.password || !match || !allowedIds.has(match[1])) return null;
    if (match[2] === 'pub' && url.searchParams.get('output') !== 'csv') return null;
    return url;
  } catch { return null; }
}

async function readSheet(url: URL): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'text/csv,text/html,text/plain,*/*', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(15000),
        redirect: 'follow',
      });
      if (!response.ok) {
        await response.body?.cancel();
        // Some configured optional tabs have not been published. The lead loader
        // separately rejects an empty mandatory general sheet.
        if (response.status === 400 || response.status === 404) return '';
        throw new Error(`Google Sheets: HTTP ${response.status}`);
      }
      const text = await response.text();
      if (url.pathname.endsWith('/pub') && /^\s*(?:<!doctype html|<html)/i.test(text)) {
        throw new Error('O Google retornou uma página HTML no lugar do CSV.');
      }
      return text;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError || new Error('Não foi possível consultar a planilha.');
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.statusCode = 405;
    res.end('Método não permitido.');
    return;
  }
  const raw = new URL(req.url || '/', 'http://localhost').searchParams.get('url');
  const source = sourceUrl(raw);
  if (!source) {
    res.statusCode = 400;
    res.end('URL de planilha inválida.');
    return;
  }
  try {
    const text = await readSheet(source);
    res.setHeader('Content-Type', source.pathname.endsWith('/pubhtml')
      ? 'text/html; charset=utf-8' : 'text/csv; charset=utf-8');
    res.setHeader('Vary', 'Accept-Encoding');
    // The CSVs can exceed 20 MB. Compress losslessly before returning from the
    // function, rather than relying on CDN compression after a large payload.
    const acceptsGzip = String(req.headers['accept-encoding'] || '').split(',').some(part => {
      const [name, ...parameters] = part.trim().split(';');
      const q = parameters.find(parameter => parameter.trim().startsWith('q='));
      return name === 'gzip' && (!q || Number(q.trim().slice(2)) > 0);
    });
    const body = acceptsGzip && text ? await compress(Buffer.from(text, 'utf8')) : Buffer.from(text, 'utf8');
    if (acceptsGzip && text) res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Content-Length', body.byteLength);
    res.statusCode = 200;
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (error) {
    console.error('Falha ao consultar Google Sheets:', error instanceof Error ? error.message : 'erro de rede');
    res.statusCode = 502;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(req.method === 'HEAD' ? undefined : 'Não foi possível atualizar a planilha. Tente novamente.');
  }
}

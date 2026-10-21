import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { ResponseCache } from '../server/responseCache.js';
import { gzipSync } from 'node:zlib';
import { supabaseTable, SUPABASE_PAGE_SIZE, SUPABASE_LEAD_ID_WINDOW } from '../src/utils/supabaseSources.js';

const pageCache = new ResponseCache();
class UpstreamError extends Error {
  constructor(readonly status: number, readonly code?: string) { super('Supabase request failed'); }
}

const PROJECT_URL = 'https://oogehvamgxiagmfgejpu.supabase.co';
const LEAD_COLUMNS = [
  'id', 'data_hora', 'produto', 'praca', 'nome', 'email', 'numero', 'idade', 'renda',
  'instagram', 'escolaridade', 'atuacao', 'estado_civil', 'tempo_wendell', 'nicho', 'tags',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'sck', 'pageurl',
  'clint', 'acao', 'tipo_ingestao', 'deleted',
].join(',');

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const requestId = randomUUID();
  const started = Date.now();
  res.setHeader('X-Request-Id', requestId);
  const send = (status: number, data: unknown, serialized = false) => {
    const json = serialized ? data as string : JSON.stringify(data);
    const acceptsGzip = String(req.headers['accept-encoding'] || '').split(',').some(value => {
      const [name, ...params] = value.trim().split(';');
      const q = params.find(p => p.trim().startsWith('q='));
      return name === 'gzip' && (!q || Number(q.trim().slice(2)) > 0);
    });
    const body = acceptsGzip ? gzipSync(json) : Buffer.from(json);
    res.statusCode = status;
    res.setHeader('Vary', 'Accept-Encoding');
    if (acceptsGzip) res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Content-Length', body.byteLength);
    res.end(body);
  };
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    send(405, { error: 'Método não permitido.' });
    return;
  }
  const params = new URL(req.url || '/', 'http://localhost').searchParams;
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const enabled = Boolean(key) && process.env.SUPABASE_ENABLED !== 'false';
  if (params.get('config') === '1') {
    send(200, { enabled });
    return;
  }
  const table = supabaseTable(params.get('city') || '', params.get('dataset') || '');
  const offsetText = params.get('offset') || '0';
  const offset = Number(offsetText);
  if (!table || !/^\d+$/.test(offsetText) || !Number.isSafeInteger(offset) || offset > 1_000_000) {
    send(400, { error: 'Fonte ou página não autorizada.' });
    return;
  }
  if (!enabled) {
    send(503, { error: 'O acesso ao Supabase ainda não está configurado no servidor.' });
    return;
  }
  const isLead = params.get('dataset') === 'geral';
  const isPrepared = isLead && params.get('prepared') === '1';
  const isBounds = isLead && params.get('bounds') === '1';
  const pageText = params.get('page') || '0';
  const page = Number(pageText);
  const version = params.get('version');
  if (isPrepared && (!/^\d+$/.test(pageText) || !Number.isSafeInteger(page) || page > 1000
    || (version !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(version)))) {
    send(400, { error: 'Página de leads inválida.' });
    return;
  }
  const firstId = Number(params.get('from'));
  const lastId = Number(params.get('to'));
  if (isLead && !isBounds && !isPrepared && (!params.has('from') || !params.has('to')
    || !/^\d+$/.test(params.get('from')!) || !/^\d+$/.test(params.get('to')!)
    || !Number.isSafeInteger(firstId) || !Number.isSafeInteger(lastId) || firstId < 0
    || lastId < firstId || lastId - firstId >= SUPABASE_LEAD_ID_WINDOW)) {
    send(400, { error: 'Intervalo de leads inválido. Atualize a página do dashboard.' });
    return;
  }
  try {
    const isRpc = isPrepared || isBounds;
    const url = new URL(`${PROJECT_URL}/rest/v1/${isPrepared ? 'rpc/dashboard_protagon_lead_page'
      : isBounds ? 'rpc/dashboard_protagon_lead_bounds' : table}`);
    if (!isRpc) {
      url.searchParams.set('select', isLead ? LEAD_COLUMNS : '*');
      url.searchParams.set('order', isLead ? 'id.asc' : 'Data.asc,"ID CAMPANHA".asc,"ID CONJUNTO".asc,"ID ANÚNCIO".asc');
      url.searchParams.set('offset', String(offset));
      url.searchParams.set('limit', String(SUPABASE_PAGE_SIZE));
      if (isLead) {
        url.searchParams.set('or', '(deleted.is.null,deleted.eq.0)');
        url.searchParams.set('and', `(id.gte.${firstId},id.lte.${lastId})`);
      }
    }
    const headers: Record<string, string> = { apikey: key!, Accept: 'application/json', 'Accept-Profile': 'public' };
    // Legacy service_role JWTs require Bearer auth; new sb_secret keys use apikey.
    if (key!.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
    if (isRpc) { headers['Content-Type'] = 'application/json'; headers['Content-Profile'] = 'public'; }
    const body = isRpc ? JSON.stringify(isPrepared
      ? { p_city: params.get('city'), p_page: page, p_version: version }
      : { city: params.get('city') }) : undefined;
    // Credential changes isolate cached data without retaining the secret as a key.
    const cacheKey = createHash('sha256').update(key!).update(url.href).update(body || '').digest('hex');
    const load = async () => {
      const response = await fetch(url, {
        headers, cache: 'no-store', signal: AbortSignal.timeout(isBounds ? 50000 : 25000),
        ...(isRpc ? { method: 'POST', body } : {}),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new UpstreamError(response.status, typeof error.code === 'string' ? error.code : undefined);
      }
      const result = await response.json();
      if (!isRpc && !Array.isArray(result)) throw new Error('Resposta inválida');
      const data = isRpc ? result : { rows: result, nextOffset: result.length ? offset + result.length : null };
      let expires = 0; // Legacy expensive lead paths are deliberately not cached.
      if (!isLead) expires = Date.now() + 60_000;
      if (isPrepared && Array.isArray(data.rows) && Number.isFinite(Date.parse(data.sourceUpdatedAt))) {
        const ageLimit = Object.hasOwn(data, 'versionExpiresAt') ? (version ? 105 : 90) : (version ? 60 : 45);
        expires = Math.min(Date.now() + (version ? 5 * 60_000 : 30_000),
          Date.parse(data.sourceUpdatedAt) + ageLimit * 60_000);
        // Only cache pinned generations when the RPC supplies their retirement deadline.
        if (version && !Object.hasOwn(data, 'versionExpiresAt')) expires = 0;
        else if (data.versionExpiresAt !== null && data.versionExpiresAt !== undefined) {
          expires = Math.min(expires, Date.parse(data.versionExpiresAt));
        }
      }
      return { body: JSON.stringify(data), expires };
    };
    const result = await pageCache.read(cacheKey, load);
    res.setHeader('X-Dashboard-Cache', result.hit ? 'HIT' : 'MISS');
    send(200, result.body, true);
  } catch (error) {
    // Log only allowlisted diagnostics: never upstream bodies, query strings, secrets or records.
    const upstream = error instanceof UpstreamError ? error : undefined;
    const timeout = upstream?.code === '57014' || (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name));
    const stale = isPrepared && upstream?.code === 'P0001';
    const code = stale ? 'STALE_SNAPSHOT' : timeout ? 'SOURCE_TIMEOUT'
      : upstream?.status === 401 || upstream?.status === 403 ? 'SOURCE_ACCESS_DENIED'
      : !upstream || upstream.status === 429 || upstream.status >= 500
        || ['PGRST000', 'PGRST001', 'PGRST002', 'PGRST003'].includes(upstream.code || '')
        ? 'SOURCE_UNAVAILABLE' : 'SOURCE_QUERY_FAILED';
    const retryable = code === 'SOURCE_TIMEOUT' || code === 'SOURCE_UNAVAILABLE';
    console.warn(JSON.stringify({ event: 'dashboard_source_error', requestId,
      city: params.get('city'), dataset: params.get('dataset'), page: isPrepared ? page : offset,
      code, upstreamStatus: upstream?.status, sqlCode: upstream?.code?.match(/^[A-Z0-9]{5,9}$/)?.[0],
      durationMs: Date.now() - started }));
    if (retryable) res.setHeader('Retry-After', '3');
    send(stale ? 503 : retryable ? (timeout ? 504 : 503) : 502, { code, retryable, requestId,
      error: stale ? 'A atualização dos leads está atrasada. Aguarde alguns minutos e tente novamente.'
        : retryable ? 'O Supabase está temporariamente indisponível. Tente novamente em alguns minutos.'
          : 'Não foi possível consultar a fonte de dados. Verifique a conexão do servidor com o Supabase.' });
  }
}

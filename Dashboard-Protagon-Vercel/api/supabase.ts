import type { IncomingMessage, ServerResponse } from 'node:http';
import { gzipSync } from 'node:zlib';
import { supabaseTable, SUPABASE_PAGE_SIZE, SUPABASE_LEAD_ID_WINDOW } from '../src/utils/supabaseSources.js';

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
  const send = (status: number, data: unknown) => {
    const json = JSON.stringify(data);
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
      url.searchParams.set('order', isLead ? 'id.asc' : '_origem_planilha.asc,_origem_aba.asc,_origem_linha.asc');
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
    const response = await fetch(url, {
      headers, cache: 'no-store', signal: AbortSignal.timeout(isBounds ? 50000 : 25000),
      ...(isRpc ? { method: 'POST', body: JSON.stringify(isPrepared
        ? { p_city: params.get('city'), p_page: page, p_version: version }
        : { city: params.get('city') }) } : {}),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (isPrepared && error.code === 'P0001') {
        send(503, { code: 'STALE_SNAPSHOT', retryable: false, error: 'A atualização dos leads está atrasada. Aguarde alguns minutos e tente novamente.' });
        return;
      }
      const code = error.code === '57014' ? 'SOURCE_TIMEOUT'
        : response.status === 401 || response.status === 403 ? 'SOURCE_ACCESS_DENIED'
        : response.status === 429 || response.status >= 500 || ['PGRST000', 'PGRST001', 'PGRST002'].includes(error.code)
          ? 'SOURCE_UNAVAILABLE' : 'SOURCE_QUERY_FAILED';
      const retryable = code === 'SOURCE_TIMEOUT' || code === 'SOURCE_UNAVAILABLE';
      if (retryable) res.setHeader('Retry-After', '3');
      send(retryable ? (code === 'SOURCE_TIMEOUT' ? 504 : 503) : 502, { code, retryable,
        error: retryable ? 'O Supabase está temporariamente indisponível. Tente novamente em alguns minutos.'
          : 'Não foi possível consultar a fonte de dados. Verifique a conexão do servidor com o Supabase.' });
      return;
    }
    if (isRpc) { send(200, await response.json()); return; }
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('Resposta inválida');
    // Advance by the actual number returned, even if the project's API cap is
    // below the requested page size. A final empty page avoids truncation.
    send(200, { rows, nextOffset: rows.length ? offset + rows.length : null });
  } catch (error) {
    // Do not log upstream bodies, credentials or lead records.
    const timeout = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name);
    res.setHeader('Retry-After', '3');
    send(timeout ? 504 : 503, { code: timeout ? 'SOURCE_TIMEOUT' : 'SOURCE_UNAVAILABLE', retryable: true,
      error: 'O Supabase está temporariamente indisponível. Tente novamente em alguns minutos.' });
  }
}

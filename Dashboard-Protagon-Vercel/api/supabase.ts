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
  const isBounds = isLead && params.get('bounds') === '1';
  const firstId = Number(params.get('from'));
  const lastId = Number(params.get('to'));
  if (isLead && !isBounds && (!params.has('from') || !params.has('to')
    || !/^\d+$/.test(params.get('from')!) || !/^\d+$/.test(params.get('to')!)
    || !Number.isSafeInteger(firstId) || !Number.isSafeInteger(lastId) || firstId < 0
    || lastId < firstId || lastId - firstId >= SUPABASE_LEAD_ID_WINDOW)) {
    send(400, { error: 'Intervalo de leads inválido. Atualize a página do dashboard.' });
    return;
  }
  try {
    const url = new URL(`${PROJECT_URL}/rest/v1/${isBounds ? 'rpc/dashboard_protagon_lead_bounds' : table}`);
    if (!isBounds) {
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
    if (isBounds) { headers['Content-Type'] = 'application/json'; headers['Content-Profile'] = 'public'; }
    const response = await fetch(url, {
      headers, cache: 'no-store', signal: AbortSignal.timeout(isBounds ? 50000 : 25000),
      ...(isBounds ? { method: 'POST', body: JSON.stringify({ city: params.get('city') }) } : {}),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const code = error.code === '57014' ? 'SOURCE_TIMEOUT'
        : response.status === 401 || response.status === 403 ? 'SOURCE_ACCESS_DENIED' : 'SOURCE_QUERY_FAILED';
      send(502, { code, error: code === 'SOURCE_TIMEOUT'
        ? 'A consulta dos leads excedeu o tempo disponível. Tente atualizar novamente.'
        : 'Não foi possível atualizar os dados do Supabase. Confira a configuração do servidor e tente novamente.' });
      return;
    }
    if (isBounds) { send(200, await response.json()); return; }
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('Resposta inválida');
    // Advance by the actual number returned, even if the project's API cap is
    // below 500. A final empty page terminates pagination without truncation.
    send(200, { rows, nextOffset: rows.length ? offset + rows.length : null });
  } catch {
    // Do not log upstream bodies, credentials or lead records.
    send(502, { error: 'Não foi possível atualizar os dados do Supabase. Confira a configuração do servidor e tente novamente.' });
  }
}

import assert from 'node:assert/strict';
import test from 'node:test';
import { gunzipSync } from 'node:zlib';
import type { IncomingMessage, ServerResponse } from 'node:http';
import handler from '../api/supabase';
import { fetchSupabaseRows, normalizeSupabaseLead } from '../src/utils/supabaseData';
import { supabaseTable, SUPABASE_CITIES, SUPABASE_DATASETS } from '../src/utils/supabaseSources';
import { fetchRawDashboardData } from '../src/utils/dataFetching';
import { processDashboardMetrics } from '../src/utils/metricsCalculator';
import { getCampaignsForFunil } from '../src/utils/campaignExtractor';

async function request(query = '?config=1', method = 'GET') {
  const result = { statusCode: 200, headers: {} as Record<string, any>, body: Buffer.alloc(0) };
  const res = Object.assign(result, {
    setHeader(key: string, value: any) { result.headers[key.toLowerCase()] = value; },
    end(body?: string | Buffer) { result.body = Buffer.from(body || ''); },
  });
  await handler({ method, url: '/api/supabase' + query, headers: { 'accept-encoding': 'gzip' } } as IncomingMessage, res as unknown as ServerResponse);
  return { ...result, data: JSON.parse(gunzipSync(result.body).toString()) };
}

async function withServerKey(fn: () => Promise<void>) {
  const previous = { ...process.env };
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_synthetic_test_only';
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_ENABLED;
  try { await fn(); } finally { process.env = previous; }
}

test('source allowlist excludes raw dedup tables, review quarantine, other schemas and arbitrary queries', async () => {
  const tables = Object.keys(SUPABASE_CITIES).flatMap(city => SUPABASE_DATASETS.map(dataset => supabaseTable(city, dataset)));
  assert.equal(new Set(tables).size, 28);
  assert.ok(tables.every(table => table?.startsWith('leads_protagon_') || table?.startsWith('trafego_protagon_')));
  for (const name of ['registro_leads_dedup', 'registros_leads_dedup', 'trafego_protagon_revisao', 'public', '__proto__', 'geral;delete']) {
    assert.equal(supabaseTable('protagon-joinville', name), null);
    assert.equal((await request(`?city=protagon-joinville&dataset=${encodeURIComponent(name)}`)).statusCode, 400);
  }
  assert.equal(supabaseTable('protagon-cuiaba', 'geral'), null);
  assert.equal((await request('?city=__proto__&dataset=geral')).statusCode, 400);
  assert.equal((await request('?city=protagon-joinville&dataset=geral&offset=-1')).statusCode, 400);
  assert.equal((await request('', 'POST')).statusCode, 405);
});

test('secret is server-only and REST selects only authorized dashboard lead columns', async () => withServerKey(async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: any, init: RequestInit) => {
    const url = new URL(input);
    assert.equal(url.origin, 'https://oogehvamgxiagmfgejpu.supabase.co');
    assert.equal(url.pathname, '/rest/v1/leads_protagon_joinville');
    assert.equal(url.searchParams.get('limit'), '1000');
    assert.equal(url.searchParams.get('order'), 'id.asc');
    assert.equal(url.searchParams.get('or'), '(deleted.is.null,deleted.eq.0)');
    assert.equal(url.searchParams.get('and'), '(id.gte.10000,id.lte.14999)');
    assert.ok(!url.searchParams.get('select')!.split(',').includes('json'));
    assert.equal((init.headers as any).apikey, 'sb_secret_synthetic_test_only');
    assert.equal((init.headers as any)['Accept-Profile'], 'public');
    assert.equal((init.headers as any).Authorization, undefined);
    return Response.json([{ id: 123, data_hora: '2026-10-19T01:30:00+00:00', renda: null }]);
  }) as typeof fetch;
  try {
    const config = await request();
    assert.deepEqual(config.data, { enabled: true });
    const response = await request('?city=protagon-joinville&dataset=geral&offset=500&from=10000&to=14999');
    assert.equal(response.statusCode, 200);
    assert.equal(response.data.nextOffset, 501);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.ok(!JSON.stringify(response.data).includes('sb_secret_'));
    assert.equal((await request('?city=protagon-joinville&dataset=geral')).statusCode, 400);
    assert.equal((await request('?city=protagon-joinville&dataset=geral&from=0&to=5000')).statusCode, 400);
  } finally { globalThis.fetch = original; }
}));

test('unconfigured server remains on Sheets; configured upstream failure is explicit and never leaks details', async () => withServerKey(async () => {
  process.env.SUPABASE_ENABLED = 'false';
  assert.deepEqual((await request()).data, { enabled: false });
  assert.equal((await request('?city=protagon-joinville&dataset=met')).statusCode, 503);
  delete process.env.SUPABASE_ENABLED;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response('sensitive upstream details', { status: 401 })) as typeof fetch;
  try {
    const result = await request('?city=protagon-joinville&dataset=met');
    assert.equal(result.statusCode, 502);
    assert.ok(!JSON.stringify(result.data).includes('sensitive'));
  } finally { globalThis.fetch = original; }
}));

test('pagination reads more than 1000 rows, including API caps below the requested page size', async () => {
  const original = globalThis.fetch;
  const inputRows = Array.from({ length: 1253 }, (_, id) => ({ id, email: `${id}@example.test` }));
  const offsets: number[] = [];
  globalThis.fetch = (async (input: any) => {
    const params = new URL(String(input), 'https://example.test').searchParams;

    const offset = Number(params.get('offset'));
    offsets.push(offset);
    const rows = inputRows.slice(offset, offset + 200);
    return Response.json({ rows, nextOffset: rows.length ? offset + rows.length : null });
  }) as typeof fetch;
  try {
    const rows = await fetchSupabaseRows('protagon-joinville', 'met');
    assert.deepEqual(rows, inputRows);
    assert.deepEqual(offsets, [0, 200, 400, 600, 800, 1000, 1200, 1253]);
    globalThis.fetch = (async () => Response.json({ rows: [{ id: 1 }], nextOffset: 0 })) as typeof fetch;
    await assert.rejects(fetchSupabaseRows('protagon-joinville', 'met'), /paginação/);
  } finally { globalThis.fetch = original; }
});

test('lead adaptation preserves São Paulo calendar dates, funnel attribution, qualification and missing attribution', () => {
  const cases = [
    [{ utm_campaign: '[PRO-E038-GOI] [METEÓRICO]', renda: 'De R$5.001 a R$7.500' }, 'Meteórico', ''],
    [{ utm_campaign: '[PRO-E039-SP] [GERAÇÃO DE DEMANDA] [FORMS NATIVO]' }, 'Geração de Demanda', 'Formulário Nativo'],
    [{ utm_campaign: '[INLEAD] [FORMS NATIVO]' }, 'Geração de Demanda', 'INLEAD'],
    [{ utm_campaign: '[PRO-E037-POA] [GERACAO-DEMANDA] [PG01]' }, 'Geração de Demanda', 'Página de Captura para o Comercial'],
    [{ utm_campaign: '[PRO-E039-SP] [WEBINÁRIO]', acao: 'Workshop Teto Invisível' }, 'Workshop', ''],
    [{ utm_campaign: '[PRO-E035-JOI] [VD]' }, 'Venda Direta Tráfego', ''],
    [{ utm_campaign: '[PRO-E039-SP]' }, '', ''],
    [{ utm_campaign: 'wendell', acao: 'PRO-E039-SP CAPTACAO METEORICO' }, 'Meteórico', ''],
  ] as const;
  for (const [extra, attribution, subfunnel] of cases) {
    const row = normalizeSupabaseLead({ id: 123, data_hora: '2026-10-19T01:30:00+00:00', clint: 'N/A', ...extra });
    assert.equal(row.data_hora, '18/10/2026');
    assert.equal(row.id, '123');
    assert.equal(row['Atribuição'], attribution);
    assert.equal(row.Subfunil, subfunnel);
    assert.equal(row.clint, 'N/A', 'Do not invent SIM or change qualification');
  }
  assert.equal(normalizeSupabaseLead({ 'Atribuição': 'Geração de Demanda', utm_campaign: 'METEORICO' })['Atribuição'], 'Geração de Demanda');
});

test('migration switches city leads and all advertising to Supabase, preserving supplemental Sheets only', async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: any) => {
    const value = String(input); calls.push(value);
    const url = new URL(value, 'https://example.test');
    if (url.searchParams.has('config')) return Response.json({ enabled: true });
    if (url.pathname === '/api/supabase') {
      const dataset = url.searchParams.get('dataset');
      if (!url.searchParams.has('prepared') && url.searchParams.get('offset') !== '0') return Response.json({ rows: [], nextOffset: null });
      const rows = dataset === 'geral' ? [
        { id: 1, email: 'met@example.test', data_hora: '2026-10-19T01:30:00+00:00', utm_campaign: '[METEÓRICO] [PG01]', renda: 'De R$5.001 a R$7.500' },
        { id: 2, email: 'gd@example.test', data_hora: '2026-10-18T12:00:00+00:00', utm_campaign: '[FORMS NATIVO]', clint: 'SIM' },
      ] : dataset === 'met' ? [{ Data: '2026-10-18', 'Valor Gasto': 123.45, 'NOME DA CAMPANHA': '[METEÓRICO] [PG01]' }]
        : dataset === 'gd' ? [{ Data: '2026-10-18', 'Valor Gasto': 15.25, 'NOME DA CAMPANHA': '[FORMS NATIVO]' }] : [];
      return Response.json(dataset === 'geral' ? snapshotPage(rows, 0) : { rows, nextOffset: rows.length ? rows.length : null });
    }
    const source = new URL(url.searchParams.get('url')!);
    assert.equal(source.searchParams.get('gid'), '1524417673', 'Only Sendflow remains in Sheets for Goiânia');
    return new Response('');
  }) as typeof fetch;
  try {
    const raw = await fetchRawDashboardData('protagon-goiania', true);
    assert.equal(raw.dataSource, 'supabase');
    assert.equal(raw.geral.length, 2);
    const metrics = processDashboardMetrics(raw, '2026-10-18', '2026-10-18');
    assert.equal(metrics.meteorico.leads, 1);
    assert.equal(metrics.meteorico.mqls, 1);
    assert.equal(metrics.meteorico.investimento, 123.45);
    assert.equal(metrics.demanda.formNativo.leads, 1);
    assert.equal(metrics.demanda.formNativo.mqls, 1);
    assert.equal(metrics.demanda.investimento, 15.25);
    globalThis.fetch = (async (input: any) => String(input).includes('config=1')
      ? Response.json({ enabled: true }) : new Response('', { status: 502 })) as typeof fetch;
    await assert.rejects(fetchRawDashboardData('protagon-goiania', true), /Supabase|planilhas/);
    assert.ok(!calls.some(url => /registro[s]?_leads_dedup/.test(url)));
  } finally { globalThis.fetch = original; }
});

const snapshotVersion = '12345678-1234-1234-1234-123456789012';
const sourceUpdatedAt = '2026-10-19T18:00:00+00:00';
function snapshotPage(rows: any[], page: number) {
  return { rows: rows.slice(page * 1000, (page + 1) * 1000), page, pageSize: 1000,
    snapshot: snapshotVersion, totalRows: rows.length, sourceUpdatedAt };
}

test('prepared leads preserve all rows and order across parallel immutable pages', async () => {
  const original = globalThis.fetch;
  const source = Array.from({ length: 5253 }, (_, id) => ({ id }));
  const calls: number[] = [];
  let active = 0, maxActive = 0;
  globalThis.fetch = (async (input: any) => {
    const params = new URL(String(input), 'https://example.test').searchParams;
    const page = Number(params.get('page'));
    assert.equal(params.get('prepared'), '1');
    assert.equal(params.get('version'), page ? snapshotVersion : null);
    calls.push(page);
    active++; maxActive = Math.max(maxActive, active);
    await new Promise(resolve => setTimeout(resolve, page % 2 ? 4 : 1));
    active--;
    return Response.json(snapshotPage(source, page));
  }) as typeof fetch;
  try {
    assert.deepEqual(await fetchSupabaseRows('protagon-sao-paulo', 'geral'), source);
    assert.deepEqual(calls, [0, 1, 2, 3, 4, 5]);
    assert.equal(maxActive, 3);
    globalThis.fetch = (async () => Response.json(snapshotPage([], 0))) as typeof fetch;
    assert.deepEqual(await fetchSupabaseRows('protagon-sao-paulo', 'geral'), []);
    globalThis.fetch = (async () => Response.json({ ...snapshotPage(source, 0), rows: [{ id: 0 }] })) as typeof fetch;
    await assert.rejects(fetchSupabaseRows('protagon-sao-paulo', 'geral'), /incompletos/);
  } finally { globalThis.fetch = original; }
});

test('prepared reads reject version changes, truncated pages and stale snapshots', async () => {
  const original = globalThis.fetch;
  const source = Array.from({ length: 1253 }, (_, id) => ({ id }));
  try {
    for (const change of [{ snapshot: '12345678-1234-1234-1234-123456789099' }, { rows: [] },
      { totalRows: 1254 }, { sourceUpdatedAt: '2026-10-19T18:01:00+00:00' }]) {
      globalThis.fetch = (async (input: any) => {
        const page = Number(new URL(String(input), 'https://example.test').searchParams.get('page'));
        return Response.json({ ...snapshotPage(source, page), ...(page ? change : {}) });
      }) as typeof fetch;
      await assert.rejects(fetchSupabaseRows('protagon-sao-paulo', 'geral'), /incompletos|versão/);
    }
    globalThis.fetch = (async () => Response.json({ code: 'STALE_SNAPSHOT' }, { status: 503 })) as typeof fetch;
    await assert.rejects(fetchSupabaseRows('protagon-sao-paulo', 'geral'), /atrasada/);
  } finally { globalThis.fetch = original; }
});

test('prepared API uses only the read RPC, validates inputs and reports stale data safely', async () => withServerKey(async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: any, init: RequestInit) => {
    assert.equal(new URL(input).pathname, '/rest/v1/rpc/dashboard_protagon_lead_page');
    assert.equal(init.method, 'POST');
    assert.deepEqual(JSON.parse(String(init.body)), { p_city: 'protagon-sao-paulo', p_page: 0, p_version: null });
    return Response.json(snapshotPage([{ id: 1 }], 0));
  }) as typeof fetch;
  const query = '?city=protagon-sao-paulo&dataset=geral&prepared=1';
  try {
    const response = await request(query);
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.deepEqual(response.data, snapshotPage([{ id: 1 }], 0));
    for (const invalid of ['&page=-1', '&page=1.1', '&page=1001', '&version=arbitrary']) {
      assert.equal((await request(query + invalid)).statusCode, 400);
    }
    globalThis.fetch = (async () => Response.json({ code: 'P0001', message: 'private details' }, { status: 400 })) as typeof fetch;
    const failed = await request(query);
    assert.equal(failed.statusCode, 503);
    assert.equal(failed.data.code, 'STALE_SNAPSHOT');
    assert.ok(!JSON.stringify(failed.data).includes('private'));
  } finally { globalThis.fetch = original; }
}));

test('bounds use only the fixed read-only RPC and timeout responses contain no upstream details', async () => withServerKey(async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: any, init: RequestInit) => {
    assert.equal(new URL(input).pathname, '/rest/v1/rpc/dashboard_protagon_lead_bounds');
    assert.equal(init.method, 'POST');
    assert.deepEqual(JSON.parse(String(init.body)), { city: 'protagon-sao-paulo' });
    return Response.json({ minId: '21486', maxId: '154000' });
  }) as typeof fetch;
  try {
    assert.deepEqual((await request('?city=protagon-sao-paulo&dataset=geral&bounds=1')).data, { minId: '21486', maxId: '154000' });
    globalThis.fetch = (async () => Response.json({ code: '57014', message: 'sensitive query details' }, { status: 500 })) as typeof fetch;
    const response = await request('?city=protagon-sao-paulo&dataset=geral&from=0&to=4999');
    assert.equal(response.statusCode, 504);
    assert.equal(response.data.code, 'SOURCE_TIMEOUT');
    assert.ok(!JSON.stringify(response.data).includes('sensitive'));
  } finally { globalThis.fetch = original; }
}));

test('campaign picker reads Supabase traffic and compares ISO dates when a campaign is paused', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: any) => {
    const url = new URL(String(input), 'https://example.test');
    assert.equal(url.pathname, '/api/supabase');
    if (url.searchParams.has('config')) return Response.json({ enabled: true });
    assert.equal(url.searchParams.get('city'), 'protagon-joinville');
    assert.equal(url.searchParams.get('dataset'), 'met');
    const rows = url.searchParams.get('offset') === '0' ? [
      { Data: '2026-10-17', 'NOME DA CAMPANHA': 'Campanha pausada', 'STATUS CAMPANHA': 'ACTIVE' },
      { Data: '2026-10-18', 'NOME DA CAMPANHA': 'Campanha pausada', 'STATUS CAMPANHA': 'PAUSED' },
      { Data: '2026-10-18', 'NOME DA CAMPANHA': 'Campanha ativa', 'STATUS CAMPANHA': 'ACTIVE' },
    ] : [];
    return Response.json({ rows, nextOffset: rows.length || null });
  }) as typeof fetch;
  try {
    const campaigns = await getCampaignsForFunil('meteorico', 'Joinville');
    assert.deepEqual(campaigns.map(campaign => campaign.nome), ['Campanha ativa']);
  } finally { globalThis.fetch = original; }
});


test('database connection failures return a retryable outage without upstream details', async () => withServerKey(async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = (async () => Response.json({ code: 'PGRST002', message: 'private database details' }, { status: 503 })) as typeof fetch;
    const response = await request('?city=protagon-porto-alegre&dataset=met');
    assert.equal(response.statusCode, 503);
    assert.equal(response.data.code, 'SOURCE_UNAVAILABLE');
    assert.equal(response.data.retryable, true);
    assert.ok(!JSON.stringify(response.data).includes('private'));
    globalThis.fetch = (async () => { throw new DOMException('private timeout details', 'TimeoutError'); }) as typeof fetch;
    const timedOut = await request('?city=protagon-porto-alegre&dataset=met');
    assert.equal(timedOut.statusCode, 504);
    assert.equal(timedOut.data.code, 'SOURCE_TIMEOUT');
    assert.equal(timedOut.data.retryable, true);
    assert.ok(!JSON.stringify(timedOut.data).includes('private'));
  } finally { globalThis.fetch = original; }
}));

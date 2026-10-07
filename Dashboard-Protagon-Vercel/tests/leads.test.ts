import assert from 'node:assert/strict';
import test from 'node:test';
import { deduplicateLeads, normalizeNativeForm } from '../src/utils/leadData';
import { DASHBOARDS, DATA_REFRESH_INTERVAL, fetchRawDashboardData } from '../src/utils/dataFetching';
import { processDashboardMetrics } from '../src/utils/metricsCalculator';

const lead = (id: number, extra = {}) => ({
  data_hora: '07/10/2026', uuid: `uuid-${id}`, email: `lead-${id}@example.test`,
  clint: 'SIM', 'Atribuição': 'Geração de Demanda', Subfunil: 'Formulário Nativo', ...extra,
});
const empty = { main: [], ingressos: [], cadeiras: [], met: [], vd: [], gd: [], dc: [] };

test('Porto Alegre: 15 consolidated forms + 5 overlapping exports = 15, plus 3 INLEAD = 18 MQLs', () => {
  const forms = Array.from({ length: 15 }, (_, id) => lead(id));
  const exports = forms.slice(0, 5).map(row => normalizeNativeForm({
    created_time: row.data_hora, email: row.email, id: row.uuid,
    campaign_name: 'PRO-POA-forms-nativo', campaign_id: '123',
  }));
  const inlead = Array.from({ length: 3 }, (_, id) => lead(id + 15, { Subfunil: 'INLEAD' }));
  const m = processDashboardMetrics({ ...empty, geral: [...forms, ...exports, ...inlead] }, '2026-10-07', '2026-10-07');
  assert.equal(m.demanda.formNativo.leads, 15);
  assert.equal(m.demanda.formNativo.mqls, 15);
  assert.equal(m.demanda.mqls, 18);
  assert.equal(m.demanda.formNativo.chartData.reduce((total, day) => total + day.mqls, 0), 15);
});

test('consolidated qualification wins and a genuinely new supplemental contact is retained', () => {
  const primary = lead(1, { clint: ' NAO ' });
  const copies = [1, 2].map(id => normalizeNativeForm({
    id, email: `lead-${id}@example.test`, created_time: '07/10/2026',
    campaign_id: '123', campaign_name: 'PRO-forms-nativo',
  }));
  const m = processDashboardMetrics({ ...empty, geral: [...copies, primary] }, '2026-10-07', '2026-10-07');
  assert.equal(m.demanda.formNativo.leads, 2);
  assert.equal(m.demanda.formNativo.mqls, 1);
  assert.equal(copies[0].utm_campaign, 'PRO-forms-nativo');
  assert.equal(copies[0].renda, '', 'Do not fabricate missing income');
});

test('missing UUID is retained; numero deduplicates; funnel registrations do not erase each other', () => {
  const rows = [
    lead(1, { uuid: '', email: '', numero: '(51) 99999-0000' }),
    lead(2, { uuid: '', email: '', numero: '51999990000' }),
    lead(3, { uuid: '' }),
    lead(3, { uuid: '', 'Atribuição': 'Meteórico', Subfunil: '', clint: 'NAO' }),
    lead(4, { 'Atribuição': '', clint: ' sim ' }),
  ];
  assert.equal(deduplicateLeads(rows).length, 4);
  const m = processDashboardMetrics({ ...empty, geral: rows }, '2026-10-07', '2026-10-07');
  assert.equal(m.demanda.formNativo.mqls, 3);
  assert.equal(m.meteorico.leads, 1);
  assert.equal(m.meteorico.mqls, 0);
});

test('native timestamps use São Paulo time and obey period boundaries', () => {
  const r = normalizeNativeForm({ id: 'native-1', email: 'day@example.test', created_time: '2026-10-07T01:30:00Z' });
  assert.equal(r.data_hora, '06/10/2026');
  const raw = { ...empty, geral: [r] };
  assert.equal(processDashboardMetrics(raw, '2026-10-06', '2026-10-06').demanda.leads, 1);
  assert.equal(processDashboardMetrics(raw, '2026-10-07', '2026-10-07').demanda.leads, 0);
});

test('loader keeps all primary forms, expires cache, refreshes explicitly and never caches a failed load as zero', async () => {
  const realFetch = globalThis.fetch;
  const realNow = Date.now;
  let now = realNow();
  Date.now = () => now;
  let failed = false;
  let calls = 0;
  let sawRefresh = false;
  const primary = 'data_hora,uuid,email,clint,Atribuição,Subfunil\n07/10/2026,u-1,lead@example.test,SIM,Geração de Demanda,Formulário Nativo';
  globalThis.fetch = (async (input: any, init: any) => {
    calls++;
    assert.equal(init?.cache, 'no-store');
    const url = new URL(String(input), 'https://example.test');
    sawRefresh ||= url.searchParams.has('refresh');
    const source = url.searchParams.get('url');
    if (source === DASHBOARDS['protagon-porto-alegre'].GERAL_CSV_URL) {
      if (failed) return new Response('', { status: 502 });
      return new Response(primary);
    }
    return new Response('');
  }) as typeof fetch;
  try {
    const initial = await fetchRawDashboardData('protagon-porto-alegre', true);
    assert.equal(initial.geral.length, 1, 'A missing auxiliary export must not erase consolidated forms');
    const firstCalls = calls;
    await fetchRawDashboardData('protagon-porto-alegre');
    assert.equal(calls, firstCalls);
    now += DATA_REFRESH_INTERVAL + 1;
    await fetchRawDashboardData('protagon-porto-alegre');
    assert.ok(calls > firstCalls);
    assert.ok(sawRefresh);
    failed = true;
    await assert.rejects(fetchRawDashboardData('protagon-porto-alegre', true), /planilhas/);
    failed = false;
    assert.equal((await fetchRawDashboardData('protagon-porto-alegre')).geral.length, 1);
  } finally {
    globalThis.fetch = realFetch;
    Date.now = realNow;
  }
});

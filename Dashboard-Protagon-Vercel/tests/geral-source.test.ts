import assert from 'node:assert/strict';
import test from 'node:test';
import { DASHBOARDS, fetchRawDashboardData } from '../src/utils/dataFetching';
import { parsePublishedTabs, resolveGeralUrl } from '../src/utils/publishedTabs';
import { isLeadMeteorico, processDashboardMetrics } from '../src/utils/metricsCalculator';

const verified = {
  'protagon-joinville': '1372087036',
  'protagon-porto-alegre': '1846123823',
  'protagon-goiania': '1301297577',
  'protagon-sao-paulo': '1309336900',
} as const;

test('all four cities use their verified GERAL ID when public discovery is unavailable', () => {
  for (const [city, gid] of Object.entries(verified)) {
    const source = DASHBOARDS[city as keyof typeof verified].GERAL_CSV_URL;
    assert.equal(new URL(resolveGeralUrl(source, [])).searchParams.get('gid'), gid);
  }
});

test('published discovery selects exact GERAL, ignores OFF - GERAL and follows a recreated GERAL tab', () => {
  const html = String.raw`items.push({name: "OFF - GERAL", gid: "0"});
    items.push({name: "G\x45R\u0041L", gid: "987654321"});`;
  const tabs = parsePublishedTabs(html);
  const source = DASHBOARDS['protagon-goiania'].GERAL_CSV_URL;
  assert.equal(new URL(resolveGeralUrl(source, tabs)).searchParams.get('gid'), '987654321');
  assert.throws(() => resolveGeralUrl(source, [{ name: 'OFF - GERAL', gid: '0' }]), /GERAL não está publicada/);
});

test('loader reads only the new GERAL: legacy and auxiliary rows cannot inflate totals', async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: any) => {
    const source = new URL(String(input), 'https://example.test').searchParams.get('url')!;
    calls.push(source);
    if (source.endsWith('/pubhtml')) return new Response('items.push({name: "OFF - GERAL", gid: "0"}); items.push({name: "GERAL", gid: "987654321"});');
    if (new URL(source).searchParams.get('gid') === '987654321') {
      // Header order deliberately differs from the old sheet. Atribuição is now AF.
      return new Response('id_pessoa,Atribuição,clint,email,data_hora,renda,Subfunil,utm_campaign\nLEAD-1,Geração de Demanda,SIM,one@example.test,15/10/2026,r$_7.501_a_r$_10.000,Formulário Nativo,[PRO-E038-GOI] [GERACAO-DEMANDA]');
    }
    return new Response('');
  }) as typeof fetch;
  try {
    const raw = await fetchRawDashboardData('protagon-goiania', true);
    assert.equal(raw.geral.length, 1);
    assert.ok(calls.every(url => new URL(url).searchParams.get('gid') !== '0'));
    assert.ok(calls.every(url => url.includes('2PACX-1vRwejh0r8y0vDlx0bMC0EZJJh39s0CpRWbqhVkckRGYl8VHrRlWPj-k1bGJn5ZIg7Z3sg9a0yHitogI')));
    const result = processDashboardMetrics(raw, '2026-10-15', '2026-10-15');
    assert.equal(result.demanda.formNativo.leads, 1);
    assert.equal(result.demanda.formNativo.mqls, 1);
    assert.equal(result.meteorico.leads, 0);
  } finally { globalThis.fetch = original; }
});

test('GERAL attribution wins over event codes and old tracking strings', () => {
  assert.equal(isLeadMeteorico({ 'Atribuição': 'Geração de Demanda', utm_campaign: '[PRO-E038-GOI] [METEÓRICO]' }), false);
  assert.equal(isLeadMeteorico({ 'Atribuição': 'Workshop', utm_campaign: '[PRO-E039-SP]' }), false);
  assert.equal(isLeadMeteorico({ utm_campaign: '[PRO-E038-GOI] [GERACAO-DEMANDA]' }), false);
  assert.equal(isLeadMeteorico({ utm_campaign: '[PRO-E038-GOI] [METEÓRICO]' }), true);
  assert.equal(isLeadMeteorico({ 'Atribuição': 'Meteórico' }), true);
});

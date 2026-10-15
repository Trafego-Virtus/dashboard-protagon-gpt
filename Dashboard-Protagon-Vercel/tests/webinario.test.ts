import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchWebinarioData, WEBINARIO_SOURCE } from '../src/utils/webinarioData';
import { DASHBOARDS } from '../src/utils/dashboardSources';
import { calculateWebinarioMetrics } from '../src/utils/webinarioCalculator';

const publishedIndex = `items.push({name: "OFF - GERAL", gid: "0"});
  items.push({name: "GERAL", gid: "101"});
  items.push({name: "MetaAds_Dados_Performance_webinario", gid: "102"});
  items.push({name: "INSCRITOS QUIZ", gid: "103"});`;
const geralCsv = `data_hora,email,id_pessoa,renda,utm_campaign,utm_term,utm_content,deleted,Atribuição
15/10/2026,one@example.test,p1,De R$5.001 a R$7.500,[WEBINÁRIO] [PG01] [SAO PAULO],,Anúncio A,0,
15/10/2026,one@example.test,p1,,,,,0,
15/10/2026,two@example.test,p2,Até R$ 1.500,,,,0,
15/10/2026,deleted@example.test,p3,De R$5.001 a R$7.500,,,,1,
15/10/2026,teste@example.test,p4,,,,,0,
01/09/2026,old@example.test,p5,De R$5.001 a R$7.500,,,,0,`;
const adsCsv = `Data,Valor Gasto,Atribuição,NOME DA CAMPANHA,NOME DO ANÚNCIO,Cliques,Page Views,Impressões
2026-10-15,"120,00",SAO PAULO,[WEBINÁRIO] [PG01] [SAO PAULO],Anúncio A,20,10,1000`;
const quizCsv = 'data_hora,email\n01/10/2026, ONE@example.test \n01/10/2026,quiz-only@example.test';
const salesCsv = 'Data Compra,email,Atribuição\n16/10/2026,one@example.test,Webinário\n16/10/2026,other@example.test,Meteórico';

function sourceFromRequest(input: any) {
  return new URL(String(input), 'https://example.test').searchParams.get('url')!;
}

test('webinar screen source uses PRO-WEB alone for leads/ads/quiz, retaining only city ticket feeds', async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  const ticketSources = ['protagon-joinville', 'protagon-cuiaba', 'protagon-porto-alegre'] as const;
  globalThis.fetch = (async (input: any, init: RequestInit) => {
    const source = sourceFromRequest(input);
    calls.push(source);
    assert.equal(init.cache, 'no-store');
    assert.ok(new URL(String(input), 'https://example.test').searchParams.has('refresh'));
    if (source === `${WEBINARIO_SOURCE}/pubhtml`) return new Response(publishedIndex);
    if (source.startsWith(WEBINARIO_SOURCE)) {
      const gid = new URL(source).searchParams.get('gid');
      if (gid === '101') return new Response(geralCsv);
      if (gid === '102') return new Response(adsCsv);
      if (gid === '103') return new Response(quizCsv);
    }
    if (source === DASHBOARDS['protagon-joinville'].INGRESSOS_CSV_URL) return new Response(salesCsv);
    if (ticketSources.some(city => source === DASHBOARDS[city].INGRESSOS_CSV_URL)) return new Response('');
    throw new Error(`Unexpected source: ${source}`);
  }) as typeof fetch;
  try {
    const raw = await fetchWebinarioData(true);
    assert.equal(calls.length, 7);
    assert.equal(raw.geral.length, 4, 'deleted and dummy rows are excluded');
    const result = calculateWebinarioMetrics(raw, '2026-10-15', '2026-10-16');
    assert.equal(result.resumo.leads, 2, 'id_pessoa works without UUID; duplicates and old dates do not inflate leads');
    assert.equal(result.resumo.mqls, 1);
    assert.equal(result.resumo.investimento, 120);
    assert.equal(result.resumo.cpl, 60);
    assert.equal(result.resumo.cplPago, 120);
    assert.equal(result.resumo.webinarioAbs, 1, 'quiz-only rows are not added as webinar leads');
    assert.equal(result.resumo.webinarioPercent, 50);
    assert.equal(result.pracas['São Paulo'].leads, 1);
    assert.equal(result.pracas['Orgânico'].leads, 1);
    assert.equal(result.pesquisa.find(row => row.email === 'one@example.test')['Atribuição'], 'São Paulo');
    assert.equal(result.resumo.vendas, 1);
    assert.equal(result.pracas['São Paulo'].vendas, 1);
    assert.equal(result.chartData.find(row => row.name === '16/10').vendasTotal, 1, 'sales-only days appear in charts');
    assert.equal(result.chartData.find(row => row.name === '16/10').cplTotal, 0);
    assert.equal(result.creatives[0].leads, 1);
    assert.equal(result.creatives[0].vendas, 1);
    assert.equal(result.pagesData[0].leads, 1);
  } finally { globalThis.fetch = original; }
});

test('published failures cannot masquerade as zero webinar leads', async () => {
  const original = globalThis.fetch;
  try {
    for (const [body, status] of [
      ['upstream failed', 502], ['<html>error</html>', 200], ['', 200], ['wrong,column\na,b', 200],
    ] as const) {
      globalThis.fetch = (async (input: any) => {
        const source = sourceFromRequest(input);
        if (source.endsWith('/pubhtml')) return new Response(publishedIndex);
        if (source.startsWith(WEBINARIO_SOURCE)) {
          const gid = new URL(source).searchParams.get('gid');
          if (gid === '101') return new Response(body, { status });
          return new Response(gid === '102' ? adsCsv : quizCsv);
        }
        return new Response('');
      }) as typeof fetch;
      await assert.rejects(fetchWebinarioData(), /PRO-WEB \/ GERAL/);
    }
    globalThis.fetch = (async () => new Response('items.push({name: "OFF - GERAL", gid: "0"});')) as typeof fetch;
    await assert.rejects(fetchWebinarioData(), /GERAL não está publicada/);
  } finally { globalThis.fetch = original; }
});

test('verified PRO-WEB tab IDs are used when public index discovery is unavailable', async () => {
  const original = globalThis.fetch;
  const gids = new Set<string>();
  globalThis.fetch = (async (input: any) => {
    const source = sourceFromRequest(input);
    if (source.endsWith('/pubhtml')) return new Response('', { status: 502 });
    if (!source.startsWith(WEBINARIO_SOURCE)) return new Response('');
    const gid = new URL(source).searchParams.get('gid')!;
    gids.add(gid);
    return new Response(gid === '0' ? geralCsv : gid === '680936326' ? adsCsv : quizCsv);
  }) as typeof fetch;
  try {
    await fetchWebinarioData();
    assert.deepEqual(gids, new Set(['0', '680936326', '1711648297']));
  } finally { globalThis.fetch = original; }
});

test('multi-city campaigns use ad-set location; ambiguous campaigns stay Geral', () => {
  const campaign = '[WEBINARIO] [PRAÇAS SEPARADAS]';
  const result = calculateWebinarioMetrics({
    geral: [
      { data_hora: '15/10/2026', email: 'one@example.test', id_pessoa: 'p1', utm_campaign: campaign, utm_term: '[PORT-ALEGRE]' },
      { data_hora: '15/10/2026', email: 'two@example.test', id_pessoa: 'p2', utm_campaign: campaign },
      { data_hora: '15/10/2026', numero: '11999999999', utm_campaign: campaign },
      { data_hora: '15/10/2026', numero: '11999999999', utm_campaign: campaign },
    ],
    captura: [
      { Data: '2026-10-01', 'Atribuição': 'JOINVILLE', 'NOME DA CAMPANHA': campaign },
      { Data: '2026-10-01', 'Atribuição': 'PORT ALEGRE', 'NOME DA CAMPANHA': campaign },
    ],
    ingressos: [],
  }, '2026-10-15', '2026-10-15');
  assert.equal(result.resumo.leads, 3);
  assert.equal(result.pracas['Porto Alegre'].leads, 1);
  assert.equal(result.pracas.Geral.leads, 2);
  assert.equal(result.pracas.Joinville.leads, 0);
});

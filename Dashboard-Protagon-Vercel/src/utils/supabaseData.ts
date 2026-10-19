import { normalizeLead } from './leadData';
import type { DashboardId } from './dashboardSources';
import { hasSupabaseSource, SUPABASE_DATASETS, type SupabaseDataset } from './supabaseSources';

type Row = Record<string, any>;
let configCache: { promise: Promise<boolean>; expires: number } | undefined;
export async function usesSupabase(city: DashboardId, forceRefresh = false): Promise<boolean> {
  if (!hasSupabaseSource(city)) return false;
  if (!forceRefresh && configCache && configCache.expires > Date.now()) return configCache.promise;
  const promise = (async () => {
    const response = await fetch('/api/supabase?config=1', { cache: 'no-store' });
    if (!response.ok) throw new Error('Não foi possível conferir a fonte de dados do dashboard.');
    const result = await response.json();
    if (typeof result.enabled !== 'boolean') throw new Error('Configuração da fonte de dados inválida.');
    return result.enabled;
  })();
  const entry = { promise, expires: Date.now() + 5 * 60 * 1000 };
  configCache = entry;
  try { return await promise; }
  catch (error) { if (configCache === entry) configCache = undefined; throw error; }
}

export async function fetchSupabaseRows(city: DashboardId, dataset: SupabaseDataset): Promise<Row[]> {
  if (!hasSupabaseSource(city)) throw new Error('Praça sem fonte Supabase configurada.');
  const rows: Row[] = [];
  let offset = 0;
  while (offset <= 1_000_000) {
    const params = new URLSearchParams({ city, dataset, offset: String(offset) });
    const response = await fetch(`/api/supabase?${params}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Não foi possível atualizar ${dataset} no Supabase. Tente novamente.`);
    const page = await response.json();
    if (!Array.isArray(page.rows)) throw new Error('O Supabase retornou dados inválidos.');
    rows.push(...page.rows);
    if (page.nextOffset === null) return rows;
    if (!page.rows.length || page.nextOffset !== offset + page.rows.length) {
      throw new Error('A paginação do Supabase retornou dados incompletos.');
    }
    offset = page.nextOffset;
  }
  throw new Error('A consulta excedeu o limite de registros. Restrinja o histórico na fonte.');
}

const text = (value: unknown) => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

export function normalizeSupabaseLead(input: Row, campaignFunnels = new Map<string, { attribution: string; subfunnel: string }>()) {
  const row = normalizeLead(input);
  // Timestamps are stored in UTC; preserve the original Brazilian business day.
  if (/^\d{4}-\d{2}-\d{2}T/.test(row.data_hora || '') && Number.isFinite(Date.parse(row.data_hora))) {
    row.data_hora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(row.data_hora));
  }
  row.id = String(row.id ?? '');
  row.renda = String(row.renda || '').replace(/_/g, ' ');
  if (row['Atribuição']) return row;
  const campaign = text(row.utm_campaign);
  const signals = text([row.utm_campaign, row.acao, row.pageurl, row.tags].filter(Boolean).join(' '));
  const matched = campaignFunnels.get(campaign);
  if (/\bquiz\b/.test(signals)) row['Atribuição'] = 'Quiz';
  else if (/webinario|webnario|teto invisivel|workshop/.test(signals)) row['Atribuição'] = 'Workshop';
  else if (/meteorico|mt captacao|captura met\b/.test(signals)) row['Atribuição'] = 'Meteórico';
  else if (/inlead|forms?\b|formul|geracao.?de.?demanda|geracao demanda|comercial|hans/.test(signals)
    || text(row.tipo_ingestao) === 'formsmeta') row['Atribuição'] = 'Geração de Demanda';
  else if (/\bvd\b|venda direta/.test(signals)) {
    row['Atribuição'] = /\bbio\b|organic/.test(signals) ? 'Venda Direta Orgânico' : 'Venda Direta Tráfego';
  } else if (matched) row['Atribuição'] = matched.attribution;

  if (row['Atribuição'] === 'Geração de Demanda' && !row.Subfunil) {
    if (/inlead/.test(signals)) row.Subfunil = 'INLEAD';
    else if (/forms?\b|formul/.test(signals) || text(row.tipo_ingestao) === 'formsmeta') row.Subfunil = 'Formulário Nativo';
    else if (/captura|comercial|\bpg\d+\b/.test(signals)) row.Subfunil = 'Página de Captura para o Comercial';
    else if (matched?.subfunnel) row.Subfunil = matched.subfunnel;
  }
  return row;
}

export function normalizeSupabaseDashboard(datasets: Record<SupabaseDataset, Row[]>) {
  const campaignFunnels = new Map<string, { attribution: string; subfunnel: string }>();
  const ambiguous = new Set<string>();
  const labels = { met: 'Meteórico', gd: 'Geração de Demanda', vd: 'Venda Direta Tráfego', workshop: 'Workshop' };
  for (const [dataset, attribution] of Object.entries(labels)) {
    for (const row of datasets[dataset as SupabaseDataset]) {
      const campaign = text(row['NOME DA CAMPANHA']);
      if (!campaign) continue;
      if (campaignFunnels.has(campaign) && campaignFunnels.get(campaign)!.attribution !== attribution) ambiguous.add(campaign);
      campaignFunnels.set(campaign, { attribution, subfunnel: String(row.Subfunil || '') });
    }
  }
  ambiguous.forEach(key => campaignFunnels.delete(key));
  return { ...datasets, geral: datasets.geral.filter(row => !/^(1|true|sim)$/i.test(String(row.deleted ?? '').trim()))
    .map(row => normalizeSupabaseLead(row, campaignFunnels)) };
}

export async function fetchSupabaseDashboard(city: DashboardId) {
  const datasets = {} as Record<SupabaseDataset, Row[]>;
  // Bound concurrency instead of requesting dozens of lead pages at once.
  for (let i = 0; i < SUPABASE_DATASETS.length; i += 3) {
    await Promise.all(SUPABASE_DATASETS.slice(i, i + 3).map(async dataset => {
      datasets[dataset] = await fetchSupabaseRows(city, dataset);
    }));
  }
  return normalizeSupabaseDashboard(datasets);
}

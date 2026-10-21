import { requestSupabaseJson } from './supabaseRequest';
import { normalizeLead } from './leadData';
import type { DashboardId } from './dashboardSources';
import { hasSupabaseSource, SUPABASE_DATASETS, type SupabaseDataset } from './supabaseSources';

type Row = Record<string, any>;
// One complete immutable generation per city, in memory only. Every refresh still
// checks page zero at the server before reusing the remaining pages.
const leadSnapshots = new Map<string, { rows: Row[]; snapshot: string; sourceUpdatedAt: string; totalRows: number }>();
let configCache: { promise: Promise<boolean>; expires: number } | undefined;
export async function usesSupabase(city: DashboardId, forceRefresh = false): Promise<boolean> {
  if (!hasSupabaseSource(city)) return false;
  if (!forceRefresh && configCache && configCache.expires > Date.now()) return configCache.promise;
  const promise = (async () => {
    const result = await requestSupabaseJson('/api/supabase?config=1', 'a configuração do dashboard');
    if (typeof result.enabled !== 'boolean') throw new Error('Configuração da fonte de dados inválida.');
    return result.enabled;
  })();
  const entry = { promise, expires: Date.now() + 5 * 60 * 1000 };
  configCache = entry;
  try { return await promise; }
  catch (error) { if (configCache === entry) configCache = undefined; throw error; }
}

// Workers start the next item as soon as one finishes, without batch barriers.
async function mapConcurrent<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const result: R[] = new Array(items.length);
  let next = 0;
  let failed = false;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (!failed && next < items.length) {
      const index = next++;
      try { result[index] = await fn(items[index]); }
      catch (error) { failed = true; throw error; }
    }
  }));
  return result;
}

export async function fetchSupabaseLeadSnapshot(city: DashboardId, signal?: AbortSignal) {
  if (!hasSupabaseSource(city)) throw new Error('Praça sem fonte Supabase configurada.');
  const readPage = async (page: number, version?: string) => {
    const params = new URLSearchParams({ city, dataset: 'geral', prepared: '1', page: String(page) });
    if (version) params.set('version', version);
    const data = await requestSupabaseJson(`/api/supabase?${params}`, 'os leads da praça', signal);
    if (!Array.isArray(data.rows) || data.page !== page || data.pageSize !== 1000
      || !Number.isSafeInteger(data.totalRows) || data.totalRows < 0 || data.totalRows > 1_000_000
      || typeof data.snapshot !== 'string' || !/^[0-9a-f-]{36}$/i.test(data.snapshot)
      || (version && data.snapshot !== version) || !Number.isFinite(Date.parse(data.sourceUpdatedAt))
      || data.rows.length !== Math.min(1000, Math.max(0, data.totalRows - page * 1000))) {
      throw new Error('A leitura dos leads retornou dados incompletos. Tente atualizar novamente.');
    }
    return data as { rows: Row[]; totalRows: number; snapshot: string; sourceUpdatedAt: string };
  };
  const first = await readPage(0);
  const cached = leadSnapshots.get(city);
  if (cached && cached.snapshot === first.snapshot && cached.totalRows === first.totalRows
    && cached.sourceUpdatedAt === first.sourceUpdatedAt) {
    return { rows: cached.rows, sourceUpdatedAt: cached.sourceUpdatedAt };
  }
  const remaining = Array.from({ length: Math.max(0, Math.ceil(first.totalRows / 1000) - 1) }, (_, i) => i + 1);
  const pages = await mapConcurrent(remaining, 3, async page => {
    const result = await readPage(page, first.snapshot);
    if (result.totalRows !== first.totalRows || result.sourceUpdatedAt !== first.sourceUpdatedAt) {
      throw new Error('A versão dos leads mudou durante a leitura. Tente atualizar novamente.');
    }
    return result.rows;
  });
  // Pin every page to the same immutable version, even during a background refresh.
  const complete = { ...first, rows: first.rows.concat(...pages) };
  leadSnapshots.set(city, complete);
  return { rows: complete.rows, sourceUpdatedAt: complete.sourceUpdatedAt };
}

export async function fetchSupabaseRows(city: DashboardId, dataset: SupabaseDataset, signal?: AbortSignal): Promise<Row[]> {
  if (!hasSupabaseSource(city)) throw new Error('Praça sem fonte Supabase configurada.');
  return dataset === 'geral' ? (await fetchSupabaseLeadSnapshot(city, signal)).rows : fetchPages(city, dataset, signal);
}

async function fetchPages(city: DashboardId, dataset: SupabaseDataset, signal?: AbortSignal): Promise<Row[]> {
  const rows: Row[] = [];
  let offset = 0;
  while (offset <= 1_000_000) {
    const params = new URLSearchParams({ city, dataset, offset: String(offset) });
    const labels: Record<SupabaseDataset, string> = { geral: 'os leads', met: 'o tráfego do Meteórico',
      vd: 'o tráfego de Venda Direta', gd: 'o tráfego de Geração de Demanda',
      dc: 'a Distribuição de Conteúdo', dcCorredor: 'a Distribuição de Conteúdo', workshop: 'o histórico de tráfego do webinário' };
    const page = await requestSupabaseJson(`/api/supabase?${params}`, labels[dataset], signal);
    if (!Array.isArray(page.rows)) throw new Error('O Supabase retornou dados inválidos.');
    rows.push(...page.rows);
    if (page.nextOffset === null) return sortTrafficBySource(rows);
    if (!page.rows.length || page.nextOffset !== offset + page.rows.length) {
      throw new Error('A paginação do Supabase retornou dados incompletos.');
    }
    offset = page.nextOffset;
  }
  throw new Error('A consulta excedeu o limite de registros. Restrinja o histórico na fonte.');
}

// Fetch using the database's existing PK index, then restore source order once
// on the complete dataset. This preserves first-row creative metadata and the
// accumulation order of existing financial calculations without a DB-wide sort.
// The database uses en_US.UTF-8; line numbers are numeric and nulls sort last.
const sourceCollator = new Intl.Collator('en-US');
export function sortTrafficBySource(rows: Row[]) {
  return rows.sort((a, b) => {
    for (const key of ['_origem_planilha', '_origem_aba', '_origem_linha']) {
      const av = a[key], bv = b[key];
      if (av == null && bv == null) continue;
      if (av == null) return 1;
      if (bv == null) return -1;
      const difference = key === '_origem_linha' ? Number(av) - Number(bv)
        : sourceCollator.compare(String(av), String(bv));
      if (difference) return difference;
    }
    return 0;
  });
}

const text = (value: unknown) => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

const leadDateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' });

export function normalizeSupabaseLead(input: Row, campaignFunnels = new Map<string, { attribution: string; subfunnel: string }>()) {
  const row = normalizeLead(input);
  // Timestamps are stored in UTC; preserve the original Brazilian business day.
  if (/^\d{4}-\d{2}-\d{2}T/.test(row.data_hora || '') && Number.isFinite(Date.parse(row.data_hora))) {
    row.data_hora = leadDateFormatter.format(new Date(row.data_hora));
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

export async function fetchSupabaseDashboard(city: DashboardId, parentSignal?: AbortSignal) {
  const controller = new AbortController();
  const signal = parentSignal ? AbortSignal.any([controller.signal, parentSignal]) : controller.signal;
  const datasets = {} as Record<SupabaseDataset, Row[]>;
  let leadsUpdatedAt: string | undefined;
  try {
    await mapConcurrent(SUPABASE_DATASETS, 3, async dataset => {
      if (dataset === 'geral') {
        const snapshot = await fetchSupabaseLeadSnapshot(city, signal);
        datasets.geral = snapshot.rows;
        leadsUpdatedAt = snapshot.sourceUpdatedAt;
      } else datasets[dataset] = await fetchSupabaseRows(city, dataset, signal);
    });
  } catch (error) { controller.abort(); throw error; }
  return { ...normalizeSupabaseDashboard(datasets), leadsUpdatedAt };
}

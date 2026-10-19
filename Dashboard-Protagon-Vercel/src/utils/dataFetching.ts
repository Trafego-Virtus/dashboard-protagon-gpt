import Papa from 'papaparse';
import { usesSupabase, fetchSupabaseDashboard } from './supabaseData';
import { DASHBOARDS, type DashboardId } from './dashboardSources';
import { normalizeLead } from './leadData';
import { parsePublishedTabs, resolveGeralUrl } from './publishedTabs';
export { DASHBOARDS } from './dashboardSources';

export interface RawDashboardData {
  dashboardId?: DashboardId;
  fetchedAt?: string;
  leadsUpdatedAt?: string;
  dataSource?: 'supabase' | 'sheets';
  main: any[];
  ingressos: any[];
  cadeiras: any[];
  geral: any[];
  met: any[];
  vd: any[];
  gd: any[];
  dc: any[];
  dcCorredor?: any[];
  workshop?: any[];
  webinario?: any[];
  sendflowTrafego?: any[];
}

// Apply the same test-record exclusion to both data sources.
const isTestOrDummyRow = (r: any) => {
  if (!r || typeof r !== 'object') return true;
  const email = String(r['email'] || r['Email'] || r['E-mail'] || '').trim().toLowerCase();
  if (email.includes('teste@') || email === 'teste') return true;
  const name = String(r['nome'] || r['Fn'] || r['Nome'] || r['full_name'] || '').trim().toLowerCase();
  if (name === 'teste' || name.includes('<test lead:')) return true;
  const prod = String(r['Produto Comprado'] || r['Produto'] || '').trim().toLowerCase();
  if (prod === 'teste') return true;
  const dateVal = String(r['Data Compra'] || r['data_hora'] || r['Data'] || '').trim();
  if (dateVal.includes('1900') || dateVal.includes('01/01/00')) return true;
  return false;
};

export const DATA_REFRESH_INTERVAL = 5 * 60 * 1000;
const requestCache = new Map<string, { promise: Promise<RawDashboardData>; expiresAt: number }>();

export async function fetchRawDashboardData(dashboardId: DashboardId, forceRefresh: boolean = false): Promise<RawDashboardData> {
  const cacheKey = dashboardId;
  
  const cached = requestCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.promise;
  }
  
  const promise = (async () => {
    const urls = DASHBOARDS[dashboardId];
    if (!urls) throw new Error("Dashboard not found");

    const refreshSuffix = forceRefresh ? `&refresh=${Date.now()}` : '';
    const fetchCsv = async (url: string, required = false) => {
      const response = await fetch(`/api/csv?url=${encodeURIComponent(url)}${refreshSuffix}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Não foi possível atualizar uma das planilhas. Tente novamente.');
      const text = await response.text();
      if (/^\s*(?:<!doctype html|<html)/i.test(text)) {
        throw new Error('A fonte retornou uma página de erro em vez dos dados. Tente novamente.');
      }
      if (!text.trim()) {
        if (required) throw new Error('A aba GERAL de leads não pôde ser lida. Os dados não serão exibidos como zero.');
        return [];
      }
      return new Promise<any[]>((resolve, reject) => {
        Papa.parse(text, {
          worker: true,
          header: true,
          skipEmptyLines: 'greedy',
          complete: (results) => {
            const fields = (results.meta.fields || []).map(key => key.trim());
            if (required && !fields.includes('data_hora')) {
              reject(new Error('A aba GERAL de leads está sem a coluna data_hora.'));
              return;
            }
            if (results.errors.some(error => error.type === 'Quotes')) {
              reject(new Error('A planilha retornou um CSV incompleto. Tente atualizar novamente.'));
              return;
            }
            resolve(results.data.map((row: any) => Object.fromEntries(
              Object.entries(row).map(([key, value]) => [key.trim(), value])
            )));
          },
          error: () => reject(new Error('Não foi possível ler uma das planilhas. Tente novamente.')),
        });
      });
    };

    if (await usesSupabase(dashboardId, forceRefresh)) {
      const hasSales = dashboardId !== 'protagon-sao-paulo' && dashboardId !== 'protagon-goiania';
      const [data, ingressos, cadeiras, sendflowTrafego] = await Promise.all([
        fetchSupabaseDashboard(dashboardId),
        hasSales ? fetchCsv(urls.INGRESSOS_CSV_URL) : Promise.resolve([]),
        hasSales ? fetchCsv(urls.CADEIRAS_CSV_URL) : Promise.resolve([]),
        urls.SENDFLOW_TRAFEGO_CSV_URL ? fetchCsv(urls.SENDFLOW_TRAFEGO_CSV_URL) : Promise.resolve([]),
      ]);
      return {
        ...data, dashboardId, fetchedAt: new Date().toISOString(), dataSource: 'supabase' as const,
        main: [], webinario: [],
        geral: data.geral.filter(row => !isTestOrDummyRow(row)),
        ingressos: ingressos.filter(row => !isTestOrDummyRow(row)),
        cadeiras: cadeiras.filter(row => !isTestOrDummyRow(row)),
        sendflowTrafego,
      };
    }

    // Extract base URL from CSV_URL to dynamically discover any published tabs
    const matchBase = urls.CSV_URL.match(/^(https:\/\/docs\.google\.com\/spreadsheets\/d\/e\/[^\/]+)/);
    const basePubUrl = matchBase ? matchBase[1] : null;

    let publishedTabs: ReturnType<typeof parsePublishedTabs> = [];
    let discoveredGdUrls: string[] = [];
    let discoveredDcUrls: string[] = [];
    let discoveredDcCorredorUrls: string[] = [];
    let discoveredWorkshopUrls: string[] = [];
    let discoveredWebinarioUrls: string[] = [];
    let discoveredSendflowUrls: string[] = [];
    let discoveredMetUrls: string[] = [];

    if (basePubUrl) {
      try {
        const pubhtmlRes = await fetch(`/api/csv?url=${encodeURIComponent(basePubUrl + '/pubhtml')}${refreshSuffix}`, { cache: 'no-store' }).catch(() => null);
        if (pubhtmlRes && pubhtmlRes.ok) {
          const html = await pubhtmlRes.text();
          
          publishedTabs = parsePublishedTabs(html);
          for (const { name: decodedName, gid } of publishedTabs) {
              // Matches MetaAds_Dados_Performance_GD, MetaAds_Dados_Performance_GD-V2, MetaAds_Dados_Performance_GD2, etc.
              if (/MetaAds_Dados_Performance_GD/i.test(decodedName)) {
                discoveredGdUrls.push(`${basePubUrl}/pub?output=csv&gid=${gid}`);
              }
              // Matches MetaAds_Dados_Performance_DC_corredor-polones, etc.
              else if (/corredor/i.test(decodedName)) {
                discoveredDcCorredorUrls.push(`${basePubUrl}/pub?output=csv&gid=${gid}`);
              }
              // Matches MetaAds_Dados_Performance_DC, MetaAds_Dados_Performance_DC2, MetaAds_Dados_Performance_DC3, etc.
              else if (/MetaAds_Dados_Performance_DC/i.test(decodedName)) {
                discoveredDcUrls.push(`${basePubUrl}/pub?output=csv&gid=${gid}`);
              }
              // Matches MetaAds_Dados_Performance_MET, etc.
              else if (/MetaAds_Dados_Performance_MET|_MET|meteorico|meteórico/i.test(decodedName)) {
                discoveredMetUrls.push(`${basePubUrl}/pub?output=csv&gid=${gid}`);
              }
              // Matches MetaAds_Dados_Performance_Workshop, etc.
              else if (/workshop/i.test(decodedName)) {
                discoveredWorkshopUrls.push(`${basePubUrl}/pub?output=csv&gid=${gid}`);
              }
              // Matches MetaAds_Dados_Performance_Webinario, etc.
              else if (/webinario|webnario/i.test(decodedName)) {
                discoveredWebinarioUrls.push(`${basePubUrl}/pub?output=csv&gid=${gid}`);
              }
              // Matches sendflow_trafego
              else if (/sendflow_trafego/i.test(decodedName)) {
                discoveredSendflowUrls.push(`${basePubUrl}/pub?output=csv&gid=${gid}`);
              }
          }
        }
      } catch (e) {
        console.warn("Could not discover published sheets from pubhtml", e);
      }
    }

    const geralUrl = resolveGeralUrl(urls.GERAL_CSV_URL, publishedTabs);

    // Combine discovered URLs with known static URLs, deduplicating
    const allGdUrls = Array.from(new Set([
      urls.GD_CSV_URL,
      urls.GD_V2_CSV_URL,
      ...discoveredGdUrls
    ].filter(Boolean) as string[]));

    const allDcUrls = Array.from(new Set([
      urls.DC_CSV_URL,
      urls.DC2_CSV_URL,
      ...discoveredDcUrls
    ].filter(Boolean) as string[]));

    const allDcCorredorUrls = Array.from(new Set([
      ...discoveredDcCorredorUrls
    ].filter(Boolean) as string[]));

    const allWorkshopUrls = Array.from(new Set([
      ...discoveredWorkshopUrls
    ].filter(Boolean) as string[]));

    const allWebinarioUrls = Array.from(new Set([
      ...discoveredWebinarioUrls
    ].filter(Boolean) as string[]));

    const allSendflowUrls = Array.from(new Set([
      urls.SENDFLOW_TRAFEGO_CSV_URL,
      ...discoveredSendflowUrls
    ].filter(Boolean) as string[]));

    const allMetUrls = Array.from(new Set([
      urls.MET_CSV_URL,
      ...discoveredMetUrls
    ].filter(Boolean) as string[]));

    // Fetch EVERYTHING in parallel at once
    const allPromises = [
      fetchCsv(urls.CSV_URL),
      fetchCsv(urls.INGRESSOS_CSV_URL),
      fetchCsv(urls.CADEIRAS_CSV_URL),
      fetchCsv(geralUrl, true),
      allMetUrls.length > 0 ? Promise.all(allMetUrls.map(u => fetchCsv(u))) : Promise.resolve([]),
      fetchCsv(urls.VD_CSV_URL),
      Promise.all(allGdUrls.map(u => fetchCsv(u))),
      Promise.all(allDcUrls.map(u => fetchCsv(u))),
      Promise.all(allDcCorredorUrls.map(u => fetchCsv(u))),
      Promise.all(allWorkshopUrls.map(u => fetchCsv(u))),
      Promise.all(allWebinarioUrls.map(u => fetchCsv(u))),
      allSendflowUrls.length > 0 ? Promise.all(allSendflowUrls.map(u => fetchCsv(u))) : Promise.resolve([])
    ];

    const results = await Promise.all(allPromises);

    const [main, ingressos, cadeiras, geral, metResults, vd, gdResults, dcResults, dcCorredorResults, workshopResults, webinarioResults, sendflowResults] = results;

    const met = Array.isArray(metResults) ? (metResults as any[]).flat() : [];
    const gd = (gdResults as any[]).flat();
    const dc = (dcResults as any[]).flat();
    const dcCorredor = (dcCorredorResults as any[]).flat();
    const workshop = (workshopResults as any[]).flat();
    const webinario = (webinarioResults as any[]).flat();
    const sendflowTrafego = (sendflowResults as any[]).flat();

    // Clean test records
    let cleanIngressos = (ingressos || []).filter((r: any) => !isTestOrDummyRow(r));
    let cleanCadeiras = (cadeiras || []).filter((r: any) => !isTestOrDummyRow(r));
    const cleanGeral = (geral || []).filter((r: any) => !isTestOrDummyRow(r)).map(normalizeLead);

    // São Paulo and Goiânia currently do not have sold tickets (only content distribution running)
    if (dashboardId === 'protagon-sao-paulo' || dashboardId === 'protagon-goiania') {
      cleanIngressos = [];
      cleanCadeiras = [];
    }

    const result: RawDashboardData = {
      dashboardId,
      dataSource: 'sheets',
      fetchedAt: new Date().toISOString(),
      main, 
      ingressos: cleanIngressos, 
      cadeiras: cleanCadeiras, 
      geral: cleanGeral, 
      met, 
      vd, 
      gd, 
      dc,
      dcCorredor,
      workshop,
      webinario,
      sendflowTrafego
    };

    return result;
  })();

  const entry = { promise, expiresAt: Infinity };
  requestCache.set(cacheKey, entry);
  try {
    const result = await promise;
    entry.expiresAt = Date.now() + DATA_REFRESH_INTERVAL;
    return result;
  } catch (error) {
    if (requestCache.get(cacheKey) === entry) requestCache.delete(cacheKey);
    throw error;
  }
}

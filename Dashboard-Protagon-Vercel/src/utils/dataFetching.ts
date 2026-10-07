import Papa from 'papaparse';
import { DashboardId } from './api';

export const DASHBOARDS: Record<DashboardId, {
  CSV_URL: string;
  INGRESSOS_CSV_URL: string;
  CADEIRAS_CSV_URL: string;
  MET_CSV_URL: string;
  VD_CSV_URL: string;
  GD_CSV_URL: string;
  GD_V2_CSV_URL?: string;
  DC_CSV_URL: string;
  DC2_CSV_URL?: string;
  GERAL_CSV_URL: string;
}> = {
  'protagon-joinville': {
    CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vScQyN2_CL3iVvWNhZWwQzXA3AO26lO_sMUukWBzkzri3fl13EZmpq6CHIog258XHsxQ-2yWVXod2u0/pub?output=csv&gid=2074501467",
    INGRESSOS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vScQyN2_CL3iVvWNhZWwQzXA3AO26lO_sMUukWBzkzri3fl13EZmpq6CHIog258XHsxQ-2yWVXod2u0/pub?output=csv&gid=1453614050",
    CADEIRAS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vScQyN2_CL3iVvWNhZWwQzXA3AO26lO_sMUukWBzkzri3fl13EZmpq6CHIog258XHsxQ-2yWVXod2u0/pub?output=csv&gid=1480696912",
    MET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vScQyN2_CL3iVvWNhZWwQzXA3AO26lO_sMUukWBzkzri3fl13EZmpq6CHIog258XHsxQ-2yWVXod2u0/pub?output=csv&gid=1934788815",
    VD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vScQyN2_CL3iVvWNhZWwQzXA3AO26lO_sMUukWBzkzri3fl13EZmpq6CHIog258XHsxQ-2yWVXod2u0/pub?output=csv&gid=1789500228",
    GD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vScQyN2_CL3iVvWNhZWwQzXA3AO26lO_sMUukWBzkzri3fl13EZmpq6CHIog258XHsxQ-2yWVXod2u0/pub?output=csv&gid=27909521",
    GD_V2_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vScQyN2_CL3iVvWNhZWwQzXA3AO26lO_sMUukWBzkzri3fl13EZmpq6CHIog258XHsxQ-2yWVXod2u0/pub?output=csv&gid=736292789",
    DC_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vScQyN2_CL3iVvWNhZWwQzXA3AO26lO_sMUukWBzkzri3fl13EZmpq6CHIog258XHsxQ-2yWVXod2u0/pub?output=csv&gid=1851196590",
    GERAL_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vScQyN2_CL3iVvWNhZWwQzXA3AO26lO_sMUukWBzkzri3fl13EZmpq6CHIog258XHsxQ-2yWVXod2u0/pub?output=csv&gid=0"
  },
  'protagon-cuiaba': {
    CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6M0lWh-1NXzvLj48Xi6fhSU8uziGahV8OTHYtkB9dlXEYpfVbiJBTjukwema9GZksETnDm-LCnmYU/pub?output=csv&gid=601859967",
    INGRESSOS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6M0lWh-1NXzvLj48Xi6fhSU8uziGahV8OTHYtkB9dlXEYpfVbiJBTjukwema9GZksETnDm-LCnmYU/pub?output=csv&gid=647886647",
    CADEIRAS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6M0lWh-1NXzvLj48Xi6fhSU8uziGahV8OTHYtkB9dlXEYpfVbiJBTjukwema9GZksETnDm-LCnmYU/pub?output=csv&gid=1480696912",
    MET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6M0lWh-1NXzvLj48Xi6fhSU8uziGahV8OTHYtkB9dlXEYpfVbiJBTjukwema9GZksETnDm-LCnmYU/pub?output=csv&gid=1934788815",
    VD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6M0lWh-1NXzvLj48Xi6fhSU8uziGahV8OTHYtkB9dlXEYpfVbiJBTjukwema9GZksETnDm-LCnmYU/pub?output=csv&gid=1789500228",
    GD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6M0lWh-1NXzvLj48Xi6fhSU8uziGahV8OTHYtkB9dlXEYpfVbiJBTjukwema9GZksETnDm-LCnmYU/pub?output=csv&gid=27909521",
    DC_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6M0lWh-1NXzvLj48Xi6fhSU8uziGahV8OTHYtkB9dlXEYpfVbiJBTjukwema9GZksETnDm-LCnmYU/pub?output=csv&gid=1851196590",
    DC2_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6M0lWh-1NXzvLj48Xi6fhSU8uziGahV8OTHYtkB9dlXEYpfVbiJBTjukwema9GZksETnDm-LCnmYU/pub?output=csv&gid=2072743280",
    GERAL_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6M0lWh-1NXzvLj48Xi6fhSU8uziGahV8OTHYtkB9dlXEYpfVbiJBTjukwema9GZksETnDm-LCnmYU/pub?output=csv&gid=0"
  },
  'protagon-porto-alegre': {
    CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLmH0WYkDKSHIOz6NpGsGl7ESq3UxdS8TlntP-1lEW-UEph2S5E-ZqLPp0mUPkyiI45OUMtYtgeMU1/pub?output=csv&gid=591401829",
    INGRESSOS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLmH0WYkDKSHIOz6NpGsGl7ESq3UxdS8TlntP-1lEW-UEph2S5E-ZqLPp0mUPkyiI45OUMtYtgeMU1/pub?output=csv&gid=1444015257",
    CADEIRAS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLmH0WYkDKSHIOz6NpGsGl7ESq3UxdS8TlntP-1lEW-UEph2S5E-ZqLPp0mUPkyiI45OUMtYtgeMU1/pub?output=csv&gid=1480696912",
    MET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLmH0WYkDKSHIOz6NpGsGl7ESq3UxdS8TlntP-1lEW-UEph2S5E-ZqLPp0mUPkyiI45OUMtYtgeMU1/pub?output=csv&gid=1934788815",
    VD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLmH0WYkDKSHIOz6NpGsGl7ESq3UxdS8TlntP-1lEW-UEph2S5E-ZqLPp0mUPkyiI45OUMtYtgeMU1/pub?output=csv&gid=1789500228",
    GD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLmH0WYkDKSHIOz6NpGsGl7ESq3UxdS8TlntP-1lEW-UEph2S5E-ZqLPp0mUPkyiI45OUMtYtgeMU1/pub?output=csv&gid=27909521",
    GD_V2_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLmH0WYkDKSHIOz6NpGsGl7ESq3UxdS8TlntP-1lEW-UEph2S5E-ZqLPp0mUPkyiI45OUMtYtgeMU1/pub?output=csv&gid=1445243482",
    DC_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLmH0WYkDKSHIOz6NpGsGl7ESq3UxdS8TlntP-1lEW-UEph2S5E-ZqLPp0mUPkyiI45OUMtYtgeMU1/pub?output=csv&gid=1851196590",
    GERAL_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLmH0WYkDKSHIOz6NpGsGl7ESq3UxdS8TlntP-1lEW-UEph2S5E-ZqLPp0mUPkyiI45OUMtYtgeMU1/pub?output=csv&gid=0"
  },
  'protagon-sao-paulo': {
    CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTw8tH3j_nWBaIHti2ArML1eCB-4RBm8q3nC4R5cKqG2nbJFvcXNxmK3WKUFkQydGK0U1wwFuxQ_n5K/pub?output=csv&gid=1444548113",
    INGRESSOS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTw8tH3j_nWBaIHti2ArML1eCB-4RBm8q3nC4R5cKqG2nbJFvcXNxmK3WKUFkQydGK0U1wwFuxQ_n5K/pub?output=csv&gid=1453614050",
    CADEIRAS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTw8tH3j_nWBaIHti2ArML1eCB-4RBm8q3nC4R5cKqG2nbJFvcXNxmK3WKUFkQydGK0U1wwFuxQ_n5K/pub?output=csv&gid=863773508",
    MET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTw8tH3j_nWBaIHti2ArML1eCB-4RBm8q3nC4R5cKqG2nbJFvcXNxmK3WKUFkQydGK0U1wwFuxQ_n5K/pub?output=csv&gid=1934788815",
    VD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTw8tH3j_nWBaIHti2ArML1eCB-4RBm8q3nC4R5cKqG2nbJFvcXNxmK3WKUFkQydGK0U1wwFuxQ_n5K/pub?output=csv&gid=1789500228",
    GD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTw8tH3j_nWBaIHti2ArML1eCB-4RBm8q3nC4R5cKqG2nbJFvcXNxmK3WKUFkQydGK0U1wwFuxQ_n5K/pub?output=csv&gid=27909521",
    DC_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTw8tH3j_nWBaIHti2ArML1eCB-4RBm8q3nC4R5cKqG2nbJFvcXNxmK3WKUFkQydGK0U1wwFuxQ_n5K/pub?output=csv&gid=1851196590",
    GERAL_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTw8tH3j_nWBaIHti2ArML1eCB-4RBm8q3nC4R5cKqG2nbJFvcXNxmK3WKUFkQydGK0U1wwFuxQ_n5K/pub?output=csv&gid=0"
  },
  'protagon-goiania': {
    CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwejh0r8y0vDlx0bMC0EZJJh39s0CpRWbqhVkckRGYl8VHrRlWPj-k1bGJn5ZIg7Z3sg9a0yHitogI/pub?output=csv&gid=1444548113",
    INGRESSOS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwejh0r8y0vDlx0bMC0EZJJh39s0CpRWbqhVkckRGYl8VHrRlWPj-k1bGJn5ZIg7Z3sg9a0yHitogI/pub?output=csv&gid=1453614050",
    CADEIRAS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwejh0r8y0vDlx0bMC0EZJJh39s0CpRWbqhVkckRGYl8VHrRlWPj-k1bGJn5ZIg7Z3sg9a0yHitogI/pub?output=csv&gid=863773508",
    MET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwejh0r8y0vDlx0bMC0EZJJh39s0CpRWbqhVkckRGYl8VHrRlWPj-k1bGJn5ZIg7Z3sg9a0yHitogI/pub?output=csv&gid=1934788815",
    VD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwejh0r8y0vDlx0bMC0EZJJh39s0CpRWbqhVkckRGYl8VHrRlWPj-k1bGJn5ZIg7Z3sg9a0yHitogI/pub?output=csv&gid=1789500228",
    GD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwejh0r8y0vDlx0bMC0EZJJh39s0CpRWbqhVkckRGYl8VHrRlWPj-k1bGJn5ZIg7Z3sg9a0yHitogI/pub?output=csv&gid=27909521",
    DC_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwejh0r8y0vDlx0bMC0EZJJh39s0CpRWbqhVkckRGYl8VHrRlWPj-k1bGJn5ZIg7Z3sg9a0yHitogI/pub?output=csv&gid=1851196590",
    GERAL_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwejh0r8y0vDlx0bMC0EZJJh39s0CpRWbqhVkckRGYl8VHrRlWPj-k1bGJn5ZIg7Z3sg9a0yHitogI/pub?output=csv&gid=0"
  }
};

export interface RawDashboardData {
  fetchedAt?: string;
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
}

import { normalizeLead, normalizeNativeForm } from './leadData';

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
        if (required) throw new Error('A planilha de leads não pôde ser lida. Os dados não serão exibidos como zero.');
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
              reject(new Error('A planilha de leads está sem a coluna data_hora.'));
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

    const newUrls: Record<string, string[]> = {
      'protagon-joinville': [
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vSpsh1QH0eUMYCmmheEezlRfcbATNlhnvO19d7Vy2BLs3_x2TCh42R0AEGomcF2LHMY6l0EcP7WrdkU/pub?output=csv&gid=24581337",
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vSpsh1QH0eUMYCmmheEezlRfcbATNlhnvO19d7Vy2BLs3_x2TCh42R0AEGomcF2LHMY6l0EcP7WrdkU/pub?output=csv&gid=1146507446"
      ],
      'protagon-cuiaba': [
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vSpsh1QH0eUMYCmmheEezlRfcbATNlhnvO19d7Vy2BLs3_x2TCh42R0AEGomcF2LHMY6l0EcP7WrdkU/pub?output=csv&gid=1243425831",
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vSpsh1QH0eUMYCmmheEezlRfcbATNlhnvO19d7Vy2BLs3_x2TCh42R0AEGomcF2LHMY6l0EcP7WrdkU/pub?output=csv&gid=2032575071"
      ],
      'protagon-porto-alegre': [
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vSpsh1QH0eUMYCmmheEezlRfcbATNlhnvO19d7Vy2BLs3_x2TCh42R0AEGomcF2LHMY6l0EcP7WrdkU/pub?output=csv&gid=284101196"
      ],
      'protagon-sao-paulo': [],
      'protagon-goiania': []
    };
    const urlsToFetch = newUrls[dashboardId] || [];

    // Extract base URL from CSV_URL to dynamically discover any published tabs
    const matchBase = urls.CSV_URL.match(/^(https:\/\/docs\.google\.com\/spreadsheets\/d\/e\/[^\/]+)/);
    const basePubUrl = matchBase ? matchBase[1] : null;

    let discoveredGdUrls: string[] = [];
    let discoveredDcUrls: string[] = [];
    let discoveredDcCorredorUrls: string[] = [];
    let discoveredWorkshopUrls: string[] = [];
    let discoveredWebinarioUrls: string[] = [];

    if (basePubUrl) {
      try {
        const pubhtmlRes = await fetch(`/api/csv?url=${encodeURIComponent(basePubUrl + '/pubhtml')}${refreshSuffix}`, { cache: 'no-store' }).catch(() => null);
        if (pubhtmlRes && pubhtmlRes.ok) {
          const html = await pubhtmlRes.text();
          
          // Use robust regex to find items.push({ ... }) blocks
          const pushRegex = /items\.push\(\s*\{([^}]+)\}\s*\)/g;
          let pushMatch;
          while ((pushMatch = pushRegex.exec(html)) !== null) {
            const innerContent = pushMatch[1];
            // Extract name and gid using flexible regexes (supports both single/double quotes and flexible spacing)
            const nameMatch = /name:\s*["']([^"']+)["']/.exec(innerContent);
            const gidMatch = /gid:\s*["']([^"']+)["']/.exec(innerContent);
            
            if (nameMatch && gidMatch) {
              const sheetName = nameMatch[1];
              const gid = gidMatch[1];
              
              // Decode any unicode/hex escapes like \x5b or \x5d
              let decodedName = sheetName.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => 
                String.fromCharCode(parseInt(hex, 16))
              );
              
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
              // Matches MetaAds_Dados_Performance_Workshop, etc.
              else if (/workshop/i.test(decodedName)) {
                discoveredWorkshopUrls.push(`${basePubUrl}/pub?output=csv&gid=${gid}`);
              }
              // Matches MetaAds_Dados_Performance_Webinario, etc.
              else if (/webinario|webnario/i.test(decodedName)) {
                discoveredWebinarioUrls.push(`${basePubUrl}/pub?output=csv&gid=${gid}`);
              }
            }
          }
        }
      } catch (e) {
        console.warn("Could not discover published sheets from pubhtml", e);
      }
    }

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

    // Fetch EVERYTHING in parallel at once
    const allPromises = [
      fetchCsv(urls.CSV_URL),
      fetchCsv(urls.INGRESSOS_CSV_URL),
      fetchCsv(urls.CADEIRAS_CSV_URL),
      fetchCsv(urls.GERAL_CSV_URL, true),
      fetchCsv(urls.MET_CSV_URL),
      fetchCsv(urls.VD_CSV_URL),
      Promise.all(allGdUrls.map(u => fetchCsv(u))),
      Promise.all(allDcUrls.map(u => fetchCsv(u))),
      Promise.all(allDcCorredorUrls.map(u => fetchCsv(u))),
      Promise.all(allWorkshopUrls.map(u => fetchCsv(u))),
      Promise.all(allWebinarioUrls.map(u => fetchCsv(u))),
      ...urlsToFetch.map(u => fetchCsv(u))
    ];

    const results = await Promise.all(allPromises);

    const [main, ingressos, cadeiras, geral, met, vd, gdResults, dcResults, dcCorredorResults, workshopResults, webinarioResults, ...newLeadsResults] = results;

    const gd = (gdResults as any[]).flat();
    const dc = (dcResults as any[]).flat();
    const dcCorredor = (dcCorredorResults as any[]).flat();
    const workshop = (workshopResults as any[]).flat();
    const webinario = (webinarioResults as any[]).flat();

    // Helper to filter out dummy/test rows from sheets
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

    // Clean test records
    let cleanIngressos = (ingressos || []).filter((r: any) => !isTestOrDummyRow(r));
    let cleanCadeiras = (cadeiras || []).filter((r: any) => !isTestOrDummyRow(r));
    const cleanGeral = (geral || []).filter((r: any) => !isTestOrDummyRow(r)).map(normalizeLead);

    // São Paulo and Goiânia currently do not have sold tickets (only content distribution running)
    if (dashboardId === 'protagon-sao-paulo' || dashboardId === 'protagon-goiania') {
      cleanIngressos = [];
      cleanCadeiras = [];
    }

    const result = { 
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
      webinario
    };

    // Keep every consolidated lead. Supplemental exports can lag behind it.
    // The calculator reconciles contacts within the selected period, always
    // preferring consolidated fields over the prequalified native export.
    const supplementalLeads = newLeadsResults.flat()
      .filter((row: any) => !isTestOrDummyRow(row))
      .map(normalizeNativeForm);
    result.geral = [...cleanGeral, ...supplementalLeads];

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

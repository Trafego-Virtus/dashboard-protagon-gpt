
import Papa from 'papaparse';
import { DashboardDataRow, CreativeDataRow, PesquisaRow } from '../types';
import { parseCurrency, parseNumber, parseDate } from './format';

export type DashboardId = 'protagon-joinville' | 'protagon-cuiaba' | 'protagon-porto-alegre' | 'protagon-sao-paulo' | 'protagon-goiania';

const DASHBOARDS = {
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

const SCK_DEMANDA_PARAMS = [
  "comercial-pp-guilhermess", "comercial-pp-renanfg", "danilon", "danilonc", "dirceubf", 
  "emanoelle", "emanoellef", "embaixador-protagon", "furlan", "guilhermesm", 
  "guilhermes", "guilhermess", "guimartins", "hansdr", "hansdsr", "priteganif", "renan", 
  "suellen", "suellenmm", "viniciosms", "gmartins", "sp-alu-daniloss", "sp-pp-cesarsa", 
  "sp-pp-nubiafcm", "comercial-pp-emanoelle", "comercial-ev-israelds", 
  "comercial-alu-felipeog", "victoriac"
];

export async function fetchDashboardData(dashboardId: DashboardId): Promise<DashboardDataRow[]> {
  try {
    const urls = DASHBOARDS[dashboardId];
    if (!urls) throw new Error("Dashboard not found");

    const fetchCsv = async (url: string) => {
      try {
        const response = await fetch(`/api/csv?url=${encodeURIComponent(url)}`);
        if (!response.ok) return [];
        const text = await response.text();
        return new Promise<any[]>((resolve) => {
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
            complete: (results) => resolve(results.data),
            error: (err) => {
              console.error("Papa parse error", err);
              resolve([]);
            }
          });
        });
      } catch (e) {
        console.error("Fetch CSV error:", e);
        return [];
      }
    };

    const mainData = await fetchCsv(urls.CSV_URL);
    const ingressosData = await fetchCsv(urls.INGRESSOS_CSV_URL);
    const cadeirasRawData = await fetchCsv(urls.CADEIRAS_CSV_URL);
    const geralData = await fetchCsv(urls.GERAL_CSV_URL);

    // Aggregate Faturamento by date and funil
    const fatPorData = { meteorico: {}, vendaDireta: {}, demanda: {}, total: {} };
    for (const row of ingressosData) {
      const dataCompra = row['Data Compra'];
      if (!dataCompra) continue;
            
      const parsedDate = parseDate(dataCompra);
      if (!parsedDate) continue;
      const dateStr = parsedDate.toISOString().split('T')[0];
      const faturamento = parseCurrency(row['Fat. Líquido - Principal'] || '0');
      const atribuicao = (row['Atribuição'] || '').trim().toLowerCase();
      
      fatPorData.total[dateStr] = (fatPorData.total[dateStr] || 0) + faturamento;
      if (atribuicao.includes('meteórico') || atribuicao.includes('meteorico')) {
        fatPorData.meteorico[dateStr] = (fatPorData.meteorico[dateStr] || 0) + faturamento;
      } else if (atribuicao.includes('geração de demanda') || atribuicao.includes('geracao de demanda')) {
        fatPorData.demanda[dateStr] = (fatPorData.demanda[dateStr] || 0) + faturamento;
      } else if (atribuicao.includes('venda direta')) {
        fatPorData.vendaDireta[dateStr] = (fatPorData.vendaDireta[dateStr] || 0) + faturamento;
      }
    }

    // Aggregate Cadeiras by date and funil
    const cadeirasPorData = { meteorico: {}, vendaDireta: {}, demanda: {} };
    for (const row of cadeirasRawData) {
      const statusTicket = row['Status do Ticket'] || '';
      if (!statusTicket.toUpperCase().includes('SOLD')) continue;
      
      const dataCompra = row['Data Compra'];
      if (!dataCompra) continue;
            
      const parsedDate = parseDate(dataCompra);
      if (!parsedDate) continue;
      const dateStr = parsedDate.toISOString().split('T')[0];
      const atribuicao = (row['Atribuição'] || '').trim().toLowerCase();
            
      if (atribuicao.includes('meteórico') || atribuicao.includes('meteorico')) {
        cadeirasPorData.meteorico[dateStr] = (cadeirasPorData.meteorico[dateStr] || 0) + 1;
      } else if (atribuicao.includes('geração de demanda') || atribuicao.includes('geracao de demanda')) {
        cadeirasPorData.demanda[dateStr] = (cadeirasPorData.demanda[dateStr] || 0) + 1;
      } else if (atribuicao.includes('venda direta')) {
        cadeirasPorData.vendaDireta[dateStr] = (cadeirasPorData.vendaDireta[dateStr] || 0) + 1;
      }
    }

    // Aggregate Leads and MQLs by date and funil
    const leadsPorData = { meteorico: {}, vendaDireta: {}, demanda: {} };
    const mqlsPorData = { meteorico: {}, vendaDireta: {}, demanda: {} };
    for (const row of geralData) {
      const data_hora = row['data_hora'] || row['Data'] || '';
      if (!data_hora) continue;
      
      const parsedDate = parseDate(data_hora);
      if (!parsedDate) continue;
      
      const dateStr = parsedDate.toISOString().split('T')[0];
      const atribuicao = (row['Atribuição'] || '').trim().toLowerCase();
      
      // MQL is determined if 'renda' is answered
      const isMQL = !!row['renda'] && String(row['renda']).trim() !== '';

      if (atribuicao.includes('meteórico') || atribuicao.includes('meteorico')) {
        leadsPorData.meteorico[dateStr] = (leadsPorData.meteorico[dateStr] || 0) + 1;
        if (isMQL) mqlsPorData.meteorico[dateStr] = (mqlsPorData.meteorico[dateStr] || 0) + 1;
      } else if (atribuicao.includes('geração de demanda') || atribuicao.includes('geracao de demanda')) {
        leadsPorData.demanda[dateStr] = (leadsPorData.demanda[dateStr] || 0) + 1;
        if (isMQL) mqlsPorData.demanda[dateStr] = (mqlsPorData.demanda[dateStr] || 0) + 1;
      } else if (atribuicao.includes('venda direta')) {
        leadsPorData.vendaDireta[dateStr] = (leadsPorData.vendaDireta[dateStr] || 0) + 1;
        if (isMQL) mqlsPorData.vendaDireta[dateStr] = (mqlsPorData.vendaDireta[dateStr] || 0) + 1;
      }
    }

    const data = mainData.map((row: any) => {
      const parsedDate = parseDate(row['Data']);
      const dateStr = parsedDate ? parsedDate.toISOString().split('T')[0] : '';
            
      return {
        date: row['Data'],
        parsedDate,
        investimentoTotal: parseCurrency(row['Investimento Total']),
        ingressos: parseNumber(row['Cadeiras']),
        investimentoDistribuicao: parseCurrency(row['Investimento em Distribuição']),
        
        investimentoMeteorico: parseCurrency(row['Investimento em Meteórico']),
        faturamentoMeteorico: fatPorData.meteorico[dateStr] || 0,
        ingressosMeteorico: cadeirasPorData.meteorico[dateStr] || 0,
        leadsMeteorico: leadsPorData.meteorico[dateStr] || 0,
        mqlsMeteorico: mqlsPorData.meteorico[dateStr] || 0,

        investimentoVendaDireta: parseCurrency(row['Investimento em Venda Direta']),
        faturamentoVendaDireta: fatPorData.vendaDireta[dateStr] || 0,
        ingressosVendaDireta: cadeirasPorData.vendaDireta[dateStr] || 0,
        leadsVendaDireta: leadsPorData.vendaDireta[dateStr] || 0,
        mqlsVendaDireta: mqlsPorData.vendaDireta[dateStr] || 0,

        investimentoGeracaoDemanda: parseCurrency(row['Investimento em Geração de Demanda']),
        faturamentoGeracaoDemanda: fatPorData.demanda[dateStr] || 0,
        ingressosGeracaoDemanda: cadeirasPorData.demanda[dateStr] || 0,
        leadsGeracaoDemanda: leadsPorData.demanda[dateStr] || 0,
        mqlsGeracaoDemanda: mqlsPorData.demanda[dateStr] || 0,
        
        faturamento: fatPorData.total[dateStr] || 0
      };
    }).filter((row: DashboardDataRow) => row.parsedDate !== null) as DashboardDataRow[];
    return data;
  } catch (err) {
    throw err;
  }
}

export async function fetchCreativesData(dashboardId: DashboardId): Promise<CreativeDataRow[]> {
  try {
    const urls = DASHBOARDS[dashboardId];
    if (!urls) throw new Error("Dashboard not found");

    const fetchCsv = async (url: string) => {
      try {
        const response = await fetch(`/api/csv?url=${encodeURIComponent(url)}`);
        if (!response.ok) return [];
        const text = await response.text();
        return new Promise<any[]>((resolve) => {
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
            complete: (results) => resolve(results.data),
            error: (err) => {
              console.error("Papa parse error", err);
              resolve([]);
            }
          });
        });
      } catch (e) {
        console.error("Fetch CSV error:", e);
        return [];
      }
    };
    
    // Fetch sequentially to avoid Google Sheets rate limits
    const metData = await fetchCsv(urls.MET_CSV_URL).catch(e => { console.error('MET error', e); return []; });
    const vdData = await fetchCsv(urls.VD_CSV_URL).catch(e => { console.error('VD error', e); return []; });
    const gdData = await fetchCsv(urls.GD_CSV_URL).catch(e => { console.error('GD error', e); return []; });
        const cadeirasRawData = await fetchCsv(urls.CADEIRAS_CSV_URL).catch(e => { console.error('CADEIRAS error in creatives', e); return []; });

    // Contar cadeiras por UTM Content e Atribuição
    const cadeirasPorFunilNome = {
      'meteorico': {} as Record<string, number>,
      'geracao-demanda': {} as Record<string, number>,
      'venda-direta': {} as Record<string, number>
    };
    for (const row of cadeirasRawData) {
      const statusTicket = row['Status do Ticket'] || '';
      if (!statusTicket.toUpperCase().includes('SOLD')) continue;
      
      const atribuicao = (row['Atribuição'] || '').trim().toLowerCase();
      let rowFunnel: 'meteorico' | 'geracao-demanda' | 'venda-direta' | null = null;
      
      if (atribuicao.includes('meteórico') || atribuicao.includes('meteorico')) {
        rowFunnel = 'meteorico';
      } else if (atribuicao.includes('geração de demanda') || atribuicao.includes('geracao de demanda')) {
        rowFunnel = 'geracao-demanda';
      } else if (atribuicao.includes('venda direta')) {
        rowFunnel = 'venda-direta';
      }
      
      const utmContent = (row['Utm Content'] || '').trim();
      if (utmContent && rowFunnel) {
        cadeirasPorFunilNome[rowFunnel][utmContent] = (cadeirasPorFunilNome[rowFunnel][utmContent] || 0) + 1;
      }
    }

    const creativesMap = new Map<string, CreativeDataRow>();

    const processRows = (rows: any[], funnel: CreativeDataRow['funnel']) => {
      for (const row of rows) {
        const getAlcance = (r: any) => {
          if (r['Alcance']) return r['Alcance'];
          if (r['alcance']) return r['alcance'];
          if (r['ALCANCE']) return r['ALCANCE'];
          for (const key in r) {
            if (key.toLowerCase().includes('alcance') || key.toLowerCase().includes('reach')) {
              return r[key];
            }
          }
          return '0';
        };
        const nome = (row['NOME DO ANÚNCIO'] || '').trim();
        if (!nome) continue;

        const investimento = parseCurrency(row['Valor Gasto'] || '0');
        const impressoes = parseNumber(row['Impressões'] || '0');
        const alcance = parseNumber(getAlcance(row));
        const view3s = parseNumber(row['View 3s'] || '0');
        const thruplays = parseNumber(row['Thruplays'] || '0');
        const thumbnail = (row['Creative Thumbnail'] || '').trim();
        const link = (row['Creative Instagram Permalink'] || '').trim();

        const key = `${funnel}-${nome}`;

        if (!creativesMap.has(key)) {
          creativesMap.set(key, {
            nome,
            thumbnail,
            link,
            investimento: 0,
            cliques: 0,
            impressoes: 0,
            alcance: 0,
            view3s: 0,
            view25: 0,
            thruplays: 0,
            visitasPerfil: 0,
            leads: 0,
            mqls: 0,
            ingressos: cadeirasPorFunilNome[funnel][nome] || 0,
            funnel,
            pesquisa: []
          });
        }

        const ad = creativesMap.get(key)!;
        ad.investimento += investimento;
        ad.impressoes += impressoes;
        ad.alcance += alcance;
        ad.view3s += view3s;
        ad.thruplays += thruplays;
        
        if (!ad.thumbnail && thumbnail) ad.thumbnail = thumbnail;
        if (!ad.link && link) ad.link = link;
      }
    };

    processRows(metData, 'meteorico');
    processRows(vdData, 'venda-direta');
    processRows(gdData, 'geracao-demanda');

    return Array.from(creativesMap.values());
  } catch (err) {
    console.error("Error fetching creatives data:", err);
    return [];
  }
}

export async function fetchPesquisaData(dashboardId: DashboardId): Promise<PesquisaRow[]> {
  try {
    const urls = DASHBOARDS[dashboardId];
    if (!urls) throw new Error("Dashboard not found");

    return fetch(`/api/csv?url=${encodeURIComponent(urls.GERAL_CSV_URL)}`)
      .then(r => r.ok ? r.text() : "")
      .then(text => {
        if (!text) return [];
        return new Promise<PesquisaRow[]>((resolve) => {
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const mapped = results.data.map((row: any) => ({
                data_hora: row['data_hora'] || '',
                nome: row['nome'] || '',
                email: row['email'] || '',
                numero: row['numero'] || '',
                renda: row['renda'] || '',
                escolaridade: row['escolaridade'] || '',
                atuacao: row['atuacao'] || '',
                estado_civil: row['estado_civil'] || '',
                tempo_wendell: row['tempo_wendell'] || '',
                tags: row['tags'] || '',
                investimento: row['investimento'] || '',
                experiencia: row['experiencia'] || '',
                impedimento: row['impedimento'] || '',
                clint: row['clint'] || '',
                origem: row['origem'] || '',
                utm_source: row['utm_source'] || '',
                utm_medium: row['utm_medium'] || '',
                utm_campaign: row['utm_campaign'] || '',
                utm_content: row['utm_content'] || '',
                utm_term: row['utm_term'] || '',
                acao: row['acao'] || ''
              }));
              resolve(mapped);
            },
            error: (err) => {
              console.error("Papa parse error", err);
              resolve([]);
            }
          });
        });
      });
  } catch (err) {
    console.error("Error fetching pesquisa data:", err);
    return [];
  }
}

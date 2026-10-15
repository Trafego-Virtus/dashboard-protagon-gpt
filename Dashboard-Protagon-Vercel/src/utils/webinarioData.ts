import Papa from 'papaparse';
import { DASHBOARDS } from './dashboardSources';
import { parsePublishedTabs, resolveGeralUrl } from './publishedTabs';

// PRO-WEB: abas conferidas na publicação web em 15/10/2026.
export const WEBINARIO_SOURCE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQjF-PCNOqWQZe3Ufy8xE0nhWslTONvTtDlK3DPjQVzeXRqxgrjQkEQst5N-tb7yxCQ0Xq1ieeOHhTn';
const csvUrl = (gid: string) => `${WEBINARIO_SOURCE}/pub?output=csv&gid=${gid}`;

export interface WebinarioRawData {
  geral: any[];
  captura: any[];
  ingressos: any[];
  quiz?: any[];
}

export async function fetchWebinarioData(forceRefresh = false): Promise<WebinarioRawData> {
  const refresh = forceRefresh ? `&refresh=${Date.now()}` : '';
  const request = (url: string) => fetch(`/api/csv?url=${encodeURIComponent(url)}${refresh}`, { cache: 'no-store' });
  const fetchCsv = async (url: string, label: string, requiredFields: string[] = []) => {
    const response = await request(url);
    if (!response.ok) throw new Error(`Não foi possível ler ${label}. Tente atualizar novamente.`);
    const text = await response.text();
    if (/^\s*(?:<!doctype html|<html)/i.test(text)) {
      throw new Error(`${label} retornou uma página de erro em vez dos dados.`);
    }
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: header => header.trim(),
    });
    if (requiredFields.some(field => !parsed.meta.fields?.includes(field))) {
      throw new Error(`${label} está indisponível ou sem as colunas necessárias (${requiredFields.join(', ')}).`);
    }
    if (parsed.errors.some(error => error.type === 'Quotes')) {
      throw new Error(`${label} retornou um CSV incompleto. Tente atualizar novamente.`);
    }
    return parsed.data;
  };

  // Se uma aba for recriada, acompanhe seu novo ID. Nunca leia OFF - GERAL.
  const indexResponse = await request(`${WEBINARIO_SOURCE}/pubhtml`).catch(() => null);
  const tabs = indexResponse?.ok ? parsePublishedTabs(await indexResponse.text()) : [];
  const resolveTab = (name: string, fallbackGid: string) => {
    const tab = tabs.find(tab => tab.name.toLowerCase() === name.toLowerCase());
    if (!tab && tabs.length) throw new Error(`A aba ${name} não está publicada na PRO-WEB.`);
    return csvUrl(tab?.gid || fallbackGid);
  };
  const geralUrl = resolveGeralUrl(csvUrl('0'), tabs);
  const capturaUrl = resolveTab('MetaAds_Dados_Performance_webinario', '680936326');
  const quizUrl = resolveTab('INSCRITOS QUIZ', '1711648297');

  // A PRO-WEB centraliza leads, anúncios e quiz. Ingressos continuam nas praças;
  // São Paulo/Goiânia mantêm a regra existente de não contabilizar vendas.
  const ticketSources = ['protagon-joinville', 'protagon-cuiaba', 'protagon-porto-alegre'] as const;
  const [geral, captura, quiz, tickets] = await Promise.all([
    fetchCsv(geralUrl, 'PRO-WEB / GERAL', ['data_hora', 'email']),
    fetchCsv(capturaUrl, 'PRO-WEB / MetaAds_Dados_Performance_webinario', ['Data', 'Valor Gasto']),
    fetchCsv(quizUrl, 'PRO-WEB / INSCRITOS QUIZ', ['email']),
    Promise.all(ticketSources.map(city => fetchCsv(DASHBOARDS[city].INGRESSOS_CSV_URL, `Ingressos / ${city}`))),
  ]);
  const isRealRecord = (row: Record<string, string>) => {
    if (/^(1|true|sim)$/i.test(String(row.deleted || '').trim())) return false;
    const email = String(row.email || row.Email || row['E-mail'] || '').trim().toLowerCase();
    const name = String(row.nome || row.Nome || row.Fn || row.full_name || '').trim().toLowerCase();
    const product = String(row['Produto Comprado'] || row.Produto || '').trim().toLowerCase();
    const date = String(row['Data Compra'] || row.data_hora || '').trim();
    return !email.includes('teste@') && email !== 'teste' && name !== 'teste'
      && !name.includes('<test lead:') && product !== 'teste'
      && !date.includes('1900') && !date.includes('01/01/00');
  };
  return {
    geral: geral.filter(isRealRecord),
    captura,
    quiz: quiz.filter(isRealRecord),
    ingressos: tickets.flat().filter(isRealRecord),
  };
}

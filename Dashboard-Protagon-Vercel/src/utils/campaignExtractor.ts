import { CampanhaVinculada, FunilType } from '../types/testes';
import { DASHBOARDS } from './dataFetching';
import { DashboardId } from './api';
import Papa from 'papaparse';

// Cache em memória de campanhas ativas para resposta instantânea
interface CacheEntry {
  data: CampanhaVinculada[];
  timestamp: number;
}
const campaignsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutos

/**
 * Busca e extrai SOMENTE os nomes das campanhas ativas, sem computar métricas pesadas,
 * otimizando o carregamento e a responsividade da aplicação.
 */
export async function getCampaignsForFunil(
  funil?: FunilType, 
  praca?: string
): Promise<CampanhaVinculada[]> {
  const cacheKey = `${funil || 'all'}_${praca || 'all'}`;
  const now = Date.now();
  const cached = campaignsCache.get(cacheKey);
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  try {
    // 1. Define as praças a consultar
    const pracasToFetch: DashboardId[] = [];
    if (!praca || praca === 'Todas as Praças' || praca === 'all') {
      pracasToFetch.push('protagon-joinville', 'protagon-cuiaba', 'protagon-porto-alegre', 'protagon-sao-paulo', 'protagon-goiania');
    } else if (praca.toLowerCase().includes('joinville')) {
      pracasToFetch.push('protagon-joinville');
    } else if (praca.toLowerCase().includes('cuiab')) {
      pracasToFetch.push('protagon-cuiaba');
    } else if (praca.toLowerCase().includes('porto') || praca.toLowerCase().includes('alegre')) {
      pracasToFetch.push('protagon-porto-alegre');
    } else if (praca.toLowerCase().includes('sao paulo') || praca.toLowerCase().includes('são paulo') || praca.toLowerCase().includes('sp')) {
      pracasToFetch.push('protagon-sao-paulo');
    } else if (praca.toLowerCase().includes('goi') || praca.toLowerCase().includes('goiania') || praca.toLowerCase().includes('goiânia')) {
      pracasToFetch.push('protagon-goiania');
    } else {
      pracasToFetch.push('protagon-joinville', 'protagon-cuiaba', 'protagon-porto-alegre', 'protagon-sao-paulo', 'protagon-goiania');
    }

    // 2. Coleta apenas as URLs das planilhas de tráfego necessárias (evita carregar CRM/Geral/Ingressos)
    const urlsToFetch: string[] = [];
    for (const p of pracasToFetch) {
      const d = DASHBOARDS[p];
      if (!d) continue;

      if (funil === 'geracao-demanda-form' || funil === 'geracao-demanda-captura') {
        if (d.GD_CSV_URL) urlsToFetch.push(d.GD_CSV_URL);
        if (d.GD_V2_CSV_URL) urlsToFetch.push(d.GD_V2_CSV_URL);
      } else if (funil === 'venda-direta') {
        if (d.VD_CSV_URL) urlsToFetch.push(d.VD_CSV_URL);
      } else if (funil === 'meteorico') {
        if (d.MET_CSV_URL) urlsToFetch.push(d.MET_CSV_URL);
      } else {
        // Padrão ou todos: busca GD, VD e DC
        if (d.GD_CSV_URL) urlsToFetch.push(d.GD_CSV_URL);
        if (d.VD_CSV_URL) urlsToFetch.push(d.VD_CSV_URL);
        if (d.DC_CSV_URL) urlsToFetch.push(d.DC_CSV_URL);
      }
    }

    // Remove URLs duplicadas
    const uniqueUrls = Array.from(new Set(urlsToFetch));

    // 3. Baixa e analisa apenas as planilhas de tráfego de forma paralela e rápida
    const parsePromises = uniqueUrls.map(async (url) => {
      try {
        const proxyUrl = `/api/csv?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) return [];
        const text = await res.text();
        if (!text || text.length < 50) return [];
        
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true
        });
        return (parsed.data as any[]) || [];
      } catch (err) {
        console.warn('Erro ao carregar planilha de campanhas:', url, err);
        return [];
      }
    });

    const allSheetsData = await Promise.all(parsePromises);

    // 4. Mapeia cada campanha para determinar o status mais recente
    const campStatusMap = new Map<string, { latestDate: string; status: string }>();

    for (const rows of allSheetsData) {
      for (const row of rows) {
        const name = (
          row['NOME DA CAMPANHA'] ||
          row['Nome da campanha'] ||
          row['Nome da Campanha'] ||
          row['campaign_name'] ||
          row['Campaign name'] ||
          row['CAMPANHA'] ||
          ''
        ).trim();

        if (!name || name.length < 3) continue;

        // Filtro específico de subfunil se aplicável
        const nameLower = name.toLowerCase();
        const subfunil = (row['Subfunil'] || '').toLowerCase();

        if (funil === 'geracao-demanda-form') {
          if (subfunil.includes('captura') || nameLower.includes('captura') || nameLower.includes('vd_')) {
            continue;
          }
        } else if (funil === 'geracao-demanda-captura') {
          if (subfunil.includes('nativo') || nameLower.includes('form') || nameLower.includes('forms-nativo')) {
            continue;
          }
        }

        const statusRaw = (
          row['STATUS CAMPANHA'] || 
          row['Status da campanha'] || 
          row['Status da veiculação'] || 
          row['Status'] || 
          row['Campaign Status'] || 
          row['Ad set delivery'] || 
          ''
        ).trim().toUpperCase();

        const dateStr = (row['Data'] || row['Reporting Starts'] || '').trim();

        if (!campStatusMap.has(name)) {
          campStatusMap.set(name, { latestDate: dateStr, status: statusRaw });
        } else {
          const existing = campStatusMap.get(name)!;
          // Se encontramos ACTIVE na linha ou se a linha é mais recente
          if (statusRaw === 'ACTIVE' || statusRaw === 'ATIVA' || statusRaw === 'ATIVO') {
            existing.status = statusRaw;
          } else if (dateStr && existing.latestDate) {
            const partsA = dateStr.split('/').map(Number);
            const partsB = existing.latestDate.split('/').map(Number);
            if (partsA.length === 3 && partsB.length === 3) {
              const timeA = new Date(partsA[2], partsA[1] - 1, partsA[0]).getTime();
              const timeB = new Date(partsB[2], partsB[1] - 1, partsB[0]).getTime();
              if (timeA >= timeB) {
                existing.latestDate = dateStr;
                existing.status = statusRaw;
              }
            }
          }
        }
      }
    }

    // 5. Filtra SOMENTE as ativas e extrai seus nomes
    const activeCampaigns: CampanhaVinculada[] = [];

    campStatusMap.forEach((val, name) => {
      const statusUpper = val.status.toUpperCase();
      const isPausada = statusUpper.includes('PAUSAD') || 
                        statusUpper.includes('PAUSED') || 
                        statusUpper.includes('OFF') || 
                        statusUpper.includes('DESATIV') ||
                        statusUpper.includes('ARCHIV') ||
                        statusUpper.includes('DELET');

      const isAtiva = (statusUpper.includes('ACTIV') || statusUpper.includes('ATIV')) && !isPausada;

      if (isAtiva) {
        activeCampaigns.push({
          id: name,
          nome: name,
          status: 'ATIVA',
          gasto: 0,
          cliques: 0,
          mqls: 0,
          ctr: 0,
          cpm: 0,
          cpc: 0,
          custoPorMql: 0
        });
      }
    });

    // Ordena em ordem alfabética para facilitar a busca e seleção
    activeCampaigns.sort((a, b) => a.nome.localeCompare(b.nome));

    // Salva no cache
    campaignsCache.set(cacheKey, { data: activeCampaigns, timestamp: now });

    return activeCampaigns;
  } catch (error) {
    console.error('Erro ao extrair nomes das campanhas ativas:', error);
    return [];
  }
}

import { parseDate, parseCurrency, parseNumber, isRendaAcima5k } from './format';
import { RawDashboardData } from './dataFetching';
import { deduplicateLeads } from './leadData';
import { isAfter, isBefore, isEqual, parseISO } from 'date-fns';

export interface ProcessedMetrics {
  visaoGeral: {
    chartData: any[];
  };
  ticketsByTypes: {
    visaoGeral: { executivo: number; vip: number; diamond: number; semIdentificacao: number };
    demanda: { executivo: number; vip: number; diamond: number; semIdentificacao: number };
    vendaDireta: { executivo: number; vip: number; diamond: number; semIdentificacao: number };
    meteorico: { executivo: number; vip: number; diamond: number; semIdentificacao: number };
    distribuicao: { executivo: number; vip: number; diamond: number; semIdentificacao: number };
  };
  // Visão Geral
  investimentoTotal: number;
  faturamentoTotal: number;
  totalIngressos: number;
  ingressosVendidos: number;
  ingressosSemRastreamento: number;
  
  
  // Funil specifics
  meteorico: {
    investimento: number;
    faturamento: number;
    ingressos: number;
    leads: number;
    mqls: number;
    impressoes: number;
    cliques: number;
    alcance: number;
    pageViews: number;
    ctr: number;
    cpc: number;
    connectRate: number;
    conversaoPagina: number;
    frequencia: number;
    chartData: any[];
    leadsData?: any[];
    creativesByPage?: { [page: string]: any[] };
    funilPages?: Array<{
      page: string;
      investimento: number;
      impressoes: number;
      cliques: number;
      pageViews: number;
      leads: number;
      mqls: number;
      cpm: number;
      ctr: number;
      cpc: number;
      connectRate: number;
      conversaoPagina: number;
      custoPorLead: number;
      qualificacao: number;
      cpmql: number;
    }>;
    publicos?: Array<{
      nome: string;
      investimento: number;
      impressoes: number;
      cliques: number;
      leads: number;
      custoPorLead: number;
      mqls: number;
      custoPorMql: number;
      qualificacao: number;
      pesquisa: any[];
    }>;
    leadsByPage?: { [page: string]: any[] };
    sendflow?: {
      hasData: boolean;
      totalPessoas: number;
      custoPorPessoa: number;
      taxaEntrada: number;
      chartData: Array<{
        date: string;
        pessoasNoGrupo: number;
        custoPorPessoaNoGrupo: number;
        taxaEntrada: number;
        investimento: number;
      }>;
    };
  };
  demanda: {
    investimento: number;
    faturamento: number;
    ingressos: number;
    ingressosOrganico: number;
    leads: number;
    mqls: number;
    // Specific Demanda requirements
    formNativo: {
      investimento: number;
      leads: number;
      mqls: number;
      ingressos: number;
      chartData: any[];
    };
    captura: {
      investimento: number;
      leads: number;
      mqls: number;
      ingressos: number;
      chartData: any[];
      conversaoDiariaPaginas: { data: any[]; pgs: string[]; averages: { [pg: string]: number } };
    };
    inlead: {
      investimento: number;
      leads: number;
      mqls: number;
      ingressos: number;
      chartData: any[];
      pagesBreakdown?: any[];
    };
    estudoPublico: any[];
  };
  vendaDireta: {
    investimento: number;
    faturamento: number;
    ingressos: number;
    ingressosOrganico: number;
    ingressosTrafego: number;
    leadsTrafego: number;
    leadsTotal: number;
    mqls: number;
    chartData: any[];
  };
  distribuicao: {
    investimento: number;
    chartData: any[];
    etapas: Record<string, {
      nome: string;
      investimento: number;
      impressoes: number;
      alcance: number;
      view3s: number;
      view25: number;
      view50: number;
      view75: number;
      view95: number;
      chartData: any[];
    }>;
  };
  distribuicaoKlt: {
    investimento: number;
    chartData: any[];
    etapas: Record<string, {
      nome: string;
      investimento: number;
      impressoes: number;
      alcance: number;
      view3s: number;
      view25: number;
      view50: number;
      view75: number;
      view95: number;
      chartData: any[];
    }>;
  };
  distribuicaoCorredor: {
    investimento: number;
    chartData: any[];
    etapas: Record<string, {
      nome: string;
      investimento: number;
      impressoes: number;
      alcance: number;
      view3s: number;
      view25: number;
      view50: number;
      view75: number;
      view95: number;
      chartData: any[];
    }>;
  };
  distribuicaoRemarketing: {
    investimento: number;
    chartData: any[];
    etapas: Record<string, {
      nome: string;
      investimento: number;
      impressoes: number;
      alcance: number;
      view3s: number;
      view25: number;
      view50: number;
      view75: number;
      view95: number;
      chartData: any[];
    }>;
  };
  
  creativesForm: any[];
  creativesCaptura: any[];
  creativesInlead: any[];
  creativesVD: any[];
  creativesMET: any[];
  creativesDC: any[];
  creativesDcKlt: any[];
  creativesDcCorredor: any[];
  creativesDcRemarketing: any[];
  pesquisa: any[];
  ingressosData: any[];
}

const isWithinDateRange = (dateStr: string, start: Date, end: Date) => {
  const parsed = parseDate(dateStr);
  if (!parsed) return false;
  const t = parsed.getTime();
  return t >= start.getTime() && t <= end.getTime();
};


const formatDateToString = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Special exception for Goiânia campaign C016 which was accidentally named with [PG04]
 * instead of [PG01]:
 * C016 - [METEÓRICO] [PRO-E038-GOI] [LEADS] [ABO] [QUENTE] [TESTE-CRIATIVOS] [ESTÁTICOS] [PG04] [GOIAS] [CAPTURA] [1-X-1] Estrutura Padrão de Testes - 09.10.26
 */
export const isC016GoianiaMistagged = (str: string): boolean => {
  if (!str) return false;
  let decoded = str;
  try {
    decoded = decodeURIComponent(str);
  } catch (_) {}
  const upper = (str + ' ' + decoded).toUpperCase();
  return upper.includes('C016') && upper.includes('PRO-E038-GOI') && (upper.includes('PG04') || upper.includes('PG-04') || upper.includes('PG 04') || upper.includes('09.10.26'));
};

/**
 * Detects if a lead belongs to the Meteórico funnel across all cities/praças.
 * Supports explicit Atribuição / Subfunil, utm_campaign, acao, and pageurl.
 */
export const isLeadMeteorico = (r: any): boolean => {
  if (!r) return false;
  const atr = String(r['Atribuição'] || r['atribuição'] || r['Atribuicao'] || r['atribuicao'] || '').toLowerCase();
  if (atr.includes('meteórico') || atr.includes('meteorico')) return true;
  if (atr.trim()) return false;
  
  const sub = String(r['Subfunil'] || r['subfunil'] || r['sub_funil'] || r['Tipo de Funil'] || r['tipo de funil'] || '').toLowerCase();
  if (sub.includes('meteórico') || sub.includes('meteorico')) return true;
  
  const camp = String(r['utm_campaign'] || r['Utm Campaign'] || r['UTM Campaign'] || r['campaign'] || '').toLowerCase();
  if (camp.includes('meteórico') || camp.includes('meteorico')) return true;
  
  const acao = String(r['acao'] || r['Acao'] || r['Ação'] || r['ação'] || '').toLowerCase();
  if (acao.includes('meteórico') || acao.includes('meteorico')) return true;

  const pageurl = String(r['pageurl'] || r['Page URL'] || r['page_url'] || r['PageUrl'] || '').toLowerCase();
  if (pageurl.includes('meteorico') || pageurl.includes('meteórico')) return true;

  const tags = String(r['tags'] || r['Tags'] || '').toLowerCase();
  if (tags.includes('meteórico') || tags.includes('meteorico')) return true;

  const prod = String(r['produto'] || r['Produto'] || '').toLowerCase();
  if (prod.includes('meteórico') || prod.includes('meteorico')) return true;

  return false;
};

/**
 * Extracts the clean audience/publico name from an ad set name or utm_term.
 * E.g. "00 - [17] [IG] [AUTO] [PERSONALIZADO] Envolvimento 365D [25 - 54] [GOIAS] - 09.10.26" -> "Envolvimento 365D"
 */
export const extractPublicoName = (str: string): string => {
  if (!str) return '';
  let clean = str.trim();
  // Decode if URL encoded
  try {
    clean = decodeURIComponent(clean);
  } catch (_) {}

  // Match after known bracket prefixes like [PERSONALIZADO], [ABERTO], [SEMELHANTE], etc.
  const matchKnown = clean.match(/\[(?:PERSONALIZADO|ABERTO|SEMELHANTE|INTERESSE|INTERESSES|LOOKALIKE|CUSTOM|PURCHASERS)\]\s*([^\[\]]+?)\s*\[/i);
  if (matchKnown && matchKnown[1].trim()) {
    return matchKnown[1].trim();
  }

  // Look for text between closing bracket and opening bracket: `] text [`
  const allMatches = [...clean.matchAll(/\]\s*([^\[\]]+?)\s*\[/g)];
  for (const m of allMatches) {
    const text = m[1].trim();
    if (text.length > 2 && !/^(IG|FB|AUTO|MANUAL|CBO|ABO|\d+)$/i.test(text)) {
      return text;
    }
  }

  // If ends with date after a dash: `] Text - DD.MM.YY`
  const matchTrailing = clean.match(/\]\s*([^\[\]]+?)\s*(?:-\s*\d{2}\.\d{2}\.\d{2}|$)/);
  if (matchTrailing && matchTrailing[1].trim()) {
    const text = matchTrailing[1].trim();
    if (text.length > 2 && !/^(IG|FB|AUTO|MANUAL|CBO|ABO|\d+)$/i.test(text)) {
      return text;
    }
  }

  return clean;
};

export function processDashboardMetrics(
  rawData: RawDashboardData,
  startDateStr: string,
  endDateStr: string,
  audienceTemp: 'all' | 'quente' | 'frio' = 'all',
  meteoricoCampType: 'all' | 'escala' | 'teste' = 'all'
): ProcessedMetrics {
  if (!startDateStr || !endDateStr) return {} as ProcessedMetrics;
  
  // Parse 'yyyy-MM-dd' locally to avoid UTC timezone offsets shifting the day backwards
  const parseLocalISO = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return parseISO(dateStr); // Fallback
  };
  
  const start = parseLocalISO(startDateStr);
  const end = parseLocalISO(endDateStr);
  // Ensure the end date covers the full day up to 23:59:59.999
  end.setHours(23, 59, 59, 999);


  const filterAudienceGeral = (r: any) => {
    if (audienceTemp === 'all') return true;
    const camp = String(r['utm_campaign'] || '').toLowerCase();
    if (audienceTemp === 'quente') return camp.includes('quente');
    if (audienceTemp === 'frio') return camp.includes('frio');
    return true;
  };

  const filterAudienceTraffic = (r: any) => {
    if (audienceTemp === 'all') return true;
    const camp = String(r['NOME DA CAMPANHA'] || r['Nome da Campanha'] || '').toLowerCase();
    if (audienceTemp === 'quente') return camp.includes('quente');
    if (audienceTemp === 'frio') return camp.includes('frio');
    return true;
  };
  
  const filterAudienceIngressos = (r: any) => {
    if (audienceTemp === 'all') return true;
    const camp = String(r['utm_campaign'] || '').toLowerCase();
    if (audienceTemp === 'quente') return camp.includes('quente');
    if (audienceTemp === 'frio') return camp.includes('frio');
    return true;
  };

  const filterMeteoricoTrafficCamp = (r: any) => {
    if (meteoricoCampType === 'all') return true;
    const camp = String(r['NOME DA CAMPANHA'] || r['Nome da Campanha'] || '').toUpperCase();
    if (meteoricoCampType === 'escala') return camp.includes('ESCALA');
    if (meteoricoCampType === 'teste') return camp.includes('TESTE');
    return true;
  };

  const filterMeteoricoLeadCamp = (r: any) => {
    if (meteoricoCampType === 'all') return true;
    const camp = String(r['utm_campaign'] || '').toUpperCase();
    if (meteoricoCampType === 'escala') return camp.includes('ESCALA');
    if (meteoricoCampType === 'teste') return camp.includes('TESTE');
    return true;
  };

  const fGeral = deduplicateLeads(rawData.geral.filter(row =>
    isWithinDateRange(row['data_hora'] || '', start, end)
  ));
  const fMet = rawData.met.filter(r => isWithinDateRange(r['Data'] || '', start, end) && filterMeteoricoTrafficCamp(r));
  const fVd = rawData.vd.filter(r => isWithinDateRange(r['Data'] || '', start, end));
  const fGd = rawData.gd.filter(r => isWithinDateRange(r['Data'] || '', start, end));
  
  const parseDCAtribuicao = (r: any) => {
    let atrRaw = String(r['Atribuição'] || r['atribuição'] || r['ATRIBUIÇÃO'] || r['atribuicao'] || '').trim();
    const atrLower = atrRaw.toLowerCase();
    
    if (atrLower.includes('ensino') || atrLower.includes('aprendizagem')) return 'Ensino/Aprendizagem';
    else if (atrLower.includes('remarketing')) return 'Remarketing';
    else if (atrLower.includes('descoberta')) return 'Descoberta';
    else if (atrLower.includes('confiança') || atrLower.includes('confianca')) return 'Confiança';
    else if (atrLower.includes('live avulsa') || String(r['Campanha'] || '').toLowerCase().includes('live avulsa') || String(r['Conjunto de anúncios'] || '').toLowerCase().includes('live avulsa')) return 'Live Avulsa';
    else if (atrRaw) return atrRaw;
    return 'Sem Atribuição';
  };

  const mappedDc = (rawData.dc || []).map(r => ({
    ...r,
    'Atribuição': parseDCAtribuicao(r)
  }));

  const mappedDcCorredor = (rawData.dcCorredor || []).map(r => ({
    ...r,
    'Atribuição': parseDCAtribuicao(r)
  }));

  const isTestOrDummyRow = (r: any) => {
    if (!r || typeof r !== 'object') return true;
    const email = String(r['email'] || r['Email'] || r['E-mail'] || '').trim().toLowerCase();
    if (email.includes('teste@') || email === 'teste') return true;
    const name = String(r['nome'] || r['Fn'] || r['Nome'] || '').trim().toLowerCase();
    if (name === 'teste') return true;
    const prod = String(r['Produto Comprado'] || r['Produto'] || '').trim().toLowerCase();
    if (prod === 'teste') return true;
    const dateVal = String(r['Data Compra'] || r['data_hora'] || r['Data'] || '').trim();
    if (dateVal.includes('1900') || dateVal.includes('01/01/00')) return true;
    return false;
  };

  const fDc = mappedDc.filter(r => isWithinDateRange(r['Data'] || '', start, end));
  const fDcKlt = fDc.filter(r => (r['Atribuição'] || '').toLowerCase() !== 'remarketing');
  const fDcRemarketing = fDc.filter(r => (r['Atribuição'] || '').toLowerCase() === 'remarketing');
  const fDcCorredor = mappedDcCorredor.filter(r => isWithinDateRange(r['Data'] || '', start, end));
  const fIngressos = (rawData.ingressos || []).filter(r => !isTestOrDummyRow(r) && isWithinDateRange(r['Data Compra'] || r['Data'] || '', start, end));
  const fSendflow = (rawData.sendflowTrafego || []).filter(r => isWithinDateRange(r['data'] || r['Data'] || '', start, end));

  const countTicketTypes = (ingressosList: any[]) => {
    let executivo = 0;
    let vip = 0;
    let diamond = 0;
    let semIdentificacao = 0;
    
    ingressosList.forEach(r => {
      // Procurar em todas as chaves (ignorando maiúsculas/minúsculas)
      let tipo = '';
      for (const key of Object.keys(r)) {
        if (key.toLowerCase().includes('tipo') && key.toLowerCase().includes('ingresso')) {
          tipo = String(r[key]).toLowerCase();
          break;
        }
      }
      
      // Fallback pra nome do produto se não achar a coluna
      if (!tipo || tipo.trim() === '') {
        tipo = String(r['Produto Comprado'] || r['Produto'] || '').toLowerCase();
      }

      if (tipo.includes('executivo')) {
        executivo++;
      } else if (tipo.includes('vip')) {
        vip++;
      } else if (tipo.includes('diamond')) {
        diamond++;
      } else {
        semIdentificacao++;
      }
    });
    return { executivo, vip, diamond, semIdentificacao };
  };

  
  // Visao Geral
  const ingressosVendidos = fIngressos.length;
  const totalIngressos = fIngressos.length;
  const ingressosSemRastreamento = fIngressos.filter(r => (r['Atribuição'] || '').toLowerCase().includes('sem rastreamento')).length;
  
  const invDC = fDc.reduce((acc, r) => acc + parseCurrency(r['Valor Gasto'] || '0'), 0);
  const invDCKlt = fDcKlt.reduce((acc, r) => acc + parseCurrency(r['Valor Gasto'] || '0'), 0);
  const invDCRemarketing = fDcRemarketing.reduce((acc, r) => acc + parseCurrency(r['Valor Gasto'] || '0'), 0);
  const invDCCorredor = fDcCorredor.reduce((acc, r) => acc + parseCurrency(r['Valor Gasto'] || '0'), 0);
  
  const etapas = {};
  fDc.forEach(r => {
    const atr = String(r['Atribuição'] || '').trim() || 'Sem Atribuição';
    if (!etapas[atr]) {
      etapas[atr] = {
        nome: atr,
        investimento: 0,
        impressoes: 0,
        alcance: 0,
        view3s: 0,
        view25: 0,
        view50: 0,
        view75: 0,
        view95: 0,
        rawData: []
      };
    }
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

    etapas[atr].investimento += parseCurrency(r['Valor Gasto'] || '0');
    etapas[atr].impressoes += parseNumber(r['Impressões'] || '0');
    etapas[atr].alcance += parseNumber(getAlcance(r));
    etapas[atr].view3s += parseNumber(r['View 3s'] || '0');
    etapas[atr].view25 += parseNumber(r['View 25%'] || '0');
    etapas[atr].view50 += parseNumber(r['View 50%'] || r['Reproduções a 50%'] || r['Reproduções do vídeo a 50%'] || r['Reproduções de vídeo a 50%'] || '0');
    etapas[atr].view75 += parseNumber(r['View 75%'] || r['Reproduções a 75%'] || r['Reproduções do vídeo a 75%'] || r['Reproduções de vídeo a 75%'] || '0');
    etapas[atr].view95 += parseNumber(r['View 95%'] || r['View 100%'] || r['Reproduções a 95%'] || r['Reproduções do vídeo a 95%'] || r['Reproduções de vídeo a 95%'] || r['Reproduções a 100%'] || r['Reproduções do vídeo a 100%'] || r['Reproduções de vídeo a 100%'] || '0');
    etapas[atr].rawData.push(r);
  });

  const etapasKlt = {};
  fDcKlt.forEach(r => {
    const atr = String(r['Atribuição'] || '').trim() || 'Sem Atribuição';
    if (!etapasKlt[atr]) {
      etapasKlt[atr] = {
        nome: atr,
        investimento: 0,
        impressoes: 0,
        alcance: 0,
        view3s: 0,
        view25: 0,
        view50: 0,
        view75: 0,
        view95: 0,
        rawData: []
      };
    }
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

    etapasKlt[atr].investimento += parseCurrency(r['Valor Gasto'] || '0');
    etapasKlt[atr].impressoes += parseNumber(r['Impressões'] || '0');
    etapasKlt[atr].alcance += parseNumber(getAlcance(r));
    etapasKlt[atr].view3s += parseNumber(r['View 3s'] || '0');
    etapasKlt[atr].view25 += parseNumber(r['View 25%'] || '0');
    etapasKlt[atr].view50 += parseNumber(r['View 50%'] || r['Reproduções a 50%'] || r['Reproduções do vídeo a 50%'] || r['Reproduções de vídeo a 50%'] || '0');
    etapasKlt[atr].view75 += parseNumber(r['View 75%'] || r['Reproduções a 75%'] || r['Reproduções do vídeo a 75%'] || r['Reproduções de vídeo a 75%'] || '0');
    etapasKlt[atr].view95 += parseNumber(r['View 95%'] || r['View 100%'] || r['Reproduções a 95%'] || r['Reproduções do vídeo a 95%'] || r['Reproduções de vídeo a 95%'] || r['Reproduções a 100%'] || r['Reproduções do vídeo a 100%'] || r['Reproduções de vídeo a 100%'] || '0');
    etapasKlt[atr].rawData.push(r);
  });

  const etapasRemarketing = {};
  fDcRemarketing.forEach(r => {
    const atr = String(r['Atribuição'] || '').trim() || 'Sem Atribuição';
    if (!etapasRemarketing[atr]) {
      etapasRemarketing[atr] = {
        nome: atr,
        investimento: 0,
        impressoes: 0,
        alcance: 0,
        view3s: 0,
        view25: 0,
        view50: 0,
        view75: 0,
        view95: 0,
        rawData: []
      };
    }
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

    etapasRemarketing[atr].investimento += parseCurrency(r['Valor Gasto'] || '0');
    etapasRemarketing[atr].impressoes += parseNumber(r['Impressões'] || '0');
    etapasRemarketing[atr].alcance += parseNumber(getAlcance(r));
    etapasRemarketing[atr].view3s += parseNumber(r['View 3s'] || '0');
    etapasRemarketing[atr].view25 += parseNumber(r['View 25%'] || '0');
    etapasRemarketing[atr].view50 += parseNumber(r['View 50%'] || r['Reproduções a 50%'] || r['Reproduções do vídeo a 50%'] || r['Reproduções de vídeo a 50%'] || '0');
    etapasRemarketing[atr].view75 += parseNumber(r['View 75%'] || r['Reproduções a 75%'] || r['Reproduções do vídeo a 75%'] || r['Reproduções de vídeo a 75%'] || '0');
    etapasRemarketing[atr].view95 += parseNumber(r['View 95%'] || r['View 100%'] || r['Reproduções a 95%'] || r['Reproduções do vídeo a 95%'] || r['Reproduções de vídeo a 95%'] || r['Reproduções a 100%'] || r['Reproduções do vídeo a 100%'] || r['Reproduções de vídeo a 100%'] || '0');
    etapasRemarketing[atr].rawData.push(r);
  });

  const etapasCorredor = {};
  fDcCorredor.forEach(r => {
    const atr = String(r['Atribuição'] || '').trim() || 'Sem Atribuição';
    if (!etapasCorredor[atr]) {
      etapasCorredor[atr] = {
        nome: atr,
        investimento: 0,
        impressoes: 0,
        alcance: 0,
        view3s: 0,
        view25: 0,
        view50: 0,
        view75: 0,
        view95: 0,
        rawData: []
      };
    }
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

    etapasCorredor[atr].investimento += parseCurrency(r['Valor Gasto'] || '0');
    etapasCorredor[atr].impressoes += parseNumber(r['Impressões'] || '0');
    etapasCorredor[atr].alcance += parseNumber(getAlcance(r));
    etapasCorredor[atr].view3s += parseNumber(r['View 3s'] || '0');
    etapasCorredor[atr].view25 += parseNumber(r['View 25%'] || '0');
    etapasCorredor[atr].view50 += parseNumber(r['View 50%'] || r['Reproduções a 50%'] || r['Reproduções do vídeo a 50%'] || r['Reproduções de vídeo a 50%'] || '0');
    etapasCorredor[atr].view75 += parseNumber(r['View 75%'] || r['Reproduções a 75%'] || r['Reproduções do vídeo a 75%'] || r['Reproduções de vídeo a 75%'] || '0');
    etapasCorredor[atr].view95 += parseNumber(r['View 95%'] || r['View 100%'] || r['Reproduções a 95%'] || r['Reproduções do vídeo a 95%'] || r['Reproduções de vídeo a 95%'] || r['Reproduções a 100%'] || r['Reproduções do vídeo a 100%'] || r['Reproduções de vídeo a 100%'] || '0');
    etapasCorredor[atr].rawData.push(r);
  });
  
  const investimentoTotal = invDC 
    + invDCCorredor
    + fMet.reduce((acc, r) => acc + parseCurrency(r['Valor Gasto'] || '0'), 0)
    + fVd.reduce((acc, r) => acc + parseCurrency(r['Valor Gasto'] || '0'), 0)
    + fGd.reduce((acc, r) => acc + parseCurrency(r['Valor Gasto'] || '0'), 0);

  const faturamentoTotal = fIngressos.reduce((acc, r) => acc + parseCurrency(r['Fat. Líquido - Principal'] || '0'), 0);

  const getCampaignStr = (row) => {
    if (!row) return '';
    const keys = Object.keys(row);
    
    // 1. Explicitly check for exact known Campaign column names first
    const exactMatches = ['utm campaign', 'utm_campaign', 'campanha', 'nome da campanha', 'campaign name', 'campaign'];
    for (const key of keys) {
      if (exactMatches.includes(key.toLowerCase().trim())) {
        const val = String(row[key]).toLowerCase().trim();
        if (val && !val.includes('http')) return val;
      }
    }

    // 2. Check Column M (index 12) which is usually Utm Campaign
    if (keys.length > 12) {
      const valM = String(row[keys[12]]).toLowerCase().trim();
      if (valM && !valM.includes('http')) return valM;
    }

    // 3. Search all columns for campaign-like patterns to be safe
    for (const key of keys) {
      const val = String(row[key]).toLowerCase().trim();
      if ((val.includes('wc_') || val.includes('pro-') || val.includes('forms-nativo')) && !val.includes('http')) {
        return val;
      }
    }
    
    // Fallback: Use 'acao' if it exists and looks like a commercial/form intent
    const acao = String(row['acao'] || '').toLowerCase().trim();
    if (acao && !acao.includes('http')) {
      if (acao.includes('comercial') || acao.includes('form')) return acao;
    }

    return '';
  };

  // Grouped leads by Atribuição
  const isInlead = (r: any) => {
    const subfunil = (r['Subfunil'] || r['subfunil'] || r['Tipo de Funil'] || r['tipo de funil'] || '').toLowerCase().trim();
    return subfunil.includes('inlead');
  };

  const leadsMet = fGeral.filter(r =>
    isLeadMeteorico(r) &&
    filterMeteoricoLeadCamp(r)
  );
  const leadsDemanda = fGeral.filter(r => {
    if (isLeadMeteorico(r)) return false;
    const atr = (r['Atribuição'] || '').toLowerCase();
    const sub = (r['Subfunil'] || r['subfunil'] || '').toLowerCase();
    return atr.includes('geração de demanda') || atr.includes('geracao de demanda') || sub.includes('inlead');
  });
  
  const allLeadsVD = fGeral.filter(r => {
    if (isLeadMeteorico(r)) return false;
    return (r['Atribuição'] || '').toLowerCase().includes('venda direta');
  });
  const leadsVDTrafego = allLeadsVD.filter(r => {
    const at = (r['Atribuição'] || '').toLowerCase();
    return at.includes('tráfego') || at.includes('trafego') || at.includes('pago');
  });

  const isMqlLead = (r: any) => {
    const isMet = isLeadMeteorico(r);
    
    // For Meteórico: consider MQLs income ranges above R$ 5.000 or clint === 'SIM'
    if (isMet) {
      const rendaVal = r['renda'] || r['Renda'] || r['faturamento'] || r['qual_é_seu_faturamento_mensal_atual?'] || '';
      if (rendaVal && isRendaAcima5k(rendaVal)) return true;
    }
    
    return String(r['clint'] || '').trim().toUpperCase() === 'SIM';
  };

  const getMqls = (leads: any[]) => leads.filter(isMqlLead);
  
  const isCaptura = (r: any) => {
    if (isInlead(r)) return false;
    const subfunil = (r['Subfunil'] || r['subfunil'] || r['Tipo de Funil'] || r['tipo de funil'] || '').toLowerCase().trim();
    if (subfunil.includes('captura')) return true;
    
    // Check acao
    const acao = String(r['acao'] || '').toLowerCase().trim();
    if (acao.includes('captura')) return true;

    const camp = getCampaignStr(r);
    return camp.includes('captura');
  };

  // Form vs Captura split
  const isForm = (r: any) => {
    if (isInlead(r)) return false;
    const subfunil = (r['Subfunil'] || r['subfunil'] || r['Tipo de Funil'] || r['tipo de funil'] || '').toLowerCase().trim();
    if (subfunil.includes('form')) return true;
    
    // Explicitly check acao too, if the system flags it as Formulario
    const acao = String(r['acao'] || '').toLowerCase().trim();
    if (acao.includes('form') && !acao.includes('comercial')) return true;
    
    // Check tags just in case
    const tags = String(r['tags'] || '').toLowerCase().trim();
    if (tags.includes('form')) return true;

    const camp = getCampaignStr(r);
    if (camp.includes('form')) return true;

    // For traffic ads in GD (MetaAds_Dados_Performance_GD*), if it is not captura, default to form
    const isTrafficAd = !!(r['NOME DO ANÚNCIO'] || r['Nome do Anúncio'] || r['ID ANÚNCIO'] || r['Valor Gasto']);
    if (isTrafficAd && !isCaptura(r)) {
      return true;
    }

    return false;
  };
  
  const leadsDemandaForm = leadsDemanda.filter(isForm);
  const leadsDemandaCaptura = leadsDemanda.filter(isCaptura);
  const leadsDemandaInlead = leadsDemanda.filter(isInlead);
  
  // MET
  const invMet = fMet.reduce((acc, r) => acc + parseCurrency(r['Valor Gasto'] || '0'), 0);
  const impressoesMet = fMet.reduce((acc, r) => acc + parseNumber(r['Impressões'] || '0'), 0);
  const cliquesMet = fMet.reduce((acc, r) => acc + parseNumber(r['Cliques'] || r['Cliques no link'] || r['Cliques no Link'] || '0'), 0);
  const alcanceMet = fMet.reduce((acc, r) => acc + parseNumber(r['Alcance'] || r['alcance'] || r['ALCANCE'] || '0'), 0);
  const pageViewsMet = fMet.reduce((acc, r) => acc + parseNumber(r['Visualizações de página de destino'] || r['Page Views'] || r['Pageviews'] || '0'), 0);

  const ctrMet = impressoesMet > 0 ? (cliquesMet / impressoesMet) * 100 : 0;
  const cpcMet = cliquesMet > 0 ? invMet / cliquesMet : 0;
  const connectRateMet = cliquesMet > 0 ? (pageViewsMet / cliquesMet) * 100 : 0;
  const conversaoPaginaMet = pageViewsMet > 0 ? (leadsMet.length / pageViewsMet) * 100 : 0;
  const frequenciaMet = alcanceMet > 0 ? impressoesMet / alcanceMet : 0;

  const fatMet = fIngressos.filter(r => (r['Atribuição'] || '').toLowerCase().includes('meteórico')).reduce((acc, r) => acc + parseCurrency(r['Fat. Líquido - Principal'] || '0'), 0);
  const ingMet = fIngressos.filter(r => (r['Atribuição'] || '').toLowerCase().includes('meteórico')).length;

  // VD
  const invVD = fVd.reduce((acc, r) => acc + parseCurrency(r['Valor Gasto'] || '0'), 0);
  const allIngVd = fIngressos.filter(r => (r['Atribuição'] || '').toLowerCase().includes('venda direta'));
  const fatVD = allIngVd.reduce((acc, r) => acc + parseCurrency(r['Fat. Líquido - Principal'] || '0'), 0);
  
  const ingressosVDOrganicoList = allIngVd.filter(r => (r['Atribuição'] || '').toLowerCase().includes('orgânico') || (r['Atribuição'] || '').toLowerCase().includes('organico'));
  const ingressosVDTrafegoList = allIngVd.filter(r => (r['Atribuição'] || '').toLowerCase().includes('tráfego') || (r['Atribuição'] || '').toLowerCase().includes('trafego'));
  
  const ingVD = allIngVd.length;
  const ingVDOrganico = ingressosVDOrganicoList.length;
  const ingVDTrafego = ingressosVDTrafegoList.length;

  // GD
  const fGdForm = fGd.filter(isForm);
  const fGdCaptura = fGd.filter(isCaptura);
  const fGdInlead = fGd.filter(isInlead);
  
  const invGdForm = fGdForm.reduce((acc, r) => acc + parseCurrency(r['Valor Gasto'] || '0'), 0);
  const invGdCaptura = fGdCaptura.reduce((acc, r) => acc + parseCurrency(r['Valor Gasto'] || '0'), 0);
  const invGdInlead = fGdInlead.reduce((acc, r) => acc + parseCurrency(r['Valor Gasto'] || '0'), 0);
  
  const fatGd = fIngressos.filter(r => {
    const atr = (r['Atribuição'] || '').toLowerCase();
    const sub = (r['Subfunil'] || r['subfunil'] || r['Tipo de Funil'] || '').toLowerCase();
    return atr.includes('geração de demanda') || atr.includes('geracao de demanda') || sub.includes('inlead');
  }).reduce((acc, r) => acc + parseCurrency(r['Fat. Líquido - Principal'] || '0'), 0);
  
  const allIngGd = fIngressos.filter(r => {
    const atr = (r['Atribuição'] || '').toLowerCase();
    const sub = (r['Subfunil'] || r['subfunil'] || r['Tipo de Funil'] || '').toLowerCase();
    return atr.includes('geração de demanda') || atr.includes('geracao de demanda') || sub.includes('inlead');
  });

  // GD Lists
  const ingressosGdFormList: any[] = [];
  const ingressosGdCapturaList: any[] = [];
  const ingressosGdInleadList: any[] = [];
  let ingGdOrganico = 0;

  allIngGd.forEach(c => {
    let subfunil = (c['Subfunil'] || c['subfunil'] || c['Tipo de Funil'] || '').toLowerCase().trim();
    
    if (subfunil.includes('inlead')) {
      ingressosGdInleadList.push(c);
    } else if (subfunil.includes('captura')) {
      ingressosGdCapturaList.push(c);
    } else if (subfunil.includes('form')) {
      ingressosGdFormList.push(c);
    }
    // If not specified in Subfunil column, do not attribute to any specific subfunnel.
  });

  const ingGdForm = ingressosGdFormList.length;
  const ingGdCaptura = ingressosGdCapturaList.length;
  const ingGdInlead = ingressosGdInleadList.length;
  
// Charts setup
  // We need daily aggregates...
  // Since we don't want to make this file 1000 lines long, I'll export daily aggregates
  
  const buildDaily = (dates: Set<string>, leadSet: any[], mqlSet: any[], metaSet: any[], ingressosSet: any[]) => {
    const buckets = new Map<string, any>();
    
    Array.from(dates).forEach(d => {
      buckets.set(d, {
        date: d,
        investimento: 0,
        leads: 0,
        mqls: 0,
        cliques: 0,
        impressoes: 0,
        view3s: 0,
        view25: 0,
        view50: 0,
        view75: 0,
        view95: 0,
        pvs: 0,
        ingressos: 0,
        faturamento: 0,
        pessoasNoGrupo: 0,
        custoPorPessoaNoGrupo: 0,
        taxaEntrada: 0
      });
    });

    const getDay = (dateStr: string) => {
      const pd = parseDate(dateStr);
      return pd ? formatDateToString(pd) : null;
    };

    leadSet.forEach(r => {
      const d = getDay(r['data_hora'] || '');
      if (d && buckets.has(d)) {
        buckets.get(d)!.leads++;
      }
    });

    mqlSet.forEach(r => {
      const d = getDay(r['data_hora'] || '');
      if (d && buckets.has(d)) {
        buckets.get(d)!.mqls++;
      }
    });

    metaSet.forEach(r => {
      const d = getDay(r['Data'] || '');
      if (d && buckets.has(d)) {
        const b = buckets.get(d)!;
        b.investimento += parseCurrency(r['Valor Gasto'] || '0');
        b.cliques += parseNumber(r['Cliques no link'] || r['Cliques'] || '0');
        b.impressoes += parseNumber(r['Impressões'] || '0');
        b.pvs += parseNumber(r['Visualizações de página de destino'] || r['Page Views'] || r['Pageviews'] || '0');
        b.view3s += parseNumber(r['View 3s'] || r['Reproduções de vídeo de 3 segundos'] || r['Reproduções contínuas de vídeo de 2 segundos'] || '0');
        b.view25 += parseNumber(r['View 25%'] || r['View 2%'] || r['Reproduções a 25%'] || r['Reproduções do vídeo a 25%'] || r['Reproduções de vídeo a 25%'] || '0');
        b.view50 += parseNumber(r['View 50%'] || r['Reproduções a 50%'] || r['Reproduções do vídeo a 50%'] || r['Reproduções de vídeo a 50%'] || '0');
        b.view75 += parseNumber(r['View 75%'] || r['Reproduções a 75%'] || r['Reproduções do vídeo a 75%'] || r['Reproduções de vídeo a 75%'] || '0');
        b.view95 += parseNumber(r['View 95%'] || r['View 100%'] || r['Reproduções a 95%'] || r['Reproduções do vídeo a 95%'] || r['Reproduções de vídeo a 95%'] || r['Reproduções a 100%'] || r['Reproduções do vídeo a 100%'] || r['Reproduções de vídeo a 100%'] || '0');
      }
    });

    if (ingressosSet) {
      ingressosSet.forEach(r => {
        const d = getDay(r['Data Compra'] || r['Data'] || '');
        if (d && buckets.has(d)) {
          const b = buckets.get(d)!;
          b.ingressos++;
          b.faturamento += parseCurrency(r['Fat. Líquido - Principal'] || '0');
        }
      });
    }

    return Array.from(dates).sort().map(d => buckets.get(d)!);
  };

  const allDates = new Set<string>();
  for (const d of [fGeral, fIngressos, fMet, fVd, fGd, fDc, fDcCorredor, fSendflow]) {
    d.forEach(r => {
      const pd = parseDate(r['data_hora'] || r['Data'] || r['data'] || r['Data Compra'] || '');
      if (pd) allDates.add(formatDateToString(pd));
    });
  }
  
  const chartMET = buildDaily(allDates, leadsMet, getMqls(leadsMet), fMet, fIngressos.filter(r => (r['Atribuição'] || '').toLowerCase().includes('meteórico')));

  // --- SENDFLOW (WHATSAPP GROUPS) AGGREGATION & CHART DECORATION ---
  const parsePercent = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = String(val).replace('%', '').replace(/\s+/g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const hasSendflowData = fSendflow.length > 0;
  let totalSendflowPessoas = 0;
  let sendflowTentadas = 0;
  const sendflowByDate = new Map<string, { pessoas: number; taxa: number }>();

  fSendflow.forEach(r => {
    const dStr = r['data'] || r['Data'] || '';
    const pd = parseDate(dStr);
    const dateKey = pd ? formatDateToString(pd) : null;
    const pessoas = parseNumber(r['pessoas no grupo'] || r['Pessoas no Grupo'] || r['pessoas'] || '0');
    const taxa = parsePercent(r['tx. entrada nos grupos'] || r['Tx. entrada nos grupos'] || r['taxa'] || '0');

    totalSendflowPessoas += pessoas;
    if (taxa > 0) {
      sendflowTentadas += pessoas / (taxa / 100);
    } else if (pessoas > 0) {
      sendflowTentadas += pessoas;
    }

    if (dateKey) {
      sendflowByDate.set(dateKey, { pessoas, taxa });
    }
  });

  const taxaEntradaMedia = sendflowTentadas > 0
    ? (totalSendflowPessoas / sendflowTentadas) * 100
    : (fSendflow.length > 0 ? fSendflow.reduce((acc, r) => acc + parsePercent(r['tx. entrada nos grupos'] || '0'), 0) / fSendflow.length : 0);

  const custoPorPessoaNoGrupo = totalSendflowPessoas > 0 ? invMet / totalSendflowPessoas : 0;

  chartMET.forEach(day => {
    const sf = sendflowByDate.get(day.date);
    if (sf) {
      day.pessoasNoGrupo = sf.pessoas;
      day.taxaEntrada = sf.taxa;
      day.custoPorPessoaNoGrupo = sf.pessoas > 0 ? (day.investimento > 0 ? day.investimento / sf.pessoas : 0) : 0;
    } else {
      day.pessoasNoGrupo = 0;
      day.taxaEntrada = 0;
      day.custoPorPessoaNoGrupo = 0;
    }
  });

  const sendflowChartData = chartMET.map(d => ({
    date: d.date,
    pessoasNoGrupo: d.pessoasNoGrupo || 0,
    custoPorPessoaNoGrupo: d.custoPorPessoaNoGrupo || 0,
    taxaEntrada: d.taxaEntrada || 0,
    investimento: d.investimento || 0
  }));
  const chartVD = buildDaily(allDates, allLeadsVD, getMqls(allLeadsVD), fVd, allIngVd);
  const chartGdForm = buildDaily(allDates, leadsDemandaForm, getMqls(leadsDemandaForm), fGdForm, ingressosGdFormList);
  const chartGdCaptura = buildDaily(allDates, leadsDemandaCaptura, getMqls(leadsDemandaCaptura), fGdCaptura, ingressosGdCapturaList);
  const chartGdInlead = buildDaily(allDates, leadsDemandaInlead, getMqls(leadsDemandaInlead), fGdInlead, ingressosGdInleadList);
  const chartDc = buildDaily(allDates, [], [], fDc, []);
  const chartDcKlt = buildDaily(allDates, [], [], fDcKlt, []);
  const chartDcRemarketing = buildDaily(allDates, [], [], fDcRemarketing, []);
  const chartDcCorredor = buildDaily(allDates, [], [], fDcCorredor, []);
  
  for (const atr in etapas) {
    const e = etapas[atr];
    e.chartData = buildDaily(allDates, [], [], e.rawData, []);
    delete e.rawData;
    
    // Merge into chartDc
    e.chartData.forEach(dayEtapa => {
      const dayOverall = chartDc.find(d => d.date === dayEtapa.date);
      if (dayOverall) {
        dayOverall[atr || 'Sem Atribuição'] = dayEtapa.investimento;
      }
    });
  }

  for (const atr in etapasKlt) {
    const e = etapasKlt[atr];
    e.chartData = buildDaily(allDates, [], [], e.rawData, []);
    delete e.rawData;
    
    // Merge into chartDcKlt
    e.chartData.forEach(dayEtapa => {
      const dayOverall = chartDcKlt.find(d => d.date === dayEtapa.date);
      if (dayOverall) {
        dayOverall[atr || 'Sem Atribuição'] = dayEtapa.investimento;
      }
    });
  }

  for (const atr in etapasRemarketing) {
    const e = etapasRemarketing[atr];
    e.chartData = buildDaily(allDates, [], [], e.rawData, []);
    delete e.rawData;
    
    // Merge into chartDcRemarketing
    e.chartData.forEach(dayEtapa => {
      const dayOverall = chartDcRemarketing.find(d => d.date === dayEtapa.date);
      if (dayOverall) {
        dayOverall[atr || 'Sem Atribuição'] = dayEtapa.investimento;
      }
    });
  }

  for (const atr in etapasCorredor) {
    const e = etapasCorredor[atr];
    e.chartData = buildDaily(allDates, [], [], e.rawData, []);
    delete e.rawData;
    
    // Merge into chartDcCorredor
    e.chartData.forEach(dayEtapa => {
      const dayOverall = chartDcCorredor.find(d => d.date === dayEtapa.date);
      if (dayOverall) {
        dayOverall[atr || 'Sem Atribuição'] = dayEtapa.investimento;
      }
    });
  }
  

  
  
  const allLeads = [...leadsMet, ...leadsDemanda, ...leadsVDTrafego];
  const allMqls = [...getMqls(leadsMet), ...getMqls(leadsDemanda), ...getMqls(leadsVDTrafego)];
  const allMeta = [...fMet, ...fVd, ...fGd, ...fDc, ...fDcCorredor];
  const chartGeral = buildDaily(allDates, allLeads, allMqls, allMeta, fIngressos);

  const emailToLeadMap = new Map<string, any>();
  rawData.geral.forEach(l => {
    const validUuid = !!(l['uuid']?.trim() || l['uidd']?.trim());
    if (!validUuid) return;
    const e = (l['email'] || '').toLowerCase().trim();
    if (e && !emailToLeadMap.has(e)) {
      emailToLeadMap.set(e, l);
    }
  });

  const getResolvedUtmContent = (item: any) => {
    let content = (item['Utm Content'] || item['utm_content'] || '').trim();
    if (!content && item['email']) {
      const emailLower = item['email'].toLowerCase().trim();
      const lead = emailToLeadMap.get(emailLower);
      if (lead) {
        content = (lead['utm_content'] || lead['Utm Content'] || '').trim();
      }
    }
    return content;
  };

  // Helper to extract thumbnail from any possible row structure/column name
  const getRowThumbnail = (r: any): string => {
    if (!r) return '';
    return (
      r['Creative Thumbnail'] ||
      r['creative_thumbnail'] ||
      r['Thumbnail'] ||
      r['thumbnail'] ||
      r['Creative Preview URL'] ||
      r['Preview URL'] ||
      r['preview_url'] ||
      r['Image URL'] ||
      r['URL da Imagem'] ||
      r['Imagem'] ||
      r['imagem'] ||
      ''
    ).trim();
  };

  // Helper to extract creative permalink from any possible row structure/column name
  const getRowLink = (r: any): string => {
    if (!r) return '';
    const raw = (
      r['Creative Instagram Permalink'] ||
      r['creative_instagram_permalink'] ||
      r['Instagram Permalink'] ||
      r['instagram_permalink'] ||
      r['Permalink'] ||
      r['permalink'] ||
      r['Link do Criativo'] ||
      r['link_do_criativo'] ||
      r['Link do Anúncio'] ||
      r['Link do Anuncio'] ||
      r['link_do_anuncio'] ||
      r['Link'] ||
      r['link'] ||
      r['URL'] ||
      r['url'] ||
      r['Ver anúncio'] ||
      r['Ver Anúncio'] ||
      ''
    ).trim();
    if (raw && !raw.startsWith('http://') && !raw.startsWith('https://') && (raw.includes('instagram.com') || raw.includes('facebook.com') || raw.includes('fb.me'))) {
      return `https://${raw}`;
    }
    return raw;
  };

  const extractAdCode = (name: string): string => {
    if (!name) return '';
    const match = name.match(/\[(AD#?\d+)\]/i) || name.match(/\b(AD#?\d+)\b/i);
    return match ? match[1].replace('#', '').toUpperCase() : '';
  };

  const cleanAdName = (name: string): string => {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/[—–-]\s*c[óo]pia/gi, '')
      .replace(/_[cC]\d+/g, '')
      .replace(/_[cC][tT][aA]\d+/g, '')
      .replace(/\s*\(\d+\)$/g, '')
      .trim();
  };

  // Combined meta lookup across all sources for maximum coverage of creative assets
  const allMetaLookupList = [
    ...(rawData.met || []),
    ...(rawData.vd || []),
    ...(rawData.gd || []),
    ...(rawData.dc || []),
    ...(rawData.dcCorredor || []),
    ...(rawData.workshop || []),
    ...(rawData.webinario || []),
    ...(rawData.main || [])
  ];

  // Process creatives for any subfunnel
  const getCreatives = (metaSubset: any[], leadsSubset: any[], ingressosSubset: any[], allMetaForLookup: any[] = allMetaLookupList, unfilteredMetaSubset: any[] = []) => {
    const combinedLookup = (allMetaForLookup && allMetaForLookup.length > 0) ? allMetaForLookup : allMetaLookupList;
    
    const globalInfoByName = new Map<string, { thumbnail: string, link: string, originalName: string }>();
    const globalInfoByClean = new Map<string, { thumbnail: string, link: string, originalName: string }>();
    const globalInfoById = new Map<string, { thumbnail: string, link: string, originalName: string }>();
    const globalInfoByCode = new Map<string, { thumbnail: string, link: string, originalName: string }>();

    if (combinedLookup) {
      combinedLookup.forEach(r => {
        const nome = (r['NOME DO ANÚNCIO'] || r['Nome do Anúncio'] || r['Nome do anúncio'] || r['nome_do_anuncio'] || r['Ad Name'] || r['ad_name'] || '').trim();
        const thumbnail = getRowThumbnail(r);
        const link = getRowLink(r);
        if (!nome && !thumbnail && !link) return;

        const info = {
          originalName: nome || 'Criativo',
          thumbnail: thumbnail,
          link: link
        };

        if (nome) {
          const lowerNome = nome.toLowerCase();
          if (!globalInfoByName.has(lowerNome) || (!globalInfoByName.get(lowerNome)!.thumbnail && thumbnail)) {
            globalInfoByName.set(lowerNome, info);
          }
          const cl = cleanAdName(nome);
          if (cl && (!globalInfoByClean.has(cl) || (!globalInfoByClean.get(cl)!.thumbnail && thumbnail))) {
            globalInfoByClean.set(cl, info);
          }
          const code = extractAdCode(nome);
          if (code && (!globalInfoByCode.has(code) || (!globalInfoByCode.get(code)!.thumbnail && thumbnail))) {
            globalInfoByCode.set(code, info);
          }
        }

        const adId = String(r['ID ANÚNCIO'] || r['ID Anúncio'] || r['id_anuncio'] || r['Ad ID'] || r['ad_id'] || '').trim();
        if (adId) {
          if (!globalInfoById.has(adId) || (!globalInfoById.get(adId)!.thumbnail && thumbnail)) {
            globalInfoById.set(adId, info);
          }
          if (!globalInfoById.has(adId.toLowerCase()) || (!globalInfoById.get(adId.toLowerCase())!.thumbnail && thumbnail)) {
            globalInfoById.set(adId.toLowerCase(), info);
          }
        }
      });
    }

    const findCreativeInfo = (targetName: string) => {
      if (!targetName) return null;
      const targetLower = targetName.toLowerCase().trim();
      if (globalInfoByName.has(targetLower)) return globalInfoByName.get(targetLower)!;
      
      const cl = cleanAdName(targetLower);
      if (cl && globalInfoByClean.has(cl)) return globalInfoByClean.get(cl)!;

      if (globalInfoById.has(targetName.trim())) return globalInfoById.get(targetName.trim())!;
      if (globalInfoById.has(targetLower)) return globalInfoById.get(targetLower)!;

      const code = extractAdCode(targetName);
      if (code && globalInfoByCode.has(code)) return globalInfoByCode.get(code)!;

      // Fallback substring search
      for (const [key, val] of globalInfoByName.entries()) {
        if (key.length > 8 && (key.includes(targetLower) || targetLower.includes(key))) {
          return val;
        }
      }
      return null;
    };

    const creativesMap = new Map<string, any>();
    // Case-insensitive mapping from lowercase name to actual stored object
    const lowerToCreative = new Map<string, any>();

    let maxDateObj = 0;
    
    const parseAnyDate = (dateStr: string) => {
      if (!dateStr) return 0;
      const cleanStr = dateStr.trim().split(/\s+/)[0].split(',')[0];
      let parts = cleanStr.split('/');
      if (parts.length !== 3) {
        parts = cleanStr.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).getTime();
        }
      }
      if (parts.length === 3) {
        return new Date(parseInt(parts[2].length === 2 ? '20'+parts[2] : parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
      }
      return 0;
    };

    const subsetForActive = unfilteredMetaSubset.length > 0 ? unfilteredMetaSubset : combinedLookup;
    // ALWAYS GET THE ABSOLUTE MAX DATE FROM THE FULL UNFILTERED CSV (combinedLookup)
    // This ensures that "today" means the last day of the whole file, not just the last day this specific subfunnel had traffic.
    if (combinedLookup) {
      combinedLookup.forEach(r => {
        const d = r['Data'] || r['data'] || r['DATA'] || '';
        const t = parseAnyDate(d);
        if (t > maxDateObj) maxDateObj = t;
      });
    }

    const activeCreativesGlobal = new Set<string>();
    if (subsetForActive && maxDateObj > 0) {
      subsetForActive.forEach(r => {
        const d = r['Data'] || r['data'] || r['DATA'] || '';
        const t = parseAnyDate(d);
        if (t === maxDateObj) {
          const stCamp = String(r['STATUS CAMPANHA'] || r['Status Campanha'] || r['Campanha Status'] || '').toUpperCase();
          const stConj = String(r['STATUS CONJUNTO'] || r['Status Conjunto'] || r['Conjunto Status'] || '').toUpperCase();
          const stAnun = String(r['STATUS ANÚNCIO'] || r['Status Anúncio'] || r['Anúncio Status'] || '').toUpperCase();
          if (stCamp === 'ACTIVE' && stConj === 'ACTIVE' && stAnun === 'ACTIVE' && parseCurrency(r['Valor Gasto'] || '0') > 0) {
            const nome = (r['NOME DO ANÚNCIO'] || r['Nome do Anúncio'] || '').trim();
            if (nome) activeCreativesGlobal.add(nome.toLowerCase());
          }
        }
      });
    }

    const ensureCreative = (nome: string) => {
      if (!nome) return null;
      const lowerNome = nome.toLowerCase().trim();
      if (!lowerToCreative.has(lowerNome)) {
        const globalInfo = findCreativeInfo(nome);
        const newAd = {
          ativo: activeCreativesGlobal.has(lowerNome) || (globalInfo ? activeCreativesGlobal.has(globalInfo.originalName.toLowerCase()) : false),
          lastDate: '',
          nome: globalInfo?.originalName || nome,
          thumbnail: globalInfo?.thumbnail || '',
          link: globalInfo?.link || '',
          investimento: 0,
          cliques: 0,
          impressoes: 0,
          alcance: 0,
          pageViews: 0,
          view3s: 0,
          view25: 0,
          view50: 0,
          view75: 0,
          view95: 0,
          thruplays: 0,
          visitasPerfil: 0,
          leads: 0,
          mqls: 0,
          ingressos: 0,
          respostasRenda: 0,
          rendaAcima5k: 0,
          pracas: [],
          campanhas: [],
          pesquisa: [],
        };
        lowerToCreative.set(lowerNome, newAd);
        creativesMap.set(lowerNome, newAd);
      }
      return lowerToCreative.get(lowerNome)!;
    };

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

    metaSubset.forEach(r => {
      const nome = (r['NOME DO ANÚNCIO'] || r['Nome do Anúncio'] || '').trim();
      const ad = ensureCreative(nome);
      if (!ad) return;
      ad.investimento += parseCurrency(r['Valor Gasto'] || '0');
      ad.cliques += parseNumber(r['Cliques no link'] || r['Cliques'] || '0');
      ad.impressoes += parseNumber(r['Impressões'] || '0');
      ad.alcance += parseNumber(getAlcance(r));
      ad.pageViews += parseNumber(r['Page Views'] || r['Visualizações de página de destino'] || r['Visualizações da Página de Destino'] || r['Pageviews'] || '0');
      ad.view3s += parseNumber(r['View 3s'] || r['Reproduções de vídeo de 3 segundos'] || r['Reproduções contínuas de vídeo de 2 segundos'] || '0');
      ad.view25 += parseNumber(r['View 25%'] || r['View 2%'] || r['Reproduções a 25%'] || r['Reproduções do vídeo a 25%'] || r['Reproduções de vídeo a 25%'] || '0');
      ad.view50 += parseNumber(r['View 50%'] || r['Reproduções a 50%'] || r['Reproduções do vídeo a 50%'] || r['Reproduções de vídeo a 50%'] || '0');
      ad.view75 += parseNumber(r['View 75%'] || r['Reproduções a 75%'] || r['Reproduções do vídeo a 75%'] || r['Reproduções de vídeo a 75%'] || '0');
      ad.view95 += parseNumber(r['View 95%'] || r['View 100%'] || r['Reproduções a 95%'] || r['Reproduções do vídeo a 95%'] || r['Reproduções de vídeo a 95%'] || r['Reproduções a 100%'] || r['Reproduções do vídeo a 100%'] || r['Reproduções de vídeo a 100%'] || '0');
      ad.atribuicao = String(r['Atribuição'] || r['atribuição'] || r['ATRIBUIÇÃO'] || '').trim();
      if (r['praca']) {
        if (!ad.pracas) ad.pracas = [];
        if (!ad.pracas.includes(r['praca'])) ad.pracas.push(r['praca']);
      }
      const nomeCampanha = (r['NOME DA CAMPANHA'] || r['Nome da Campanha'] || '').trim();
      if (nomeCampanha) {
        if (!ad.campanhas) ad.campanhas = [];
        if (!ad.campanhas.includes(nomeCampanha)) ad.campanhas.push(nomeCampanha);
      }
      ad.visitasPerfil += parseNumber(r['Visitas ao Perfil'] || '0');
      
      const rowThumb = getRowThumbnail(r);
      const rowLink = getRowLink(r);
      if (!ad.thumbnail && rowThumb) ad.thumbnail = rowThumb;
      if (!ad.link && rowLink) ad.link = rowLink;
      
      const rDate = r['Data'] || r['data'] || r['DATA'] || '';
      if (rDate >= ad.lastDate) {
        ad.lastDate = rDate;
        const statusCampanha = (r['STATUS CAMPANHA'] || r['Status Campanha'] || r['Campanha Status'] || '').trim().toUpperCase();
        const statusConjunto = (r['STATUS CONJUNTO'] || r['Status Conjunto'] || r['Conjunto Status'] || '').trim().toUpperCase();
        const statusAnuncio = (r['STATUS ANÚNCIO'] || r['Status Anúncio'] || r['Anúncio Status'] || '').trim().toUpperCase();
        // ad.ativo is now managed globally
      }
    });
    
    const mqlSubset = getMqls(leadsSubset);
    
    const isRendaAcima5k = (renda: string) => {
      if (!renda) return false;
      const lower = String(renda).toLowerCase();
      // Known substrings for <= 5k should be filtered if we were doing a negative check,
      // but since we know all > 5k values, we can match them directly.
      return lower.includes('5.001') || 
             lower.includes('7.501') || 
             lower.includes('10.001') || 
             lower.includes('10.000,00') ||
             lower.includes('20.001') || 
             lower.includes('20.000') ||
             lower.includes('30.000') ||
             lower.includes('30.001') ||
             (lower.includes('acima de') && !lower.includes('2.500') && !lower.includes('5.000'));
    };

    leadsSubset.forEach(l => {
      const content = getResolvedUtmContent(l);
      if (content) {
        const ad = ensureCreative(content);
        if (ad) {
          ad.leads++;
          ad.pesquisa.push(l);
          const renda = String(l['renda'] || '').trim().toLowerCase();
          const isInvalid = !renda || renda === '(vazio)' || renda === 'null' ||
            renda.includes('faturamento') || renda.includes('--') || renda.includes('<test') ||
            renda.includes('qual_é');
            
          if (!isInvalid) {
            ad.respostasRenda++;
            if (isRendaAcima5k(renda)) {
              ad.rendaAcima5k++;
            }
          }
          
          const leadThumb = getRowThumbnail(l);
          const leadLink = getRowLink(l);
          if (!ad.thumbnail && leadThumb) ad.thumbnail = leadThumb;
          if (!ad.link && leadLink) ad.link = leadLink;
        }
      }
    });

    mqlSubset.forEach(l => {
      const content = getResolvedUtmContent(l);
      if (content) {
        const ad = ensureCreative(content);
        if (ad) ad.mqls++;
      }
    });

    ingressosSubset.forEach(i => {
      const content = getResolvedUtmContent(i);
      if (content) {
        const ad = ensureCreative(content);
        if (ad) ad.ingressos++;
      }
    });

    // Final pass to guarantee thumbnail and link are populated from allMetaLookupList
    for (const ad of creativesMap.values()) {
      if (!ad.thumbnail || !ad.link) {
        const info = findCreativeInfo(ad.nome);
        if (info) {
          if (!ad.thumbnail && info.thumbnail) ad.thumbnail = info.thumbnail;
          if (!ad.link && info.link) ad.link = info.link;
        }
      }
    }
    
    return Array.from(creativesMap.values())
      .map(ad => ({
        ...ad,
        frequencia: ad.alcance > 0 ? ad.impressoes / ad.alcance : 0,
        conversaoPagina: ad.pageViews > 0 ? (ad.leads / ad.pageViews) * 100 : (ad.cliques > 0 ? (ad.leads / ad.cliques) * 100 : 0)
      }))
      .filter(ad => ad.investimento > 0 || ad.leads > 0 || ad.ingressos > 0);
  };
  
  
    const calcConversaoPaginasDiaria = (leads: any[], meta: any[]) => {
      const dates = new Set<string>();
      const dailyData = new Map<string, { [pg: string]: { leads: number; pageviews: number } }>();
      
      const getDay = (dateStr: string) => {
        const pd = parseDate(dateStr);
        return pd ? formatDateToString(pd) : null;
      };
      
      meta.forEach(r => {
        const d = getDay(r['Data'] || '');
        if (d) {
          dates.add(d);
          if (!dailyData.has(d)) dailyData.set(d, {});
          
          const campaignName = (r['NOME DA CAMPANHA'] || r['Nome da Campanha'] || '').toUpperCase();
          const adName = (r['NOME DO ANÚNCIO'] || r['Nome do Anúncio'] || '').toUpperCase();
          
          let pg: string | null = null;
          if (isC016GoianiaMistagged(campaignName) || isC016GoianiaMistagged(adName)) {
            pg = 'PG01';
          } else {
            const match = campaignName.match(/PG-?\d+/i) || adName.match(/PG-?\d+/i);
            if (match) {
              pg = match[0].toUpperCase().replace('-', '');
            }
          }
          if (pg) {
            const pv = parseNumber(r['Visualizações de página de destino'] || r['Page Views'] || r['Pageviews'] || '0');
            
            if (!dailyData.get(d)![pg]) dailyData.get(d)![pg] = { leads: 0, pageviews: 0 };
            dailyData.get(d)![pg].pageviews += pv;
          }
        }
      });
      
      leads.forEach(r => {
        const d = getDay(r['data_hora'] || '');
        if (d) {
          dates.add(d);
          if (!dailyData.has(d)) dailyData.set(d, {});
          
          const campaign = (r['utm_campaign'] || '').toUpperCase();
          let pg: string | null = null;
          if (isC016GoianiaMistagged(campaign)) {
            pg = 'PG01';
          } else {
            const match = campaign.match(/PG-?\d+/i);
            if (match) {
              pg = match[0].toUpperCase().replace('-', '');
            }
          }
          if (pg) {
            if (!dailyData.get(d)![pg]) dailyData.get(d)![pg] = { leads: 0, pageviews: 0 };
            dailyData.get(d)![pg].leads += 1;
          }
        }
      });
      
      const allPgs = new Set<string>();
      dailyData.forEach(day => Object.keys(day).forEach(pg => allPgs.add(pg)));
      
      const sortedDates = Array.from(dates).sort();
      const result = sortedDates.map(date => {
        const dayObj: any = { date };
        const dayData = dailyData.get(date) || {};
        allPgs.forEach(pg => {
          const stats = dayData[pg] || { leads: 0, pageviews: 0 };
          dayObj[pg] = stats.pageviews > 0 ? (stats.leads / stats.pageviews) * 100 : 0;
        });
        return dayObj;
      });
      
      const averages: { [pg: string]: number } = {};
      allPgs.forEach(pg => {
        let totalLeads = 0;
        let totalPv = 0;
        dailyData.forEach(day => {
          if (day[pg]) {
            totalLeads += day[pg].leads;
            totalPv += day[pg].pageviews;
          }
        });
        averages[pg] = totalPv > 0 ? (totalLeads / totalPv) * 100 : 0;
      });

      return { data: result, pgs: Array.from(allPgs), averages };
    };
    
  
  
  
  const normalizeAdsetName = (name: string) => {
    let n = name.toUpperCase();

    if (n.includes('COMRPADORES') || n.includes('COMPRADORES')) {
      n = n.replace(/COMRPADORES/g, 'COMPRADORES');
      if (n.includes('COMPRADORES ENVOLVIDOS')) {
        return 'Compradores Envolvidos';
      }
    }

    // Group ENVOLVIMENTO-180D_E_SEGUIDORES specifically if it exists to be safe
    if (n.includes('ENVOLVIMENTO-180D_E_SEGUIDORES')) {
      return 'ENVOLVIMENTO-180D_E_SEGUIDORES';
    }

    // Remove leading numbers (e.g. "01 - ", "00-", "23 ")
    n = n.replace(/^\s*\d+\s*[-_]?\s*/, '');
    
    // Optional: remove bracketed tags at the beginning like "[IG]", "[IG - ST&RL]" 
    // Usually people want to group these too if they are just placements
    // Let's just remove platform prefixes at the start
    n = n.replace(/^(\[[^\]]+\]\s*)+/, '');

    // Remove dates at the end (e.g., - 03.08.2026, _03/08/2026)
    n = n.replace(/\s*[-_]?\s*\d{2}[\.\/]\d{2}[\.\/]\d{2,4}.*$/, '');
    // Remove copies (e.g., - copy, - cópia)
    n = n.replace(/\s*[-_]?\s*(?:COPY|C[OÓ]PIA).*$/i, '');
    // Remove any trailing dashes or spaces
    n = n.replace(/[-\s]+$/, '');
    
    return n.trim() || name;
  };

  
  const estudoPublicoMap = new Map<string, any>();
  fGd.forEach(r => {
    const rawAdset = String(r['NOME DO CONJUNTO'] || r['Conjunto de anúncios'] || '').trim();
    if (!rawAdset) return;
    const key = normalizeAdsetName(rawAdset);
    if (!estudoPublicoMap.has(key)) {
      estudoPublicoMap.set(key, {
        nome: key, // display name
        investimento: 0,
        impressoes: 0,
        alcance: 0,
        leads: 0,
        mqls: 0,
        vendas: 0,
        leadsData: [],
        subPublicosMap: new Map<string, any>()
      });
    }
    const obj = estudoPublicoMap.get(key);
    obj.investimento += parseCurrency(r['Valor Gasto'] || '0');
    obj.impressoes += parseInt(r['Impressões'] || '0') || 0;
    obj.alcance += parseInt(r['Alcance'] || '0') || 0;

    const childKey = rawAdset;
    if (!obj.subPublicosMap.has(childKey)) {
      obj.subPublicosMap.set(childKey, {
        nome: childKey,
        investimento: 0,
        impressoes: 0,
        alcance: 0,
        leads: 0,
        mqls: 0,
        vendas: 0,
        leadsData: []
      });
    }
    const child = obj.subPublicosMap.get(childKey);
    child.investimento += parseCurrency(r['Valor Gasto'] || '0');
    child.impressoes += parseInt(r['Impressões'] || '0') || 0;
    child.alcance += parseInt(r['Alcance'] || '0') || 0;
  });

  leadsDemanda.forEach(l => {
    let rawAdset = String(l['utm_term'] || '').trim();
    if (!rawAdset) return;
    
    try { rawAdset = decodeURIComponent(rawAdset); } catch (e) {}
    
    const key = normalizeAdsetName(rawAdset);
    if (!estudoPublicoMap.has(key)) return;
    const obj = estudoPublicoMap.get(key);
    obj.leads++;
    if ((l['clint'] || '').toUpperCase() === 'SIM') {
      obj.mqls++;
    }
    obj.leadsData.push(l);

    const childKey = rawAdset;
    if (!obj.subPublicosMap.has(childKey)) {
      obj.subPublicosMap.set(childKey, {
        nome: childKey,
        investimento: 0, impressoes: 0, alcance: 0,
        leads: 0, mqls: 0, vendas: 0, leadsData: []
      });
    }
    const child = obj.subPublicosMap.get(childKey);
    child.leads++;
    if ((l['clint'] || '').toUpperCase() === 'SIM') {
      child.mqls++;
    }
    child.leadsData.push(l);
  });

  allIngGd.forEach(i => {
    let rawAdset = String(i['Utm Term'] || i['utm_term'] || '').trim();
    if (!rawAdset) return;
    
    try { rawAdset = decodeURIComponent(rawAdset); } catch (e) {}
    
    const key = normalizeAdsetName(rawAdset);
    if (!estudoPublicoMap.has(key)) return;
    const obj = estudoPublicoMap.get(key);
    obj.vendas++;

    const childKey = rawAdset;
    if (!obj.subPublicosMap.has(childKey)) {
      obj.subPublicosMap.set(childKey, {
        nome: childKey,
        investimento: 0, impressoes: 0, alcance: 0,
        leads: 0, mqls: 0, vendas: 0, leadsData: []
      });
    }
    const child = obj.subPublicosMap.get(childKey);
    child.vendas++;
  });

  const estudoPublico = Array.from(estudoPublicoMap.values()).map(o => {
    const cpl = o.leads > 0 ? o.investimento / o.leads : 0;
    const custoMql = o.mqls > 0 ? o.investimento / o.mqls : 0;
    const cac = o.vendas > 0 ? o.investimento / o.vendas : 0;
    const frequencia = o.alcance > 0 ? o.impressoes / o.alcance : 0;

    const subPublicos = Array.from(o.subPublicosMap.values()).map((child: any) => {
      const cplC = child.leads > 0 ? child.investimento / child.leads : 0;
      const custoMqlC = child.mqls > 0 ? child.investimento / child.mqls : 0;
      const cacC = child.vendas > 0 ? child.investimento / child.vendas : 0;
      const frequenciaC = child.alcance > 0 ? child.impressoes / child.alcance : 0;
      return { ...child, cpl: cplC, custoMql: custoMqlC, cac: cacC, frequencia: frequenciaC };
    }).sort((a: any, b: any) => b.investimento - a.investimento);

    return { ...o, cpl, custoMql, cac, frequencia, subPublicos };
  }).sort((a, b) => b.investimento - a.investimento);

  const inleadPagesData: { [page: string]: any } = {};

  const getPageKey = (str: string) => {
    if (!str) return null;
    if (isC016GoianiaMistagged(str)) {
      return 'PG01';
    }
    const match = str.match(/PG-?\d+/i);
    return match ? match[0].toUpperCase().replace('-', '') : null;
  };

  // 1. Process Traffic (fGdInlead)
  fGdInlead.forEach(r => {
    const camp = getCampaignStr(r);
    const pg = getPageKey(camp);
    if (pg) {
      if (!inleadPagesData[pg]) {
        inleadPagesData[pg] = { page: pg, investimento: 0, cliques: 0, impressoes: 0, leads: 0, mqls: 0, ingressos: 0, faturamento: 0 };
      }
      inleadPagesData[pg].investimento += parseCurrency(r['Valor Gasto'] || '0');
      inleadPagesData[pg].cliques += parseNumber(r['Cliques no link'] || r['Cliques'] || '0');
      inleadPagesData[pg].impressoes += parseNumber(r['Impressões'] || '0');
    }
  });

  // 2. Process Leads (leadsDemandaInlead)
  leadsDemandaInlead.forEach(l => {
    const camp = String(l['utm_campaign'] || '').trim();
    const pg = getPageKey(camp);
    if (pg) {
      if (!inleadPagesData[pg]) {
        inleadPagesData[pg] = { page: pg, investimento: 0, cliques: 0, impressoes: 0, leads: 0, mqls: 0, ingressos: 0, faturamento: 0 };
      }
      inleadPagesData[pg].leads += 1;
      if ((l['clint'] || '').toUpperCase() === 'SIM') {
        inleadPagesData[pg].mqls += 1;
      }
    }
  });

  // 3. Process Sales (ingressosGdInleadList)
  ingressosGdInleadList.forEach(i => {
    const camp = String(i['Utm Campaign'] || i['utm_campaign'] || '').trim();
    const pg = getPageKey(camp);
    if (pg) {
      if (!inleadPagesData[pg]) {
        inleadPagesData[pg] = { page: pg, investimento: 0, cliques: 0, impressoes: 0, leads: 0, mqls: 0, ingressos: 0, faturamento: 0 };
      }
      inleadPagesData[pg].ingressos += 1;
      inleadPagesData[pg].faturamento += parseCurrency(i['Fat. Líquido - Principal'] || '0');
    }
  });

  const inleadPagesBreakdown = Object.values(inleadPagesData).sort((a: any, b: any) => a.page.localeCompare(b.page));

  // --- METEÓRICO PAGES BREAKDOWN (POR PÁGINA PGX) ---
  const meteoricoPagesData: { [page: string]: any } = {};

  const getPgPageKey = (str?: string, pageurl?: string) => {
    if (!str && !pageurl) return null;
    if (str && isC016GoianiaMistagged(str)) {
      return 'PG01';
    }
    if (str) {
      const match = str.match(/\[?\b(PG-?\s*\d+)\b\]?/i) || str.match(/\[?(PG\d+)\]?/i);
      if (match) return match[1].toUpperCase().replace(/[-\s]/g, '');
    }
    if (pageurl) {
      const p = pageurl.toLowerCase();
      if (p.includes('longa') || p.includes('pg04') || p.includes('pg-04')) return 'PG04';
      if (p.includes('captacao-2') || p.includes('pg02') || p.includes('pg-02')) return 'PG02';
      if (p.includes('captacao-3') || p.includes('pg03') || p.includes('pg-03')) return 'PG03';
      if (p.includes('captacao-4') || p.includes('pg04') || p.includes('pg-04')) return 'PG04';
      if (p.includes('captacao') || p.includes('pg01') || p.includes('pg-01')) return 'PG01';
    }
    return null;
  };

  // 1. Process Traffic (fMet)
  fMet.forEach(r => {
    const camp = String(r['NOME DA CAMPANHA'] || r['Nome da Campanha'] || r['campaign_name'] || getCampaignStr(r) || '');
    const pg = getPgPageKey(camp);
    if (pg) {
      if (!meteoricoPagesData[pg]) {
        meteoricoPagesData[pg] = { page: pg, investimento: 0, impressoes: 0, cliques: 0, pageViews: 0, leads: 0, mqls: 0 };
      }
      meteoricoPagesData[pg].investimento += parseCurrency(r['Valor Gasto'] || '0');
      meteoricoPagesData[pg].impressoes += parseNumber(r['Impressões'] || '0');
      meteoricoPagesData[pg].cliques += parseNumber(r['Cliques'] || r['Cliques no link'] || r['Cliques no Link'] || '0');
      meteoricoPagesData[pg].pageViews += parseNumber(r['Page Views'] || r['Visualizações da Página de Destino'] || '0');
    }
  });

  // 2. Process Leads (leadsMet)
  leadsMet.forEach(l => {
    const camp = String(l['utm_campaign'] || l['Utm Campaign'] || '');
    const pg = getPgPageKey(camp, l['pageurl']);
    if (pg) {
      if (!meteoricoPagesData[pg]) {
        meteoricoPagesData[pg] = { page: pg, investimento: 0, impressoes: 0, cliques: 0, pageViews: 0, leads: 0, mqls: 0 };
      }
      meteoricoPagesData[pg].leads += 1;
      if (isMqlLead(l)) {
        meteoricoPagesData[pg].mqls += 1;
      }
    }
  });

  const meteoricoPagesBreakdown = Object.values(meteoricoPagesData).map((d: any) => {
    const cpm = d.impressoes > 0 ? (d.investimento / d.impressoes) * 1000 : 0;
    const ctr = d.impressoes > 0 ? (d.cliques / d.impressoes) * 100 : 0;
    const cpc = d.cliques > 0 ? d.investimento / d.cliques : 0;
    const connectRate = d.cliques > 0 ? (d.pageViews / d.cliques) * 100 : 0;
    const conversaoPagina = d.pageViews > 0 ? (d.leads / d.pageViews) * 100 : 0;
    const custoPorLead = d.leads > 0 ? d.investimento / d.leads : 0;
    const qualificacao = d.leads > 0 ? (d.mqls / d.leads) * 100 : 0;
    const cpmql = d.mqls > 0 ? d.investimento / d.mqls : 0;
    return {
      ...d,
      cpm,
      ctr,
      cpc,
      connectRate,
      conversaoPagina,
      custoPorLead,
      qualificacao,
      cpmql
    };
  }).sort((a: any, b: any) => a.page.localeCompare(b.page));

  // Add fifth option 'GERAL' encompassing all pages if there are pages
  if (meteoricoPagesBreakdown.length > 0) {
    const totalInvestimento = invMet > 0 ? invMet : meteoricoPagesBreakdown.reduce((acc: number, p: any) => acc + (p.investimento || 0), 0);
    const totalImpressoes = impressoesMet > 0 ? impressoesMet : meteoricoPagesBreakdown.reduce((acc: number, p: any) => acc + (p.impressoes || 0), 0);
    const totalCliques = cliquesMet > 0 ? cliquesMet : meteoricoPagesBreakdown.reduce((acc: number, p: any) => acc + (p.cliques || 0), 0);
    const totalPageViews = pageViewsMet > 0 ? pageViewsMet : meteoricoPagesBreakdown.reduce((acc: number, p: any) => acc + (p.pageViews || 0), 0);
    const totalLeads = leadsMet.length > 0 ? leadsMet.length : meteoricoPagesBreakdown.reduce((acc: number, p: any) => acc + (p.leads || 0), 0);
    const totalMqls = getMqls(leadsMet).length > 0 ? getMqls(leadsMet).length : meteoricoPagesBreakdown.reduce((acc: number, p: any) => acc + (p.mqls || 0), 0);

    const cpm = totalImpressoes > 0 ? (totalInvestimento / totalImpressoes) * 1000 : 0;
    const ctr = totalImpressoes > 0 ? (totalCliques / totalImpressoes) * 100 : 0;
    const cpc = totalCliques > 0 ? totalInvestimento / totalCliques : 0;
    const connectRate = totalCliques > 0 ? (totalPageViews / totalCliques) * 100 : 0;
    const conversaoPagina = totalPageViews > 0 ? (totalLeads / totalPageViews) * 100 : 0;
    const custoPorLead = totalLeads > 0 ? totalInvestimento / totalLeads : 0;
    const qualificacao = totalLeads > 0 ? (totalMqls / totalLeads) * 100 : 0;
    const cpmql = totalMqls > 0 ? totalInvestimento / totalMqls : 0;

    meteoricoPagesBreakdown.push({
      page: 'GERAL',
      investimento: totalInvestimento,
      impressoes: totalImpressoes,
      cliques: totalCliques,
      pageViews: totalPageViews,
      leads: totalLeads,
      mqls: totalMqls,
      cpm,
      ctr,
      cpc,
      connectRate,
      conversaoPagina,
      custoPorLead,
      qualificacao,
      cpmql
    });
  }

  const creativesMET = getCreatives(
    fMet.filter(filterAudienceTraffic),
    leadsMet.filter(filterAudienceGeral),
    fIngressos.filter(r => (r['Atribuição'] || '').toLowerCase().includes('meteórico') && filterAudienceIngressos(r)),
    allMetaLookupList,
    rawData.met.filter(r => filterAudienceTraffic(r) && filterMeteoricoTrafficCamp(r))
  );

  const meteoricoCreativesByPage: { [pg: string]: any[] } = {};
  meteoricoPagesBreakdown.forEach((p: any) => {
    const pg = p.page;
    if (pg === 'GERAL') {
      meteoricoCreativesByPage['GERAL'] = creativesMET;
      return;
    }
    const fMetPg = fMet.filter(r => {
      const camp = String(r['NOME DA CAMPANHA'] || r['Nome da Campanha'] || r['campaign_name'] || '');
      return getPgPageKey(camp) === pg;
    });
    const leadsMetPg = leadsMet.filter(l => {
      const camp = String(l['utm_campaign'] || l['Utm Campaign'] || '');
      return getPgPageKey(camp, l['pageurl']) === pg;
    });
    meteoricoCreativesByPage[pg] = getCreatives(
      fMetPg.filter(filterAudienceTraffic),
      leadsMetPg.filter(filterAudienceGeral),
      fIngressos.filter(r => (r['Atribuição'] || '').toLowerCase().includes('meteórico') && filterAudienceIngressos(r)),
      allMetaLookupList,
      rawData.met.filter(r => filterAudienceTraffic(r) && filterMeteoricoTrafficCamp(r))
    );
  });

  // Calculate Meteorico Públicos (extract pure audience name from Ad Sets and utm_term)
  const normTerm = (s: string) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  
  // Index filtered Meteórico leads by extracted publico name
  const metLeadsByPublico = new Map<string, any[]>();
  leadsMet.filter(filterAudienceGeral).forEach(l => {
    const rawTerm = String(l['utm_term'] || l['Utm Term'] || '').trim();
    if (!rawTerm || rawTerm === 'term' || rawTerm === '{{adset.name}}') return;
    const pubName = extractPublicoName(rawTerm);
    if (!pubName) return;
    const key = normTerm(pubName);
    if (!metLeadsByPublico.has(key)) metLeadsByPublico.set(key, []);
    metLeadsByPublico.get(key)!.push(l);
  });

  // Group traffic data by extracted publico name
  const publicosMap = new Map<string, {
    nome: string;
    investimento: number;
    impressoes: number;
    cliques: number;
  }>();

  fMet.filter(filterAudienceTraffic).forEach(r => {
    const rawAdSet = String(r['NOME DO CONJUNTO'] || r['Nome do Conjunto'] || r['adset_name'] || '').trim();
    if (!rawAdSet) return;
    const pubName = extractPublicoName(rawAdSet);
    if (!pubName) return;
    const key = normTerm(pubName);
    if (!publicosMap.has(key)) {
      publicosMap.set(key, {
        nome: pubName,
        investimento: 0,
        impressoes: 0,
        cliques: 0
      });
    }
    const item = publicosMap.get(key)!;
    item.investimento += parseCurrency(r['Valor Gasto'] || '0');
    item.impressoes += parseNumber(r['Impressões'] || '0');
    item.cliques += parseNumber(r['Cliques'] || r['Cliques no link'] || r['Cliques no Link'] || '0');
  });

  // Also ensure any publicos that exist in leads but had 0 traffic in the period are included
  metLeadsByPublico.forEach((leads, key) => {
    if (!publicosMap.has(key)) {
      const pubName = extractPublicoName(leads[0]?.['utm_term'] || leads[0]?.['Utm Term'] || key);
      publicosMap.set(key, {
        nome: pubName,
        investimento: 0,
        impressoes: 0,
        cliques: 0
      });
    }
  });

  // Group leads without utm_term as "Direto / Orgânico / Sem utm_term" if any exist
  const leadsSemTerm = leadsMet.filter(filterAudienceGeral).filter(l => {
    const rawTerm = String(l['utm_term'] || l['Utm Term'] || '').trim();
    return !rawTerm || rawTerm === 'term' || rawTerm === '{{adset.name}}';
  });
  if (leadsSemTerm.length > 0) {
    const key = 'direto_organico';
    metLeadsByPublico.set(key, leadsSemTerm);
    if (!publicosMap.has(key)) {
      publicosMap.set(key, {
        nome: 'Direto / Orgânico / Sem utm_term',
        investimento: 0,
        impressoes: 0,
        cliques: 0
      });
    }
  }

  const meteoricoPublicos = Array.from(publicosMap.entries()).map(([key, pub]) => {
    const matchedLeads = metLeadsByPublico.get(key) || [];
    const leadsCount = matchedLeads.length;
    const mqlsCount = getMqls(matchedLeads).length;
    const custoPorLead = leadsCount > 0 ? pub.investimento / leadsCount : 0;
    const custoPorMql = mqlsCount > 0 ? pub.investimento / mqlsCount : 0;
    const qualificacao = leadsCount > 0 ? (mqlsCount / leadsCount) * 100 : 0;

    return {
      nome: pub.nome,
      investimento: pub.investimento,
      impressoes: pub.impressoes,
      cliques: pub.cliques,
      leads: leadsCount,
      custoPorLead,
      mqls: mqlsCount,
      custoPorMql,
      qualificacao,
      pesquisa: matchedLeads
    };
  }).sort((a, b) => {
    if (b.investimento !== a.investimento) return b.investimento - a.investimento;
    return b.leads - a.leads;
  });

  // Group Meteorico leads by PG (e.g. PG01, PG02, PG03, PG04)
  const meteoricoLeadsByPage: { [pg: string]: any[] } = {};
  leadsMet.filter(filterAudienceGeral).forEach(l => {
    const camp = String(l['utm_campaign'] || l['Utm Campaign'] || '');
    const pg = getPgPageKey(camp, l['pageurl']);
    if (pg) {
      if (!meteoricoLeadsByPage[pg]) meteoricoLeadsByPage[pg] = [];
      meteoricoLeadsByPage[pg].push(l);
    }
  });

  return {
    ticketsByTypes: {
      visaoGeral: countTicketTypes(fIngressos),
      demanda: countTicketTypes(allIngGd),
      vendaDireta: countTicketTypes(allIngVd),
      meteorico: countTicketTypes(fIngressos.filter(r => (r['Atribuição'] || '').toLowerCase().includes('meteórico'))),
      distribuicao: countTicketTypes(fIngressos.filter(r => (r['Atribuição'] || '').toLowerCase().includes('distribuição de conteúdo') || (r['Atribuição'] || '').toLowerCase().includes('distribuicao'))),
    },
    visaoGeral: {
      chartData: chartGeral
    },
    investimentoTotal,
    faturamentoTotal,
    totalIngressos,
    ingressosVendidos,
    ingressosSemRastreamento,
    
    
    meteorico: {
      investimento: invMet,
      faturamento: fatMet,
      ingressos: ingMet,
      leads: leadsMet.length,
      mqls: getMqls(leadsMet).length,
      impressoes: impressoesMet,
      cliques: cliquesMet,
      alcance: alcanceMet,
      pageViews: pageViewsMet,
      ctr: ctrMet,
      cpc: cpcMet,
      connectRate: connectRateMet,
      conversaoPagina: conversaoPaginaMet,
      frequencia: frequenciaMet,
      chartData: chartMET,
      funilPages: meteoricoPagesBreakdown,
      leadsData: leadsMet,
      creativesByPage: meteoricoCreativesByPage,
      publicos: meteoricoPublicos,
      leadsByPage: meteoricoLeadsByPage,
      sendflow: {
        hasData: hasSendflowData,
        totalPessoas: totalSendflowPessoas,
        custoPorPessoa: custoPorPessoaNoGrupo,
        taxaEntrada: taxaEntradaMedia,
        chartData: sendflowChartData
      }
    },
    demanda: {
      investimento: invGdForm + invGdCaptura + invGdInlead,
      faturamento: fatGd,
      ingressos: allIngGd.length,
      ingressosOrganico: ingGdOrganico,
      leads: leadsDemanda.length,
      mqls: getMqls(leadsDemanda).length,
      formNativo: {
        investimento: invGdForm,
        leads: leadsDemandaForm.length,
        mqls: getMqls(leadsDemandaForm).length,
        ingressos: ingGdForm,
        chartData: chartGdForm,
      },
      captura: {
        investimento: invGdCaptura,
        leads: leadsDemandaCaptura.length,
        mqls: getMqls(leadsDemandaCaptura).length,
        ingressos: ingGdCaptura,
        chartData: chartGdCaptura,
        conversaoDiariaPaginas: calcConversaoPaginasDiaria(leadsDemandaCaptura, fGdCaptura),
      },
      inlead: {
        investimento: invGdInlead,
        leads: leadsDemandaInlead.length,
        mqls: getMqls(leadsDemandaInlead).length,
        ingressos: ingGdInlead,
        chartData: chartGdInlead,
        pagesBreakdown: inleadPagesBreakdown,
      },
      estudoPublico
    },
    vendaDireta: {
      investimento: invVD,
      faturamento: fatVD,
      ingressos: ingVD,
      ingressosOrganico: ingVDOrganico,
      ingressosTrafego: ingVDTrafego,
      leadsTrafego: leadsVDTrafego.length,
      leadsTotal: allLeadsVD.length,
      mqls: getMqls(leadsVDTrafego).length,
      chartData: chartVD,
    },
    distribuicao: {
      investimento: invDC,
      chartData: chartDc,
      etapas: etapas,
    },
    distribuicaoKlt: {
      investimento: invDCKlt,
      chartData: chartDcKlt,
      etapas: etapasKlt,
    },
    distribuicaoCorredor: {
      investimento: invDCCorredor,
      chartData: chartDcCorredor,
      etapas: etapasCorredor,
    },
    distribuicaoRemarketing: {
      investimento: invDCRemarketing,
      chartData: chartDcRemarketing,
      etapas: etapasRemarketing,
    },
    
    creativesForm: getCreatives(fGdForm.filter(filterAudienceTraffic), leadsDemandaForm.filter(filterAudienceGeral), ingressosGdFormList.filter(filterAudienceIngressos), rawData.gd, rawData.gd.filter(isForm).filter(filterAudienceTraffic)),
    creativesCaptura: getCreatives(fGdCaptura.filter(filterAudienceTraffic), leadsDemandaCaptura.filter(filterAudienceGeral), ingressosGdCapturaList.filter(filterAudienceIngressos), rawData.gd, rawData.gd.filter(isCaptura).filter(filterAudienceTraffic)),
    creativesInlead: getCreatives(fGdInlead.filter(filterAudienceTraffic), leadsDemandaInlead.filter(filterAudienceGeral), ingressosGdInleadList.filter(filterAudienceIngressos), rawData.gd, rawData.gd.filter(isInlead).filter(filterAudienceTraffic)),
    creativesVD: getCreatives(fVd.filter(filterAudienceTraffic), allLeadsVD.filter(filterAudienceGeral), ingressosVDTrafegoList.filter(filterAudienceIngressos), rawData.vd, rawData.vd.filter(filterAudienceTraffic)),
    creativesMET: creativesMET,
    creativesDC: getCreatives(
      fDc.filter(r => filterAudienceTraffic(r)), 
      [], [], mappedDc, 
      mappedDc.filter(r => filterAudienceTraffic(r))
    ),
    creativesDcKlt: getCreatives(
      fDcKlt.filter(r => filterAudienceTraffic(r)), 
      [], [], mappedDc.filter(r => (r['Atribuição'] || '').toLowerCase() !== 'remarketing'), 
      mappedDc.filter(r => (r['Atribuição'] || '').toLowerCase() !== 'remarketing').filter(r => filterAudienceTraffic(r))
    ),
    creativesDcCorredor: getCreatives(
      fDcCorredor.filter(r => filterAudienceTraffic(r)), 
      [], [], mappedDcCorredor, 
      mappedDcCorredor.filter(r => filterAudienceTraffic(r))
    ),
    creativesDcRemarketing: getCreatives(
      fDcRemarketing.filter(r => filterAudienceTraffic(r)), 
      [], [], mappedDc.filter(r => (r['Atribuição'] || '').toLowerCase() === 'remarketing'), 
      mappedDc.filter(r => (r['Atribuição'] || '').toLowerCase() === 'remarketing').filter(r => filterAudienceTraffic(r))
    ),
    pesquisa: fGeral,
    ingressosData: fIngressos
  };
}

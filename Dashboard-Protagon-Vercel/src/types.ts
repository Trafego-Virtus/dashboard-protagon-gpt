export interface DashboardDataRow {
  date: string;
  parsedDate: Date | null;
  investimentoTotal: number;
  ingressos: number;
  investimentoDistribuicao: number;
  
  investimentoMeteorico: number;
  faturamentoMeteorico: number;
  ingressosMeteorico: number;
  leadsMeteorico: number;
  mqlsMeteorico: number;
  
  investimentoVendaDireta: number;
  faturamentoVendaDireta: number;
  ingressosVendaDireta: number;
  leadsVendaDireta: number;
  mqlsVendaDireta: number;
  
  investimentoGeracaoDemanda: number;
  faturamentoGeracaoDemanda: number;
  ingressosGeracaoDemanda: number;
  leadsGeracaoDemanda: number;
  mqlsGeracaoDemanda: number;
  
  faturamento: number;
}

export interface PesquisaRow {
  data_hora: string;
  nome: string;
  email: string;
  numero: string;
  renda: string;
  escolaridade: string;
  atuacao: string;
  estado_civil: string;
  tempo_wendell: string;
  tags: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  acao: string;
  [key: string]: any;
}

export interface CreativeDataRow {
  ativo?: boolean;
  pracas?: string[];
  campanhas?: string[];
  nome: string;
  thumbnail: string;
  link: string;
  investimento: number;
  cliques: number;
  impressoes: number;
  alcance: number;
  view3s: number;
  view25: number;
  view50?: number;
  view75?: number;
  view95?: number;
  thruplays: number;
  visitasPerfil: number;
  leads: number;
  mqls: number;
  ingressos: number;
  respostasRenda?: number;
  rendaAcima5k?: number;
  funnel: 'meteorico' | 'geracao-demanda' | 'venda-direta' | 'distribuicao';
  pesquisa: any[];
  atribuicao?: string;
}

export type MqlRule = 'padrao' | '7.5k' | '10k' | '20k' | '30k';

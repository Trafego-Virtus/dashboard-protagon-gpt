export type FunilType = 
  | 'geracao-demanda-form'
  | 'venda-direta'
  | 'geracao-demanda-captura'
  | 'meteorico';

export type KpiKey = 
  | 'custo_mql'
  | 'cpm'
  | 'cpc'
  | 'ctr'
  | 'hook_rate'
  | 'hook_marcos'
  | 'conversao_pagina';

export type StatusTeste = 'ativo' | 'inativo' | 'concluido';

export type ResultadoTeste = 'positivo' | 'negativo' | 'inconclusivo';

export interface KpiReference {
  ruim: number;      // P25
  medio: number;     // P50
  excelente: number; // P75
  unit: 'currency' | 'percent' | 'number';
  direction: 'lower_is_better' | 'higher_is_better';
  label: string;
}

export interface FunilKpiConfig {
  id: FunilType;
  nome: string;
  baseVideos: number;
  descricao: string;
  kpis: Partial<Record<KpiKey, KpiReference>>;
  cacEstimado?: {
    cenarioRuim: { taxa: string; cac: number; mqlsPorVenda: number };
    cenarioMedio: { taxa: string; cac: number; mqlsPorVenda: number };
    cenarioExcelente: { taxa: string; cac: number; mqlsPorVenda: number };
  };
  variaveisRecomendadas: Partial<Record<KpiKey, string[]>>;
}

export interface CampanhaVinculada {
  id: string;
  nome: string;
  status: 'ATIVA' | 'PAUSADA';
  gasto: number;
  cliques: number;
  mqls: number;
  ctr: number;
  cpm: number;
  cpc: number;
  custoPorMql: number;
  gastoHoje?: number;
  gastoTotal?: number;
  dataReferencia?: string;
}

export interface CriativoValidado {
  id: string;
  nome: string;
  kpiValor: number;
  kpiLabel?: string;
  observacoes?: string;
}

export interface FeedbackTeste {
  dataConclusao: string;
  resultado: ResultadoTeste;
  metricaFinal: number;
  variacaoPercentual: number;
  aprendizado: string;
  decisao: 'escalar' | 'descartar' | 'iterar' | 'ajustar_orcamento';
  observacoes?: string;
  criativosValidados?: CriativoValidado[];
}

export interface TesteAgil {
  id: string;
  nome: string;
  praca: string;
  evento: string; // "PROTAGON"
  tipoFunil: FunilType;
  kpiAlvo: KpiKey;
  
  baseline: number;
  metaAlvo: number;
  excelenteRef: number;
  
  variavelUnica: string;
  hipotese: string;
  
  campanhasVinculadas: CampanhaVinculada[];
  
  dataInicio: string; // YYYY-MM-DD
  duracaoDias: 3 | 7 | 14 | number;
  dataProximoFeedback: string; // YYYY-MM-DD
  
  status: StatusTeste;
  feedback?: FeedbackTeste;
  
  criadoEm: string;
  atualizadoEm: string;
}

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, Target, Plus, Minus, SlidersHorizontal
} from 'lucide-react';
import { 
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ReferenceLine 
} from 'recharts';
import { format, differenceInDays, addDays, parseISO, startOfToday, isValid } from 'date-fns';
import { formatCurrency, formatNumber } from '../utils/format';
import { RawDashboardData } from '../utils/dataFetching';
import { ProcessedMetrics, processDashboardMetrics } from '../utils/metricsCalculator';

interface PrevisoesProps {
  metrics: ProcessedMetrics;
  rawData: RawDashboardData;
  dashboardId?: string;
  diasFiltro?: number;
  goals?: any;
}

export function Previsoes({ metrics, rawData, dashboardId = 'protagon-joinville' }: PrevisoesProps) {
  const storageKey = `previsoes_params_${dashboardId}`;

  const defaultTargetDate = useMemo(() => {
    return format(addDays(startOfToday(), 45), 'yyyy-MM-dd');
  }, []);

  const savedParams = useMemo(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      // ignore
    }
    return null;
  }, [storageKey]);

  // Primeiro dado: último dia de venda de ingressos
  const [dataFimVendas, setDataFimVendas] = useState<string>(
    savedParams?.dataFimVendas || defaultTargetDate
  );

  // Meta de Ingressos
  const [metaIngressos, setMetaIngressos] = useState<number>(
    savedParams?.metaIngressos ?? (metrics.ingressosVendidos > 0 ? Math.ceil(metrics.ingressosVendidos * 1.5 / 50) * 50 : 500)
  );

  // Variáveis em tempo real
  const [investimentoRestante, setInvestimentoRestante] = useState<number>(
    savedParams?.investimentoRestante ?? 40000
  );

  const [custoPorMql, setCustoPorMql] = useState<number>(
    savedParams?.custoPorMql ?? 18.0
  );

  const [taxaConversaoComercial, setTaxaConversaoComercial] = useState<number>(
    savedParams?.taxaConversaoComercial ?? 3.5
  );

  // Persistência
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        dataFimVendas,
        metaIngressos,
        investimentoRestante,
        custoPorMql,
        taxaConversaoComercial
      }));
    } catch (e) {
      // ignore
    }
  }, [storageKey, dataFimVendas, metaIngressos, investimentoRestante, custoPorMql, taxaConversaoComercial]);

  // Métricas acumuladas até o momento (ignora filtros de data do dashboard, contabiliza tudo)
  const allTimeMetrics = useMemo(() => {
    if (!rawData) return metrics;
    try {
      const today = format(startOfToday(), 'yyyy-MM-dd');
      return processDashboardMetrics(rawData, '2000-01-01', today, 'all');
    } catch (e) {
      return metrics;
    }
  }, [rawData, metrics]);

  // Ingressos e Investimento já realizados (acumulado total até o momento)
  const ingressosAtuais = allTimeMetrics.ingressosVendidos || allTimeMetrics.totalIngressos || 0;
  const investimentoAtual = allTimeMetrics.investimentoTotal || 0;

  // Dias restantes
  const diasRestantes = useMemo(() => {
    try {
      const parsedEnd = parseISO(dataFimVendas);
      if (!isValid(parsedEnd)) return 30;
      const today = startOfToday();
      const diff = differenceInDays(parsedEnd, today);
      return Math.max(1, diff);
    } catch (e) {
      return 30;
    }
  }, [dataFimVendas]);

  // Cálculos de Pace
  const ingressosFaltantes = Math.max(0, metaIngressos - ingressosAtuais);
  const paceNecessario = diasRestantes > 0 ? ingressosFaltantes / diasRestantes : 0;

  const mqlsProjetados = custoPorMql > 0 ? Math.floor(investimentoRestante / custoPorMql) : 0;
  const novosIngressosProjetados = Math.round(mqlsProjetados * (taxaConversaoComercial / 100));
  const totalIngressosProjetados = ingressosAtuais + novosIngressosProjetados;
  const paceProjetado = diasRestantes > 0 ? novosIngressosProjetados / diasRestantes : 0;

  const diferencaMeta = totalIngressosProjetados - metaIngressos;
  const atingiuMeta = totalIngressosProjetados >= metaIngressos;
  const cacProjetado = novosIngressosProjetados > 0 ? investimentoRestante / novosIngressosProjetados : 0;

  // Dados do gráfico
  const chartData = useMemo(() => {
    const points: any[] = [];
    const today = startOfToday();

    for (let i = 0; i <= diasRestantes; i++) {
      const currentDate = addDays(today, i);
      const dateFormatted = format(currentDate, 'dd/MM');

      points.push({
        dataStr: dateFormatted,
        metaIdeal: Math.round(ingressosAtuais + (paceNecessario * i)),
        cenarioProjetado: Math.round(ingressosAtuais + (paceProjetado * i))
      });
    }

    return points;
  }, [ingressosAtuais, paceNecessario, paceProjetado, diasRestantes]);

  return (
    <div className="space-y-5 pb-16 text-zinc-200">
      
      {/* 1. Header Minimalista: Primeiro dado (Data Final) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Target size={18} className="text-yellow-500" />
            Previsões
          </h2>
          <p className="text-xs text-zinc-400">
            Simulação de Pace e projeção de alcance da meta de ingressos até o fechamento
          </p>
        </div>

        {/* Último dia de venda de ingressos */}
        <div className="flex items-center gap-2.5 bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 self-start sm:self-auto">
          <Calendar size={15} className="text-yellow-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-400 uppercase font-semibold">Último dia de vendas</span>
            <input 
              type="date" 
              value={dataFimVendas}
              onChange={(e) => setDataFimVendas(e.target.value)}
              className="bg-transparent text-white text-xs font-mono font-medium outline-none cursor-pointer"
            />
          </div>
          <span className="ml-2 pl-2.5 border-l border-white/10 text-xs font-mono text-yellow-400 font-bold">
            {diasRestantes}d
          </span>
        </div>
      </div>

      {/* 2. Grid de Conteúdo: Controles à Esquerda e Gráfico à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Painel de Variáveis (4 Colunas) */}
        <div className="lg:col-span-4 bg-zinc-900/60 border border-white/5 rounded-xl p-4 space-y-4">
          
          {/* Meta de Ingressos */}
          <div className="space-y-1.5 pb-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Meta de Ingressos</label>
              <span className="text-[11px] text-zinc-400 font-mono">
                Ingressos: <strong className="text-zinc-200">{formatNumber(ingressosAtuais)}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setMetaIngressos(prev => Math.max(ingressosAtuais, prev - 50))}
                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 text-xs transition-colors"
                title="-50 ingressos"
              >
                <Minus size={13} />
              </button>
              <input 
                type="number"
                min={ingressosAtuais}
                step={10}
                value={metaIngressos}
                onChange={(e) => setMetaIngressos(Math.max(0, parseInt(e.target.value) || 0))}
                className="flex-1 bg-zinc-950 border border-white/10 focus:border-yellow-500 text-center font-mono text-base font-bold text-yellow-400 py-1 rounded outline-none"
              />
              <button
                onClick={() => setMetaIngressos(prev => prev + 50)}
                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 text-xs transition-colors"
                title="+50 ingressos"
              >
                <Plus size={13} />
              </button>
            </div>
            <div className="text-[11px] text-zinc-400 flex justify-between">
              <span>Faltam: <strong className="text-yellow-400 font-mono">{ingressosFaltantes}</strong></span>
              <span>Pace Necessário: <strong className="text-yellow-400 font-mono">{paceNecessario.toFixed(2)}/dia</strong></span>
            </div>
            <div className="text-[10px] text-zinc-500 pt-1 font-mono flex justify-between border-t border-white/5">
              <span>Investimento já realizado:</span>
              <strong className="text-zinc-400">{formatCurrency(investimentoAtual)}</strong>
            </div>
          </div>

          {/* Variáveis em tempo real */}
          <div className="space-y-3.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal size={13} className="text-cyan-400" />
                Variáveis do Cenário
              </span>
            </div>

            {/* Investimento Restante */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Investimento Restante</span>
                <span className="font-mono font-bold text-emerald-400">{formatCurrency(investimentoRestante)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setInvestimentoRestante(prev => Math.max(0, prev - 2500))}
                  className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 text-xs"
                >
                  <Minus size={11} />
                </button>
                <input 
                  type="range"
                  min={0}
                  max={200000}
                  step={1000}
                  value={investimentoRestante}
                  onChange={(e) => setInvestimentoRestante(Number(e.target.value))}
                  className="flex-1 accent-emerald-400 h-1.5 bg-zinc-950 rounded cursor-pointer"
                />
                <button 
                  onClick={() => setInvestimentoRestante(prev => prev + 2500)}
                  className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 text-xs"
                >
                  <Plus size={11} />
                </button>
              </div>
            </div>

            {/* Custo por MQL */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Custo por MQL</span>
                <span className="font-mono font-bold text-yellow-400">{formatCurrency(custoPorMql)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCustoPorMql(prev => Math.max(1, Number((prev - 1).toFixed(1))))}
                  className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 text-xs"
                >
                  <Minus size={11} />
                </button>
                <input 
                  type="range"
                  min={3}
                  max={60}
                  step={0.5}
                  value={custoPorMql}
                  onChange={(e) => setCustoPorMql(Number(e.target.value))}
                  className="flex-1 accent-yellow-400 h-1.5 bg-zinc-950 rounded cursor-pointer"
                />
                <button 
                  onClick={() => setCustoPorMql(prev => Number((prev + 1).toFixed(1)))}
                  className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 text-xs"
                >
                  <Plus size={11} />
                </button>
              </div>
            </div>

            {/* Conversão Comercial */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Conversão Comercial</span>
                <span className="font-mono font-bold text-cyan-400">{taxaConversaoComercial.toFixed(2)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setTaxaConversaoComercial(prev => Math.max(0.1, Number((prev - 0.2).toFixed(1))))}
                  className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 text-xs"
                >
                  <Minus size={11} />
                </button>
                <input 
                  type="range"
                  min={0.2}
                  max={12}
                  step={0.1}
                  value={taxaConversaoComercial}
                  onChange={(e) => setTaxaConversaoComercial(Number(e.target.value))}
                  className="flex-1 accent-cyan-400 h-1.5 bg-zinc-950 rounded cursor-pointer"
                />
                <button 
                  onClick={() => setTaxaConversaoComercial(prev => Number((prev + 0.2).toFixed(1)))}
                  className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 text-xs"
                >
                  <Plus size={11} />
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Gráfico & Resumo Direto (8 Colunas) */}
        <div className="lg:col-span-8 bg-zinc-900/60 border border-white/5 rounded-xl p-4 space-y-3">
          
          {/* Linha de Indicadores Síntese */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            <div className="bg-zinc-950/50 p-2 rounded-lg border border-white/5">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block truncate">Ingressos Realizados</span>
              <span className="text-base font-black font-mono text-white">{formatNumber(ingressosAtuais)}</span>
              <span className="text-[10px] text-zinc-500 block font-mono truncate">{formatCurrency(investimentoAtual)}</span>
            </div>

            <div className="bg-zinc-950/50 p-2 rounded-lg border border-white/5">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block truncate">Meta Final</span>
              <span className="text-base font-black font-mono text-yellow-400">{formatNumber(metaIngressos)}</span>
              <span className="text-[10px] text-zinc-500 block font-mono truncate">Pace: {paceNecessario.toFixed(1)}/dia</span>
            </div>

            <div className="bg-zinc-950/50 p-2 rounded-lg border border-white/5">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block truncate">Total Projetado</span>
              <span className="text-base font-black font-mono text-cyan-400">{formatNumber(totalIngressosProjetados)}</span>
              <span className="text-[10px] text-zinc-500 block font-mono truncate">Pace: {paceProjetado.toFixed(1)}/dia</span>
            </div>

            <div className="bg-zinc-950/50 p-2 rounded-lg border border-white/5">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block truncate">Saldo vs Meta</span>
              <span className={`text-base font-black font-mono ${atingiuMeta ? 'text-emerald-400' : 'text-amber-400'}`}>
                {diferencaMeta >= 0 ? `+${diferencaMeta}` : diferencaMeta}
              </span>
              <span className="text-[10px] text-zinc-500 block font-mono truncate">
                {atingiuMeta ? 'Atinge a meta' : 'Abaixo da meta'}
              </span>
            </div>

            <div className="bg-zinc-950/50 p-2 rounded-lg border border-white/5 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block truncate">CAC Projetado</span>
              <span className="text-base font-black font-mono text-white">{formatCurrency(cacProjetado)}</span>
              <span className="text-[10px] text-zinc-500 block font-mono truncate">+{novosIngressosProjetados} ingressos</span>
            </div>
          </div>

          {/* Gráfico Simples e Direto */}
          <div className="h-[340px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                
                <XAxis 
                  dataKey="dataStr" 
                  stroke="#71717a" 
                  fontSize={11}
                  tickLine={false}
                  interval={Math.max(1, Math.floor(diasRestantes / 7))}
                />
                
                <YAxis 
                  stroke="#71717a" 
                  fontSize={11}
                  tickLine={false}
                  domain={[ingressosAtuais, Math.max(metaIngressos, totalIngressosProjetados) * 1.05]}
                />

                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    borderColor: '#3f3f46',
                    borderRadius: '0.5rem',
                    fontSize: '12px'
                  }}
                  formatter={(val: any, name: string) => [
                    `${val} ing`, 
                    name === 'metaIdeal' ? 'Meta (Ideal)' : 'Cenário Projetado'
                  ]}
                />

                <Legend 
                  verticalAlign="top"
                  height={32}
                  formatter={(val) => (
                    <span className="text-xs font-medium text-zinc-300">
                      {val === 'metaIdeal' ? `Meta Ideal (Pace: ${paceNecessario.toFixed(1)}/dia)` : `Cenário Pilotado (Pace: ${paceProjetado.toFixed(1)}/dia)`}
                    </span>
                  )}
                />

                <ReferenceLine 
                  y={metaIngressos} 
                  stroke="#eab308" 
                  strokeDasharray="3 3" 
                  opacity={0.6}
                />

                <Line 
                  type="monotone" 
                  dataKey="metaIdeal" 
                  stroke="#eab308" 
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />

                <Line 
                  type="monotone" 
                  dataKey="cenarioProjetado" 
                  stroke="#06b6d4" 
                  strokeWidth={2.5}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

        </div>

      </div>

    </div>
  );
}

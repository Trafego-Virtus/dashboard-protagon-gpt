import React, { useState } from 'react';
import { FeedbackKPIsSummary, FunnelFeedbackAnalysis } from '../../utils/feedbackKpiCalculator';
import { BenchmarkMetric, classifyMetric } from '../../data/benchmarkReferences';
import { MetricImpactModal } from './MetricImpactModal';
import { CACComparisonCard } from './CACComparisonCard';
import { formatCurrency, formatNumber } from '../../utils/format';
import { 
  CheckCircle2, AlertTriangle, AlertCircle, 
  Layers, ChevronDown, ChevronUp, Sparkles, Target, ArrowRight,
  BarChart2, PieChart, Activity
} from 'lucide-react';

interface BenchmarkComparisonSectionProps {
  summary: FeedbackKPIsSummary;
  selectedPracasLabel?: string;
  startDate?: string;
  endDate?: string;
}

interface ActiveModalState {
  metric: BenchmarkMetric;
  currentValue: number;
  funnelName: string;
  averageSpend: number;
  creatives: any[];
}

export function BenchmarkComparisonSection({ 
  summary,
  selectedPracasLabel = 'Todas as Praças',
  startDate,
  endDate
}: BenchmarkComparisonSectionProps) {
  const [selectedFunnelKey, setSelectedFunnelKey] = useState<'all' | 'vd' | 'gdForm' | 'gdCaptura' | 'gdInlead' | 'meteorico'>('all');
  const [activeModal, setActiveModal] = useState<ActiveModalState | null>(null);

  const funnelsList: { key: 'vd' | 'gdForm' | 'gdCaptura' | 'gdInlead' | 'meteorico'; data: FunnelFeedbackAnalysis }[] = [
    { key: 'vd', data: summary.funnels.vd },
    { key: 'gdForm', data: summary.funnels.gdForm },
    { key: 'gdCaptura', data: summary.funnels.gdCaptura },
    { key: 'gdInlead', data: summary.funnels.gdInlead },
    { key: 'meteorico', data: summary.funnels.meteorico },
  ];

  const filteredFunnels = selectedFunnelKey === 'all' 
    ? funnelsList 
    : funnelsList.filter(f => f.key === selectedFunnelKey);

  // Compute total compiled counts dynamically based on the active filter
  const totalExcelente = filteredFunnels.reduce((acc, f) => acc + f.data.outlierKpiCount.excelente, 0);
  const totalMedio = filteredFunnels.reduce((acc, f) => acc + f.data.outlierKpiCount.medio, 0);
  const totalRuim = filteredFunnels.reduce((acc, f) => acc + f.data.outlierKpiCount.ruim, 0);
  const totalKpis = totalExcelente + totalMedio + totalRuim;

  const percExcelente = totalKpis > 0 ? (totalExcelente / totalKpis) * 100 : 0;
  const percMedio = totalKpis > 0 ? (totalMedio / totalKpis) * 100 : 0;
  const percRuim = totalKpis > 0 ? (totalRuim / totalKpis) * 100 : 0;

  const formatDateBR = (isoStr?: string) => {
    if (!isoStr) return '';
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const getActiveFunnelLabel = () => {
    switch (selectedFunnelKey) {
      case 'vd': return 'Venda Direta';
      case 'gdForm': return 'GD Formulário';
      case 'gdCaptura': return 'GD Captura';
      case 'gdInlead': return 'GD Inlead';
      case 'meteorico': return 'Meteórico';
      default: return 'Todos os Funis';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Compilado Geral de Desempenho dos KPIs (Top Banner com Semáforo) */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 font-bold">
              <Activity size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight uppercase">
                  Compilado de Desempenho dos KPIs
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 font-bold uppercase">
                  Semáforo Global
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Total consolidado de métricas no cenário do filtro atual
              </p>
            </div>
          </div>

          {/* Active Filter Tags */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-zinc-800 border border-white/5 text-zinc-300 font-medium">
              Praça: <strong className="text-white">{selectedPracasLabel}</strong>
            </span>
            {startDate && endDate && (
              <span className="px-2.5 py-1 rounded-lg bg-zinc-800 border border-white/5 text-zinc-300 font-medium">
                Período: <strong className="text-yellow-400">{formatDateBR(startDate)} a {formatDateBR(endDate)}</strong>
              </span>
            )}
            <span className="px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-semibold">
              {getActiveFunnelLabel()} ({totalKpis} KPIs)
            </span>
          </div>
        </div>

        {/* 3 Metric Compile Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Excelente */}
          <div className="p-4 rounded-xl border bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={16} />
                KPIs Excelentes
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Meta Ideal
              </span>
            </div>
            <div className="my-2">
              <span className="text-3xl font-black text-white">{totalExcelente}</span>
              <span className="text-xs text-emerald-400/80 font-semibold ml-2">
                ({percExcelente.toFixed(0)}% do filtro)
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Métricas no topo de performance. Prontas para escala de orçamento.
            </p>
          </div>

          {/* Médio */}
          <div className="p-4 rounded-xl border bg-amber-950/20 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.08)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={16} />
                KPIs na Média
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Equilíbrio
              </span>
            </div>
            <div className="my-2">
              <span className="text-3xl font-black text-white">{totalMedio}</span>
              <span className="text-xs text-amber-400/80 font-semibold ml-2">
                ({percMedio.toFixed(0)}% do filtro)
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Operação sustentável e estável. Manter ativos com ajustes graduais.
            </p>
          </div>

          {/* Ruim */}
          <div className="p-4 rounded-xl border bg-rose-950/20 border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.08)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle size={16} />
                KPIs Ruins
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Alerta Crítico
              </span>
            </div>
            <div className="my-2">
              <span className="text-3xl font-black text-white">{totalRuim}</span>
              <span className="text-xs text-rose-400/80 font-semibold ml-2">
                ({percRuim.toFixed(0)}% do filtro)
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Abaixo da tolerância. Desacelerar verba ou pausar para diagnóstico.
            </p>
          </div>
        </div>
      </div>

      {/* Filtros por Funil (Minimalista) */}
      <div className="flex flex-wrap items-center gap-1.5 py-1">
        <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mr-1 flex items-center gap-1.5">
          <Layers size={13} className="text-yellow-500" />
          Filtrar Funil:
        </span>
        <button
          onClick={() => setSelectedFunnelKey('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            selectedFunnelKey === 'all'
              ? 'bg-yellow-500 text-black shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
          }`}
        >
          Todos os Funis
        </button>
        <button
          onClick={() => setSelectedFunnelKey('vd')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            selectedFunnelKey === 'vd'
              ? 'bg-yellow-500 text-black shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
          }`}
        >
          Venda Direta
        </button>
        <button
          onClick={() => setSelectedFunnelKey('gdForm')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            selectedFunnelKey === 'gdForm'
              ? 'bg-yellow-500 text-black shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
          }`}
        >
          GD Formulário
        </button>
        <button
          onClick={() => setSelectedFunnelKey('gdCaptura')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            selectedFunnelKey === 'gdCaptura'
              ? 'bg-yellow-500 text-black shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
          }`}
        >
          GD Captura
        </button>
        <button
          onClick={() => setSelectedFunnelKey('gdInlead')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            selectedFunnelKey === 'gdInlead'
              ? 'bg-yellow-500 text-black shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
          }`}
        >
          GD Inlead
        </button>
        <button
          onClick={() => setSelectedFunnelKey('meteorico')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            selectedFunnelKey === 'meteorico'
              ? 'bg-yellow-500 text-black shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
          }`}
        >
          Meteórico
        </button>
      </div>

      {/* Funnels Clean List */}
      <div className="space-y-6">
        {filteredFunnels.map(({ key, data }) => {
          const bm = data.benchmark;

          return (
            <div
              key={key}
              className="bg-zinc-900/70 border border-white/10 rounded-2xl overflow-hidden shadow-xl"
            >
              {/* Funnel Clean Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center font-bold text-yellow-500">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{bm.name}</h3>
                    <div className="flex items-center gap-4 text-xs text-zinc-400 mt-0.5">
                      <span>Investimento: <strong className="text-yellow-400">{formatCurrency(data.investimento)}</strong></span>
                      <span>MQLs: <strong className="text-white">{data.mqls}</strong></span>
                      <span>Ingressos: <strong className="text-emerald-400">{data.ingressos}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Counters */}
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                    {data.outlierKpiCount.excelente} Excelente{data.outlierKpiCount.excelente > 1 ? 's' : ''}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                    {data.outlierKpiCount.medio} Médio
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
                    {data.outlierKpiCount.ruim} Ruim
                  </span>
                </div>
              </div>

              {/* Minimalist Metrics Table */}
              <div className="p-4 sm:p-5 space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-400 text-[11px] uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Métrica</th>
                        <th className="pb-3 font-semibold">Real no Período</th>
                        <th className="pb-3 font-semibold text-emerald-400">Meta Excelente</th>
                        <th className="pb-3 font-semibold text-amber-400">Ponto Médio</th>
                        <th className="pb-3 font-semibold text-rose-400">Alerta Ruim</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold text-right">Análise & Testes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.metrics.map((m, mIdx) => {
                        const val = m.currentValue;
                        const isCurrency = m.metric.unit === 'currency';
                        const isPercent = m.metric.unit === 'percent';
                        const lowerBetter = m.metric.direction === 'lower_is_better';
                        const isClickable = (m.classification.status === 'excelente' || m.classification.status === 'ruim') && val > 0;

                        const formatRef = (v: number) => {
                          if (isCurrency) return formatCurrency(v);
                          if (isPercent) return `${v.toFixed(2)}%`;
                          return v.toString();
                        };

                        const handleRowClick = () => {
                          if (!isClickable) return;
                          setActiveModal({
                            metric: m.metric,
                            currentValue: val,
                            funnelName: bm.shortName,
                            averageSpend: data.averageCreativeSpend,
                            creatives: data.impactCreatives
                          });
                        };

                        return (
                          <tr
                            key={mIdx}
                            onClick={handleRowClick}
                            className={`transition-colors ${
                              isClickable
                                ? 'cursor-pointer hover:bg-white/[0.04]'
                                : 'opacity-80'
                            }`}
                          >
                            <td className="py-3.5 font-bold text-zinc-200">
                              {m.metric.name}
                            </td>
                            <td className="py-3.5">
                              {m.metric.available === false ? (
                                <span className="text-zinc-500 italic">N/D</span>
                              ) : val > 0 ? (
                                <span className="font-extrabold text-sm text-white">
                                  {formatRef(val)}
                                </span>
                              ) : (
                                <span className="text-zinc-600">-</span>
                              )}
                            </td>
                            <td className="py-3.5 text-zinc-300">
                              {m.metric.available === false ? '-' : `${lowerBetter ? '≤ ' : '≥ '}${formatRef(m.metric.excelente)}`}
                            </td>
                            <td className="py-3.5 text-zinc-400">
                              {m.metric.available === false ? '-' : formatRef(m.metric.medio)}
                            </td>
                            <td className="py-3.5 text-zinc-300">
                              {m.metric.available === false ? '-' : `${lowerBetter ? '≥ ' : '≤ '}${formatRef(m.metric.ruim)}`}
                            </td>
                            <td className="py-3.5">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${m.classification.badgeBg} ${m.classification.badgeBorder} ${m.classification.badgeText}`}
                              >
                                {m.classification.status === 'excelente' && <CheckCircle2 size={12} />}
                                {m.classification.status === 'medio' && <AlertTriangle size={12} />}
                                {m.classification.status === 'ruim' && <AlertCircle size={12} />}
                                {m.classification.label}
                              </span>
                            </td>
                            <td className="py-3.5 text-right">
                              {isClickable ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRowClick();
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer ${
                                    m.classification.status === 'excelente'
                                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                                      : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                                  }`}
                                >
                                  <span>Ver Criativos & Testes</span>
                                  <ArrowRight size={12} />
                                </button>
                              ) : (
                                <span className="text-[11px] text-zinc-600 italic">
                                  {m.metric.available === false ? 'Base com problema' : 'Em equilíbrio'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Análise de CAC Estimado considerando conversão de MQLs (Filtro Atual vs Referência) */}
                <CACComparisonCard data={data} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Metric Detail Modal with Impact Creatives & Test Propositions */}
      {activeModal && (
        <MetricImpactModal
          metric={activeModal.metric}
          currentValue={activeModal.currentValue}
          funnelName={activeModal.funnelName}
          averageSpend={activeModal.averageSpend}
          creatives={activeModal.creatives}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}

import React from 'react';
import { FeedbackKPIsSummary, FunnelFeedbackAnalysis } from '../../utils/feedbackKpiCalculator';
import { formatCurrency, formatNumber } from '../../utils/format';
import { 
  ArrowUpRight, ArrowDownRight, ArrowRight, Minus, 
  TrendingUp, TrendingDown, Calendar, Layers, DollarSign, Users, ShoppingCart
} from 'lucide-react';

interface PeriodComparisonSectionProps {
  summary: FeedbackKPIsSummary;
  startDate: string;
  endDate: string;
  prevStartDate: string;
  prevEndDate: string;
}

export function PeriodComparisonSection({
  summary,
  startDate,
  endDate,
  prevStartDate,
  prevEndDate
}: PeriodComparisonSectionProps) {
  const formatDateBR = (isoStr: string) => {
    if (!isoStr) return '';
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const calcDiff = (curr: number, prev: number) => {
    const abs = curr - prev;
    const perc = prev > 0 ? (abs / prev) * 100 : 0;
    return { abs, perc };
  };

  const getTrendBadge = (curr: number, prev: number, direction: 'lower_is_better' | 'higher_is_better') => {
    if (!prev || prev === 0) {
      return (
        <span className="text-zinc-500 text-xs flex items-center gap-0.5">
          <Minus size={12} /> 0%
        </span>
      );
    }

    const { abs, perc } = calcDiff(curr, prev);
    if (Math.abs(perc) < 0.05) {
      return (
        <span className="text-zinc-400 text-xs flex items-center gap-0.5 font-medium">
          <Minus size={12} /> Estável
        </span>
      );
    }

    const isFavorable = direction === 'lower_is_better' ? abs < 0 : abs > 0;
    const isUp = abs > 0;

    return (
      <span
        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-bold ${
          isFavorable
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }`}
      >
        {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {isUp ? '+' : ''}{perc.toFixed(1)}%
      </span>
    );
  };

  const funnelsList: { name: string; key: 'vd' | 'gdForm' | 'gdCaptura' | 'meteorico'; data: FunnelFeedbackAnalysis }[] = [
    { name: 'Venda Direta (VD)', key: 'vd', data: summary.funnels.vd },
    { name: 'Geração de Demanda (Formulário)', key: 'gdForm', data: summary.funnels.gdForm },
    { name: 'Geração de Demanda (Página de Captura)', key: 'gdCaptura', data: summary.funnels.gdCaptura },
    { name: 'Meteórico', key: 'meteorico', data: summary.funnels.meteorico },
  ];

  const totalInvCurr = summary.totalInvestimento;
  const totalInvPrev = summary.prevTotalInvestimento || 0;
  const totalIngCurr = summary.totalIngressos;
  const totalIngPrev = summary.prevTotalIngressos || 0;
  const totalMqlCurr = summary.totalMqls;
  const totalMqlPrev = summary.prevTotalMqls || 0;

  return (
    <div className="space-y-6">
      {/* Date Interval Comparison Banner */}
      <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-yellow-500 uppercase tracking-wider mb-1">
              <Calendar size={14} />
              Comparativo Temporal
            </div>
            <h3 className="text-base font-bold text-white">
              Período Atual vs Mesmo Período Anterior
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
              <span>Atual: {formatDateBR(startDate)} até {formatDateBR(endDate)}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-zinc-800 border border-white/10 text-zinc-300 font-medium">
              <span>Anterior: {formatDateBR(prevStartDate)} até {formatDateBR(prevEndDate)}</span>
            </div>
          </div>
        </div>

        {/* Global Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/5">
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Investimento Total</span>
              <div className="text-base font-bold text-white mt-0.5">{formatCurrency(totalInvCurr)}</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Ant: {formatCurrency(totalInvPrev)}</div>
            </div>
            {getTrendBadge(totalInvCurr, totalInvPrev, 'lower_is_better')}
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Ingressos Vendidos</span>
              <div className="text-base font-bold text-emerald-400 mt-0.5">{totalIngCurr}</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Ant: {totalIngPrev}</div>
            </div>
            {getTrendBadge(totalIngCurr, totalIngPrev, 'higher_is_better')}
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">MQLs Gerados</span>
              <div className="text-base font-bold text-white mt-0.5">{totalMqlCurr}</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Ant: {totalMqlPrev}</div>
            </div>
            {getTrendBadge(totalMqlCurr, totalMqlPrev, 'higher_is_better')}
          </div>
        </div>
      </div>

      {/* Breakdown by Funnel */}
      <div className="space-y-6">
        {funnelsList.map(({ name, key, data }) => {
          const prev = data.previousPeriod;
          const prevInv = prev?.investimento || 0;
          const prevIng = prev?.ingressos || 0;
          const prevMql = prev?.mqls || 0;

          return (
            <div
              key={key}
              className="bg-zinc-900/60 border border-white/10 rounded-2xl overflow-hidden shadow-xl"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-zinc-900 to-zinc-950 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center font-bold text-yellow-500">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{name}</h4>
                    <span className="text-xs text-zinc-500">Comparativo métrica a métrica</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Investimento:</span>
                    <strong className="text-white">{formatCurrency(data.investimento)}</strong>
                    {getTrendBadge(data.investimento, prevInv, 'lower_is_better')}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Ingressos:</span>
                    <strong className="text-emerald-400">{data.ingressos}</strong>
                    {getTrendBadge(data.ingressos, prevIng, 'higher_is_better')}
                  </div>
                </div>
              </div>

              {/* Metrics Table */}
              <div className="p-4 sm:p-5 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-400 text-[11px] uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Métrica</th>
                      <th className="pb-3 font-semibold text-yellow-400">Período Atual</th>
                      <th className="pb-3 font-semibold text-zinc-400">Período Anterior</th>
                      <th className="pb-3 font-semibold">Variação Absoluta (Δ)</th>
                      <th className="pb-3 font-semibold text-right">Evolução (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.metrics.map((m, mIdx) => {
                      const currVal = m.currentValue;
                      const prevVal = m.previousValue || 0;
                      const isCurrency = m.metric.unit === 'currency';
                      const isPercent = m.metric.unit === 'percent';
                      const diffAbs = currVal - prevVal;

                      const formatVal = (v: number) => {
                        if (m.metric.available === false) return 'N/D';
                        if (v === 0) return '-';
                        if (isCurrency) return formatCurrency(v);
                        if (isPercent) return `${v.toFixed(2)}%`;
                        return v.toString();
                      };

                      return (
                        <tr key={mIdx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 font-semibold text-zinc-200">
                            {m.metric.name}
                          </td>
                          <td className="py-3 font-bold text-white text-sm">
                            {formatVal(currVal)}
                          </td>
                          <td className="py-3 text-zinc-400 font-medium">
                            {formatVal(prevVal)}
                          </td>
                          <td className="py-3 text-zinc-300">
                            {m.metric.available === false ? (
                              '-'
                            ) : currVal > 0 && prevVal > 0 ? (
                              <span>
                                {diffAbs > 0 ? '+' : ''}
                                {formatVal(diffAbs)}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-3 text-right">
                            {m.metric.available === false ? (
                              <span className="text-zinc-600 text-xs">N/D</span>
                            ) : (
                              getTrendBadge(currVal, prevVal, m.metric.direction)
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

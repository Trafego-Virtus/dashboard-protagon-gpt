import React from 'react';
import { FunnelFeedbackAnalysis } from '../../utils/feedbackKpiCalculator';
import { formatCurrency, formatNumber } from '../../utils/format';
import { Target, TrendingDown, TrendingUp, HelpCircle, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface CACComparisonCardProps {
  data: FunnelFeedbackAnalysis;
}

export function CACComparisonCard({ data }: CACComparisonCardProps) {
  const bm = data.benchmark;
  if (!bm.cacScenarios || bm.cacScenarios.length === 0) {
    return null;
  }

  const actualMqls = data.mqls || 0;
  const actualInv = data.investimento || 0;
  const actualMqlCost = actualMqls > 0 ? actualInv / actualMqls : 0;
  const actualIngressos = data.ingressos || 0;
  const actualRealizedCac = actualIngressos > 0 ? actualInv / actualIngressos : 0;

  const isVd = bm.id === 'vd';
  const conversionType = isVd ? 'Checkout' : 'Comercial';

  return (
    <div className="bg-black/35 rounded-xl border border-white/5 p-4 space-y-3.5">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <Target size={15} className="text-yellow-500" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Análise de CAC Estimado por Conversão de MQLs
            </h4>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-semibold">
              Filtro Atual vs Referência
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Compara o CAC projetado com o custo real de MQL deste período contra a referência para cada taxa de conversão ({conversionType}).
          </p>
        </div>

        {/* Current filter baseline stats */}
        <div className="flex items-center gap-3 text-xs bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-white/5 shrink-0">
          <div>
            <span className="text-[10px] text-zinc-500 block uppercase">Custo MQL Atual</span>
            <strong className="text-yellow-400">
              {actualMqlCost > 0 ? formatCurrency(actualMqlCost) : 'Sem MQLs'}
            </strong>
          </div>
          <div className="border-l border-white/10 pl-3">
            <span className="text-[10px] text-zinc-500 block uppercase">MQLs no Filtro</span>
            <strong className="text-white">{actualMqls}</strong>
          </div>
          {actualRealizedCac > 0 && (
            <div className="border-l border-white/10 pl-3">
              <span className="text-[10px] text-zinc-500 block uppercase">CAC Real Fechado</span>
              <strong className="text-emerald-400">{formatCurrency(actualRealizedCac)}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {bm.cacScenarios.map((sc, sIdx) => {
          // Conversion Rate % (e.g. 20, 30, 40 or 2, 3, 4)
          const convRate = sc.conversionRate;
          const mqlsPerSale = 100 / convRate;

          // Reference benchmark CAC
          const refCac = sc.cac;
          const refMqlCost = sc.mqlCost;

          // Real projected CAC using current filter MQL cost
          const currentProjectedCac = actualMqlCost > 0 ? actualMqlCost * mqlsPerSale : 0;
          const projectedIngressos = actualMqls > 0 ? (actualMqls * convRate) / 100 : 0;

          // Difference vs Reference
          const diffCac = currentProjectedCac - refCac;
          const diffPerc = refCac > 0 ? (diffCac / refCac) * 100 : 0;
          const isFavorable = currentProjectedCac > 0 && currentProjectedCac <= refCac;

          const cardTheme = sc.status === 'excelente'
            ? 'border-emerald-500/25 bg-emerald-950/10'
            : sc.status === 'medio'
            ? 'border-amber-500/25 bg-amber-950/10'
            : 'border-rose-500/25 bg-rose-950/10';

          return (
            <div
              key={sIdx}
              className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${cardTheme}`}
            >
              {/* Scenario Title & Tag */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    {sc.title}
                  </span>
                  <span
                    className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      sc.status === 'excelente'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : sc.status === 'medio'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {sc.status}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400">
                  Convertendo <strong className="text-zinc-200">{convRate}%</strong> dos MQLs ({mqlsPerSale.toFixed(1)} MQLs / venda)
                </div>
              </div>

              {/* CAC Current vs CAC Reference Comparison */}
              <div className="space-y-2 bg-black/40 p-2.5 rounded-lg border border-white/5 text-xs">
                {/* Real Projected CAC */}
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                    CAC no Filtro Atual:
                  </span>
                  <div className="text-right">
                    {currentProjectedCac > 0 ? (
                      <span className={`text-sm font-black ${isFavorable ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(currentProjectedCac)}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500 italic">Sem MQLs no filtro</span>
                    )}
                  </div>
                </div>

                {/* Benchmark Reference CAC */}
                <div className="flex items-baseline justify-between text-[11px] text-zinc-400 border-t border-white/5 pt-1.5">
                  <span>CAC de Referência:</span>
                  <span className="font-semibold text-zinc-300">
                    {formatCurrency(refCac)}
                  </span>
                </div>

                {/* Variation vs Reference */}
                {currentProjectedCac > 0 && (
                  <div className="flex items-center justify-between text-[10px] border-t border-white/5 pt-1.5">
                    <span className="text-zinc-500">Variação vs Ref:</span>
                    <span
                      className={`font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] ${
                        isFavorable
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {diffCac < 0 ? (
                        <>
                          <TrendingDown size={11} />
                          <span>{formatCurrency(Math.abs(diffCac))} mais eficiente ({diffPerc.toFixed(1)}%)</span>
                        </>
                      ) : diffCac > 0 ? (
                        <>
                          <TrendingUp size={11} />
                          <span>+{formatCurrency(diffCac)} acima (+{diffPerc.toFixed(1)}%)</span>
                        </>
                      ) : (
                        <span>Exatamente na referência</span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Volume Projection */}
              {actualMqls > 0 && (
                <div className="text-[10px] text-zinc-400 flex items-center justify-between border-t border-white/5 pt-2">
                  <span>Projeção para os MQLs atuais:</span>
                  <strong className="text-yellow-400 font-bold">
                    ~{projectedIngressos >= 1 ? projectedIngressos.toFixed(1) : projectedIngressos.toFixed(2)} vendas
                  </strong>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

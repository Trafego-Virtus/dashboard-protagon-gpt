import React from 'react';
import { ImpactCreative } from '../../utils/feedbackKpiCalculator';
import { ExternalLink, TrendingUp, AlertTriangle, CheckCircle, Sparkles, DollarSign, Eye, MousePointer } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/format';

interface ImpactCreativesSectionProps {
  creatives: ImpactCreative[];
  averageSpend: number;
  funnelName: string;
  hasOutlierKpis: boolean;
}

export function ImpactCreativesSection({
  creatives,
  averageSpend,
  funnelName,
  hasOutlierKpis
}: ImpactCreativesSectionProps) {
  if (creatives.length === 0) {
    return (
      <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-6 text-center">
        <p className="text-sm text-zinc-400">
          Nenhum criativo com gasto relevante (≥ {formatCurrency(averageSpend)}) registrado para este funil no período selecionado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            Criativos de Maior Impacto ({funnelName})
          </h4>
          <p className="text-xs text-zinc-400 mt-0.5">
            Criativos com gasto relevante (≥ Média de {formatCurrency(averageSpend)}) que impulsionaram ou afetaram os KPIs da praça.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-white/10 font-medium">
            {creatives.length} criativo{creatives.length > 1 ? 's' : ''} analisado{creatives.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {creatives.map((ad, idx) => (
          <div
            key={idx}
            className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
              ad.impactType === 'excelente'
                ? 'bg-emerald-950/20 border-emerald-500/25 hover:border-emerald-500/40'
                : ad.impactType === 'ruim'
                ? 'bg-rose-950/20 border-rose-500/25 hover:border-rose-500/40'
                : 'bg-zinc-900/60 border-white/10 hover:border-white/20'
            }`}
          >
            <div>
              {/* Header with thumbnail & badges */}
              <div className="flex items-start gap-3 mb-3">
                {ad.thumbnail ? (
                  <img
                    src={ad.thumbnail}
                    alt={ad.nome}
                    className="w-12 h-12 rounded-lg object-cover bg-zinc-800 border border-white/10 shrink-0"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 text-zinc-500 text-xs font-bold uppercase">
                    AD
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${ad.summaryBadge.bg} ${ad.summaryBadge.border} ${ad.summaryBadge.textColor}`}
                    >
                      {ad.summaryBadge.text}
                    </span>
                    {ad.ativo && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Ativo
                      </span>
                    )}
                  </div>
                  <h5 className="text-xs font-bold text-white truncate" title={ad.nome}>
                    {ad.nome}
                  </h5>
                </div>
              </div>

              {/* Financial & Volume Metrics */}
              <div className="grid grid-cols-3 gap-2 bg-black/30 p-2.5 rounded-lg border border-white/5 mb-3 text-center">
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase">Gasto</div>
                  <div className="text-xs font-bold text-yellow-400">{formatCurrency(ad.investimento)}</div>
                  <div className="text-[9px] text-zinc-500">{ad.percentOfFunnelSpend.toFixed(1)}% do funil</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase">MQLs / Leads</div>
                  <div className="text-xs font-bold text-white">
                    {ad.mqls} <span className="text-zinc-500 font-normal">/ {ad.leads}</span>
                  </div>
                  <div className="text-[9px] text-zinc-500">
                    {ad.custoMql > 0 ? formatCurrency(ad.custoMql) : '-'} / MQL
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase">Ingressos</div>
                  <div className="text-xs font-bold text-emerald-400">{ad.ingressos}</div>
                  <div className="text-[9px] text-zinc-500">
                    {ad.ingressos > 0 ? formatCurrency(ad.investimento / ad.ingressos) : 'CAC -'}
                  </div>
                </div>
              </div>

              {/* Affected KPIs deep-dive */}
              <div className="space-y-1.5 mb-3">
                <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Métricas Chave & KPIs Afetados:
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="p-2 rounded bg-white/5 border border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">CTR:</span>
                    <span className={`text-xs font-bold ${ad.ctr >= 0.76 ? 'text-emerald-400' : ad.ctr <= 0.46 ? 'text-rose-400' : 'text-zinc-200'}`}>
                      {ad.ctr.toFixed(2)}%
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white/5 border border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">CPC:</span>
                    <span className={`text-xs font-bold ${ad.cpc <= 5 ? 'text-emerald-400' : ad.cpc >= 10 ? 'text-rose-400' : 'text-zinc-200'}`}>
                      {formatCurrency(ad.cpc)}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white/5 border border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">CPM:</span>
                    <span className={`text-xs font-bold ${ad.cpm <= 30 ? 'text-emerald-400' : ad.cpm >= 50 ? 'text-rose-400' : 'text-zinc-200'}`}>
                      {formatCurrency(ad.cpm)}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white/5 border border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">Hook Rate:</span>
                    <span className={`text-xs font-bold ${ad.hookRate >= 18 ? 'text-emerald-400' : ad.hookRate <= 12 ? 'text-rose-400' : 'text-zinc-200'}`}>
                      {ad.hookRate.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Specific Impact Highlights */}
                {ad.affectedKpis.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                    {ad.affectedKpis.map((kpi, kIdx) => (
                      <div
                        key={kIdx}
                        className={`text-[11px] px-2 py-1 rounded flex items-center justify-between ${
                          kpi.status === 'excelente'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            : kpi.status === 'ruim'
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                            : 'bg-zinc-800/60 text-zinc-300'
                        }`}
                      >
                        <span className="font-medium">{kpi.metricName}:</span>
                        <span className="font-bold">
                          {kpi.unit === 'currency' ? formatCurrency(kpi.creativeValue) : `${kpi.creativeValue.toFixed(2)}%`}
                          <span className="opacity-70 text-[9px] font-normal ml-1">
                            ({kpi.status === 'excelente' ? 'Excelente' : kpi.status === 'ruim' ? 'Ruim' : 'Médio'})
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Direct Link Action */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 truncate max-w-[180px]">
                {ad.impressoes.toLocaleString('pt-BR')} imp. / {ad.cliques.toLocaleString('pt-BR')} cliq.
              </span>
              {ad.link ? (
                <a
                  href={ad.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-yellow-400 hover:text-yellow-300 font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 transition-all"
                >
                  <span>Abrir Criativo</span>
                  <ExternalLink size={12} />
                </a>
              ) : (
                <span className="text-[10px] text-zinc-600 italic">Sem link direto</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

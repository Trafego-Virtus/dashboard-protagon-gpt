import React, { useState } from 'react';
import { BenchmarkMetric, classifyMetric } from '../../data/benchmarkReferences';
import { DIAGNOSTIC_CHECKLIST_CONFIG } from '../../data/diagnosticChecklist';
import { ImpactCreative } from '../../utils/feedbackKpiCalculator';
import { formatCurrency, formatNumber } from '../../utils/format';
import { 
  X, Sparkles, ExternalLink, CheckCircle2, AlertCircle, 
  Target, FlaskConical, CheckSquare, Square, 
  HelpCircle, ClipboardCheck, ArrowRight, ShieldAlert, FileText, User
} from 'lucide-react';

interface MetricImpactModalProps {
  metric: BenchmarkMetric;
  currentValue: number;
  funnelName: string;
  averageSpend: number;
  creatives: ImpactCreative[];
  onClose: () => void;
}

export function MetricImpactModal({
  metric,
  currentValue,
  funnelName,
  averageSpend,
  creatives,
  onClose
}: MetricImpactModalProps) {
  const classification = classifyMetric(metric, currentValue);
  const status = classification.status; // 'excelente' | 'ruim'
  const isCurrency = metric.unit === 'currency';
  const isPercent = metric.unit === 'percent';
  const lowerBetter = metric.direction === 'lower_is_better';

  const formatVal = (v: number) => {
    if (isCurrency) return formatCurrency(v);
    if (isPercent) return `${v.toFixed(2)}%`;
    return v.toString();
  };

  // Get PDF diagnostic guide config for this metric
  const guide = DIAGNOSTIC_CHECKLIST_CONFIG[metric.id];
  const diagnosticData = guide ? (status === 'excelente' ? guide.excelente : guide.ruim) : null;

  // Checklist interactive state
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const toggleCheck = (idx: number) => {
    setCheckedItems(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Filter and sort creatives for this specific metric
  const creativesWithVal = creatives.map(c => {
    let cVal = 0;
    switch (metric.id) {
      case 'cpm': cVal = c.cpm; break;
      case 'cpc': cVal = c.cpc; break;
      case 'ctr': cVal = c.ctr; break;
      case 'hook_rate': cVal = c.hookRate; break;
      case 'hook_marcos': cVal = c.hookMarcos; break;
      case 'custo_mql': cVal = c.custoMql; break;
      default: cVal = 0; break;
    }
    const cClassification = classifyMetric(metric, cVal);
    return {
      ...c,
      metricVal: cVal,
      cClassification
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-zinc-900 to-zinc-950 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border font-bold ${
              status === 'excelente'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}>
              {status === 'excelente' ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold text-yellow-500 tracking-wider">
                  {funnelName}
                </span>
                <span className="text-zinc-600">•</span>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {metric.name}
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Diagnóstico de desvios, checklist operacional e criativos de impacto
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${classification.badgeBg} ${classification.badgeBorder} ${classification.badgeText}`}>
              {classification.label}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
          {/* Performance Comparison Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-black/40 border border-white/5 rounded-xl p-3.5 text-center">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Real no Período</span>
              <p className={`text-xl font-black mt-0.5 ${classification.color}`}>{formatVal(currentValue)}</p>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Meta Excelente</span>
              <p className="text-sm font-bold text-emerald-400 mt-1">
                {lowerBetter ? '≤ ' : '≥ '}{formatVal(metric.excelente)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Ponto Médio</span>
              <p className="text-sm font-bold text-amber-400 mt-1">{formatVal(metric.medio)}</p>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Alerta Ruim</span>
              <p className="text-sm font-bold text-rose-400 mt-1">
                {lowerBetter ? '≥ ' : '≤ '}{formatVal(metric.ruim)}
              </p>
            </div>
          </div>

          {/* CAC Impact Projection for Custo por MQL */}
          {metric.id === 'custo_mql' && currentValue > 0 && (
            <div className="bg-black/45 border border-white/10 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Target size={14} />
                  Projeção de CAC com o Custo por MQL Atual ({formatCurrency(currentValue)})
                </span>
                <span className="text-[10px] text-zinc-400">
                  Fórmula: CAC = Custo MQL × (100 ÷ Taxa Conv.)
                </span>
              </div>
              <p className="text-[11px] text-zinc-300">
                Avaliando a conversão de MQLs no cenário do filtro atual versus os benchmarks de referência:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {funnelName.includes('Venda Direta') ? (
                  <>
                    <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-white/5 space-y-0.5">
                      <div className="text-[10px] text-zinc-400 flex justify-between">
                        <span>Ruim (Checkout 20%):</span>
                        <span className="text-zinc-500">Ref: R$ 6.691</span>
                      </div>
                      <strong className="text-white text-sm block">{formatCurrency(currentValue * 5.0)}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-white/5 space-y-0.5">
                      <div className="text-[10px] text-zinc-400 flex justify-between">
                        <span>Médio (Checkout 30%):</span>
                        <span className="text-zinc-500">Ref: R$ 2.633</span>
                      </div>
                      <strong className="text-white text-sm block">{formatCurrency(currentValue * 3.333)}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 space-y-0.5">
                      <div className="text-[10px] text-emerald-400 flex justify-between">
                        <span>Excelente (Checkout 40%):</span>
                        <span className="text-zinc-500">Ref: R$ 1.532</span>
                      </div>
                      <strong className="text-emerald-400 text-sm block">{formatCurrency(currentValue * 2.5)}</strong>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-white/5 space-y-0.5">
                      <div className="text-[10px] text-zinc-400 flex justify-between">
                        <span>Ruim (Comercial 2%):</span>
                        <span className="text-zinc-500">Ref: {funnelName.includes('Captura') ? 'R$ 16.435' : 'R$ 5.206'}</span>
                      </div>
                      <strong className="text-white text-sm block">{formatCurrency(currentValue * 50)}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-white/5 space-y-0.5">
                      <div className="text-[10px] text-zinc-400 flex justify-between">
                        <span>Médio (Comercial 3%):</span>
                        <span className="text-zinc-500">Ref: {funnelName.includes('Captura') ? 'R$ 7.526' : 'R$ 2.211'}</span>
                      </div>
                      <strong className="text-white text-sm block">{formatCurrency(currentValue * 33.333)}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 space-y-0.5">
                      <div className="text-[10px] text-emerald-400 flex justify-between">
                        <span>Excelente (Comercial 4%):</span>
                        <span className="text-zinc-500">Ref: {funnelName.includes('Captura') ? 'R$ 3.723' : 'R$ 1.236'}</span>
                      </div>
                      <strong className="text-emerald-400 text-sm block">{formatCurrency(currentValue * 25)}</strong>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Operational Checklist from PDF */}
          {diagnosticData && (
            <div className="bg-zinc-900/60 border border-white/10 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-yellow-500" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {diagnosticData.title}
                  </h4>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-zinc-400 font-semibold uppercase">
                  Guia Operacional Protagon
                </span>
              </div>

              {/* Checklist items */}
              <div className="space-y-2">
                {diagnosticData.investigar.map((item, idx) => {
                  const isChecked = !!checkedItems[idx];
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleCheck(idx)}
                      className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                          : 'bg-black/30 border-white/5 text-zinc-300 hover:bg-white/[0.03]'
                      }`}
                    >
                      <button type="button" className="mt-0.5 shrink-0 text-yellow-500">
                        {isChecked ? <CheckSquare size={15} /> : <Square size={15} className="text-zinc-500" />}
                      </button>
                      <span className="leading-relaxed flex-1 select-none">{item}</span>
                    </div>
                  );
                })}
              </div>

              {diagnosticData.regraLeitura && (
                <div className="p-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/15 text-[11px] text-yellow-400/90 flex items-start gap-2">
                  <HelpCircle size={14} className="shrink-0 mt-0.5" />
                  <span><strong>Leitura Prática:</strong> {diagnosticData.regraLeitura}</span>
                </div>
              )}
            </div>
          )}

          {/* Test Proposition & Analysis Register (Fluxo Rápido de Diagnóstico) */}
          {diagnosticData && (
            <div className={`rounded-xl border p-4 sm:p-5 space-y-3.5 ${
              status === 'excelente'
                ? 'bg-emerald-950/15 border-emerald-500/30'
                : 'bg-rose-950/15 border-rose-500/30'
            }`}>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <FlaskConical className={`w-4 h-4 ${status === 'excelente' ? 'text-emerald-400' : 'text-rose-400'}`} />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Registro da Análise & Proposição de Teste
                  </h4>
                </div>
                <span className="text-[10px] text-zinc-400 font-semibold uppercase">
                  Etapa 6: Ação Imediata
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">
                    Hipótese Principal:
                  </span>
                  <p className="text-zinc-200 italic leading-relaxed">
                    "{diagnosticData.hipotesePadrao}"
                  </p>
                </div>

                <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-1">
                  <span className="text-[10px] text-yellow-400 uppercase font-bold tracking-wider block">
                    Ação / Teste Definido:
                  </span>
                  <p className="text-white font-medium leading-relaxed">
                    {diagnosticData.acaoPadrao}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
                <span>Responsáveis operacionais sugeridos: <strong className="text-zinc-200">Laio / Júlia / Estrategista de Tráfego</strong></span>
                <span className="text-zinc-500">Métrica disparadora: <strong className="text-yellow-400">{metric.name}</strong></span>
              </div>
            </div>
          )}

          {/* Impact Creatives for this Metric */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={14} className="text-yellow-500" />
                Criativos de Maior Impacto nesta Métrica (Gasto ≥ {formatCurrency(averageSpend)})
              </h4>
              <span className="text-[11px] text-zinc-500 font-medium">
                {creativesWithVal.length} criativo{creativesWithVal.length > 1 ? 's' : ''} analisado{creativesWithVal.length > 1 ? 's' : ''}
              </span>
            </div>

            {creativesWithVal.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-xs bg-zinc-900/30 rounded-xl border border-white/5">
                Nenhum criativo com gasto relevante registrado para este período.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {creativesWithVal.map((ad, idx) => {
                  const cStatus = ad.cClassification.status;

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                        cStatus === 'excelente'
                          ? 'bg-emerald-950/20 border-emerald-500/25'
                          : cStatus === 'ruim'
                          ? 'bg-rose-950/20 border-rose-500/25'
                          : 'bg-zinc-900/60 border-white/5'
                      }`}
                    >
                      <div>
                        {/* Top: thumb & name */}
                        <div className="flex items-start gap-3 mb-2.5">
                          {ad.thumbnail ? (
                            <img
                              src={ad.thumbnail}
                              alt={ad.nome}
                              className="w-11 h-11 rounded-lg object-cover bg-zinc-800 border border-white/10 shrink-0"
                              referrerPolicy="no-referrer"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 text-zinc-500 text-[10px] font-bold">
                              AD
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${ad.cClassification.badgeBg} ${ad.cClassification.badgeBorder} ${ad.cClassification.badgeText}`}>
                                {ad.cClassification.label}
                              </span>
                              {ad.ativo && (
                                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                  Ativo
                                </span>
                              )}
                            </div>
                            <h5 className="text-xs font-bold text-white truncate" title={ad.nome}>
                              {ad.nome}
                            </h5>
                          </div>
                        </div>

                        {/* Highlight: Metric performance for this ad */}
                        <div className="p-2.5 bg-black/40 rounded-lg border border-white/5 flex items-center justify-between mb-2">
                          <div>
                            <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                              {metric.name} no Criativo:
                            </span>
                            <div className={`text-sm font-black ${ad.cClassification.color}`}>
                              {formatVal(ad.metricVal)}
                            </div>
                          </div>
                          <div className="text-right text-[10px] text-zinc-400">
                            <div>Gasto: <strong className="text-yellow-400">{formatCurrency(ad.investimento)}</strong></div>
                            <div className="text-zinc-500">{ad.percentOfFunnelSpend.toFixed(1)}% do funil</div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom action link */}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                        <span className="text-[10px] text-zinc-500">
                          {ad.mqls} MQLs • {ad.ingressos} Ingressos
                        </span>
                        {ad.link ? (
                          <a
                            href={ad.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-yellow-400 hover:text-yellow-300 font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 transition-all"
                          >
                            <span>Ver Criativo</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-[10px] text-zinc-600 italic">Sem link</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

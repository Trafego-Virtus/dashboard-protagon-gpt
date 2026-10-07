import React, { useState } from 'react';
import { X, Target, TrendingUp, HelpCircle, CheckCircle2, AlertTriangle, ShieldAlert, Award, Calculator, Info } from 'lucide-react';
import { KPIS_PROTAGON_CONFIG, METODOLOGIA_TESTES } from '../../data/kpisProtagon';
import { FunilType } from '../../types/testes';
import { formatCurrency } from '../../utils/format';

interface ReferenceKpisModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFunil?: FunilType;
}

export function ReferenceKpisModal({ isOpen, onClose, initialFunil = 'geracao-demanda-form' }: ReferenceKpisModalProps) {
  const [selectedFunil, setSelectedFunil] = useState<FunilType>(initialFunil);

  if (!isOpen) return null;

  const config = KPIS_PROTAGON_CONFIG[selectedFunil];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#0f0f10] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#141416]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
              <Award size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">KPIs de Referência • PROTAGON</h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold tracking-wider uppercase rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                  Benchmarks Reais
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Valores de referência baseados na análise percentil histórica (P25 Ruim, P50 Médio, P75 Excelente)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Funil Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 pb-2 border-b border-white/5 bg-[#111113] overflow-x-auto">
          {(Object.keys(KPIS_PROTAGON_CONFIG) as FunilType[]).map((funilKey) => {
            const f = KPIS_PROTAGON_CONFIG[funilKey];
            const isSelected = selectedFunil === funilKey;
            return (
              <button
                key={funilKey}
                onClick={() => setSelectedFunil(funilKey)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-2 ${
                  isSelected 
                    ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20 font-bold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 bg-zinc-900/50 border border-white/5'
                }`}
              >
                <span>{f.nome}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isSelected ? 'bg-black/20 text-black font-bold' : 'bg-white/10 text-zinc-400'
                }`}>
                  {f.baseVideos} vídeos
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Funil Context Box */}
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
            <Info size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-zinc-300 leading-relaxed">
              <span className="font-semibold text-yellow-400">{config.nome}: </span>
              {config.descricao}
            </div>
          </div>

          {/* Table of KPIs */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-3 flex items-center gap-2">
              <Target size={14} className="text-yellow-400" />
              Tabela de Benchmarks por Métrica (Protagon)
            </h3>
            <div className="border border-white/10 rounded-xl overflow-hidden bg-zinc-900/30">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-zinc-900/80 text-zinc-400">
                    <th className="py-3 px-4 font-semibold">Métrica (KPI)</th>
                    <th className="py-3 px-4 font-semibold text-red-400">
                      <div className="flex items-center gap-1.5">
                        <ShieldAlert size={14} />
                        Ruim (P25)
                      </div>
                    </th>
                    <th className="py-3 px-4 font-semibold text-yellow-400">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle size={14} />
                        Médio (P50)
                      </div>
                    </th>
                    <th className="py-3 px-4 font-semibold text-emerald-400">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} />
                        Excelente (P75)
                      </div>
                    </th>
                    <th className="py-3 px-4 font-semibold text-zinc-400">Direção Ideal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {Object.entries(config.kpis).map(([kpiKey, ref]) => {
                    if (!ref) return null;
                    const formatVal = (val: number) => {
                      if (ref.unit === 'currency') return formatCurrency(val);
                      if (ref.unit === 'percent') return `${val.toFixed(2)}%`;
                      return val.toLocaleString('pt-BR');
                    };

                    return (
                      <tr key={kpiKey} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                          {ref.label}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-red-400/90 font-mono">
                          {formatVal(ref.ruim)}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-yellow-400/90 font-mono">
                          {formatVal(ref.medio)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-400 font-mono bg-emerald-500/5">
                          {formatVal(ref.excelente)}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            ref.direction === 'lower_is_better' 
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                              : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          }`}>
                            {ref.direction === 'lower_is_better' ? '↓ Menor é Melhor' : '↑ Maior é Melhor'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* CAC Projections Card if Available */}
          {config.cacEstimado && (
            <div className="bg-zinc-900/40 border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calculator size={16} className="text-yellow-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Simulação de CAC Estimado (Sensibilidade de Conversão)
                  </h4>
                </div>
                <span className="text-[11px] text-zinc-400">
                  Impacto do Custo MQL na taxa de fechamento
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Ruim */}
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                  <div className="text-[11px] font-semibold text-red-400 flex items-center justify-between mb-1">
                    <span>Cenário Ruim ({config.cacEstimado.cenarioRuim.taxa})</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">P25</span>
                  </div>
                  <div className="text-xl font-bold text-white font-mono mt-1">
                    {formatCurrency(config.cacEstimado.cenarioRuim.cac)}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-2">
                    MQLs por venda: <span className="text-zinc-200 font-semibold">{config.cacEstimado.cenarioRuim.mqlsPorVenda}</span>
                  </div>
                </div>

                {/* Médio */}
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                  <div className="text-[11px] font-semibold text-yellow-400 flex items-center justify-between mb-1">
                    <span>Cenário Médio ({config.cacEstimado.cenarioMedio.taxa})</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">P50</span>
                  </div>
                  <div className="text-xl font-bold text-white font-mono mt-1">
                    {formatCurrency(config.cacEstimado.cenarioMedio.cac)}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-2">
                    MQLs por venda: <span className="text-zinc-200 font-semibold">{config.cacEstimado.cenarioMedio.mqlsPorVenda}</span>
                  </div>
                </div>

                {/* Excelente */}
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                  <div className="text-[11px] font-semibold text-emerald-400 flex items-center justify-between mb-1">
                    <span>Cenário Excelente ({config.cacEstimado.cenarioExcelente.taxa})</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">P75</span>
                  </div>
                  <div className="text-xl font-bold text-white font-mono mt-1">
                    {formatCurrency(config.cacEstimado.cenarioExcelente.cac)}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-2">
                    MQLs por venda: <span className="text-zinc-200 font-semibold">{config.cacEstimado.cenarioExcelente.mqlsPorVenda}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Methodology Card */}
          <div className="border border-white/10 rounded-xl p-4 bg-zinc-900/20 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={14} className="text-yellow-400" />
              Metodologia de Teste Ágil e Ciclo de Vida do Protagon
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-zinc-300">
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="font-semibold text-yellow-400 block mb-1">🎯 Maturação Estatística</span>
                <p className="text-zinc-400 leading-relaxed text-[11px]">
                  {METODOLOGIA_TESTES.maturacao}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="font-semibold text-yellow-400 block mb-1">⏱ Ciclo de Vida do Criativo</span>
                <p className="text-zinc-400 leading-relaxed text-[11px]">
                  {METODOLOGIA_TESTES.cicloVida}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#141416] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-black bg-yellow-500 hover:bg-yellow-400 rounded-lg transition-colors font-bold shadow-lg shadow-yellow-500/10"
          >
            Fechar Visualização
          </button>
        </div>
      </div>
    </div>
  );
}

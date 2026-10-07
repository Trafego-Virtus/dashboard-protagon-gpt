import React, { useState } from 'react';
import { 
  Play, Pause, Edit3, Trash2, CheckCircle2, XCircle, HelpCircle, 
  ChevronDown, ChevronUp, Calendar, Clock, AlertTriangle, 
  Rocket, RefreshCw, ArrowRight, Tag, MapPin, Target, TrendingUp, TrendingDown,
  Film, Award
} from 'lucide-react';
import { TesteAgil, FeedbackTeste } from '../../types/testes';
import { KPIS_PROTAGON_CONFIG } from '../../data/kpisProtagon';
import { formatCurrency, parseDate } from '../../utils/format';

interface CardTesteAgilProps {
  teste: TesteAgil;
  onEdit: (teste: TesteAgil) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onOpenFeedback: (teste: TesteAgil) => void;
  onReabrir?: (id: string) => void;
}

export function CardTesteAgil({
  teste,
  onEdit,
  onDelete,
  onToggleStatus,
  onOpenFeedback,
  onReabrir
}: CardTesteAgilProps) {
  const [showCampanhas, setShowCampanhas] = useState(false);

  const funilConfig = KPIS_PROTAGON_CONFIG[teste.tipoFunil];
  const kpiConfig = funilConfig?.kpis[teste.kpiAlvo];

  const formatKpi = (val: number) => {
    if (kpiConfig?.unit === 'currency') return formatCurrency(val);
    if (kpiConfig?.unit === 'percent') return `${val.toFixed(2)}%`;
    return val.toLocaleString('pt-BR');
  };

  const isConcluido = teste.status === 'concluido';
  const isAtivo = teste.status === 'ativo';

  // Cálculo de dias restantes para o próximo feedback
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [y, m, d] = (teste.dataProximoFeedback || '').split('-').map(Number);
  const targetDate = new Date(y, (m || 1) - 1, d || 1);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Barra de progresso do sprint
  const [sy, sm, sd] = (teste.dataInicio || '').split('-').map(Number);
  const startDate = new Date(sy, (sm || 1) - 1, sd || 1);
  const totalSprintDays = Math.max(1, teste.duracaoDias || 7);
  const elapsedDays = Math.max(0, Math.min(totalSprintDays, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))));
  const sprintProgress = Math.min(100, Math.round((elapsedDays / totalSprintDays) * 100));

  // Métrica real agregada das campanhas vinculadas
  const gastoTotalCampanhas = (teste.campanhasVinculadas || []).reduce((acc, c) => acc + c.gasto, 0);
  const mqlsTotalCampanhas = (teste.campanhasVinculadas || []).reduce((acc, c) => acc + c.mqls, 0);
  const metricRealCalculada = mqlsTotalCampanhas > 0 ? gastoTotalCampanhas / mqlsTotalCampanhas : 0;

  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col ${
      isConcluido
        ? 'bg-zinc-900/30 border-white/5 opacity-90'
        : isAtivo
          ? 'bg-zinc-900/60 border-white/10 hover:border-yellow-500/30 shadow-lg shadow-black/40'
          : 'bg-zinc-900/20 border-white/5 opacity-70'
    }`}>
      {/* Top Badges */}
      <div className="p-5 pb-3 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* KPI Badge */}
            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
              {kpiConfig?.label || teste.kpiAlvo}
            </span>

            {/* Praça */}
            <span className="px-2 py-0.5 text-[10px] font-semibold text-zinc-300 bg-white/5 rounded-md border border-white/5 flex items-center gap-1">
              <MapPin size={11} className="text-zinc-400" />
              {teste.praca}
            </span>

            {/* Funil */}
            <span className="px-2 py-0.5 text-[10px] font-semibold text-zinc-400 bg-white/5 rounded-md border border-white/5 flex items-center gap-1">
              <Tag size={11} />
              {funilConfig?.nome || teste.tipoFunil}
            </span>
          </div>

          {/* Status / Restante Badge */}
          {isConcluido ? (
            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5 border ${
              teste.feedback?.resultado === 'positivo'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : teste.feedback?.resultado === 'negativo'
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
            }`}>
              {teste.feedback?.resultado === 'positivo' && <CheckCircle2 size={12} />}
              {teste.feedback?.resultado === 'negativo' && <XCircle size={12} />}
              {teste.feedback?.resultado === 'inconclusivo' && <HelpCircle size={12} />}
              <span>{teste.feedback?.resultado === 'positivo' ? 'Positivo (Validado)' : teste.feedback?.resultado === 'negativo' ? 'Negativo (Invalidado)' : 'Inconclusivo'}</span>
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1 border ${
                diffDays < 0 
                  ? 'bg-red-500/15 text-red-400 border-red-500/30' 
                  : diffDays === 0 
                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' 
                    : 'bg-zinc-800 text-zinc-300 border-white/10'
              }`}>
                <Clock size={11} />
                {diffDays < 0 
                  ? 'Feedback Atrasado' 
                  : diffDays === 0 
                    ? 'Feedback Hoje' 
                    : `${diffDays}d restantes`}
              </span>

              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                isAtivo 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-zinc-800 text-zinc-500 border-zinc-700'
              }`}>
                {isAtivo ? 'ATIVO' : 'PAUSADO'}
              </span>
            </div>
          )}
        </div>

        {/* Nome do Teste */}
        <div>
          <h3 className="text-sm font-bold text-white leading-snug">
            {teste.nome}
          </h3>
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
            <strong className="text-zinc-300">Hipótese:</strong> {teste.hipotese}
          </p>
        </div>

        {/* Variável Única */}
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-zinc-300 flex items-start gap-2">
          <span className="font-semibold text-yellow-400 whitespace-nowrap">Variável Única:</span>
          <span className="text-zinc-300">{teste.variavelUnica}</span>
        </div>

        {/* 3 Blocos de Benchmarks (Baseline, Meta Alvo, Excelente Ref) */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
          <div className="p-2 rounded-xl bg-zinc-950/60 border border-white/5">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase block">Baseline</span>
            <span className="text-xs font-mono font-bold text-zinc-300 mt-0.5 block">
              {formatKpi(teste.baseline)}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
            <span className="text-[10px] text-yellow-400 font-semibold uppercase block">Meta Alvo</span>
            <span className="text-xs font-mono font-bold text-yellow-400 mt-0.5 block">
              {formatKpi(teste.metaAlvo)}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <span className="text-[10px] text-emerald-400 font-semibold uppercase block">Excelente Ref.</span>
            <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5 block">
              {formatKpi(teste.excelenteRef)}
            </span>
          </div>
        </div>

        {/* Resultado Real das Campanhas Vinculadas se houver */}
        {teste.campanhasVinculadas && teste.campanhasVinculadas.length > 0 && !isConcluido && (
          <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-semibold uppercase">
                Métrica Extraída das Campanhas:
              </span>
              <button
                type="button"
                onClick={() => setShowCampanhas(!showCampanhas)}
                className="text-[10px] font-semibold text-yellow-400 hover:underline flex items-center gap-1"
              >
                <span>{teste.campanhasVinculadas.length} campanha(s) vinculada(s)</span>
                {showCampanhas ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            <div className="flex items-center justify-between mt-1 text-xs">
              <span className="font-mono font-bold text-white">
                {metricRealCalculada > 0 ? formatCurrency(metricRealCalculada) : 'R$ 0,00'}
                <span className="text-[10px] text-zinc-500 font-normal ml-1">
                  (Gasto: {formatCurrency(gastoTotalCampanhas)})
                </span>
              </span>
              
              {metricRealCalculada > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  metricRealCalculada <= teste.metaAlvo 
                    ? 'bg-emerald-500/10 text-emerald-400' 
                    : 'bg-yellow-500/10 text-yellow-400'
                }`}>
                  {metricRealCalculada <= teste.metaAlvo ? 'Meta Batida' : 'Em Busca da Meta'}
                </span>
              )}
            </div>

            {/* Lista recolhível de campanhas */}
            {showCampanhas && (
              <div className="mt-2.5 pt-2 border-t border-white/5 space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                {teste.campanhasVinculadas.map(c => (
                  <div key={c.id} className="text-[10px] flex items-center justify-between text-zinc-400 bg-white/[0.02] p-1.5 rounded">
                    <span className="truncate max-w-[200px] text-zinc-300 font-medium">{c.nome}</span>
                    <span className="font-mono text-zinc-300 font-semibold">
                      {c.custoPorMql > 0 ? formatCurrency(c.custoPorMql) : 'R$ 0,00'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FEEDBACK ARQUIVADO / APRENDIZADOS se concluído */}
        {isConcluido && teste.feedback && (
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] uppercase font-bold text-zinc-400">
                Resultado Final Obtido:
              </span>
              <span className="font-mono font-bold text-emerald-400">
                {formatKpi(teste.feedback.metricaFinal)}
                <span className="text-[10px] text-zinc-400 ml-1.5">
                  ({teste.feedback.variacaoPercentual > 0 ? `+${teste.feedback.variacaoPercentual}%` : `${teste.feedback.variacaoPercentual}%`})
                </span>
              </span>
            </div>

            <div className="text-xs text-zinc-300 bg-white/[0.02] p-2 rounded-lg border border-white/5">
              <strong className="text-yellow-400 block text-[10px] uppercase mb-0.5">Aprendizado Ágil:</strong>
              <p className="text-zinc-300 text-[11px] leading-relaxed">
                {teste.feedback.aprendizado}
              </p>
            </div>

            {/* Criativos Validados */}
            {teste.feedback.criativosValidados && teste.feedback.criativosValidados.length > 0 && (
              <div className="pt-2 border-t border-white/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-yellow-400 flex items-center gap-1">
                    <Award size={12} />
                    Criativos Validados ({teste.feedback.criativosValidados.length}):
                  </span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                  {teste.feedback.criativosValidados.map((criativo) => (
                    <div 
                      key={criativo.id}
                      className="text-[10px] flex items-center justify-between text-zinc-300 bg-white/[0.03] p-1.5 rounded border border-white/5"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="truncate block font-semibold text-white">{criativo.nome}</span>
                        {criativo.observacoes && (
                          <span className="text-[9px] text-zinc-400 truncate block">{criativo.observacoes}</span>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-mono text-yellow-400 font-bold">
                          {formatKpi(criativo.kpiValor)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
              <span>Decisão Ágil: <strong className="text-white capitalize">{teste.feedback.decisao}</strong></span>
              <span>Concluído em: <strong className="text-zinc-300">{teste.feedback.dataConclusao}</strong></span>
            </div>
          </div>
        )}

        {/* Ciclo de Feedback (Datas e Sprint Progress) */}
        {!isConcluido && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                Início: <strong className="text-zinc-300">{teste.dataInicio}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Target size={11} />
                Próximo Feedback: <strong className="text-yellow-400">{teste.dataProximoFeedback}</strong>
              </span>
            </div>

            {/* Barra de Progresso */}
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  diffDays <= 0 ? 'bg-red-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${sprintProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] text-zinc-500">
              <span>Sprint: {totalSprintDays} dias ({elapsedDays}d decorridos)</span>
              <span>{sprintProgress}% do ciclo</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-auto px-5 py-3 border-t border-white/5 bg-[#121214] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {!isConcluido && (
            <button
              onClick={() => onToggleStatus(teste.id)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              title={isAtivo ? 'Pausar Teste' : 'Retomar Teste'}
            >
              {isAtivo ? <Pause size={15} /> : <Play size={15} />}
            </button>
          )}

          <button
            onClick={() => onEdit(teste)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Editar Teste"
          >
            <Edit3 size={15} />
          </button>

          <button
            onClick={() => {
              if (confirm('Deseja realmente excluir este teste?')) {
                onDelete(teste.id);
              }
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Excluir Teste"
          >
            <Trash2 size={15} />
          </button>
        </div>

        {isConcluido ? (
          onReabrir && (
            <button
              onClick={() => onReabrir(teste.id)}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={12} />
              Reabrir Teste
            </button>
          )
        ) : (
          <button
            onClick={() => onOpenFeedback(teste)}
            className="px-3.5 py-1.5 text-xs font-bold text-black bg-yellow-500 hover:bg-yellow-400 rounded-lg transition-all shadow-md shadow-yellow-500/10 flex items-center gap-1.5"
          >
            <span>Registrar Feedback</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

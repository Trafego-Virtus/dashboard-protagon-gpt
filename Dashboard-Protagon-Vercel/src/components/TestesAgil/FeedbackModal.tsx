import React, { useState } from 'react';
import { 
  X, CheckCircle2, XCircle, HelpCircle, TrendingUp, TrendingDown, 
  ArrowRight, Lightbulb, Rocket, Trash2, RefreshCw, Plus, Award, Film 
} from 'lucide-react';
import { TesteAgil, ResultadoTeste, FeedbackTeste, CriativoValidado } from '../../types/testes';
import { KPIS_PROTAGON_CONFIG } from '../../data/kpisProtagon';
import { formatCurrency } from '../../utils/format';

interface FeedbackModalProps {
  isOpen: boolean;
  teste: TesteAgil | null;
  onClose: () => void;
  onConfirm: (id: string, feedback: FeedbackTeste) => void;
}

export function FeedbackModal({ isOpen, teste, onClose, onConfirm }: FeedbackModalProps) {
  if (!isOpen || !teste) return null;

  const funilConfig = KPIS_PROTAGON_CONFIG[teste.tipoFunil];
  const kpiConfig = funilConfig?.kpis[teste.kpiAlvo];

  // Extrai valor sugerido das campanhas vinculadas se houver
  const valorCampanhas = teste.campanhasVinculadas?.length > 0
    ? (teste.kpiAlvo === 'custo_mql' 
        ? teste.campanhasVinculadas.reduce((acc, c) => acc + c.gasto, 0) / Math.max(1, teste.campanhasVinculadas.reduce((acc, c) => acc + c.mqls, 0))
        : teste.metaAlvo)
    : teste.metaAlvo;

  const [resultado, setResultado] = useState<ResultadoTeste>('positivo');
  const [metricaFinal, setMetricaFinal] = useState<number>(Number(valorCampanhas.toFixed(2)));
  const [aprendizado, setAprendizado] = useState<string>('');
  const [decisao, setDecisao] = useState<'escalar' | 'descartar' | 'iterar' | 'ajustar_orcamento'>('escalar');
  const [observacoes, setObservacoes] = useState<string>('');

  // Criativos validados
  const [criativosValidados, setCriativosValidados] = useState<CriativoValidado[]>(
    teste.feedback?.criativosValidados || []
  );
  const [novoCriativoNome, setNovoCriativoNome] = useState('');
  const [novoCriativoKpi, setNovoCriativoKpi] = useState('');
  const [novoCriativoObs, setNovoCriativoObs] = useState('');

  const handleAddCriativo = () => {
    if (!novoCriativoNome.trim()) {
      alert('Por favor, informe o nome ou identificador do criativo.');
      return;
    }
    const val = parseFloat(novoCriativoKpi.replace(',', '.'));
    if (isNaN(val)) {
      alert('Por favor, informe o valor numérico do KPI alcançado pelo criativo.');
      return;
    }

    const novo: CriativoValidado = {
      id: `criativo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      nome: novoCriativoNome.trim(),
      kpiValor: val,
      kpiLabel: kpiConfig?.label || teste.kpiAlvo,
      observacoes: novoCriativoObs.trim() || undefined
    };

    setCriativosValidados(prev => [...prev, novo]);
    setNovoCriativoNome('');
    setNovoCriativoKpi('');
    setNovoCriativoObs('');
  };

  const handleRemoveCriativo = (id: string) => {
    setCriativosValidados(prev => prev.filter(c => c.id !== id));
  };

  // Calcula variação
  const diferenca = metricaFinal - teste.baseline;
  const variacaoPercentual = teste.baseline > 0 ? (diferenca / teste.baseline) * 100 : 0;
  
  const isMelhoria = kpiConfig?.direction === 'lower_is_better' 
    ? metricaFinal < teste.baseline 
    : metricaFinal > teste.baseline;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aprendizado.trim()) {
      alert('Por favor, descreva o aprendizado principal obtido neste teste ágil.');
      return;
    }

    const feedbackData: FeedbackTeste = {
      dataConclusao: new Date().toISOString().split('T')[0],
      resultado,
      metricaFinal,
      variacaoPercentual: Number(variacaoPercentual.toFixed(1)),
      aprendizado: aprendizado.trim(),
      decisao,
      observacoes: observacoes.trim() || undefined,
      criativosValidados: criativosValidados.length > 0 ? criativosValidados : undefined
    };

    onConfirm(teste.id, feedbackData);
    onClose();
  };

  const formatVal = (v: number) => {
    if (kpiConfig?.unit === 'currency') return formatCurrency(v);
    if (kpiConfig?.unit === 'percent') return `${v.toFixed(2)}%`;
    return v.toLocaleString('pt-BR');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-[#0f0f10] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#141416]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
              <Lightbulb size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Registrar Feedback & Concluir Teste
              </h2>
              <p className="text-xs text-zinc-400">
                Avalie o resultado ágil da hipótese para arquivamento e histórico de aprendizados
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* Test Summary Card */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                {kpiConfig?.label || teste.kpiAlvo}
              </span>
              <span className="text-xs text-zinc-400">Praça: <strong className="text-zinc-200">{teste.praca}</strong></span>
            </div>
            <h4 className="text-sm font-semibold text-white">{teste.nome}</h4>
            <p className="text-xs text-zinc-400 line-clamp-2">
              <strong className="text-zinc-300">Variável:</strong> {teste.variavelUnica}
            </p>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center">
              <div>
                <span className="text-[10px] text-zinc-500 block uppercase">Baseline</span>
                <span className="text-xs font-mono font-bold text-zinc-300">{formatVal(teste.baseline)}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block uppercase">Meta Alvo</span>
                <span className="text-xs font-mono font-bold text-yellow-400">{formatVal(teste.metaAlvo)}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block uppercase">Excelente Ref.</span>
                <span className="text-xs font-mono font-bold text-emerald-400">{formatVal(teste.excelenteRef)}</span>
              </div>
            </div>
          </div>

          {/* Resultado Selection */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-2">
              1. Classificação do Resultado da Hipótese *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {/* Positivo */}
              <button
                type="button"
                onClick={() => {
                  setResultado('positivo');
                  setDecisao('escalar');
                }}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col items-center text-center gap-2 ${
                  resultado === 'positivo'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-lg shadow-emerald-500/10'
                    : 'bg-zinc-900/40 border-white/5 text-zinc-400 hover:bg-white/5'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  resultado === 'positivo' ? 'bg-emerald-500 text-black' : 'bg-white/5 text-zinc-400'
                }`}>
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Positivo</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Hipótese Validada</div>
                </div>
              </button>

              {/* Negativo */}
              <button
                type="button"
                onClick={() => {
                  setResultado('negativo');
                  setDecisao('descartar');
                }}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col items-center text-center gap-2 ${
                  resultado === 'negativo'
                    ? 'bg-red-500/15 border-red-500/50 text-white shadow-lg shadow-red-500/10'
                    : 'bg-zinc-900/40 border-white/5 text-zinc-400 hover:bg-white/5'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  resultado === 'negativo' ? 'bg-red-500 text-white' : 'bg-white/5 text-zinc-400'
                }`}>
                  <XCircle size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Negativo</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Hipótese Invalidada</div>
                </div>
              </button>

              {/* Inconclusivo */}
              <button
                type="button"
                onClick={() => {
                  setResultado('inconclusivo');
                  setDecisao('iterar');
                }}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col items-center text-center gap-2 ${
                  resultado === 'inconclusivo'
                    ? 'bg-yellow-500/15 border-yellow-500/50 text-white shadow-lg shadow-yellow-500/10'
                    : 'bg-zinc-900/40 border-white/5 text-zinc-400 hover:bg-white/5'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  resultado === 'inconclusivo' ? 'bg-yellow-500 text-black' : 'bg-white/5 text-zinc-400'
                }`}>
                  <HelpCircle size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Inconclusivo</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Sem Volume / Ruído</div>
                </div>
              </button>
            </div>
          </div>

          {/* Métrica Final Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                2. Métrica Final Alcançada *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={metricaFinal}
                  onChange={(e) => setMetricaFinal(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-yellow-500"
                  required
                />
              </div>
            </div>

            {/* Variação Calculada */}
            <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Variação vs Baseline</span>
                <div className="flex items-center gap-1.5 mt-1">
                  {isMelhoria ? (
                    <TrendingDown size={18} className="text-emerald-400" />
                  ) : (
                    <TrendingUp size={18} className="text-red-400" />
                  )}
                  <span className={`text-base font-bold font-mono ${
                    isMelhoria ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {variacaoPercentual > 0 ? `+${variacaoPercentual.toFixed(1)}%` : `${variacaoPercentual.toFixed(1)}%`}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Impacto</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${
                  isMelhoria 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {isMelhoria ? 'Melhoria' : 'Piora/Sem Ganho'}
                </span>
              </div>
            </div>
          </div>

          {/* Próximo Passo / Decisão Ágil */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-2">
              3. Próximo Passo Ágil (Decisão) *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { id: 'escalar', label: 'Escalar', icon: Rocket, desc: 'Aumentar orçamento' },
                { id: 'descartar', label: 'Descartar', icon: Trash2, desc: 'Pausar criativo/página' },
                { id: 'iterar', label: 'Iterar', icon: RefreshCw, desc: 'Testar nova variável' },
                { id: 'ajustar_orcamento', label: 'Ajustar', icon: TrendingUp, desc: 'Rebalancear verba' }
              ].map(opt => {
                const Icon = opt.icon;
                const isSel = decisao === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDecisao(opt.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSel 
                        ? 'bg-yellow-500/15 border-yellow-500 text-white' 
                        : 'bg-zinc-900/40 border-white/5 text-zinc-400 hover:bg-white/5'
                    }`}
                  >
                    <Icon size={14} className={isSel ? 'text-yellow-400 mb-1' : 'text-zinc-500 mb-1'} />
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aprendizados */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5">
              4. O que aprendemos com este teste? (Conclusão Ágil) *
            </label>
            <textarea
              rows={3}
              value={aprendizado}
              onChange={(e) => setAprendizado(e.target.value)}
              placeholder="Ex: A inserção do filtro de renda no formulário reduziu em 28% o custo por MQL qualificado, mantendo taxa de resposta estável. Recomenda-se aplicar em todas as praças..."
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-yellow-500 leading-relaxed"
              required
            />
          </div>

          {/* Observações Opcionais */}
          <div>
            <label className="text-xs font-semibold text-zinc-400 block mb-1.5">
              Observações Adicionais (Opcional)
            </label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Anúncio rodou sem pausas durante o final de semana..."
              className="w-full px-3.5 py-2 bg-zinc-900 border border-white/10 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
            />
          </div>

          {/* 5. CRIATIVOS VALIDADOS NO TESTE */}
          <div className="border border-white/10 rounded-xl p-4 bg-zinc-900/40 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Award size={14} className="text-yellow-400" />
                    5. Criativos Validados no Teste & Respectivo KPI
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {criativosValidados.length} validado(s)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Adicione os criativos que foram validados neste teste e registre o KPI alcançado por cada um.
                </p>
              </div>
            </div>

            {/* Inputs para adicionar novo criativo */}
            <div className="p-3 rounded-lg bg-zinc-950/70 border border-white/5 space-y-2.5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <div className="md:col-span-6">
                  <label className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">
                    Nome / Código do Criativo *
                  </label>
                  <input
                    type="text"
                    value={novoCriativoNome}
                    onChange={(e) => setNovoCriativoNome(e.target.value)}
                    placeholder="Ex: AD 03 - Gancho Marcos no Palco"
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCriativo();
                      }
                    }}
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1 truncate">
                    {kpiConfig?.label || 'KPI'} Obtido *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={novoCriativoKpi}
                    onChange={(e) => setNovoCriativoKpi(e.target.value)}
                    placeholder={`Ex: ${metricaFinal > 0 ? metricaFinal : '14.50'}`}
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono text-xs placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCriativo();
                      }
                    }}
                  />
                </div>

                <div className="md:col-span-3 flex items-end">
                  <button
                    type="button"
                    onClick={handleAddCriativo}
                    className="w-full px-3 py-1.5 text-xs font-bold text-black bg-yellow-500 hover:bg-yellow-400 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={novoCriativoObs}
                  onChange={(e) => setNovoCriativoObs(e.target.value)}
                  placeholder="Observação opcional (Ex: Rodou em público frio com retenção 3s acima de 20%)"
                  className="w-full px-3 py-1 bg-zinc-900/60 border border-white/5 rounded-lg text-zinc-300 text-[11px] placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCriativo();
                    }
                  }}
                />
              </div>
            </div>

            {/* Lista dos criativos cadastrados */}
            {criativosValidados.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                {criativosValidados.map((criativo) => (
                  <div
                    key={criativo.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/80 border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <Film size={13} className="text-yellow-400 flex-shrink-0" />
                        <span className="font-semibold text-zinc-200 text-xs truncate">
                          {criativo.nome}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                          VALIDADO
                        </span>
                      </div>
                      {criativo.observacoes && (
                        <p className="text-[10px] text-zinc-400 mt-0.5 pl-5 truncate">
                          {criativo.observacoes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <span className="text-[9px] text-zinc-500 block uppercase font-medium">
                          {criativo.kpiLabel || kpiConfig?.label || 'KPI'}
                        </span>
                        <span className="text-xs font-mono font-bold text-yellow-400">
                          {formatVal(criativo.kpiValor)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCriativo(criativo.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                        title="Remover criativo"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-3.5 text-center border border-dashed border-white/10 rounded-lg text-zinc-500 text-[11px]">
                Nenhum criativo validado adicionado ainda. Preencha os campos acima para salvar os criativos vencedores.
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-black bg-yellow-500 hover:bg-yellow-400 rounded-xl transition-all shadow-lg shadow-yellow-500/20 flex items-center gap-2"
            >
              <span>Salvar Feedback & Arquivar Teste</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

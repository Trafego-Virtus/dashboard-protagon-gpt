import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Target, FlaskConical, Calendar, ArrowRight, Zap, Check, Filter, RefreshCw, Info } from 'lucide-react';
import { TesteAgil, FunilType, KpiKey, CampanhaVinculada } from '../../types/testes';
import { KPIS_PROTAGON_CONFIG, METODOLOGIA_TESTES } from '../../data/kpisProtagon';
import { getCampaignsForFunil } from '../../utils/campaignExtractor';
import { formatCurrency } from '../../utils/format';

interface NovoTesteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (teste: TesteAgil) => void;
  testeParaEditar?: TesteAgil | null;
}

const PRACAS = ['Joinville', 'Cuiabá', 'Porto Alegre', 'São Paulo', 'Goiânia', 'Todas as Praças'];

export function NovoTesteModal({ isOpen, onClose, onSave, testeParaEditar }: NovoTesteModalProps) {
  const [praca, setPraca] = useState<string>('Joinville');
  const [tipoFunil, setTipoFunil] = useState<FunilType>('geracao-demanda-form');
  const [nome, setNome] = useState<string>('');
  const [kpiAlvo, setKpiAlvo] = useState<KpiKey>('custo_mql');
  const [baseline, setBaseline] = useState<number>(77.56);
  const [metaAlvo, setMetaAlvo] = useState<number>(55.00);
  const [variavelUnica, setVariavelUnica] = useState<string>('');
  const [hipotese, setHipotese] = useState<string>('');
  
  // Datas e Sprint
  const [dataInicio, setDataInicio] = useState<string>(new Date().toISOString().split('T')[0]);
  const [duracaoDias, setDuracaoDias] = useState<number>(7);
  const [dataProximoFeedback, setDataProximoFeedback] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');

  // Campanhas
  const [availableCampaigns, setAvailableCampaigns] = useState<CampanhaVinculada[]>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState<boolean>(false);

  // Configuração do funil atual
  const funilConfig = KPIS_PROTAGON_CONFIG[tipoFunil];
  const kpisDisponiveis = useMemo(() => Object.keys(funilConfig.kpis) as KpiKey[], [funilConfig]);
  const currentKpiRef = funilConfig.kpis[kpiAlvo];

  // Carrega dados para edição ou inicialização
  useEffect(() => {
    if (testeParaEditar) {
      setPraca(testeParaEditar.praca);
      setTipoFunil(testeParaEditar.tipoFunil);
      setNome(testeParaEditar.nome);
      setKpiAlvo(testeParaEditar.kpiAlvo);
      setBaseline(testeParaEditar.baseline);
      setMetaAlvo(testeParaEditar.metaAlvo);
      setVariavelUnica(testeParaEditar.variavelUnica);
      setHipotese(testeParaEditar.hipotese);
      setDataInicio(testeParaEditar.dataInicio);
      setDuracaoDias(testeParaEditar.duracaoDias);
      setDataProximoFeedback(testeParaEditar.dataProximoFeedback);
      setStatus(testeParaEditar.status === 'concluido' ? 'ativo' : testeParaEditar.status);
      setSelectedCampaignIds((testeParaEditar.campanhasVinculadas || []).map(c => c.id));
    } else {
      // Valores padrão quando novo
      if (currentKpiRef) {
        setBaseline(currentKpiRef.medio);
        setMetaAlvo(currentKpiRef.excelente);
      }
    }
  }, [testeParaEditar, isOpen]);

  // Recarrega campanhas reais ao trocar tipoFunil ou praça
  useEffect(() => {
    let ignore = false;
    setLoadingCampaigns(true);
    getCampaignsForFunil(tipoFunil, praca).then(camps => {
      if (!ignore) {
        setAvailableCampaigns(camps);
        setLoadingCampaigns(false);
      }
    });
    return () => { ignore = true; };
  }, [tipoFunil, praca]);

  // Quando troca o funil, garante que o kpiAlvo seja válido
  useEffect(() => {
    if (!kpisDisponiveis.includes(kpiAlvo)) {
      const firstKpi = kpisDisponiveis[0] || 'custo_mql';
      setKpiAlvo(firstKpi);
    }
  }, [kpisDisponiveis, kpiAlvo]);

  // Atualiza data do feedback ao alterar duração ou data inicial
  const handleDuracaoChange = (dias: number) => {
    setDuracaoDias(dias);
    const start = new Date(dataInicio + 'T00:00:00');
    if (!isNaN(start.getTime())) {
      start.setDate(start.getDate() + dias);
      setDataProximoFeedback(start.toISOString().split('T')[0]);
    }
  };

  const handleDataInicioChange = (dateStr: string) => {
    setDataInicio(dateStr);
    const start = new Date(dateStr + 'T00:00:00');
    if (!isNaN(start.getTime())) {
      start.setDate(start.getDate() + duracaoDias);
      setDataProximoFeedback(start.toISOString().split('T')[0]);
    }
  };

  // Aplica sugestão inteligente de benchmark
  const handleUsarBaseline = (valor: number) => {
    setBaseline(valor);
  };

  const handleUsarMeta = (valor: number) => {
    setMetaAlvo(valor);
  };

  // Gerador de fórmula ágil
  const handleGerarFormulaAgil = () => {
    const varText = variavelUnica.trim() || '[Alteração na variável única]';
    const kpiLabel = currentKpiRef?.label || kpiAlvo;
    const formatValue = (v: number) => currentKpiRef?.unit === 'currency' ? formatCurrency(v) : `${v}%`;

    const formula = `Se implementarmos ${varText}, esperamos que o ${kpiLabel} alcance a meta de ${formatValue(metaAlvo)} (saindo do baseline de ${formatValue(baseline)}) porque otimizaremos a taxa de passagem e reduziremos dispersão de impressões.`;
    setHipotese(formula);
  };

  // Campanhas filtradas (já filtradas estritamente por ATIVA + Gasto no dia atual)
  const campanhasFiltradas = availableCampaigns;

  // Campanhas selecionadas para o teste
  const campanhasSelecionadas = useMemo(() => {
    return availableCampaigns.filter(c => selectedCampaignIds.includes(c.id));
  }, [availableCampaigns, selectedCampaignIds]);

  // Submissão do formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      alert('Por favor, informe o nome do experimento.');
      return;
    }
    if (!variavelUnica.trim()) {
      alert('Por favor, defina a variável única em teste.');
      return;
    }
    if (!hipotese.trim()) {
      alert('Por favor, defina a hipótese ágil do teste.');
      return;
    }

    const campanhasToSave: CampanhaVinculada[] = campanhasSelecionadas.length > 0 
      ? campanhasSelecionadas
      : (testeParaEditar?.campanhasVinculadas || []);

    const testeData: TesteAgil = {
      id: testeParaEditar?.id || `teste-${Date.now()}`,
      nome: nome.trim(),
      praca,
      evento: 'PROTAGON',
      tipoFunil,
      kpiAlvo,
      baseline,
      metaAlvo,
      excelenteRef: currentKpiRef?.excelente || metaAlvo,
      variavelUnica: variavelUnica.trim(),
      hipotese: hipotese.trim(),
      campanhasVinculadas: campanhasToSave,
      dataInicio,
      duracaoDias,
      dataProximoFeedback,
      status,
      criadoEm: testeParaEditar?.criadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };

    onSave(testeData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-[#0f0f10] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#141416]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
              <FlaskConical size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {testeParaEditar ? 'Editar Teste Ágil' : 'Criar Novo Teste Ágil'}
              </h2>
              <p className="text-xs text-zinc-400">
                Defina hipótese com variável única, métrica-alvo e selecione as campanhas para medição contínua.
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
          {/* Linha 1: Praça, Evento e Funil */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Praça */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                Praça *
              </label>
              <select
                value={praca}
                onChange={(e) => setPraca(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-yellow-500"
              >
                {PRACAS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Evento */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                Evento
              </label>
              <input
                type="text"
                value="PROTAGON"
                disabled
                className="w-full px-3 py-2 bg-zinc-900/60 border border-white/5 rounded-xl text-yellow-400 font-bold text-xs cursor-not-allowed"
              />
            </div>

            {/* Tipo de Campanha / Funil */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                Tipo de Campanha / Funil *
              </label>
              <select
                value={tipoFunil}
                onChange={(e) => setTipoFunil(e.target.value as FunilType)}
                className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-yellow-500 font-medium"
              >
                {(Object.keys(KPIS_PROTAGON_CONFIG) as FunilType[]).map(fk => (
                  <option key={fk} value={fk}>{KPIS_PROTAGON_CONFIG[fk].nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Nome do Experimento */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
              Nome do Experimento *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Teste MQL 2.0 - Pergunta Eliminatória de Renda no Form Nativo"
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-yellow-500 font-medium"
              required
            />
          </div>

          {/* Seleção do KPI-Alvo com Cards Visuais */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block">
                KPI-Alvo do Teste * (Selecione a métrica primária)
              </label>
              <span className="text-[10px] text-zinc-500">
                Benchmarks específicos de {funilConfig.nome}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {kpisDisponiveis.map(key => {
                const ref = funilConfig.kpis[key];
                if (!ref) return null;
                const isSelected = kpiAlvo === key;

                const formatKpiVal = (val: number) => {
                  if (ref.unit === 'currency') return formatCurrency(val);
                  if (ref.unit === 'percent') return `${val.toFixed(2)}%`;
                  return val.toLocaleString('pt-BR');
                };

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setKpiAlvo(key);
                      setBaseline(ref.medio);
                      setMetaAlvo(ref.excelente);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'bg-yellow-500/10 border-yellow-500 shadow-md shadow-yellow-500/5'
                        : 'bg-zinc-900/40 border-white/5 hover:border-white/15 hover:bg-zinc-900/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isSelected ? 'text-yellow-400' : 'text-zinc-200'}`}>
                        {ref.label}
                      </span>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-yellow-400" />
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">Meta Sugerida:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {formatKpiVal(ref.excelente)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sugestões Inteligentes com base no KPI selecionado (Imagem 2) */}
          {currentKpiRef && (
            <div className="bg-zinc-900/60 border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-yellow-400" />
                  Sugestões Inteligentes com Base nos KPIs de Referência (Protagon)
                </span>
                <span className="text-[10px] text-zinc-500">
                  {funilConfig.baseVideos} vídeos analisados
                </span>
              </div>

              {/* Caixas de P25, P50, P75 com botões de 1 clique */}
              <div className="grid grid-cols-3 gap-2">
                {/* Ruim */}
                <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/20 text-center">
                  <span className="text-[10px] text-red-400 font-semibold block uppercase">Ruim (P25)</span>
                  <span className="text-xs font-mono font-bold text-white mt-0.5 block">
                    {currentKpiRef.unit === 'currency' ? formatCurrency(currentKpiRef.ruim) : `${currentKpiRef.ruim}%`}
                  </span>
                  <span className="text-[9px] text-zinc-500 mt-1 block">Ponto de Corte</span>
                </div>

                {/* Médio */}
                <div className="p-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-center">
                  <span className="text-[10px] text-yellow-400 font-semibold block uppercase">Médio (P50)</span>
                  <span className="text-xs font-mono font-bold text-white mt-0.5 block">
                    {currentKpiRef.unit === 'currency' ? formatCurrency(currentKpiRef.medio) : `${currentKpiRef.medio}%`}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUsarBaseline(currentKpiRef.medio)}
                    className="mt-1 text-[10px] font-semibold text-yellow-400 hover:underline"
                  >
                    Usar Baseline
                  </button>
                </div>

                {/* Excelente */}
                <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
                  <span className="text-[10px] text-emerald-400 font-semibold block uppercase">Excelente (P75)</span>
                  <span className="text-xs font-mono font-bold text-white mt-0.5 block">
                    {currentKpiRef.unit === 'currency' ? formatCurrency(currentKpiRef.excelente) : `${currentKpiRef.excelente}%`}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUsarMeta(currentKpiRef.excelente)}
                    className="mt-1 text-[10px] font-semibold text-emerald-400 hover:underline"
                  >
                    Usar Meta
                  </button>
                </div>
              </div>

              {/* Variáveis recomendadas para testar */}
              {funilConfig.variaveisRecomendadas[kpiAlvo] && (
                <div>
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Variáveis recomendadas para testar em {currentKpiRef.label} (clique para aplicar):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {funilConfig.variaveisRecomendadas[kpiAlvo]!.map((varItem, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setVariavelUnica(varItem)}
                        className="px-2.5 py-1 text-[11px] rounded-lg bg-white/5 hover:bg-yellow-500/15 text-zinc-300 hover:text-yellow-300 border border-white/5 hover:border-yellow-500/30 transition-all text-left"
                      >
                        ⚡ {varItem}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Baseline e Meta Alvo Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                Baseline Atual *
              </label>
              <input
                type="number"
                step="any"
                value={baseline}
                onChange={(e) => setBaseline(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-yellow-500"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                Meta Alvo Desejada *
              </label>
              <input
                type="number"
                step="any"
                value={metaAlvo}
                onChange={(e) => setMetaAlvo(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-yellow-400 font-mono text-sm font-bold focus:outline-none focus:border-yellow-500"
                required
              />
            </div>
          </div>

          {/* Variável Única em Teste */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block">
                Variável Única em Teste *
              </label>
              <span className="text-[10px] text-yellow-400/80">
                Regra Ágil: Altere apenas 1 elemento por vez
              </span>
            </div>
            <input
              type="text"
              value={variavelUnica}
              onChange={(e) => setVariavelUnica(e.target.value)}
              placeholder="Ex: Filtro de qualificação no formulário nativo"
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
              required
            />
          </div>

          {/* Hipótese Ágil com Botão Gerador de Fórmula */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block">
                Hipótese Ágil de Validação *
              </label>
              <button
                type="button"
                onClick={handleGerarFormulaAgil}
                className="text-[11px] font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 hover:underline"
              >
                <Zap size={12} />
                Gerar Fórmula Ágil
              </button>
            </div>
            <textarea
              rows={3}
              value={hipotese}
              onChange={(e) => setHipotese(e.target.value)}
              placeholder="Ex: Se aplicarmos a pergunta de renda na 1ª etapa, esperamos reduzir o Custo por MQL para R$ 55,00 porque filtraremos usuários fora do ICP..."
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-yellow-500 leading-relaxed"
              required
            />
          </div>

          {/* SELEÇÃO DE CAMPANHAS ATIVAS (Apenas nomes, sem métricas) */}
          <div className="border border-white/10 rounded-xl p-4 bg-zinc-900/30 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Campanhas Ativas
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Status Ativa
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Selecione as campanhas ativas que farão parte deste teste.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const ativas = availableCampaigns.map(c => c.id);
                    setSelectedCampaignIds(ativas);
                  }}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors font-medium"
                >
                  Selecionar Todas ({availableCampaigns.length})
                </button>
                {selectedCampaignIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCampaignIds([])}
                    className="px-2.5 py-1 text-[11px] rounded-lg text-zinc-400 hover:text-white transition-colors"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Lista com scroll das campanhas */}
            <div className="max-h-52 overflow-y-auto border border-white/5 rounded-lg divide-y divide-white/5 bg-zinc-950/60 custom-scrollbar">
              {loadingCampaigns ? (
                <div className="py-8 text-center text-zinc-500 flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-yellow-400" />
                  Carregando campanhas ativas...
                </div>
              ) : campanhasFiltradas.length === 0 ? (
                <div className="py-6 text-center text-zinc-500 text-xs">
                  Nenhuma campanha ativa encontrada para os filtros selecionados.
                </div>
              ) : (
                campanhasFiltradas.map(camp => {
                  const isChecked = selectedCampaignIds.includes(camp.id);
                  return (
                    <label
                      key={camp.id}
                      className={`flex items-center justify-between p-2.5 cursor-pointer transition-colors ${
                        isChecked ? 'bg-yellow-500/5' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCampaignIds([...selectedCampaignIds, camp.id]);
                            } else {
                              setSelectedCampaignIds(selectedCampaignIds.filter(id => id !== camp.id));
                            }
                          }}
                          className="rounded border-zinc-700 bg-zinc-900 text-yellow-500 focus:ring-0 focus:ring-offset-0"
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-zinc-200 text-xs break-all">
                            {camp.nome}
                          </span>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          ATIVA
                        </span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            {/* Resumo da Seleção */}
            <div className="flex items-center justify-between text-[11px] pt-1 text-zinc-400">
              <span>
                <strong className="text-white">{campanhasSelecionadas.length}</strong> campanha(s) selecionada(s) para o teste.
              </span>
              {campanhasSelecionadas.length > 0 && (
                <span className="text-emerald-400/80 text-[10px]">
                  ✓ Vinculadas ao teste
                </span>
              )}
            </div>
          </div>

          {/* CICLO DE FEEDBACK & ESTABILIZAÇÃO ÁGIL */}
          <div className="border border-white/10 rounded-xl p-4 bg-zinc-900/30 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Ciclo de Feedback & Estabilização Ágil
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Data Inicial */}
              <div>
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Data Inicial *
                </label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => handleDataInicioChange(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-yellow-500"
                  required
                />
              </div>

              {/* Duração do Sprint */}
              <div>
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Duração do Sprint
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[3, 7, 14].map(dias => (
                    <button
                      key={dias}
                      type="button"
                      onClick={() => handleDuracaoChange(dias)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        duracaoDias === dias 
                          ? 'bg-yellow-500 text-black border-yellow-500' 
                          : 'bg-zinc-900 text-zinc-400 border-white/10 hover:text-white'
                      }`}
                    >
                      {dias}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Data do Próximo Feedback */}
              <div>
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Data do Próximo Feedback *
                </label>
                <input
                  type="date"
                  value={dataProximoFeedback}
                  onChange={(e) => setDataProximoFeedback(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-yellow-400 font-bold text-xs focus:outline-none focus:border-yellow-500"
                  required
                />
              </div>

              {/* Status Inicial */}
              <div>
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Status Inicial
                </label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setStatus('ativo')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      status === 'ativo' 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                        : 'bg-zinc-900 text-zinc-500 border-white/5'
                    }`}
                  >
                    Ativo
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('inativo')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      status === 'inativo' 
                        ? 'bg-zinc-700 text-zinc-300 border-zinc-600' 
                        : 'bg-zinc-900 text-zinc-500 border-white/5'
                    }`}
                  >
                    Pausado
                  </button>
                </div>
              </div>
            </div>
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
              className="px-6 py-2.5 text-xs font-bold text-black bg-yellow-500 hover:bg-yellow-400 rounded-xl transition-all shadow-lg shadow-yellow-500/20 flex items-center gap-2"
            >
              <span>{testeParaEditar ? 'Atualizar Teste Ágil' : 'Salvar Teste Ágil'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

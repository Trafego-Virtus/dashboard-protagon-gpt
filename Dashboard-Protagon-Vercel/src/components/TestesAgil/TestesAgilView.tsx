import React, { useState, useEffect, useMemo } from 'react';
import { 
  FlaskConical, Plus, Award, Filter, Search, LayoutGrid, Layers, 
  CheckCircle2, XCircle, HelpCircle, RefreshCw, AlertCircle, 
  Sparkles, Target, Clock, ArrowRight, Menu 
} from 'lucide-react';
import { TesteAgil, FunilType, KpiKey, FeedbackTeste, ResultadoTeste } from '../../types/testes';
import { KPIS_PROTAGON_CONFIG } from '../../data/kpisProtagon';
import { 
  fetchTestesAgil, saveTesteAgil, deleteTesteAgil, 
  concluirTesteAgil, toggleStatusTesteAgil, reabrirTesteAgil 
} from '../../services/testesService';
import { CardTesteAgil } from './CardTesteAgil';
import { NovoTesteModal } from './NovoTesteModal';
import { FeedbackModal } from './FeedbackModal';
import { ReferenceKpisModal } from './ReferenceKpisModal';

interface TestesAgilViewProps {
  onOpenAppMenu?: () => void;
}

export function TestesAgilView({ onOpenAppMenu }: TestesAgilViewProps) {
  const [testes, setTestes] = useState<TesteAgil[]>([]);
  const [loading, setLoading] = useState(true);

  // Abas principais
  const [activeTab, setActiveTab] = useState<'andamento' | 'arquivados'>('andamento');

  // Modais
  const [isNovoModalOpen, setIsNovoModalOpen] = useState(false);
  const [isRefModalOpen, setIsRefModalOpen] = useState(false);
  const [testeParaEditar, setTesteParaEditar] = useState<TesteAgil | null>(null);
  const [testeParaFeedback, setTesteParaFeedback] = useState<TesteAgil | null>(null);

  // Filtros
  const [selectedFunil, setSelectedFunil] = useState<string>('all');
  const [selectedPraca, setSelectedPraca] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('all');
  const [resultadoFilter, setResultadoFilter] = useState<'all' | ResultadoTeste>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'grouped_by_kpi'>('grid');

  // Notificação Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carrega testes
  const loadTestes = async () => {
    setLoading(true);
    try {
      const data = await fetchTestesAgil();
      setTestes(data);
    } catch (e) {
      console.error('Erro ao carregar testes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTestes();
  }, []);

  // Handlers CRUD
  const handleSaveTeste = async (teste: TesteAgil) => {
    await saveTesteAgil(teste);
    showToast(testeParaEditar ? 'Teste atualizado com sucesso!' : 'Novo teste ágil criado!');
    setTesteParaEditar(null);
    loadTestes();
  };

  const handleDeleteTeste = async (id: string) => {
    await deleteTesteAgil(id);
    showToast('Teste excluído.');
    loadTestes();
  };

  const handleToggleStatus = async (id: string) => {
    const updated = await toggleStatusTesteAgil(id);
    if (updated) {
      showToast(updated.status === 'ativo' ? 'Teste retomado.' : 'Teste pausado.');
      loadTestes();
    }
  };

  const handleConfirmFeedback = async (id: string, feedback: FeedbackTeste) => {
    await concluirTesteAgil(id, feedback);
    showToast('Feedback registrado! Teste arquivado com sucesso.');
    loadTestes();
  };

  const handleReabrir = async (id: string) => {
    await reabrirTesteAgil(id);
    showToast('Teste reaberto e movido para testes em andamento.');
    loadTestes();
  };

  // Listas filtradas
  const testesEmAndamento = useMemo(() => {
    return testes.filter(t => t.status !== 'concluido');
  }, [testes]);

  const testesArquivados = useMemo(() => {
    return testes.filter(t => t.status === 'concluido');
  }, [testes]);

  const filteredTestes = useMemo(() => {
    const list = activeTab === 'andamento' ? testesEmAndamento : testesArquivados;

    return list.filter(t => {
      // Funil
      if (selectedFunil !== 'all' && t.tipoFunil !== selectedFunil) return false;

      // Praça
      if (selectedPraca !== 'all' && t.praca !== selectedPraca) return false;

      // Status (para andamento)
      if (activeTab === 'andamento' && statusFilter !== 'all' && t.status !== statusFilter) return false;

      // Resultado (para arquivados)
      if (activeTab === 'arquivados' && resultadoFilter !== 'all' && t.feedback?.resultado !== resultadoFilter) return false;

      // Busca
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = t.nome.toLowerCase().includes(q);
        const matchVar = t.variavelUnica.toLowerCase().includes(q);
        const matchHipo = t.hipotese.toLowerCase().includes(q);
        const matchPraca = t.praca.toLowerCase().includes(q);
        if (!matchName && !matchVar && !matchHipo && !matchPraca) return false;
      }

      return true;
    });
  }, [activeTab, testesEmAndamento, testesArquivados, selectedFunil, selectedPraca, statusFilter, resultadoFilter, searchQuery]);

  // Agrupamento por KPI-Alvo para visão em seções
  const groupedByKpi = useMemo(() => {
    const groups: Partial<Record<KpiKey, TesteAgil[]>> = {};
    filteredTestes.forEach(t => {
      if (!groups[t.kpiAlvo]) groups[t.kpiAlvo] = [];
      groups[t.kpiAlvo]!.push(t);
    });
    return groups;
  }, [filteredTestes]);

  const allKpiKeys: { key: KpiKey; label: string; desc: string }[] = [
    { key: 'custo_mql', label: 'Custo por MQL', desc: 'Métrica principal de eficiência na geração de demanda qualificada' },
    { key: 'cpm', label: 'CPM (Custo por Mil Impressões)', desc: 'Relevância e custo de entrega para o público' },
    { key: 'cpc', label: 'CPC (Custo por Clique)', desc: 'Atratividade do criativo para gerar visitas ao funil' },
    { key: 'ctr', label: 'CTR (%)', desc: 'Taxa de clique sobre impressões (qualidade do criativo)' },
    { key: 'hook_rate', label: 'Hook Rate (Geral)', desc: 'Retenção inicial dos primeiros 3 segundos do vídeo' },
    { key: 'hook_marcos', label: 'Hook Marcos', desc: 'Retenção nos criativos gravados pelo Marcos' },
    { key: 'conversao_pagina', label: 'Conversão da Página', desc: 'Taxa de visitantes que se cadastram na Landing Page' }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050505] text-zinc-200 overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-yellow-500 text-black font-bold text-xs shadow-2xl animate-in slide-in-from-bottom duration-200 flex items-center gap-2">
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="px-6 py-5 border-b border-white/10 bg-[#0a0a0a] flex-shrink-0 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {onOpenAppMenu && (
            <button
              onClick={onOpenAppMenu}
              className="lg:hidden p-2 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white"
            >
              <Menu size={18} />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                ANÁLISE ESTRATÉGICA • GESTÃO ÁGIL DE TESTES
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <FlaskConical size={22} className="text-yellow-400" />
              Testes & Otimização Contínua por Tipo de Campanha
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
              Painel global de testes fora de praças isoladas. As métricas de referência (Ruim, Médio, Excelente) mudam dinamicamente conforme o tipo de campanha (Formulário, Venda Direta, Página de Captura ou Meteórico) e o evento selecionado.
            </p>
          </div>
        </div>

        {/* Action Buttons Top Right */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsRefModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-xl transition-all flex items-center gap-2 shadow-sm"
          >
            <Award size={15} className="text-yellow-400" />
            <span>KPIs de referência Ver</span>
          </button>

          <button
            onClick={() => {
              setTesteParaEditar(null);
              setIsNovoModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-bold text-black bg-yellow-500 hover:bg-yellow-400 rounded-xl transition-all shadow-lg shadow-yellow-500/20 flex items-center gap-2"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>Novo Teste Ágil</span>
          </button>
        </div>
      </div>

      {/* Secondary Bar: Main Tabs & Summary Counts */}
      <div className="px-6 pt-3 pb-0 border-b border-white/5 bg-[#080808] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {/* Aba Em Andamento */}
          <button
            onClick={() => setActiveTab('andamento')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'andamento'
                ? 'border-yellow-500 text-yellow-400 font-extrabold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Testes em Andamento</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'andamento' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-zinc-500'
            }`}>
              {testesEmAndamento.length}
            </span>
          </button>

          {/* Aba Arquivados */}
          <button
            onClick={() => setActiveTab('arquivados')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'arquivados'
                ? 'border-yellow-500 text-yellow-400 font-extrabold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Testes Arquivados (Histórico & Aprendizados)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'arquivados' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-zinc-500'
            }`}>
              {testesArquivados.length}
            </span>
          </button>
        </div>

        {/* View Mode Toggle (Apenas na aba em andamento) */}
        {activeTab === 'andamento' && (
          <div className="flex items-center gap-1 bg-zinc-900/60 p-1 rounded-xl border border-white/5 mb-1.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 text-[11px] rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'grid' ? 'bg-yellow-500/15 text-yellow-400 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
              title="Visualização em cards unificados"
            >
              <LayoutGrid size={13} />
              Cards
            </button>
            <button
              onClick={() => setViewMode('grouped_by_kpi')}
              className={`px-2.5 py-1 text-[11px] rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'grouped_by_kpi' ? 'bg-yellow-500/15 text-yellow-400 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
              title="Seções organizadas para cada um dos KPIs"
            >
              <Layers size={13} />
              Seções por KPI
            </button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="px-6 py-3 border-b border-white/5 bg-[#0a0a0a]/50 flex items-center justify-between flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Filtro de Funil */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 text-[11px] uppercase font-semibold">Funil:</span>
            <select
              value={selectedFunil}
              onChange={(e) => setSelectedFunil(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-yellow-500"
            >
              <option value="all">Todas as Campanhas</option>
              <option value="geracao-demanda-form">Formulário Nativo</option>
              <option value="venda-direta">Venda Direta (VD)</option>
              <option value="geracao-demanda-captura">Página de Captura</option>
              <option value="meteorico">Meteórico</option>
            </select>
          </div>

          {/* Filtro de Praça */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 text-[11px] uppercase font-semibold">Praça:</span>
            <select
              value={selectedPraca}
              onChange={(e) => setSelectedPraca(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-yellow-500"
            >
              <option value="all">Todas as Praças</option>
              <option value="Joinville">Joinville</option>
              <option value="Cuiabá">Cuiabá</option>
              <option value="Porto Alegre">Porto Alegre</option>
              <option value="São Paulo">São Paulo</option>
              <option value="Goiânia">Goiânia</option>
            </select>
          </div>

          {/* Filtro de Status (Aba Andamento) */}
          {activeTab === 'andamento' && (
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 text-[11px] uppercase font-semibold">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-yellow-500"
              >
                <option value="all">Todos os Status</option>
                <option value="ativo">Ativos ({testesEmAndamento.filter(t => t.status === 'ativo').length})</option>
                <option value="inativo">Pausados ({testesEmAndamento.filter(t => t.status === 'inativo').length})</option>
              </select>
            </div>
          )}

          {/* Filtro de Resultado (Aba Arquivados) */}
          {activeTab === 'arquivados' && (
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 text-[11px] uppercase font-semibold">Resultado:</span>
              <select
                value={resultadoFilter}
                onChange={(e) => setResultadoFilter(e.target.value as any)}
                className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-yellow-500"
              >
                <option value="all">Todos os Resultados</option>
                <option value="positivo">Positivo (Validado)</option>
                <option value="negativo">Negativo (Invalidado)</option>
                <option value="inconclusivo">Inconclusivo</option>
              </select>
            </div>
          )}
        </div>

        {/* Busca Textual */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por hipótese, variável..."
            className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-3">
            <RefreshCw size={24} className="animate-spin text-yellow-500" />
            <span className="text-xs">Sincronizando testes ágeis e dados de campanhas...</span>
          </div>
        ) : filteredTestes.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-20 px-4">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center mx-auto mb-4">
              <FlaskConical size={26} />
            </div>
            <h3 className="text-sm font-bold text-white">Nenhum teste encontrado</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              {searchQuery || selectedFunil !== 'all' || selectedPraca !== 'all'
                ? 'Nenhum teste corresponde aos filtros aplicados. Tente ajustar os parâmetros de pesquisa.'
                : activeTab === 'andamento'
                  ? 'Você ainda não possui testes em andamento. Crie o primeiro teste definindo uma variável única e métrica-alvo!'
                  : 'Nenhum teste foi arquivado até o momento. Quando você concluir e registrar o feedback de um teste, ele aparecerá aqui com seus aprendizados.'}
            </p>
            {activeTab === 'andamento' && (
              <button
                onClick={() => {
                  setTesteParaEditar(null);
                  setIsNovoModalOpen(true);
                }}
                className="mt-5 px-5 py-2.5 text-xs font-bold text-black bg-yellow-500 hover:bg-yellow-400 rounded-xl transition-all shadow-lg shadow-yellow-500/20 inline-flex items-center gap-2"
              >
                <Plus size={16} className="stroke-[3]" />
                <span>Criar Novo Teste Ágil</span>
              </button>
            )}
          </div>
        ) : activeTab === 'andamento' && viewMode === 'grouped_by_kpi' ? (
          /* Visualização em Seções por KPI */
          <div className="space-y-8">
            {allKpiKeys.map(({ key, label, desc }) => {
              const testesDoKpi = groupedByKpi[key] || [];

              return (
                <div key={key} className="space-y-3">
                  {/* KPI Section Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                        {label}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-bold text-zinc-400">
                        {testesDoKpi.length} {testesDoKpi.length === 1 ? 'teste' : 'testes'}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setTesteParaEditar(null);
                        setIsNovoModalOpen(true);
                      }}
                      className="text-xs font-semibold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 hover:underline"
                    >
                      <Plus size={13} />
                      <span>Novo Teste para este KPI</span>
                    </button>
                  </div>

                  {testesDoKpi.length === 0 ? (
                    <div className="p-4 rounded-xl bg-zinc-900/20 border border-dashed border-white/5 text-center text-xs text-zinc-500">
                      Nenhum teste ativo para {label}. Clique em "Novo Teste para este KPI" para iniciar uma hipótese.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {testesDoKpi.map(teste => (
                        <CardTesteAgil
                          key={teste.id}
                          teste={teste}
                          onEdit={(t) => {
                            setTesteParaEditar(t);
                            setIsNovoModalOpen(true);
                          }}
                          onDelete={handleDeleteTeste}
                          onToggleStatus={handleToggleStatus}
                          onOpenFeedback={(t) => setTesteParaFeedback(t)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Visualização Padrão em Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredTestes.map(teste => (
              <CardTesteAgil
                key={teste.id}
                teste={teste}
                onEdit={(t) => {
                  setTesteParaEditar(t);
                  setIsNovoModalOpen(true);
                }}
                onDelete={handleDeleteTeste}
                onToggleStatus={handleToggleStatus}
                onOpenFeedback={(t) => setTesteParaFeedback(t)}
                onReabrir={activeTab === 'arquivados' ? handleReabrir : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modais */}
      <NovoTesteModal
        isOpen={isNovoModalOpen}
        onClose={() => {
          setIsNovoModalOpen(false);
          setTesteParaEditar(null);
        }}
        onSave={handleSaveTeste}
        testeParaEditar={testeParaEditar}
      />

      <FeedbackModal
        isOpen={!!testeParaFeedback}
        teste={testeParaFeedback}
        onClose={() => setTesteParaFeedback(null)}
        onConfirm={handleConfirmFeedback}
      />

      <ReferenceKpisModal
        isOpen={isRefModalOpen}
        onClose={() => setIsRefModalOpen(false)}
        initialFunil={selectedFunil !== 'all' ? (selectedFunil as FunilType) : 'geracao-demanda-form'}
      />
    </div>
  );
}

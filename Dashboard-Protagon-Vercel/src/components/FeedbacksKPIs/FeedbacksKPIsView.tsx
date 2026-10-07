import React, { useState, useEffect, useMemo } from 'react';
import { fetchRawDashboardData, RawDashboardData } from '../../utils/dataFetching';
import { DashboardId } from '../../utils/api';
import { processDashboardMetrics, ProcessedMetrics } from '../../utils/metricsCalculator';
import { buildFeedbackKPIsSummary, FeedbackKPIsSummary } from '../../utils/feedbackKpiCalculator';
import { BenchmarkComparisonSection } from './BenchmarkComparisonSection';
import { PeriodComparisonSection } from './PeriodComparisonSection';
import { RestrictedLogin } from './RestrictedLogin';
import { buildClipboardReportText, copyToClipboard } from '../../utils/feedbackClipboardExport';
import { 
  Menu, BarChart2, ShieldCheck, LogOut, Calendar, 
  MapPin, Copy, Check, RefreshCw, Loader2, Sparkles, Filter
} from 'lucide-react';
import { format, subDays, startOfToday, parseISO } from 'date-fns';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale/pt-BR';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('pt-BR', ptBR);

interface FeedbacksKPIsViewProps {
  onOpenAppMenu: () => void;
}

const ALL_PRACAS: { id: DashboardId; name: string }[] = [
  { id: 'protagon-joinville', name: 'Joinville' },
  { id: 'protagon-cuiaba', name: 'Cuiabá' },
  { id: 'protagon-porto-alegre', name: 'Porto Alegre' },
  { id: 'protagon-sao-paulo', name: 'São Paulo' },
  { id: 'protagon-goiania', name: 'Goiânia' }
];

export function FeedbacksKPIsView({ onOpenAppMenu }: FeedbacksKPIsViewProps) {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('protagon_auth_musy') === 'true';
  });

  // Date controls
  const [startDate, setStartDate] = useState<string>(() => format(subDays(startOfToday(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(() => format(startOfToday(), 'yyyy-MM-dd'));
  const [datePreset, setDatePreset] = useState<string>('last7');

  // Praça selection: 'all' or a single DashboardId
  const [selectedPraca, setSelectedPraca] = useState<'all' | DashboardId>('all');

  // Sub-tabs: 1. Benchmarks & Criativos, 2. Comparativo Período Anterior
  const [activeSubTab, setActiveSubTab] = useState<'benchmarks' | 'period-comparison'>('benchmarks');

  // Copy state feedback
  const [copied, setCopied] = useState(false);

  // Raw data store per praça (cached in memory)
  const [rawStore, setRawStore] = useState<Record<string, RawDashboardData>>({});
  const [loading, setLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Summary computed data
  const [summary, setSummary] = useState<FeedbackKPIsSummary | null>(null);

  // Previous period date calculation
  const { prevStartDate, prevEndDate } = useMemo(() => {
    try {
      const startD = parseISO(startDate);
      const endD = parseISO(endDate);
      const diffTime = Math.abs(endD.getTime() - startD.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const prevEnd = subDays(startD, 1);
      const prevStart = subDays(prevEnd, diffDays - 1);
      return {
        prevStartDate: format(prevStart, 'yyyy-MM-dd'),
        prevEndDate: format(prevEnd, 'yyyy-MM-dd')
      };
    } catch {
      return {
        prevStartDate: format(subDays(startOfToday(), 15), 'yyyy-MM-dd'),
        prevEndDate: format(subDays(startOfToday(), 8), 'yyyy-MM-dd')
      };
    }
  }, [startDate, endDate]);

  const handleLogout = () => {
    localStorage.removeItem('protagon_auth_musy');
    localStorage.removeItem('protagon_auth_musy_user');
    setIsAuthenticated(false);
  };

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const today = startOfToday();
    if (preset === 'today') {
      const t = format(today, 'yyyy-MM-dd');
      setStartDate(t);
      setEndDate(t);
    } else if (preset === 'yesterday') {
      const y = format(subDays(today, 1), 'yyyy-MM-dd');
      setStartDate(y);
      setEndDate(y);
    } else if (preset === 'last7') {
      setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'last14') {
      setStartDate(format(subDays(today, 14), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'last30') {
      setStartDate(format(subDays(today, 30), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'all') {
      setStartDate('2024-01-01');
      setEndDate(format(today, 'yyyy-MM-dd'));
    }
  };

  // Fetch raw data once for all 5 praças and cache in memory
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    const loadAll = async () => {
      try {
        const [j, c, p, sp, g] = await Promise.all([
          fetchRawDashboardData('protagon-joinville'),
          fetchRawDashboardData('protagon-cuiaba'),
          fetchRawDashboardData('protagon-porto-alegre'),
          fetchRawDashboardData('protagon-sao-paulo'),
          fetchRawDashboardData('protagon-goiania')
        ]);

        if (!ignore) {
          setRawStore({
            'protagon-joinville': j,
            'protagon-cuiaba': c,
            'protagon-porto-alegre': p,
            'protagon-sao-paulo': sp,
            'protagon-goiania': g
          });
        }
      } catch (err: any) {
        if (!ignore) {
          setError(err.message || 'Erro ao carregar bases de dados');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadAll();
    return () => { ignore = true; };
  }, [refreshKey]);

  // Combine raw data according to selected praça (single selection or all)
  const combinedRawData = useMemo(() => {
    if (Object.keys(rawStore).length === 0) return null;

    const pracaKeys = selectedPraca === 'all'
      ? ALL_PRACAS.map(p => p.id)
      : [selectedPraca];

    const pracaNames: Record<DashboardId, string> = {
      'protagon-joinville': 'Joinville',
      'protagon-cuiaba': 'Cuiabá',
      'protagon-porto-alegre': 'Porto Alegre',
      'protagon-sao-paulo': 'São Paulo',
      'protagon-goiania': 'Goiânia'
    };

    const addPraca = (rows: any[], pName: string) => (rows || []).map(r => ({ ...r, praca: pName }));

    let main: any[] = [];
    let ingressos: any[] = [];
    let cadeiras: any[] = [];
    let geral: any[] = [];
    let met: any[] = [];
    let vd: any[] = [];
    let gd: any[] = [];
    let dc: any[] = [];

    pracaKeys.forEach(pId => {
      const data = rawStore[pId];
      if (data) {
        const name = pracaNames[pId] || pId;
        main = [...main, ...addPraca(data.main, name)];
        ingressos = [...ingressos, ...addPraca(data.ingressos, name)];
        cadeiras = [...cadeiras, ...addPraca(data.cadeiras, name)];
        geral = [...geral, ...addPraca(data.geral, name)];
        met = [...met, ...addPraca(data.met, name)];
        vd = [...vd, ...addPraca(data.vd, name)];
        gd = [...gd, ...addPraca(data.gd, name)];
        dc = [...dc, ...addPraca(data.dc, name)];
      }
    });

    return { main, ingressos, cadeiras, geral, met, vd, gd, dc } as RawDashboardData;
  }, [rawStore, selectedPraca]);

  // Calculate feedback KPIs whenever raw data or date range changes
  useEffect(() => {
    if (!combinedRawData || !startDate || !endDate) return;

    setIsCalculating(true);
    setTimeout(() => {
      try {
        const currentM = processDashboardMetrics(combinedRawData, startDate, endDate, 'all');
        const prevM = processDashboardMetrics(combinedRawData, prevStartDate, prevEndDate, 'all');
        const sum = buildFeedbackKPIsSummary(currentM, prevM);
        setSummary(sum);
      } catch (e) {
        console.error('Erro calculando feedback KPIs:', e);
      } finally {
        setIsCalculating(false);
      }
    }, 0);
  }, [combinedRawData, startDate, endDate, prevStartDate, prevEndDate]);

  // If user is not authenticated, show restricted login form
  if (!isAuthenticated) {
    return <RestrictedLogin onSuccess={() => setIsAuthenticated(true)} />;
  }

  const selectedPracasLabel = selectedPraca === 'all'
    ? 'Todas as Praças'
    : (ALL_PRACAS.find(p => p.id === selectedPraca)?.name || selectedPraca);

  const handleCopyData = async () => {
    if (!summary) return;
    const text = buildClipboardReportText({
      summary,
      startDate,
      endDate,
      prevStartDate,
      prevEndDate,
      selectedPracasLabel
    });
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#08080a] text-zinc-100 overflow-hidden font-sans">
      {/* Top Header & Navigation */}
      <header className="flex-none bg-zinc-950/80 border-b border-white/10 px-4 xl:px-6 py-3 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onOpenAppMenu}
                className="xl:hidden p-2 -ml-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg"
              >
                <Menu size={22} />
              </button>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center font-black text-black shadow-[0_0_15px_rgba(234,179,8,0.25)]">
                F
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white tracking-tight uppercase">
                    Feedbacks KPIs
                  </h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-semibold uppercase tracking-wider">
                    Estratégico
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Comparação de funis com benchmarks e criativos de impacto
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={handleLogout}
                className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg"
                title="Sair da sessão restrita"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>

          {/* Date Range & Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Quick date presets */}
            <div className="bg-zinc-900 border border-white/10 rounded-lg p-1 flex shadow-inner">
              <button
                onClick={() => handlePresetChange('last7')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  datePreset === 'last7' ? 'bg-zinc-800 text-yellow-400 shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                7D
              </button>
              <button
                onClick={() => handlePresetChange('last14')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  datePreset === 'last14' ? 'bg-zinc-800 text-yellow-400 shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                14D
              </button>
              <button
                onClick={() => handlePresetChange('last30')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  datePreset === 'last30' ? 'bg-zinc-800 text-yellow-400 shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                30D
              </button>
              <button
                onClick={() => handlePresetChange('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  datePreset === 'all' ? 'bg-zinc-800 text-yellow-400 shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Tudo
              </button>
            </div>

            {/* Custom Date Pickers */}
            <div className="flex items-center gap-1 sm:gap-2 bg-zinc-900 border border-white/10 rounded-lg p-1 px-2.5">
              <DatePicker
                selected={startDate ? new Date(startDate + 'T12:00:00') : null}
                onChange={(date) => {
                  if (date) {
                    setStartDate(format(date, 'yyyy-MM-dd'));
                    setDatePreset('custom');
                  }
                }}
                selectsStart
                startDate={startDate ? new Date(startDate + 'T12:00:00') : null}
                endDate={endDate ? new Date(endDate + 'T12:00:00') : null}
                locale="pt-BR"
                dateFormat="dd/MM/yyyy"
                className="bg-transparent text-white text-xs w-[76px] outline-none text-center font-medium"
                placeholderText="Início"
              />
              <span className="text-zinc-500 font-medium text-xs">até</span>
              <DatePicker
                selected={endDate ? new Date(endDate + 'T12:00:00') : null}
                onChange={(date) => {
                  if (date) {
                    setEndDate(format(date, 'yyyy-MM-dd'));
                    setDatePreset('custom');
                  }
                }}
                selectsEnd
                startDate={startDate ? new Date(startDate + 'T12:00:00') : null}
                endDate={endDate ? new Date(endDate + 'T12:00:00') : null}
                minDate={startDate ? new Date(startDate + 'T12:00:00') : null}
                locale="pt-BR"
                dateFormat="dd/MM/yyyy"
                className="bg-transparent text-white text-xs w-[76px] outline-none text-center font-medium"
                placeholderText="Fim"
              />
            </div>

            {/* Copy Period Data Button */}
            <button
              onClick={handleCopyData}
              disabled={!summary || loading}
              className={`font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_15px_rgba(234,179,8,0.2)] disabled:opacity-50'
              }`}
              title="Copiar dados organizados do período para a área de transferência"
            >
              {copied ? (
                <>
                  <Check size={14} className="stroke-[3]" />
                  <span>Dados Copiados!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copiar Dados do Período</span>
                </>
              )}
            </button>

            {/* Refresh Data */}
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-white/10 transition-colors"
              title="Recarregar bases"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-yellow-500' : ''} />
            </button>

            {/* User badge & Logout */}
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-white/10">
              <span className="text-xs text-zinc-400 flex items-center gap-1 font-medium">
                <ShieldCheck size={14} className="text-emerald-400" />
                Musy
              </span>
              <button
                onClick={handleLogout}
                className="text-xs text-zinc-500 hover:text-rose-400 transition-colors flex items-center gap-1"
                title="Encerrar sessão"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Second Header Row: Praças Filter & Sub-tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-3 pt-3 border-t border-white/5">
          {/* Praças Filter: Single Select or All */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mr-1 flex items-center gap-1">
              <MapPin size={12} className="text-yellow-500" />
              Praças:
            </span>
            <button
              onClick={() => setSelectedPraca('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedPraca === 'all'
                  ? 'bg-yellow-500 text-black shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              Todas as Praças
            </button>
            {ALL_PRACAS.map(praca => {
              const isSelected = selectedPraca === praca.id;
              return (
                <button
                  key={praca.id}
                  onClick={() => setSelectedPraca(praca.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-yellow-500 text-black shadow-md'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  {praca.name}
                </button>
              );
            })}
          </div>

          {/* Sub-tabs Selection */}
          <div className="flex items-center gap-1 bg-zinc-900/90 border border-white/10 rounded-lg p-1">
            <button
              onClick={() => setActiveSubTab('benchmarks')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeSubTab === 'benchmarks'
                  ? 'bg-yellow-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              1. Análise com Benchmarks & Impacto
            </button>
            <button
              onClick={() => setActiveSubTab('period-comparison')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeSubTab === 'period-comparison'
                  ? 'bg-yellow-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              2. Comparativo Período Anterior
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 xl:p-6 custom-scrollbar relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="w-9 h-9 text-yellow-500 animate-spin mb-3" />
            <p className="text-sm font-semibold text-white">Carregando dados das praças...</p>
            <p className="text-xs text-zinc-500 mt-1">Sincronizando planilhas e métricas operacionais</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center max-w-md">
              <p className="text-sm font-semibold text-rose-400">Falha ao carregar dados</p>
              <p className="text-xs text-zinc-400 mt-1">{error}</p>
              <button
                onClick={() => setRefreshKey(k => k + 1)}
                className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        ) : isCalculating || !summary ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mb-3" />
            <p className="text-sm font-semibold text-white">Processando cruzamento de benchmarks e criativos...</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-7xl mx-auto pb-16">
            {activeSubTab === 'benchmarks' ? (
              <BenchmarkComparisonSection
                summary={summary}
                selectedPracasLabel={selectedPracasLabel}
                startDate={startDate}
                endDate={endDate}
              />
            ) : (
              <PeriodComparisonSection
                summary={summary}
                startDate={startDate}
                endDate={endDate}
                prevStartDate={prevStartDate}
                prevEndDate={prevEndDate}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

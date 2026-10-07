import React, { useEffect, useState, useMemo } from 'react';
import { Menu, X } from "lucide-react";
import { ComposedChart, BarChart, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, Legend, Bar, ReferenceLine, PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import { 
  DollarSign, Users, ShoppingCart, Target, Filter, 
  TrendingUp, BarChart3, Activity, PieChart, 
  RefreshCw, LayoutDashboard, ArrowLeft, Loader2, AlertCircle, ArrowUpRight, ArrowDownRight, Info
} from 'lucide-react';
import { motion } from 'motion/react';
import { format, startOfToday, subDays, parseISO } from 'date-fns';
import { DashboardId } from '../utils/api';
import { Previsoes } from './Previsoes';
import { GeracaoDemandaCiclos } from './GeracaoDemandaCiclos';
import { GeracaoDemandaEstudoPublico } from './GeracaoDemandaEstudoPublico';
import { GDCacPontual } from './GDCacPontual';
import { fetchRawDashboardData, RawDashboardData, DATA_REFRESH_INTERVAL } from '../utils/dataFetching';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { ProcessedMetrics, processDashboardMetrics } from '../utils/metricsCalculator';
import { formatCurrency, formatNumber } from '../utils/format';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ptBR } from 'date-fns/locale/pt-BR';
registerLocale('pt-BR', ptBR);

import { MetricCard } from './MetricCard';
import { TicketTypeMetrics, MiniTicketTypeMetrics } from './TicketTypeMetrics';
import { CreativesTable } from './CreativesTable';
import { CreativesTableDistribuicao } from './CreativesTableDistribuicao';
import { PesquisaAudiencia } from "./PesquisaAudiencia";
import { AnaliseKPIs } from "./AnaliseKPIs";
import { DistribuicaoGeralView } from './DistribuicaoGeralView';

interface DashboardProps { onBack?: () => void; dashboardId: DashboardId; onOpenAppMenu?: () => void; }

export function Dashboard({ onBack, dashboardId, onOpenAppMenu }: DashboardProps) {
  const [rawData, setRawData] = useState<RawDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ProcessedMetrics | null>(null);
  const [prevMetrics, setPrevMetrics] = useState<ProcessedMetrics | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const [startDate, setStartDate] = useState<string>(() => format(subDays(startOfToday(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(() => format(startOfToday(), 'yyyy-MM-dd'));
  const [datePreset, setDatePreset] = useState<string>('last7');
  const [activeTab, setActiveTab] = useState<string>('visao-geral');
  const [cycleLength, setCycleLength] = useState<7 | 17>(17);

  const getTrend = (curr: number, prev: number, type: 'cost' | 'revenue' | 'neutral' = 'revenue') => {
    if (!prevMetrics) return undefined;
    if (prev === 0) return undefined;
    const diff = curr - prev;
    if (diff === 0) return { direction: 'neutral' as const, isGood: true };
    const perc = Math.abs(diff / prev) * 100;
    const valStr = `${diff > 0 ? '+' : '-'}${perc.toFixed(1)}%`;
    return {
      direction: diff > 0 ? 'up' as const : 'down' as const,
      isGood: type === 'cost' ? diff < 0 : diff > 0,
      value: valStr
    };
  };
  const [pesquisaSubtab, setPesquisaSubtab] = useState<'leads' | 'compradores'>('leads');
  const [selectedCreativePesquisa, setSelectedCreativePesquisa] = useState<{nome: string; pesquisa: any[]} | null>(null);
  const [showInleadPagesModal, setShowInleadPagesModal] = useState(false);
  const [selectedInleadPageFilter, setSelectedInleadPageFilter] = useState<string>('all');

  const [audienceTemp, setAudienceTemp] = useState<'all' | 'quente' | 'frio'>('all');

  const compradoresPesquisa = useMemo(() => {
    if (!metrics || !metrics.ingressosData) return [];
    return metrics.ingressosData.map((row: any) => ({
      renda: row['Renda'] || row['renda'] || '',
      escolaridade: row['Escolaridade'] || row['escolaridade'] || '',
      atuacao: row['Atuação'] || row['atuacao'] || row['Atuacao'] || '',
      estado_civil: row['Estado Civil'] || row['estado_civil'] || row['Estado civil'] || ''
    })).filter((row: any) => row.renda || row.escolaridade || row.atuacao || row.estado_civil);
  }, [metrics]);

  const allCreatives = useMemo(() => {
    if (!metrics) return [];
    return [
      ...(metrics.creativesForm || []),
      ...(metrics.creativesCaptura || []),
      ...(metrics.creativesVD || []),
      ...(metrics.creativesMET || []),
      ...(metrics.creativesDC || [])
    ];
  }, [metrics]);

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const today = startOfToday();
    
    if (preset === 'today') {
      setStartDate(format(today, 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'yesterday') {
      setStartDate(format(subDays(today, 1), 'yyyy-MM-dd'));
      setEndDate(format(subDays(today, 1), 'yyyy-MM-dd'));
    } else if (preset === 'last7') {
      setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'last17') {
      setStartDate(format(subDays(today, 17), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'last30') {
      setStartDate(format(subDays(today, 30), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'all') {
      setStartDate('2020-01-01');
      setEndDate(format(today, 'yyyy-MM-dd'));
    }
  };

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        // Only clear metrics if it's a completely new dashboard load
        if (!rawData) {
          setMetrics(null);
          setPrevMetrics(null);
        }
        const data = await fetchRawDashboardData(dashboardId, refreshKey > 0);
        
        if (ignore) return;
        
        setRawData(data);
        
      } catch (err: any) {
        if (!ignore) {
          setError(err.message || 'Erro ao carregar dados');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      ignore = true;
    };
  }, [dashboardId, refreshKey]);

  useEffect(() => {
    if (loading) return;
    const refreshIfStale = () => {
      if (document.visibilityState !== 'visible') return;
      const loadedAt = rawData?.fetchedAt ? Date.parse(rawData.fetchedAt) : 0;
      if (Date.now() - loadedAt >= DATA_REFRESH_INTERVAL) setRefreshKey(key => key + 1);
    };
    const timer = window.setInterval(refreshIfStale, DATA_REFRESH_INTERVAL);
    document.addEventListener('visibilitychange', refreshIfStale);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfStale);
    };
  }, [loading, rawData?.fetchedAt]);

  useEffect(() => {
    if (!rawData || !startDate || !endDate) return;
    setIsCalculating(true);
    
    const timer = setTimeout(() => {
      try {
        let prevStartStr = startDate;
        let prevEndStr = endDate;
        if (startDate && endDate) {
          const startD = parseISO(startDate);
          const endD = parseISO(endDate);
          const diffTime = Math.abs(endD.getTime() - startD.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          const prevEnd = subDays(startD, 1);
          const prevStart = subDays(prevEnd, diffDays - 1);
          prevStartStr = format(prevStart, 'yyyy-MM-dd');
          prevEndStr = format(prevEnd, 'yyyy-MM-dd');
        }
        
        const result = processDashboardMetrics(rawData, startDate, endDate, audienceTemp);
        const prevResult = processDashboardMetrics(rawData, prevStartStr, prevEndStr, audienceTemp);
        setMetrics(result);
        setPrevMetrics(prevResult);
      } catch (error) {
        console.error("Error calculating metrics:", error);
      }
      setIsCalculating(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [rawData, startDate, endDate, audienceTemp]);

  if (loading && !metrics) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-white min-h-screen">
        <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mb-4" />
        <h2 className="text-xl font-medium tracking-tight">Carregando dados...</h2>
        <p className="text-sm text-zinc-500 mt-2">Por favor aguarde, processando milhões de linhas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-white min-h-screen">
        <div className="bg-red-500/10 text-red-500 p-4 rounded-md mb-4 border border-red-500/20">
          <p className="font-medium">Erro ao carregar o dashboard</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
        <button onClick={() => setRefreshKey(k => k + 1)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md transition-colors">
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-white min-h-screen">
        <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mb-4" />
        <h2 className="text-xl font-medium tracking-tight">Calculando métricas...</h2>
      </div>
    );
  }

  const dias = metrics?.visaoGeral?.chartData?.length || 1;

  const tooltipFormatter = (value: any, name: string) => {
    if (typeof value !== 'number') return [value, name];
    if (name.includes('Investimento') || name.includes('Custo') || name.includes('CPM')) {
      return [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name];
    }
    if (name.includes('CTR') || name.includes('Connect') || name.includes('Conversão') || name.includes('%')) {
      return [`${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`, name];
    }
    return [value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }), name];
  };


  const formatDashboardName = (id: string) => {
    switch (id) {
      case 'protagon-joinville': return 'Protagon Joinville';
      case 'protagon-cuiaba': return 'Protagon Cuiabá';
      case 'protagon-porto-alegre': return 'Protagon Porto Alegre';
      case 'protagon-sao-paulo': return 'Protagon São Paulo';
      case 'protagon-goiania': return 'Protagon Goiânia';
      default: return id.replace('protagon-', 'Protagon ').replace('-', ' ');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 text-white relative">
      {(loading || isCalculating) && (
        <div className="absolute inset-0 z-50 bg-zinc-950/50 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mb-4" />
          <h2 className="text-xl font-medium tracking-tight text-white">Calculando...</h2>
        </div>
      )}
      {/* Header and Controls */}
      <header className="flex-none bg-zinc-950/50 border-b border-white/10 py-2 px-4 sticky top-0 z-20 backdrop-blur-md">
        <div className="w-full mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-4 px-2">
          <div className="flex xl:hidden items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <button onClick={() => onOpenAppMenu && onOpenAppMenu()} className="p-2 text-zinc-400 hover:text-white transition-colors">
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent uppercase truncate">
                {formatDashboardName(dashboardId)}
              </h1>
            </div>
          </div>
          <div className="hidden xl:flex items-center gap-4">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-2 hover:bg-white/10 rounded-full transition-colors group"
              >
                <ArrowLeft className="w-5 h-5 text-zinc-400 group-hover:text-white" />
              </button>
            )}
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent uppercase">
                {formatDashboardName(dashboardId)}
              </h1>
              <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Dashboard de Performance</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full xl:w-auto">
            {activeTab !== 'previsoes' ? (
              <>
                <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-lg p-1 shadow-inner">
                  <button 
                    onClick={() => {
                      setCycleLength(17);
                      setActiveTab('geracao-demanda-ciclo');
                    }}
                    className={`px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all ${cycleLength === 17 && activeTab === 'geracao-demanda-ciclo' ? 'bg-zinc-800 text-yellow-500 shadow-sm border-white/5' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Filtrar pelo Ciclo de Vendas (17D)
                  </button>
                  <button 
                    onClick={() => {
                      setCycleLength(7);
                      setActiveTab('geracao-demanda-ciclo');
                    }}
                    className={`px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all ${cycleLength === 7 && activeTab === 'geracao-demanda-ciclo' ? 'bg-zinc-800 text-yellow-500 shadow-sm border-white/5' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Filtrar pelo Ciclo de Vendas (7D)
                  </button>
                </div>
                <div className="bg-zinc-900 border border-white/10 rounded-lg p-1 flex flex-wrap shadow-inner">
                  <button onClick={() => handlePresetChange('today')} className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all ${datePreset === 'today' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>Hoje</button>
                  <button onClick={() => handlePresetChange('yesterday')} className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all ${datePreset === 'yesterday' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>Ontem</button>
                  <button onClick={() => handlePresetChange('last7')} className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all ${datePreset === 'last7' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>7D</button>
                  <button onClick={() => handlePresetChange('last30')} className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all ${datePreset === 'last30' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>30D</button>
                  <button onClick={() => handlePresetChange('all')} className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all ${datePreset === 'all' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>Tudo</button>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 bg-zinc-900 border border-white/10 rounded-md p-1 px-2 w-full sm:w-auto justify-between sm:justify-start">
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
                    className="bg-transparent text-white text-xs sm:text-sm w-[75px] sm:w-[85px] outline-none text-center"
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
                    className="bg-transparent text-white text-xs sm:text-sm w-[75px] sm:w-[85px] outline-none text-center"
                    placeholderText="Fim"
                  />
                </div>
              </>
            ) : (
              <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs text-zinc-400 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                <span>Dados acumulados até o momento (sem filtro de data)</span>
              </div>
            )}
            <button 
              onClick={() => setRefreshKey(k => k + 1)} 
              disabled={loading}
              className="bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap"
              title="Atualizar dados do Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-yellow-500' : 'text-zinc-400'}`} />
              <span className="hidden sm:inline">Atualizar Dados</span>
            </button>
            {rawData?.fetchedAt && (
              <span className="text-[10px] text-zinc-500 whitespace-nowrap" title="Horário da última consulta às planilhas; atualização automática a cada 5 minutos">
                Consultado às {new Date(rawData.fetchedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden w-full mx-auto relative">
        {/* Sidebar Navigation */}
        <aside className="w-full xl:w-48 flex-none border-b xl:border-b-0 xl:border-r border-white/5 overflow-x-auto xl:overflow-y-auto custom-scrollbar p-2 flex flex-row xl:flex-col gap-2 xl:gap-1 items-center xl:items-stretch whitespace-nowrap bg-zinc-950 z-10">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 mt-2 px-3 hidden xl:block">Geral</div>
          <button onClick={() => { setActiveTab('visao-geral'); }} className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors text-left ${activeTab === 'visao-geral' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' : 'text-zinc-400 hover:bg-white/5 hover:text-white transition-all'}`}>Visão Geral</button>
          <button onClick={() => { setActiveTab('pesquisa-audiencia'); }} className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors text-left ${activeTab === 'pesquisa-audiencia' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' : 'text-zinc-400 hover:bg-white/5 hover:text-white transition-all'}`}>Pesquisa de Audiência</button>
          <button onClick={() => { setActiveTab('previsoes'); }} className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors text-left ${activeTab === 'previsoes' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' : 'text-zinc-400 hover:bg-white/5 hover:text-white transition-all'}`}>Previsões</button>

          <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 mt-4 px-3 hidden xl:block">Funis</div>
          
          <div className="flex flex-row xl:flex-col gap-2 xl:gap-1">
            <button onClick={() => { setActiveTab('meteorico-analise'); }} className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors text-left ${activeTab.startsWith('meteorico') ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' : 'text-zinc-400 hover:bg-white/5 hover:text-white transition-all'}`}>Meteórico</button>
            {activeTab.startsWith('meteorico') && (
              <div className="xl:ml-4 xl:pl-3 xl:border-l border-white/10 flex flex-row xl:flex-col py-1 gap-2 xl:gap-1">
                <button onClick={() => { setActiveTab('meteorico-analise'); }} className={`px-2 py-1.5 rounded-md text-xs font-medium text-left ${activeTab === 'meteorico-analise' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Análise de Métricas</button>
                <button disabled className="px-2 py-1.5 rounded-md text-xs font-medium text-left text-zinc-600 cursor-not-allowed">Funil (Em breve)</button>
                <button onClick={() => { setActiveTab('meteorico-criativos'); }} className={`px-2 py-1.5 rounded-md text-xs font-medium text-left ${activeTab === 'meteorico-criativos' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Criativos</button>
              </div>
            )}
            
            <button onClick={() => { setActiveTab('geracao-demanda-analise'); }} className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors text-left ${activeTab.startsWith('geracao-demanda') ? 'bg-white/5 text-yellow-500/80 border border-white/10' : 'text-zinc-400 hover:bg-white/5 hover:text-white transition-all'}`}>Geração de Demanda</button>
            {activeTab.startsWith('geracao-demanda') && (
              <div className="ml-4 pl-3 border-l border-white/10 flex flex-col py-1 gap-1">
                <button onClick={() => { setActiveTab('geracao-demanda-analise'); }} className={`px-2 py-1.5 rounded-md text-xs font-medium text-left ${activeTab === 'geracao-demanda-analise' ? 'text-yellow-500/80' : 'text-zinc-500 hover:text-zinc-300'}`}>Análise de Métricas</button>
                <button onClick={() => { setActiveTab('geracao-demanda-criativos'); }} className={`px-2 py-1.5 rounded-md text-xs font-medium text-left ${activeTab === 'geracao-demanda-criativos' ? 'text-yellow-500/80' : 'text-zinc-500 hover:text-zinc-300'}`}>Criativos</button>
                <button onClick={() => { setActiveTab('geracao-demanda-ciclo'); }} className={`px-2 py-1.5 rounded-md text-xs font-medium text-left ${activeTab === 'geracao-demanda-ciclo' ? 'text-yellow-500/80' : 'text-zinc-500 hover:text-zinc-300'}`}>Ciclo de Vendas</button>
                <button onClick={() => { setActiveTab('geracao-demanda-estudo'); }} className={`px-2 py-1.5 rounded-md text-xs font-medium text-left ${activeTab === 'geracao-demanda-estudo' ? 'text-yellow-500/80' : 'text-zinc-500 hover:text-zinc-300'}`}>Estudo do Público</button>
                <button onClick={() => { setActiveTab('geracao-demanda-cac-pontual'); }} className={`px-2 py-1.5 rounded-md text-xs font-medium text-left ${activeTab === 'geracao-demanda-cac-pontual' ? 'text-yellow-500/80' : 'text-zinc-500 hover:text-zinc-300'}`}>CAC Pontual & Ciclo</button>
              </div>
            )}

            <button onClick={() => { setActiveTab('venda-direta-analise'); }} className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors text-left ${activeTab.startsWith('venda-direta') ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' : 'text-zinc-400 hover:bg-white/5 hover:text-white transition-all'}`}>Venda Direta</button>
            {activeTab.startsWith('venda-direta') && (
              <div className="ml-4 pl-3 border-l border-white/10 flex flex-col py-1 gap-1">
                <button onClick={() => { setActiveTab('venda-direta-analise'); }} className={`px-2 py-1.5 rounded-md text-xs font-medium text-left ${activeTab === 'venda-direta-analise' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Análise de Métricas</button>
                <button disabled className="px-2 py-1.5 rounded-md text-xs font-medium text-left text-zinc-600 cursor-not-allowed">Funil (Em breve)</button>
                <button onClick={() => { setActiveTab('venda-direta-criativos'); }} className={`px-2 py-1.5 rounded-md text-xs font-medium text-left ${activeTab === 'venda-direta-criativos' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Criativos</button>
              </div>
            )}
            
            <button onClick={() => { setActiveTab('distribuicao-klt-geral'); }} className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors text-left ${activeTab.startsWith('distribuicao-') ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' : 'text-zinc-400 hover:bg-white/5 hover:text-white transition-all'}`}>Distribuição de Conteúdo</button>
            {activeTab.startsWith('distribuicao-') && (
              <div className="flex flex-col gap-2 ml-4 pl-3 border-l border-white/10 mt-1">
                {/* SUBABA KLT */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 pl-2">KLT</span>
                  <button onClick={() => { setActiveTab('distribuicao-klt-geral'); }} className={`px-2 py-1 rounded-md text-xs font-medium text-left ${activeTab === 'distribuicao-klt-geral' ? 'text-white bg-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}>Geral</button>
                  <button onClick={() => { setActiveTab('distribuicao-klt-criativos'); }} className={`px-2 py-1 rounded-md text-xs font-medium text-left ${activeTab === 'distribuicao-klt-criativos' ? 'text-white bg-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}>Criativos</button>
                </div>
                {/* SUBABA CORREDOR POLONÊS */}
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 pl-2">Corredor Polonês</span>
                  <button onClick={() => { setActiveTab('distribuicao-corredor-geral'); }} className={`px-2 py-1 rounded-md text-xs font-medium text-left ${activeTab === 'distribuicao-corredor-geral' ? 'text-white bg-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}>Geral</button>
                  <button onClick={() => { setActiveTab('distribuicao-corredor-criativos'); }} className={`px-2 py-1 rounded-md text-xs font-medium text-left ${activeTab === 'distribuicao-corredor-criativos' ? 'text-white bg-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}>Criativos</button>
                </div>
                {/* SUBABA REMARKETING */}
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 pl-2">Remarketing</span>
                  <button onClick={() => { setActiveTab('distribuicao-remarketing-geral'); }} className={`px-2 py-1 rounded-md text-xs font-medium text-left ${activeTab === 'distribuicao-remarketing-geral' ? 'text-white bg-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}>Geral</button>
                  <button onClick={() => { setActiveTab('distribuicao-remarketing-criativos'); }} className={`px-2 py-1 rounded-md text-xs font-medium text-left ${activeTab === 'distribuicao-remarketing-criativos' ? 'text-white bg-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}>Criativos</button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Dashboard Content */}
        <main className="flex-1 p-4 overflow-hidden flex flex-col relative">
          
          {activeTab === 'previsoes' && metrics && (
          <section className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-20 animate-in fade-in duration-500">
            <Previsoes metrics={metrics} rawData={rawData} dashboardId={dashboardId} diasFiltro={dias} />
          </section>
        )}
        {activeTab === 'analise-kpis' && metrics && rawData && (
          <section className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-20 animate-in fade-in duration-500">
            <AnaliseKPIs metrics={metrics} dashboardId={dashboardId} rawData={rawData} />
          </section>
        )}
        {activeTab === 'visao-geral' && metrics && (
            <section className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-20">
              {(dashboardId === 'protagon-sao-paulo' || dashboardId === 'protagon-goiania') && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-blue-300">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse flex-none"></span>
                    <div>
                      <p className="font-semibold text-sm text-white">Praça em fase de Distribuição de Conteúdo</p>
                      <p className="text-xs text-zinc-400">Atualmente não há ingressos vendidos para esta praça (0 ingressos). O investimento ativo corresponde à distribuição de conteúdo.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('distribuicao-conteudo')}
                    className="px-3 py-1.5 text-xs font-semibold bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg transition-colors border border-blue-500/30 whitespace-nowrap"
                  >
                    Ver Distribuição de Conteúdo →
                  </button>
                </div>
              )}

              {/* Minimalist Notice: Investimento Total inclui Distribuição de Conteúdo */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-white/5 text-zinc-400 text-xs w-fit">
                <Info size={13} className="text-zinc-500 shrink-0" />
                <span>O <strong className="text-zinc-300 font-medium">Investimento Total</strong> desta praça inclui os valores aplicados em distribuição de conteúdo.</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
                <MetricCard 
                  title="Investimento Total" 
                  value={metrics.investimentoTotal} 
                  type="currency" 
                  icon={DollarSign} 
                  subtitle="Inclui Distribuição de Conteúdo"
                  tooltip="Soma dos investimentos de todos os funis somados à distribuição de conteúdo"
                />
                <MetricCard title="Inv. Distribuição" value={metrics.distribuicao.investimento} type="currency" icon={DollarSign} />
                <MetricCard title="Faturamento Total" value={metrics.faturamentoTotal} type="currency" icon={DollarSign} trend={metrics.faturamentoTotal > metrics.investimentoTotal ? 'up' : 'down'} />
                <MetricCard title="ROAS Global" value={metrics.investimentoTotal > 0 ? (metrics.faturamentoTotal / metrics.investimentoTotal) : 0} type="number" decimals={2} />
                <MetricCard 
                  title="Ingressos Vendidos" 
                  value={`${metrics.ingressosVendidos} ingressos`} 
                  type="string" 
                  icon={Users} subtitle={`${metrics.ingressosSemRastreamento} sem rastreamento`} 
                  
                />
                <MetricCard title="CAC Ingresso" value={metrics.ingressosVendidos > 0 ? metrics.investimentoTotal / metrics.ingressosVendidos : 0} type="currency" icon={DollarSign} />
                <MetricCard title="Ticket Médio" value={metrics.ingressosVendidos > 0 ? metrics.faturamentoTotal / metrics.ingressosVendidos : 0} type="currency" icon={DollarSign} />
                <MetricCard title="Pace (Ingressos)" value={metrics.ingressosVendidos / dias} type="number" decimals={2} />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 shadow-md">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Meteórico</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider">Investimento</p>
                      <p className="text-lg font-mono">{formatCurrency(metrics.meteorico.investimento)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider">Faturamento</p>
                      <p className="text-lg font-mono text-emerald-400">{formatCurrency(metrics.meteorico.faturamento)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider">Leads / MQLs</p>
                      <p className="text-lg font-mono">{formatNumber(metrics.meteorico.leads)} / {formatNumber(metrics.meteorico.mqls)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider">Custo por MQL</p>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-mono">{formatCurrency(metrics.meteorico.mqls > 0 ? metrics.meteorico.investimento / metrics.meteorico.mqls : 0)}</p>
                        {prevMetrics && <TrendBadge curr={metrics.meteorico.mqls > 0 ? metrics.meteorico.investimento / metrics.meteorico.mqls : 0} prev={prevMetrics.meteorico.mqls > 0 ? prevMetrics.meteorico.investimento / prevMetrics.meteorico.mqls : 0} type="cost" />}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider">Ingressos Vendidos</p>
                      <p className="text-lg font-mono">{formatNumber(metrics.meteorico.ingressos)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider">CAC Ingresso</p>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-mono">{formatCurrency(metrics.meteorico.ingressos > 0 ? metrics.meteorico.investimento / metrics.meteorico.ingressos : 0)}</p>
                        {prevMetrics && <TrendBadge curr={metrics.meteorico.ingressos > 0 ? metrics.meteorico.investimento / metrics.meteorico.ingressos : 0} prev={prevMetrics.meteorico.ingressos > 0 ? prevMetrics.meteorico.investimento / prevMetrics.meteorico.ingressos : 0} type="cost" />}
                      </div>
                    </div>
                  </div>
                  <MiniTicketTypeMetrics data={metrics.ticketsByTypes.meteorico} />
                </div>

                <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 shadow-md relative">
                  <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none z-0">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                      <Target className="w-24 h-24" />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-yellow-500/80 uppercase tracking-widest mb-4">Geração de Demanda</h3>
                  <div className="space-y-4 relative z-10">
                    <div>
                      <p className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider">Investimento</p>
                      <p className="text-lg font-mono">{formatCurrency(metrics.demanda.investimento)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider">Faturamento</p>
                      <p className="text-lg font-mono text-emerald-400">{formatCurrency(metrics.demanda.faturamento)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider">Leads / MQLs</p>
                      <p className="text-lg font-mono">{formatNumber(metrics.demanda.leads)} / {formatNumber(metrics.demanda.mqls)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider">Custo por MQL</p>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-mono">{formatCurrency(metrics.demanda.mqls > 0 ? metrics.demanda.investimento / metrics.demanda.mqls : 0)}</p>
                        {prevMetrics && <TrendBadge curr={metrics.demanda.mqls > 0 ? metrics.demanda.investimento / metrics.demanda.mqls : 0} prev={prevMetrics.demanda.mqls > 0 ? prevMetrics.demanda.investimento / prevMetrics.demanda.mqls : 0} type="cost" />}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider">Ingressos Vendidos</p>
                      <p className="text-lg font-mono">{formatNumber(metrics.demanda.ingressos)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider">CAC Ingresso</p>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-mono">{formatCurrency(metrics.demanda.ingressos > 0 ? metrics.demanda.investimento / metrics.demanda.ingressos : 0)}</p>
                        {prevMetrics && <TrendBadge curr={metrics.demanda.ingressos > 0 ? metrics.demanda.investimento / metrics.demanda.ingressos : 0} prev={prevMetrics.demanda.ingressos > 0 ? prevMetrics.demanda.investimento / prevMetrics.demanda.ingressos : 0} type="cost" />}
                      </div>
                    </div>
                  </div>
                  <MiniTicketTypeMetrics data={metrics.ticketsByTypes.demanda} />
                </div>

                <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 shadow-md">
                  <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4">Venda Direta</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider">Investimento</p>
                      <p className="text-lg font-mono">{formatCurrency(metrics.vendaDireta.investimento)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider">Faturamento</p>
                      <p className="text-lg font-mono text-emerald-400">{formatCurrency(metrics.vendaDireta.faturamento)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider">Leads / MQLs (Tráfego)</p>
                      <p className="text-lg font-mono">{formatNumber(metrics.vendaDireta.leadsTrafego)} / {formatNumber(metrics.vendaDireta.mqls)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider">Custo por MQL</p>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-mono">{formatCurrency(metrics.vendaDireta.mqls > 0 ? metrics.vendaDireta.investimento / metrics.vendaDireta.mqls : 0)}</p>
                        {prevMetrics && <TrendBadge curr={metrics.vendaDireta.mqls > 0 ? metrics.vendaDireta.investimento / metrics.vendaDireta.mqls : 0} prev={prevMetrics.vendaDireta.mqls > 0 ? prevMetrics.vendaDireta.investimento / prevMetrics.vendaDireta.mqls : 0} type="cost" />}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider">Ingressos Vendidos</p>
                      <p className="text-lg font-mono">{formatNumber(metrics.vendaDireta.ingressos)}</p>
                      <p className="text-[10px] text-zinc-500">{formatNumber(metrics.vendaDireta.ingressosOrganico)} Orgânico / {formatNumber(metrics.vendaDireta.ingressosTrafego)} Tráfego</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider">CAC Ingresso (Geral)</p>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-mono">{formatCurrency(metrics.vendaDireta.ingressos > 0 ? metrics.vendaDireta.investimento / metrics.vendaDireta.ingressos : 0)}</p>
                        {prevMetrics && <TrendBadge curr={metrics.vendaDireta.ingressos > 0 ? metrics.vendaDireta.investimento / metrics.vendaDireta.ingressos : 0} prev={prevMetrics.vendaDireta.ingressos > 0 ? prevMetrics.vendaDireta.investimento / prevMetrics.vendaDireta.ingressos : 0} type="cost" />}
                      </div>
                    </div>
                  </div>
                  <MiniTicketTypeMetrics data={metrics.ticketsByTypes.vendaDireta} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 shadow-md">
                  <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Alocação de Investimento</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: 'Meteórico', value: metrics.meteorico.investimento, fill: '#8b5cf6' },
                            { name: 'Geração de Demanda', value: metrics.demanda.investimento, fill: '#3b82f6' },
                            { name: 'Venda Direta', value: metrics.vendaDireta.investimento, fill: '#eab308' },
                            { name: 'Distribuição', value: metrics.distribuicao.investimento, fill: '#10b981' }
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {
                            [
                              { name: 'Meteórico', value: metrics.meteorico.investimento, fill: '#8b5cf6' },
                              { name: 'Geração de Demanda', value: metrics.demanda.investimento, fill: '#3b82f6' },
                              { name: 'Venda Direta', value: metrics.vendaDireta.investimento, fill: '#eab308' },
                              { name: 'Distribuição', value: metrics.distribuicao.investimento, fill: '#10b981' }
                            ].filter(d => d.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))
                          }
                        </Pie>
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const total = metrics.meteorico.investimento + metrics.demanda.investimento + metrics.vendaDireta.investimento + metrics.distribuicao.investimento;
                              const percent = total > 0 ? ((data.value / total) * 100).toFixed(2) : '0.00';
                              
                              return (
                                <div className="bg-zinc-900 border border-white/10 p-3 rounded-lg shadow-xl">
                                  <p className="text-white font-bold mb-1">{data.name}</p>
                                  <p className="text-zinc-300 text-sm flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: data.fill }}></span>
                                    Investimento: <span className="text-white font-bold">{formatCurrency(data.value)}</span>
                                  </p>
                                  <p className="text-zinc-400 text-xs mt-1 font-medium">
                                    Representa {percent}% do total
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 shadow-md">
                  <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Investimento e MQLs por Dia</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={metrics.visaoGeral.chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickFormatter={(tick) => tick ? tick.substring(5, 10) : ""} />
                        <YAxis yAxisId="left" stroke="#a1a1aa" fontSize={12} tickFormatter={(val) => `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                        <YAxis yAxisId="right" orientation="right" stroke="#a1a1aa" fontSize={12} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)' }}
                          formatter={tooltipFormatter}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="investimento" name="Investimento" fill="#eab308" />
                        <Line yAxisId="right" type="monotone" name="MQLs" dataKey="mqls" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 shadow-md">
                  <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Número de Ingressos por Dia</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={metrics.visaoGeral.chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickFormatter={(tick) => tick ? tick.substring(5, 10) : ""} />
                        <YAxis stroke="#a1a1aa" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)' }} formatter={tooltipFormatter} />
                        <Legend />
                        <Bar dataKey="ingressos" name="Ingressos Vendidos" fill="#10b981" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
              </div>
            </section>
          )}

          {activeTab === 'pesquisa-audiencia' && metrics && (
             <section className="flex-1 flex flex-col min-h-0">
               <div className="flex justify-between items-end mb-4">
                 <h2 className="text-xl font-bold tracking-tight border-l-4 border-yellow-500 pl-3 uppercase">Pesquisa de Audiência</h2>
               </div>
               
               <div className="flex gap-4 mb-4 border-b border-white/10 pb-2">
                 <button
                   onClick={() => setPesquisaSubtab('leads')}
                   className={`px-4 py-2 font-bold uppercase tracking-wider text-sm rounded-lg transition-colors ${
                     pesquisaSubtab === 'leads' 
                       ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' 
                       : 'text-zinc-400 hover:text-white hover:bg-white/5'
                   }`}
                 >
                   Leads
                 </button>
                 <button
                   onClick={() => setPesquisaSubtab('compradores')}
                   className={`px-4 py-2 font-bold uppercase tracking-wider text-sm rounded-lg transition-colors ${
                     pesquisaSubtab === 'compradores' 
                       ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' 
                       : 'text-zinc-400 hover:text-white hover:bg-white/5'
                   }`}
                 >
                   Compradores
                 </button>
               </div>

               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative">
                 <PesquisaAudiencia 
                   data={pesquisaSubtab === 'leads' ? metrics.pesquisa : compradoresPesquisa} 
                   creatives={allCreatives}
                   isLoading={loading || isCalculating} 
                 />
               </div>
             </section>
          )}

          {activeTab === 'meteorico-analise' && metrics && (
             <section className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-20">
               <div className="flex justify-between items-end mb-4">
                 <h2 className="text-xl font-bold tracking-tight border-l-4 border-yellow-500 pl-3 uppercase">Meteórico - Análise</h2>
               </div>
               
               <TicketTypeMetrics data={metrics.ticketsByTypes.meteorico} />

               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                 <MetricCard title="Investimento" value={metrics.meteorico.investimento} type="currency" />
                 <MetricCard title="Faturamento" value={metrics.meteorico.faturamento} type="currency" />
                 <MetricCard title="Ingressos Vendidos" value={metrics.meteorico.ingressos} type="number" />
                 <MetricCard title="CAC Ingresso" value={metrics.meteorico.ingressos > 0 ? metrics.meteorico.investimento / metrics.meteorico.ingressos : 0} type="currency" />
                 <MetricCard title="Pace Diário (Ingressos)" value={metrics.meteorico.ingressos / dias} type="number" decimals={2} />
                 <MetricCard title="Leads (Atrib: Meteórico)" value={metrics.meteorico.leads} type="number" />
                 <MetricCard title="MQLs" value={metrics.meteorico.mqls} type="number" />
                 <MetricCard title="Custo por Lead" value={metrics.meteorico.leads > 0 ? metrics.meteorico.investimento / metrics.meteorico.leads : 0} type="currency" />
                 <MetricCard title="Custo por MQL" value={metrics.meteorico.mqls > 0 ? metrics.meteorico.investimento / metrics.meteorico.mqls : 0} type="currency" />
                 <MetricCard title="Pace Diário (MQLs)" value={metrics.meteorico.mqls / dias} type="number" decimals={2} />
               </div>
               
               <div className="space-y-6">
                 <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
                   <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Gráfico 1: Número de leads diário</h3>
                   <div className="h-64">
                     <ResponsiveContainer width="100%" height="100%">
                       <ComposedChart data={metrics.meteorico.chartData}>
                         <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                         <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                         <YAxis stroke="#a1a1aa" fontSize={12} />
                         <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} formatter={tooltipFormatter} />
                         <Line type="monotone" dataKey="leads" stroke="#eab308" strokeWidth={2} dot={false} />
                       </ComposedChart>
                     </ResponsiveContainer>
                   </div>
                 </div>

                 <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
                   <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Gráfico 2: Investimento</h3>
                   <div className="h-64">
                     <ResponsiveContainer width="100%" height="100%">
                       <ComposedChart data={metrics.meteorico.chartData}>
                         <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                         <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                         <YAxis stroke="#a1a1aa" fontSize={12} tickFormatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                         <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} formatter={tooltipFormatter} />
                         <Bar dataKey="investimento" fill="#eab308" />
                       </ComposedChart>
                     </ResponsiveContainer>
                   </div>
                 </div>

                 <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
                   <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Gráfico 3: CTR (%) e Gráfico 4: Connect Rate (%)</h3>
                   <div className="h-64">
                     <ResponsiveContainer width="100%" height="100%">
                       <ComposedChart data={metrics.meteorico.chartData}>
                         <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                         <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                         <YAxis yAxisId="left" stroke="#a1a1aa" fontSize={12} tickFormatter={(v) => `${v}%`} />
                         <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} formatter={tooltipFormatter} />
                         <Legend />
                         <Line yAxisId="left" type="monotone" name="CTR (%)" dataKey={(d) => d.impressoes > 0 ? ((d.cliques / d.impressoes) * 100).toFixed(2) : 0} stroke="#3b82f6" strokeWidth={2} dot={false} />
                         <Line yAxisId="left" type="monotone" name="Connect Rate (%)" dataKey={(d) => d.cliques > 0 ? Number(((d.pvs / d.cliques) * 100).toFixed(2)) : 0} stroke="#10b981" strokeWidth={2} dot={false} />
                       </ComposedChart>
                     </ResponsiveContainer>
                   </div>
                 </div>

                 <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
                   <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Gráfico 5: Conversão da Página (%)</h3>
                   <div className="h-64">
                     <ResponsiveContainer width="100%" height="100%">
                       <ComposedChart data={metrics.meteorico.chartData}>
                         <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                         <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                         <YAxis stroke="#a1a1aa" fontSize={12} tickFormatter={(v) => `${v}%`} />
                         <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} formatter={tooltipFormatter} />
                         <Line type="monotone" name="Conversão da Página (%)" dataKey={(d) => d.pvs > 0 ? Number(((d.leads / d.pvs) * 100).toFixed(2)) : 0} stroke="#8b5cf6" strokeWidth={2} dot={false} />
                       </ComposedChart>
                     </ResponsiveContainer>
                   </div>
                 </div>
               </div>
             </section>
          )}

          {activeTab === 'geracao-demanda-analise' && metrics && (
             <section className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8 pb-20">
               <div className="flex justify-between items-end mb-4">
                 <h2 className="text-xl font-bold tracking-tight border-l-4 border-yellow-500 pl-3 uppercase">Geração de Demanda - Análise</h2>
               </div>
               
               <TicketTypeMetrics data={metrics.ticketsByTypes.demanda} />
               
               {/* Resumo */}
               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                 <MetricCard title="Investimento (Total)" value={metrics.demanda.investimento} type="currency" trend={prevMetrics ? getTrend(metrics.demanda.investimento, prevMetrics.demanda.investimento, 'revenue') : undefined} />
                 <MetricCard title="Faturamento (Total)" value={metrics.demanda.faturamento} type="currency" trend={prevMetrics ? getTrend(metrics.demanda.faturamento, prevMetrics.demanda.faturamento, 'revenue') : undefined} />
                 <MetricCard title="Ingressos (Total)" value={metrics.demanda.ingressos} type="number" subtitle={metrics.demanda.ingressosOrganico > 0 ? `${metrics.demanda.ingressosOrganico} orgânico${metrics.demanda.ingressosOrganico > 1 ? "s" : ""}` : undefined} trend={prevMetrics ? getTrend(metrics.demanda.ingressos, prevMetrics.demanda.ingressos, 'revenue') : undefined} />
                 <MetricCard title="CAC Ingresso" value={metrics.demanda.ingressos > 0 ? metrics.demanda.investimento / metrics.demanda.ingressos : 0} type="currency" trend={prevMetrics ? getTrend(metrics.demanda.ingressos > 0 ? metrics.demanda.investimento / metrics.demanda.ingressos : 0, prevMetrics.demanda.ingressos > 0 ? prevMetrics.demanda.investimento / prevMetrics.demanda.ingressos : 0, 'cost') : undefined} />
                 <MetricCard title="Pace Diário (Ingressos)" value={metrics.demanda.ingressos / dias} type="number" decimals={2} trend={prevMetrics ? getTrend(metrics.demanda.ingressos / dias, prevMetrics.demanda.ingressos / dias, 'revenue') : undefined} />
                 <MetricCard title="Leads (Total)" value={metrics.demanda.leads} type="number" trend={prevMetrics ? getTrend(metrics.demanda.leads, prevMetrics.demanda.leads, 'revenue') : undefined} />
                 <MetricCard title="MQLs (Total)" value={metrics.demanda.mqls} type="number" trend={prevMetrics ? getTrend(metrics.demanda.mqls, prevMetrics.demanda.mqls, 'revenue') : undefined} />
                 <MetricCard title="Custo por Lead" value={metrics.demanda.leads > 0 ? metrics.demanda.investimento / metrics.demanda.leads : 0} type="currency" trend={prevMetrics ? getTrend(metrics.demanda.leads > 0 ? metrics.demanda.investimento / metrics.demanda.leads : 0, prevMetrics.demanda.leads > 0 ? prevMetrics.demanda.investimento / prevMetrics.demanda.leads : 0, 'cost') : undefined} />
                 <MetricCard title="CPMQL" value={metrics.demanda.mqls > 0 ? metrics.demanda.investimento / metrics.demanda.mqls : 0} type="currency" trend={prevMetrics ? getTrend(metrics.demanda.mqls > 0 ? metrics.demanda.investimento / metrics.demanda.mqls : 0, prevMetrics.demanda.mqls > 0 ? prevMetrics.demanda.investimento / prevMetrics.demanda.mqls : 0, 'cost') : undefined} />
                 <MetricCard title="Pace Diário (MQLs)" value={metrics.demanda.mqls / dias} type="number" decimals={2} trend={prevMetrics ? getTrend(metrics.demanda.mqls / dias, prevMetrics.demanda.mqls / dias, 'revenue') : undefined} />
               </div>

               {/* CAMPANHAS DE FORM NATIVO */}
               <div>
                 <div className="bg-zinc-900 border-l-4 border-yellow-500 p-4 rounded-r-lg mb-4">
                   <h3 className="text-lg font-bold text-white uppercase tracking-wider">Campanhas de Form Nativo</h3>
                 </div>
                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                   <MetricCard title="Investimento (Form)" value={metrics.demanda.formNativo.investimento} type="currency" trend={prevMetrics ? getTrend(metrics.demanda.formNativo.investimento, prevMetrics.demanda.formNativo.investimento, 'revenue') : undefined} />
                   <MetricCard title="Ingressos Vendidos" value={metrics.demanda.formNativo.ingressos} type="number" trend={prevMetrics ? getTrend(metrics.demanda.formNativo.ingressos, prevMetrics.demanda.formNativo.ingressos, 'revenue') : undefined} />
                   <MetricCard title="CAC por Ingresso" value={metrics.demanda.formNativo.ingressos > 0 ? metrics.demanda.formNativo.investimento / metrics.demanda.formNativo.ingressos : 0} type="currency" trend={prevMetrics ? getTrend(metrics.demanda.formNativo.ingressos > 0 ? metrics.demanda.formNativo.investimento / metrics.demanda.formNativo.ingressos : 0, prevMetrics.demanda.formNativo.ingressos > 0 ? prevMetrics.demanda.formNativo.investimento / prevMetrics.demanda.formNativo.ingressos : 0, 'cost') : undefined} />
                   <MetricCard title="Pace Diário (Ingressos)" value={metrics.demanda.formNativo.ingressos / dias} type="number" decimals={2} trend={prevMetrics ? getTrend(metrics.demanda.formNativo.ingressos / dias, prevMetrics.demanda.formNativo.ingressos / dias, 'revenue') : undefined} />
                   <MetricCard title="Leads (Form)" value={metrics.demanda.formNativo.leads} type="number" trend={prevMetrics ? getTrend(metrics.demanda.formNativo.leads, prevMetrics.demanda.formNativo.leads, 'revenue') : undefined} />
                   <MetricCard title="MQLs (Form)" value={metrics.demanda.formNativo.mqls} type="number" trend={prevMetrics ? getTrend(metrics.demanda.formNativo.mqls, prevMetrics.demanda.formNativo.mqls, 'revenue') : undefined} />
                   <MetricCard title="Pace Diário (MQLs)" value={metrics.demanda.formNativo.mqls / dias} type="number" decimals={2} trend={prevMetrics ? getTrend(metrics.demanda.formNativo.mqls / dias, prevMetrics.demanda.formNativo.mqls / dias, 'revenue') : undefined} />
                   <MetricCard title="Custo por Lead" value={metrics.demanda.formNativo.leads > 0 ? metrics.demanda.formNativo.investimento / metrics.demanda.formNativo.leads : 0} type="currency" trend={prevMetrics ? getTrend(metrics.demanda.formNativo.leads > 0 ? metrics.demanda.formNativo.investimento / metrics.demanda.formNativo.leads : 0, prevMetrics.demanda.formNativo.leads > 0 ? prevMetrics.demanda.formNativo.investimento / prevMetrics.demanda.formNativo.leads : 0, 'cost') : undefined} />
                   <MetricCard title="CPMQL" value={metrics.demanda.formNativo.mqls > 0 ? metrics.demanda.formNativo.investimento / metrics.demanda.formNativo.mqls : 0} type="currency" trend={prevMetrics ? getTrend(metrics.demanda.formNativo.mqls > 0 ? metrics.demanda.formNativo.investimento / metrics.demanda.formNativo.mqls : 0, prevMetrics.demanda.formNativo.mqls > 0 ? prevMetrics.demanda.formNativo.investimento / prevMetrics.demanda.formNativo.mqls : 0, 'cost') : undefined} />
                 </div>
                 
                 <div className="space-y-4">
                   <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
                     <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Gráficos 1 e 2: Leads e MQLs Diários</h3>
                     <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <ComposedChart data={metrics.demanda.formNativo.chartData}>
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                           <YAxis stroke="#a1a1aa" fontSize={12} />
                           <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} formatter={tooltipFormatter} />
                           <Legend />
                           <Line type="monotone" name="Leads" dataKey="leads" stroke="#eab308" strokeWidth={2} dot={false} />
                           <Line type="monotone" name="MQLs" dataKey="mqls" stroke="#3b82f6" strokeWidth={2} dot={false} />
                         </ComposedChart>
                       </ResponsiveContainer>
                     </div>
                   </div>

                   <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
                     <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Gráfico 3: Investimento Diário</h3>
                     <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <ComposedChart data={metrics.demanda.formNativo.chartData}>
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                           <YAxis stroke="#a1a1aa" fontSize={12} tickFormatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                           <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} formatter={tooltipFormatter} />
                           <Bar dataKey="investimento" name="Investimento" fill="#eab308" />
                         </ComposedChart>
                       </ResponsiveContainer>
                     </div>
                   </div>

                   <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
                     <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Gráfico 4: CTR (%) e CPM (R$)</h3>
                     <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <ComposedChart data={metrics.demanda.formNativo.chartData}>
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                           <YAxis yAxisId="left" stroke="#a1a1aa" fontSize={12} tickFormatter={(v) => `${v}%`} />
                           <YAxis yAxisId="right" orientation="right" stroke="#a1a1aa" fontSize={12} tickFormatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                           <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} formatter={tooltipFormatter} />
                           <Legend />
                           <Line yAxisId="left" type="monotone" name="CTR (%)" dataKey={(d) => d.impressoes > 0 ? ((d.cliques / d.impressoes) * 100).toFixed(2) : 0} stroke="#3b82f6" strokeWidth={2} dot={false} />
                           <Line yAxisId="right" type="monotone" name="CPM (R$)" dataKey={(d) => d.impressoes > 0 ? (d.investimento / (d.impressoes / 1000)).toFixed(2) : 0} stroke="#ef4444" strokeWidth={2} dot={false} />
                         </ComposedChart>
                       </ResponsiveContainer>
                     </div>
                   </div>
                   
                   <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
                     <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Gráficos 5 e 6: Custo por Lead e Custo por MQL</h3>
                     <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <ComposedChart data={metrics.demanda.formNativo.chartData}>
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                           <YAxis stroke="#a1a1aa" fontSize={12} tickFormatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                           <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} formatter={tooltipFormatter} />
                           <Legend />
                           <Line type="monotone" name="Custo por Lead" dataKey={(d) => d.leads > 0 ? (d.investimento / d.leads).toFixed(2) : 0} stroke="#10b981" strokeWidth={2} dot={false} />
                           <Line type="monotone" name="Custo por MQL" dataKey={(d) => d.mqls > 0 ? (d.investimento / d.mqls).toFixed(2) : 0} stroke="#8b5cf6" strokeWidth={2} dot={false} />
                         </ComposedChart>
                       </ResponsiveContainer>
                     </div>
                   </div>

                   <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
                     <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Gráfico 7: Ingressos Vendidos</h3>
                     <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <ComposedChart data={metrics.demanda.formNativo.chartData}>
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                           <YAxis stroke="#a1a1aa" fontSize={12} />
                           <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} formatter={tooltipFormatter} />
                           <Legend />
                           <Bar dataKey="ingressos" name="Ingressos Vendidos" fill="#10b981" />
                         </ComposedChart>
                       </ResponsiveContainer>
                     </div>
                   </div>

                 </div>
               </div>

               {/* CAMPANHAS PÁGINA CAPTURA */}
               <div className="pt-8">
                 <div className="bg-zinc-900 border-l-4 border-blue-500 p-4 rounded-r-lg mb-4">
                   <h3 className="text-lg font-bold text-white uppercase tracking-wider">Campanhas para Página de Captura para o Comercial</h3>
                 </div>
                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                   <MetricCard title="Investimento (Captura)" value={metrics.demanda.captura.investimento} type="currency" trend={prevMetrics ? getTrend(metrics.demanda.captura.investimento, prevMetrics.demanda.captura.investimento, 'revenue') : undefined} />
                   <MetricCard title="Ingressos Vendidos" value={metrics.demanda.captura.ingressos} type="number" trend={prevMetrics ? getTrend(metrics.demanda.captura.ingressos, prevMetrics.demanda.captura.ingressos, 'revenue') : undefined} />
                   <MetricCard title="CAC por Ingresso" value={metrics.demanda.captura.ingressos > 0 ? metrics.demanda.captura.investimento / metrics.demanda.captura.ingressos : 0} type="currency" trend={prevMetrics ? getTrend(metrics.demanda.captura.ingressos > 0 ? metrics.demanda.captura.investimento / metrics.demanda.captura.ingressos : 0, prevMetrics.demanda.captura.ingressos > 0 ? prevMetrics.demanda.captura.investimento / prevMetrics.demanda.captura.ingressos : 0, 'cost') : undefined} />
                   <MetricCard title="Pace Diário (Ingressos)" value={metrics.demanda.captura.ingressos / dias} type="number" decimals={2} trend={prevMetrics ? getTrend(metrics.demanda.captura.ingressos / dias, prevMetrics.demanda.captura.ingressos / dias, 'revenue') : undefined} />
                   <MetricCard title="Leads (Captura)" value={metrics.demanda.captura.leads} type="number" trend={prevMetrics ? getTrend(metrics.demanda.captura.leads, prevMetrics.demanda.captura.leads, 'revenue') : undefined} />
                   <MetricCard title="MQLs (Captura)" value={metrics.demanda.captura.mqls} type="number" trend={prevMetrics ? getTrend(metrics.demanda.captura.mqls, prevMetrics.demanda.captura.mqls, 'revenue') : undefined} />
                   <MetricCard title="Pace Diário (MQLs)" value={metrics.demanda.captura.mqls / dias} type="number" decimals={2} trend={prevMetrics ? getTrend(metrics.demanda.captura.mqls / dias, prevMetrics.demanda.captura.mqls / dias, 'revenue') : undefined} />
                   <MetricCard title="Custo por Lead" value={metrics.demanda.captura.leads > 0 ? metrics.demanda.captura.investimento / metrics.demanda.captura.leads : 0} type="currency" trend={prevMetrics ? getTrend(metrics.demanda.captura.leads > 0 ? metrics.demanda.captura.investimento / metrics.demanda.captura.leads : 0, prevMetrics.demanda.captura.leads > 0 ? prevMetrics.demanda.captura.investimento / prevMetrics.demanda.captura.leads : 0, 'cost') : undefined} />
                   <MetricCard title="CPMQL" value={metrics.demanda.captura.mqls > 0 ? metrics.demanda.captura.investimento / metrics.demanda.captura.mqls : 0} type="currency" trend={prevMetrics ? getTrend(metrics.demanda.captura.mqls > 0 ? metrics.demanda.captura.investimento / metrics.demanda.captura.mqls : 0, prevMetrics.demanda.captura.mqls > 0 ? prevMetrics.demanda.captura.investimento / prevMetrics.demanda.captura.mqls : 0, 'cost') : undefined} />
                 </div>
                 
                 <div className="space-y-4">
                   <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
                     <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Gráficos 1 e 2: Leads e MQLs Diários</h3>
                     <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <ComposedChart data={metrics.demanda.captura.chartData}>
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                           <YAxis stroke="#a1a1aa" fontSize={12} />
                           <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} formatter={tooltipFormatter} />
                           <Legend />
                           <Line type="monotone" name="Leads" dataKey="leads" stroke="#eab308" strokeWidth={2} dot={false} />
                           <Line type="monotone" name="MQLs" dataKey="mqls" stroke="#3b82f6" strokeWidth={2} dot={false} />
                         </ComposedChart>
                       </ResponsiveContainer>
                     </div>
                   </div>

                   <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
                     <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Gráfico 3: Investimento Diário</h3>
                     <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <ComposedChart data={metrics.demanda.captura.chartData}>
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                           <YAxis stroke="#a1a1aa" fontSize={12} tickFormatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                           <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} formatter={tooltipFormatter} />
                           <Bar dataKey="investimento" name="Investimento" fill="#eab308" />
                         </ComposedChart>
                       </ResponsiveContainer>
                     </div>
                   </div>

                   <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
                     <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Gráfico 4: CTR (%) e CPM (R$)</h3>
                     <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <ComposedChart data={metrics.demanda.captura.chartData}>
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                           <YAxis yAxisId="left" stroke="#a1a1aa" fontSize={12} tickFormatter={(v) => `${v}%`} />
                           <YAxis yAxisId="right" orientation="right" stroke="#a1a1aa" fontSize={12} tickFormatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                           <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} formatter={tooltipFormatter} />
                           <Legend />
                           <Line yAxisId="left" type="monotone" name="CTR (%)" dataKey={(d) => d.impressoes > 0 ? ((d.cliques / d.impressoes) * 100).toFixed(2) : 0} stroke="#3b82f6" strokeWidth={2} dot={false} />
                           <Line yAxisId="right" type="monotone" name="CPM (R$)" dataKey={(d) => d.impressoes > 0 ? (d.investimento / (d.impressoes / 1000)).toFixed(2) : 0} stroke="#ef4444" strokeWidth={2} dot={false} />
                         </ComposedChart>
                       </ResponsiveContainer>
                     </div>
                   </div>
                   
                   <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
                     <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Gráficos 5 e 6: Custo por Lead e Custo por MQL</h3>
                     <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <ComposedChart data={metrics.demanda.captura.chartData}>
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                           <YAxis stroke="#a1a1aa" fontSize={12} tickFormatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                           <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} formatter={tooltipFormatter} />
                           <Legend />
                           <Line type="monotone" name="Custo por Lead" dataKey={(d) => d.leads > 0 ? (d.investimento / d.leads).toFixed(2) : 0} stroke="#10b981" strokeWidth={2} dot={false} />
                           <Line type="monotone" name="Custo por MQL" dataKey={(d) => d.mqls > 0 ? (d.investimento / d.mqls).toFixed(2) : 0} stroke="#8b5cf6" strokeWidth={2} dot={false} />
                         </ComposedChart>
                       </ResponsiveContainer>
                     </div>
                   </div>

                   <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
                     <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Gráfico 7: Ingressos Vendidos</h3>
                     <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <ComposedChart data={metrics.demanda.captura.chartData}>
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                           <YAxis stroke="#a1a1aa" fontSize={12} />
                           <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} formatter={tooltipFormatter} />
                           <Legend />
                           <Bar dataKey="ingressos" name="Ingressos Vendidos" fill="#10b981" />
                         </ComposedChart>
                       </ResponsiveContainer>
                     </div>
                   </div>


                   <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 mt-4 relative">
                     <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Conversão por Página de Captura (PGXX) ao longo dos dias</h3>
                     
                     {metrics.demanda.captura.conversaoDiariaPaginas.pgs.length > 0 && (
                       <div className="absolute top-4 right-4 bg-zinc-950/80 border border-white/10 rounded-lg p-2 text-xs flex flex-col gap-1 backdrop-blur-sm z-10 max-h-48 overflow-y-auto custom-scrollbar">
                         <span className="text-zinc-500 font-semibold uppercase mb-1">Média do Período</span>
                         {metrics.demanda.captura.conversaoDiariaPaginas.pgs.map((pg, index) => {
                           const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#6366f1', '#14b8a6', '#f43f5e'];
                           const avg = metrics.demanda.captura.conversaoDiariaPaginas.averages[pg];
                           return (
                             <div key={pg} className="flex items-center justify-between gap-4">
                               <div className="flex items-center gap-1.5">
                                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                                 <span className="text-zinc-300">{pg}</span>
                               </div>
                               <span className="font-medium text-white">{avg.toFixed(2)}%</span>
                             </div>
                           );
                         })}
                       </div>
                     )}

                     <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <ComposedChart data={metrics.demanda.captura.conversaoDiariaPaginas.data}>
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                           <YAxis stroke="#a1a1aa" fontSize={12} tickFormatter={(v) => `${v}%`} />
                           <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} formatter={(value, name) => [`${Number(value).toFixed(2)}%`, name]} />
                           <Legend />
                           {metrics.demanda.captura.conversaoDiariaPaginas.pgs.map((pg, index) => {
                             const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#6366f1', '#14b8a6', '#f43f5e'];
                             return (
                               <Line 
                                 key={pg} 
                                 type="monotone" 
                                 dataKey={pg} 
                                 name={pg} 
                                 stroke={colors[index % colors.length]} 
                                 strokeWidth={2} 
                                 dot={false} 
                               />
                             );
                           })}
                         </ComposedChart>
                       </ResponsiveContainer>
                     </div>
                   </div>

                 </div>
               </div>

               {/* CAMPANHAS DE INLEAD */}
               <div className="pt-8">
                 <div className="bg-zinc-900 border-l-4 border-emerald-500 p-4 rounded-r-lg mb-4 flex items-center justify-between">
                   <h3 className="text-lg font-bold text-white uppercase tracking-wider">Campanhas de Inlead</h3>
                   <button 
                     onClick={() => setShowInleadPagesModal(true)}
                     className="px-3 py-1.5 text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg transition-all border border-emerald-500/30 shadow-[0_2px_8px_rgba(16,185,129,0.1)] flex items-center gap-1.5"
                   >
                     <Activity className="w-3.5 h-3.5" />
                     Ver detalhamento por página
                   </button>
                 </div>
                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                   <MetricCard title="Investimento (Inlead)" value={metrics.demanda.inlead.investimento} type="currency" trend={prevMetrics ? getTrend(metrics.demanda.inlead.investimento, prevMetrics.demanda.inlead?.investimento || 0, 'revenue') : undefined} />
                   <MetricCard title="Ingressos Vendidos" value={metrics.demanda.inlead.ingressos} type="number" trend={prevMetrics ? getTrend(metrics.demanda.inlead.ingressos, prevMetrics.demanda.inlead?.ingressos || 0, 'revenue') : undefined} />
                   <MetricCard title="CAC por Ingresso" value={metrics.demanda.inlead.ingressos > 0 ? metrics.demanda.inlead.investimento / metrics.demanda.inlead.ingressos : 0} type="currency" trend={prevMetrics ? getTrend(metrics.demanda.inlead.ingressos > 0 ? metrics.demanda.inlead.investimento / metrics.demanda.inlead.ingressos : 0, prevMetrics.demanda.inlead?.ingressos > 0 ? prevMetrics.demanda.inlead.investimento / metrics.demanda.inlead.ingressos : 0, 'cost') : undefined} />
                   <MetricCard title="Pace Diário (Ingressos)" value={metrics.demanda.inlead.ingressos / dias} type="number" decimals={2} trend={prevMetrics ? getTrend(metrics.demanda.inlead.ingressos / dias, (prevMetrics.demanda.inlead?.ingressos || 0) / dias, 'revenue') : undefined} />
                   <MetricCard title="Leads (Inlead)" value={metrics.demanda.inlead.leads} type="number" trend={prevMetrics ? getTrend(metrics.demanda.inlead.leads, prevMetrics.demanda.inlead?.leads || 0, 'revenue') : undefined} />
                   <MetricCard title="MQLs (Inlead)" value={metrics.demanda.inlead.mqls} type="number" trend={prevMetrics ? getTrend(metrics.demanda.inlead.mqls, prevMetrics.demanda.inlead?.mqls || 0, 'revenue') : undefined} />
                   <MetricCard title="Pace Diário (MQLs)" value={metrics.demanda.inlead.mqls / dias} type="number" decimals={2} trend={prevMetrics ? getTrend(metrics.demanda.inlead.mqls / dias, (prevMetrics.demanda.inlead?.mqls || 0) / dias, 'revenue') : undefined} />
                   <MetricCard title="Custo por Lead" value={metrics.demanda.inlead.leads > 0 ? metrics.demanda.inlead.investimento / metrics.demanda.inlead.leads : 0} type="currency" trend={prevMetrics ? getTrend(metrics.demanda.inlead.leads > 0 ? metrics.demanda.inlead.investimento / metrics.demanda.inlead.leads : 0, prevMetrics.demanda.inlead?.leads > 0 ? metrics.demanda.inlead.investimento / metrics.demanda.inlead.leads : 0, 'cost') : undefined} />
                   <MetricCard title="CPMQL" value={metrics.demanda.inlead.mqls > 0 ? metrics.demanda.inlead.investimento / metrics.demanda.inlead.mqls : 0} type="currency" trend={prevMetrics ? getTrend(metrics.demanda.inlead.mqls > 0 ? metrics.demanda.inlead.investimento / metrics.demanda.inlead.mqls : 0, prevMetrics.demanda.inlead?.mqls > 0 ? metrics.demanda.inlead.investimento / metrics.demanda.inlead.mqls : 0, 'cost') : undefined} />
                 </div>
                 
                 <div className="space-y-4">
                   <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
                     <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Gráficos 1 e 2: Leads e MQLs Diários (Inlead)</h3>
                     <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <ComposedChart data={metrics.demanda.inlead.chartData}>
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                           <YAxis stroke="#a1a1aa" fontSize={12} />
                           <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} formatter={tooltipFormatter} />
                           <Legend />
                           <Line type="monotone" name="Leads" dataKey="leads" stroke="#eab308" strokeWidth={2} dot={false} />
                           <Line type="monotone" name="MQLs" dataKey="mqls" stroke="#3b82f6" strokeWidth={2} dot={false} />
                         </ComposedChart>
                       </ResponsiveContainer>
                     </div>
                   </div>

                   <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
                     <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Gráfico 3: Investimento Diário (Inlead)</h3>
                     <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <ComposedChart data={metrics.demanda.inlead.chartData}>
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                           <YAxis stroke="#a1a1aa" fontSize={12} tickFormatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                           <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} formatter={tooltipFormatter} />
                           <Bar dataKey="investimento" name="Investimento" fill="#eab308" />
                         </ComposedChart>
                       </ResponsiveContainer>
                     </div>
                   </div>

                   <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
                     <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Gráfico 4: CTR (%) e CPM (R$) (Inlead)</h3>
                     <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <ComposedChart data={metrics.demanda.inlead.chartData}>
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                           <YAxis yAxisId="left" stroke="#a1a1aa" fontSize={12} tickFormatter={(v) => `${v}%`} />
                           <YAxis yAxisId="right" orientation="right" stroke="#a1a1aa" fontSize={12} tickFormatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                           <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} formatter={tooltipFormatter} />
                           <Legend />
                           <Line yAxisId="left" type="monotone" name="CTR (%)" dataKey={(d) => d.impressoes > 0 ? ((d.cliques / d.impressoes) * 100).toFixed(2) : 0} stroke="#3b82f6" strokeWidth={2} dot={false} />
                           <Line yAxisId="right" type="monotone" name="CPM (R$)" dataKey={(d) => d.impressoes > 0 ? (d.investimento / (d.impressoes / 1000)).toFixed(2) : 0} stroke="#ef4444" strokeWidth={2} dot={false} />
                         </ComposedChart>
                       </ResponsiveContainer>
                     </div>
                   </div>
                   
                   <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
                     <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Gráficos 5 e 6: Custo por Lead e Custo por MQL (Inlead)</h3>
                     <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <ComposedChart data={metrics.demanda.inlead.chartData}>
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                           <YAxis stroke="#a1a1aa" fontSize={12} tickFormatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                           <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} formatter={tooltipFormatter} />
                           <Legend />
                           <Line type="monotone" name="Custo por Lead" dataKey={(d) => d.leads > 0 ? (d.investimento / d.leads).toFixed(2) : 0} stroke="#10b981" strokeWidth={2} dot={false} />
                           <Line type="monotone" name="Custo por MQL" dataKey={(d) => d.mqls > 0 ? (d.investimento / d.mqls).toFixed(2) : 0} stroke="#8b5cf6" strokeWidth={2} dot={false} />
                         </ComposedChart>
                       </ResponsiveContainer>
                     </div>
                   </div>

                   <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
                     <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Gráfico 7: Ingressos Vendidos (Inlead)</h3>
                     <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <ComposedChart data={metrics.demanda.inlead.chartData}>
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                           <YAxis stroke="#a1a1aa" fontSize={12} />
                           <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} formatter={tooltipFormatter} />
                           <Legend />
                           <Bar dataKey="ingressos" name="Ingressos Vendidos" fill="#10b981" />
                         </ComposedChart>
                       </ResponsiveContainer>
                     </div>
                   </div>

                 </div>
               </div>
             </section>
          )}

          {activeTab === 'geracao-demanda-ciclo' && metrics && rawData && (
          <section className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-20">
            <GeracaoDemandaCiclos rawData={rawData} audienceTemp={audienceTemp} cycleLength={cycleLength} />
          </section>
        )}
        
        
        {activeTab === 'geracao-demanda-estudo' && metrics && (
          <section className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8 pb-20">
            <GeracaoDemandaEstudoPublico metrics={metrics} />
          </section>
        )}
        
        {activeTab === 'geracao-demanda-cac-pontual' && rawData && (
          <section className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-20">
            <GDCacPontual rawData={rawData} />
          </section>
        )}

        {activeTab === 'geracao-demanda-criativos' && metrics && (
             <section className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8 pb-20">
               <div className="flex justify-between items-end mb-4">
                 <h2 className="text-xl font-bold tracking-tight border-l-4 border-yellow-500 pl-3 uppercase">Geração de Demanda - Criativos</h2>
               </div>
               
               <div>
                 <div className="bg-zinc-900 border-l-4 border-yellow-500 p-4 rounded-r-lg mb-4">
                   <h3 className="text-lg font-bold text-white uppercase tracking-wider">Campanhas de Form Nativo</h3>
                 </div>
                 <CreativesTable data={metrics.creativesForm} onViewPesquisa={setSelectedCreativePesquisa} audienceTemp={audienceTemp} setAudienceTemp={setAudienceTemp} />
               </div>

               <div className="pt-8">
                 <div className="bg-zinc-900 border-l-4 border-blue-500 p-4 rounded-r-lg mb-4">
                   <h3 className="text-lg font-bold text-white uppercase tracking-wider">Campanhas de Página de Captura Comercial</h3>
                 </div>
                 <CreativesTable data={metrics.creativesCaptura} onViewPesquisa={setSelectedCreativePesquisa} audienceTemp={audienceTemp} setAudienceTemp={setAudienceTemp} />
               </div>

               <div className="pt-8">
                 {(() => {
                   const getPageFromCampName = (name: string) => {
                     if (!name) return null;
                     const match = name.match(/PG-?\d+/i);
                     return match ? match[0].toUpperCase().replace('-', '') : null;
                   };

                   const allInleadPagesInCreatives = Array.from(new Set(
                     (metrics.creativesInlead || []).flatMap(c => 
                       (c.campanhas || []).map(camp => getPageFromCampName(camp)).filter(Boolean)
                     )
                   )).sort();

                   const filteredInleadCreatives = metrics.creativesInlead.filter(c => {
                     if (selectedInleadPageFilter === 'all') return true;
                     return (c.campanhas || []).some(camp => getPageFromCampName(camp) === selectedInleadPageFilter);
                   });

                   return (
                     <>
                       <div className="bg-zinc-900 border-l-4 border-emerald-500 p-4 rounded-r-lg mb-4 flex items-center justify-between flex-wrap gap-2">
                         <h3 className="text-lg font-bold text-white uppercase tracking-wider">Campanhas de Inlead</h3>
                         
                         <div className="flex items-center gap-2">
                           <span className="text-xs text-zinc-400 font-medium">Filtrar por Página:</span>
                           <select
                             value={selectedInleadPageFilter}
                             onChange={(e) => setSelectedInleadPageFilter(e.target.value)}
                             className="px-3 py-1.5 text-xs font-semibold bg-zinc-950 border border-white/10 rounded-lg text-zinc-300 focus:outline-none focus:border-emerald-500 transition-colors"
                           >
                             <option value="all">Todas as páginas (Geral)</option>
                             {allInleadPagesInCreatives.map((pg: any) => (
                               <option key={pg} value={pg}>{pg}</option>
                             ))}
                           </select>
                         </div>
                       </div>
                       <CreativesTable data={filteredInleadCreatives} onViewPesquisa={setSelectedCreativePesquisa} audienceTemp={audienceTemp} setAudienceTemp={setAudienceTemp} />
                     </>
                   );
                 })()}
               </div>
             </section>
          )}

          {activeTab === 'venda-direta-analise' && metrics && (
             <section className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-20">
               <div className="flex justify-between items-end mb-4">
                 <h2 className="text-xl font-bold tracking-tight border-l-4 border-yellow-500 pl-3 uppercase">Venda Direta - Análise</h2>
               </div>
               <TicketTypeMetrics data={metrics.ticketsByTypes.vendaDireta} />
               <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg mb-4">
                 <p className="text-blue-200 text-sm">
                   <strong>Nota:</strong> O custo por MQL e Custo por Lead da venda direta consideram o número de leads originados <strong>pelo tráfego</strong>. 
                   O número total de leads apresentados no resumo inclui leads orgânicos e tráfego.
                 </p>
               </div>

               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                 <MetricCard title="Investimento" value={metrics.vendaDireta.investimento} type="currency" />
                 <MetricCard title="Faturamento" value={metrics.vendaDireta.faturamento} type="currency" />
                 <MetricCard title="Ingressos Vendidos" value={metrics.vendaDireta.ingressos} type="number" subtitle={`${metrics.vendaDireta.ingressosTrafego} Tráfego / ${metrics.vendaDireta.ingressosOrganico} Orgânico`} />
                 <MetricCard title="Pace Diário (Ingressos)" value={metrics.vendaDireta.ingressos / dias} type="number" decimals={2} />
                 <MetricCard title="Leads (Total: Orgânico + Tráfego)" value={metrics.vendaDireta.leadsTotal} type="number" />
                 <MetricCard title="Leads (Tráfego)" value={metrics.vendaDireta.leadsTrafego} type="number" />
                 <MetricCard title="MQLs (Tráfego)" value={metrics.vendaDireta.mqls} type="number" />
                 <MetricCard title="Pace Diário (MQLs)" value={metrics.vendaDireta.mqls / dias} type="number" decimals={2} />
                 <MetricCard title="Custo por Lead (Tráfego)" value={metrics.vendaDireta.leadsTrafego > 0 ? metrics.vendaDireta.investimento / metrics.vendaDireta.leadsTrafego : 0} type="currency" />
                 <MetricCard title="Custo por MQL (Tráfego)" value={metrics.vendaDireta.mqls > 0 ? metrics.vendaDireta.investimento / metrics.vendaDireta.mqls : 0} type="currency" />
                 <MetricCard title="CAC Ingresso (Geral)" value={metrics.vendaDireta.ingressos > 0 ? metrics.vendaDireta.investimento / metrics.vendaDireta.ingressos : 0} type="currency" />
                 <MetricCard title="CAC Ingresso (Tráfego)" value={metrics.vendaDireta.ingressosTrafego > 0 ? metrics.vendaDireta.investimento / metrics.vendaDireta.ingressosTrafego : 0} type="currency" />
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
                 <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 shadow-md">
                   <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Investimento e MQLs (Total) por Dia</h3>
                   <div className="h-64">
                     <ResponsiveContainer width="100%" height="100%">
                       <ComposedChart data={metrics.vendaDireta.chartData}>
                         <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                         <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickFormatter={(tick) => tick ? tick.substring(5, 10) : ""} />
                         <YAxis yAxisId="left" stroke="#a1a1aa" fontSize={12} tickFormatter={(val) => `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                         <YAxis yAxisId="right" orientation="right" stroke="#a1a1aa" fontSize={12} />
                         <Tooltip
                           contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)' }}
                           formatter={tooltipFormatter}
                         />
                         <Legend />
                         <Bar yAxisId="left" dataKey="investimento" name="Investimento" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                         <Line yAxisId="right" type="monotone" dataKey="mqls" name="MQLs (Total)" stroke="#eab308" strokeWidth={3} dot={{ r: 4, fill: '#eab308' }} activeDot={{ r: 6 }} />
                       </ComposedChart>
                     </ResponsiveContainer>
                   </div>
                 </div>

                 <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 shadow-md">
                   <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Ingressos Vendidos (Total) por Dia</h3>
                   <div className="h-64">
                     <ResponsiveContainer width="100%" height="100%">
                       <ComposedChart data={metrics.vendaDireta.chartData}>
                         <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                         <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickFormatter={(tick) => tick ? tick.substring(5, 10) : ""} />
                         <YAxis stroke="#a1a1aa" fontSize={12} />
                         <Tooltip
                           contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)' }}
                           formatter={tooltipFormatter}
                         />
                         <Legend />
                         <Bar dataKey="ingressos" name="Ingressos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                       </ComposedChart>
                     </ResponsiveContainer>
                   </div>
                 </div>
               </div>

             </section>
          )}

          {activeTab === 'meteorico-criativos' && metrics && (
             <section className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8 pb-20">
               <div className="flex justify-between items-end mb-4">
                 <h2 className="text-xl font-bold tracking-tight border-l-4 border-yellow-500 pl-3 uppercase">Meteórico - Criativos</h2>
               </div>
               <div className="pt-4">
                 <CreativesTable key={`${dashboardId}-meteorico`} initialStatusFilter="todos" data={metrics.creativesMET} onViewPesquisa={setSelectedCreativePesquisa} audienceTemp={audienceTemp} setAudienceTemp={setAudienceTemp} />
               </div>
             </section>
          )}

          {activeTab === 'venda-direta-criativos' && metrics && (
             <section className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8 pb-20">
               <div className="flex justify-between items-end mb-4">
                 <h2 className="text-xl font-bold tracking-tight border-l-4 border-yellow-500 pl-3 uppercase">Venda Direta - Criativos</h2>
               </div>
               <div className="pt-4">
                 <CreativesTable data={metrics.creativesVD} onViewPesquisa={setSelectedCreativePesquisa} audienceTemp={audienceTemp} setAudienceTemp={setAudienceTemp} />
               </div>
             </section>
          )}
          
          {/* DISTRIBUIÇÃO DE CONTEÚDO - KLT GERAL */}
          {activeTab === 'distribuicao-klt-geral' && metrics && (
             <section className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-20 animate-in fade-in duration-500">
               <DistribuicaoGeralView 
                 title="Distribuição de Conteúdo (KLT) - Geral"
                 distData={metrics.distribuicaoKlt}
                 creatives={metrics.creativesDcKlt}
                 tooltipFormatter={tooltipFormatter}
               />
             </section>
          )}

          {/* DISTRIBUIÇÃO DE CONTEÚDO - KLT CRIATIVOS */}
          {activeTab === 'distribuicao-klt-criativos' && metrics && (
             <section className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-20 animate-in fade-in duration-500">
               <div className="flex justify-between items-end mb-4">
                 <h2 className="text-xl font-bold tracking-tight border-l-4 border-yellow-500 pl-3 uppercase">Criativos da Distribuição (KLT)</h2>
               </div>
               <div className="pt-4">
                 <CreativesTableDistribuicao data={metrics.creativesDcKlt} />
               </div>
             </section>
          )}

          {/* DISTRIBUIÇÃO DE CONTEÚDO - CORREDOR POLONÊS GERAL */}
          {activeTab === 'distribuicao-corredor-geral' && metrics && (
             <section className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-20 animate-in fade-in duration-500">
               <DistribuicaoGeralView 
                 title="Distribuição de Conteúdo (Corredor Polonês) - Geral"
                 distData={metrics.distribuicaoCorredor}
                 creatives={metrics.creativesDcCorredor}
                 tooltipFormatter={tooltipFormatter}
               />
             </section>
          )}

          {/* DISTRIBUIÇÃO DE CONTEÚDO - CORREDOR POLONÊS CRIATIVOS */}
          {activeTab === 'distribuicao-corredor-criativos' && metrics && (
             <section className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-20 animate-in fade-in duration-500">
               <div className="flex justify-between items-end mb-4">
                 <h2 className="text-xl font-bold tracking-tight border-l-4 border-yellow-500 pl-3 uppercase">Criativos da Distribuição (Corredor Polonês)</h2>
               </div>
               <div className="pt-4">
                 <CreativesTableDistribuicao data={metrics.creativesDcCorredor} />
               </div>
             </section>
          )}

          {/* DISTRIBUIÇÃO DE CONTEÚDO - REMARKETING GERAL */}
          {activeTab === 'distribuicao-remarketing-geral' && metrics && (
             <section className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-20 animate-in fade-in duration-500">
               <DistribuicaoGeralView 
                 title="Distribuição de Conteúdo (Remarketing) - Geral"
                 distData={metrics.distribuicaoRemarketing}
                 creatives={metrics.creativesDcRemarketing}
                 tooltipFormatter={tooltipFormatter}
               />
             </section>
          )}

          {/* DISTRIBUIÇÃO DE CONTEÚDO - REMARKETING CRIATIVOS */}
          {activeTab === 'distribuicao-remarketing-criativos' && metrics && (
             <section className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-20 animate-in fade-in duration-500">
               <div className="flex justify-between items-end mb-4">
                 <h2 className="text-xl font-bold tracking-tight border-l-4 border-yellow-500 pl-3 uppercase">Criativos da Distribuição (Remarketing)</h2>
               </div>
               <div className="pt-4">
                 <CreativesTableDistribuicao data={metrics.creativesDcRemarketing} />
               </div>
             </section>
          )}
          

          {selectedCreativePesquisa && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedCreativePesquisa(null)} />
              <div className="relative w-full max-w-6xl h-[85vh] bg-zinc-950 border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-zinc-900/50">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Pesquisa do Criativo: <span className="text-yellow-500">{selectedCreativePesquisa.nome}</span>
                  </h3>
                  <button 
                    onClick={() => setSelectedCreativePesquisa(null)}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {selectedCreativePesquisa.pesquisa.length > 0 ? (
                    <PesquisaAudiencia data={selectedCreativePesquisa.pesquisa} isLoading={false} />
                  ) : (
                    <div className="h-full flex items-center justify-center flex-col gap-4 text-zinc-500">
                      <p>Nenhuma resposta de pesquisa encontrada para este criativo no período.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {showInleadPagesModal && metrics && metrics.demanda.inlead.pagesBreakdown && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInleadPagesModal(false)} />
              <div className="relative w-full max-w-5xl h-[80vh] bg-zinc-950 border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-zinc-900/50">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-500" />
                    Detalhamento de Métricas por Página (Inlead)
                  </h3>
                  <button 
                    onClick={() => setShowInleadPagesModal(false)}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-black/20">
                  {metrics.demanda.inlead.pagesBreakdown.length > 0 ? (
                    <div className="space-y-6">
                      {/* CHARTS GRID */}
                      {(() => {
                        const customChartTooltip = ({ active, payload, label }: any) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-zinc-950 border border-white/10 p-3 rounded-lg shadow-xl text-xs font-mono">
                                <p className="font-bold text-white mb-2">{label}</p>
                                {payload.map((item: any, idx: number) => (
                                  <p key={idx} style={{ color: item.color }} className="flex justify-between gap-4">
                                    <span>{item.name}:</span>
                                    <span>{item.name.toLowerCase().includes('leads') || item.name.toLowerCase().includes('mqls') ? formatNumber(item.value) : formatCurrency(item.value)}</span>
                                  </p>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        };

                        return (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* CHART 1: INVESTIMENTO vs LEADS */}
                            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 backdrop-blur-md">
                              <h4 className="text-xs font-bold text-zinc-400 mb-4 uppercase tracking-wider">Investimento vs Leads por Página</h4>
                              <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                  <ComposedChart data={metrics.demanda.inlead.pagesBreakdown.map(r => ({ ...r, 'Investimento': r.investimento, 'Leads': r.leads }))}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="page" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                                    <YAxis yAxisId="left" stroke="#10b981" fontSize={11} tickFormatter={(val) => `R$ ${val}`} tickLine={false} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#eab308" fontSize={11} tickLine={false} />
                                    <Tooltip content={customChartTooltip} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Bar yAxisId="left" name="Investimento" dataKey="Investimento" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    <Line yAxisId="right" name="Leads" type="monotone" dataKey="Leads" stroke="#eab308" strokeWidth={3} activeDot={{ r: 6 }} />
                                  </ComposedChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            {/* CHART 2: CPL e CPMQL */}
                            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 backdrop-blur-md">
                              <h4 className="text-xs font-bold text-zinc-400 mb-4 uppercase tracking-wider">Eficiência de Custos: CPL e CPMQL</h4>
                              <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={metrics.demanda.inlead.pagesBreakdown.map(row => {
                                    const cpl = row.leads > 0 ? row.investimento / row.leads : 0;
                                    const cpmql = row.mqls > 0 ? row.investimento / row.mqls : 0;
                                    return {
                                      page: row.page,
                                      'CPL': cpl,
                                      'CPMQL': cpmql
                                    };
                                  })}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="page" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#3b82f6" fontSize={11} tickFormatter={(val) => `R$ ${val}`} tickLine={false} />
                                    <Tooltip content={customChartTooltip} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Bar name="Custo por Lead (CPL)" dataKey="CPL" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                    <Bar name="Custo por MQL (CPMQL)" dataKey="CPMQL" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* TABLE BLOCK */}
                      <div className="overflow-x-auto rounded-lg border border-white/5 bg-zinc-900/50 backdrop-blur-md">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase tracking-wider bg-white/5">
                              <th className="p-3 text-center">Página</th>
                              <th className="p-3 text-right">Investimento</th>
                              <th className="p-3 text-right">Impressões</th>
                              <th className="p-3 text-right">Cliques</th>
                              <th className="p-3 text-right">CTR</th>
                              <th className="p-3 text-right">CPC</th>
                              <th className="p-3 text-right">Leads</th>
                              <th className="p-3 text-right">CPL</th>
                              <th className="p-3 text-right">MQLs</th>
                              <th className="p-3 text-right">CPMQL</th>
                              <th className="p-3 text-right">Ingressos</th>
                              <th className="p-3 text-right">Faturamento</th>
                              <th className="p-3 text-right">ROI</th>
                            </tr>
                          </thead>
                          <tbody>
                            {metrics.demanda.inlead.pagesBreakdown.map((row: any, i: number) => {
                              const ctr = row.impressoes > 0 ? (row.cliques / row.impressoes) * 100 : 0;
                              const cpc = row.cliques > 0 ? row.investimento / row.cliques : 0;
                              const cpl = row.leads > 0 ? row.investimento / row.leads : 0;
                              const cpmql = row.mqls > 0 ? row.investimento / row.mqls : 0;
                              const roi = row.investimento > 0 ? row.faturamento / row.investimento : 0;
                              
                              return (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                  <td className="p-3 font-bold text-center text-emerald-400 bg-emerald-500/5">{row.page}</td>
                                  <td className="p-3 text-right font-mono text-white">{formatCurrency(row.investimento)}</td>
                                  <td className="p-3 text-right font-mono text-zinc-300">{formatNumber(row.impressoes)}</td>
                                  <td className="p-3 text-right font-mono text-zinc-300">{formatNumber(row.cliques)}</td>
                                  <td className="p-3 text-right font-mono text-zinc-400">{ctr.toFixed(2)}%</td>
                                  <td className="p-3 text-right font-mono text-zinc-400">{formatCurrency(cpc)}</td>
                                  <td className="p-3 text-right font-bold font-mono text-emerald-400">{formatNumber(row.leads)}</td>
                                  <td className="p-3 text-right font-bold font-mono text-emerald-300">{formatCurrency(cpl)}</td>
                                  <td className="p-3 text-right font-mono text-blue-400">{formatNumber(row.mqls)}</td>
                                  <td className="p-3 text-right font-mono text-blue-300">{formatCurrency(cpmql)}</td>
                                  <td className="p-3 text-right font-mono text-zinc-300">{formatNumber(row.ingressos)}</td>
                                  <td className="p-3 text-right font-mono text-emerald-400">{formatCurrency(row.faturamento)}</td>
                                  <td className="p-3 text-right font-bold font-mono text-emerald-500">{roi > 0 ? `${roi.toFixed(2)}x` : '-'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center gap-2 text-zinc-500">
                      <p className="text-sm font-semibold">Nenhum dado por página localizado.</p>
                      <p className="text-xs text-center max-w-md">Certifique-se de que os dados de Inlead com nomenclatura de páginas (PG01, PG02...) constam na base de dados.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

function TrendBadge({ curr, prev, type }: { curr: number, prev: number, type: 'cost' | 'revenue' | 'neutral' }) {
  if (prev === 0) {
    if (curr === 0) return null;
    return (
      <div className="flex items-center gap-1 text-red-500 text-sm font-semibold">
        <ArrowUpRight className="w-4 h-4" />
        <span>100%</span>
        <TrendTooltip />
      </div>
    );
  }
  
  const diff = curr - prev;
  if (diff === 0) return null;
  const perc = Math.abs(diff / prev) * 100;
  
  const isUp = diff > 0;
  const isGood = type === 'cost' ? diff < 0 : diff > 0;
  const colorClass = isGood ? 'text-emerald-500' : 'text-red-500';
  
  return (
    <div className={`flex items-center gap-1 text-sm font-semibold ${colorClass}`}>
      {isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
      <span>{perc.toFixed(1)}%</span>
      <TrendTooltip />
    </div>
  );
}

function TrendTooltip() {
  return (
    <div className="group relative flex items-center">
      <AlertCircle className="w-4 h-4 text-zinc-500 animate-pulse cursor-pointer hover:text-zinc-300 transition-colors" />
      <div className="absolute bottom-full right-1/2 translate-x-[75%] sm:translate-x-1/2 md:translate-x-0 md:right-0 mb-2.5 w-52 p-2.5 bg-zinc-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[999] text-center shadow-2xl border border-zinc-700 leading-relaxed whitespace-normal break-words">
        Quando comparado com o mesmo período anterior ao filtrado
      </div>
    </div>
  );
}

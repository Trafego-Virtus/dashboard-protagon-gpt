import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useMemo } from 'react';
import { format, subDays, startOfToday } from 'date-fns';
import { fetchRawDashboardData } from '../utils/dataFetching';
import { DashboardId } from '../utils/api';
import { calculateWorkshopMetrics, WorkshopMetrics } from '../utils/workshopCalculator';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Copy, Check, ExternalLink, Menu, ArrowDown, ArrowUp, Info, X, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell, ComposedChart, Line } from 'recharts';
import { PesquisaAudiencia } from './PesquisaAudiencia';
import { MetricCard } from './MetricCard';

const CITIES: DashboardId[] = ['protagon-joinville', 'protagon-cuiaba', 'protagon-porto-alegre', 'protagon-sao-paulo', 'protagon-goiania'];

interface MergedWorkshopRaw {
  workshopTraffic: any[];
  geral: any[];
  ingressos: any[];
}

export function PerpetualWorkshop({ onOpenAppMenu }: { onOpenAppMenu: () => void }) {
  const [rawData, setRawData] = useState<MergedWorkshopRaw | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const minD = new Date('2026-09-29T12:00:00');
    const startD = subDays(startOfToday(), 7);
    return format(startD < minD ? minD : startD, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(format(startOfToday(), 'yyyy-MM-dd'));
  const [datePreset, setDatePreset] = useState('last7');
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'geral' | 'audiencia'>('geral');
  const [audienciaPraca, setAudienciaPraca] = useState<string>('todos');
  const [pracaIndex, setPracaIndex] = useState(0);
  
  // Table state
  const [sortField, setSortField] = useState<string>('investimento');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pracaFilter, setPracaFilter] = useState<string>('todos');

  const handleRefresh = async (force: boolean = false) => {
    setLoading(true);
    try {
      const cityPromises = CITIES.map(cid => fetchRawDashboardData(cid, force));
      const results = await Promise.all(cityPromises);
      
      const mergedWorkshopTraffic = results.flatMap((r, idx) => {
        const cityId = CITIES[idx];
        let cityName = 'Joinville';
        if (cityId === 'protagon-cuiaba') cityName = 'Cuiabá';
        else if (cityId === 'protagon-porto-alegre') cityName = 'Porto Alegre';
        else if (cityId === 'protagon-sao-paulo') cityName = 'São Paulo';
        else if (cityId === 'protagon-goiania') cityName = 'Goiânia';
        
        return (r.workshop || []).map(row => ({
          ...row,
          _praca: cityName
        }));
      });

      const mergedGeral = results.flatMap((r, idx) => {
        const cityId = CITIES[idx];
        let cityName = 'Joinville';
        if (cityId === 'protagon-cuiaba') cityName = 'Cuiabá';
        else if (cityId === 'protagon-porto-alegre') cityName = 'Porto Alegre';
        else if (cityId === 'protagon-sao-paulo') cityName = 'São Paulo';
        else if (cityId === 'protagon-goiania') cityName = 'Goiânia';
        
        return (r.geral || []).map(row => ({
          ...row,
          _praca: cityName
        }));
      });

      const mergedIngressos = results.flatMap((r, idx) => {
        const cityId = CITIES[idx];
        let cityName = 'Joinville';
        if (cityId === 'protagon-cuiaba') cityName = 'Cuiabá';
        else if (cityId === 'protagon-porto-alegre') cityName = 'Porto Alegre';
        else if (cityId === 'protagon-sao-paulo') cityName = 'São Paulo';
        else if (cityId === 'protagon-goiania') cityName = 'Goiânia';
        
        return (r.ingressos || []).map(row => ({
          ...row,
          _praca: cityName
        }));
      });
      
      setRawData({
        workshopTraffic: mergedWorkshopTraffic,
        geral: mergedGeral,
        ingressos: mergedIngressos
      });
    } catch (e) {
      console.error("Error loading workshop data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  const metrics = useMemo(() => {
    if (!rawData) return null;
    return calculateWorkshopMetrics(rawData.workshopTraffic, rawData.geral, rawData.ingressos, startDate, endDate, pracaFilter);
  }, [rawData, startDate, endDate, pracaFilter]);

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const today = startOfToday();
    const minDateLimit = new Date('2026-09-29T12:00:00');
    
    let newStart = today;
    let newEnd = today;
    
    if (preset === 'today') {
      newStart = today;
      newEnd = today;
    } else if (preset === 'yesterday') {
      newStart = subDays(today, 1);
      newEnd = subDays(today, 1);
    } else if (preset === 'last7') {
      newStart = subDays(today, 7);
      newEnd = today;
    } else if (preset === 'last30') {
      newStart = subDays(today, 30);
      newEnd = today;
    } else if (preset === 'all') {
      newStart = minDateLimit;
      newEnd = today;
    }
    
    if (newStart < minDateLimit) {
      newStart = minDateLimit;
    }
    if (newEnd < minDateLimit) {
      newEnd = minDateLimit;
    }
    
    setStartDate(format(newStart, 'yyyy-MM-dd'));
    setEndDate(format(newEnd, 'yyyy-MM-dd'));
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 inline-block ml-1" /> : <ArrowDown className="w-3 h-3 inline-block ml-1" />;
  };

  if (loading || !metrics) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#050505] h-full">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full"></div>
          <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase">Carregando dados das 5 praças...</p>
        </div>
      </div>
    );
  }

  // Sort creatives
  const sortedCreatives = [...metrics.creatives].sort((a, b) => {
    const valA = a[sortField] || 0;
    const valB = b[sortField] || 0;
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Filter pesquisa by praça
  const pesquisaFiltered = audienciaPraca === 'todos' 
    ? metrics.pesquisa 
    : metrics.pesquisa.filter(r => {
        const atr = String(r._praca || r['Atribuição'] || r['atribuicao'] || '').trim();
        if (audienciaPraca === 'Orgânico') {
          return !['Joinville', 'Cuiabá', 'Porto Alegre', 'São Paulo', 'Goiânia'].includes(atr) || atr === 'Orgânico';
        }
        return atr === audienciaPraca;
      });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050505] overflow-y-auto">
      <div className="bg-[#0a0a0a] border-b border-white/5 sticky top-0 z-30">
        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <button onClick={onOpenAppMenu} className="xl:hidden p-2 -ml-2 text-zinc-400 hover:text-white">
                <Menu size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse"></span>
                  Funil de Workshop
                </h1>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Análise Perpétua</p>
              </div>
            </div>
            
            <div className="flex bg-zinc-900 border border-white/10 rounded-lg p-1">
              <button onClick={() => setActiveTab('geral')} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'geral' ? 'bg-yellow-500 text-black shadow-sm font-bold' : 'text-zinc-400 hover:text-white'}`}>Visão Geral</button>
              <button onClick={() => setActiveTab('audiencia')} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'audiencia' ? 'bg-yellow-500 text-black shadow-sm font-bold' : 'text-zinc-400 hover:text-white'}`}>Pesquisa de Audiência</button>
            </div>
            
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
              <button 
                onClick={() => handleRefresh(true)}
                disabled={loading}
                className="p-2 bg-zinc-900 border border-white/10 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center justify-center"
                title="Atualizar dados"
              >
                <RefreshCw size={18} className={loading ? "animate-spin text-yellow-500" : ""} />
              </button>
              <div className="bg-zinc-900 border border-white/10 rounded-lg p-1 flex shadow-inner">
                {['today', 'yesterday', 'last7', 'last30', 'all'].map(p => (
                  <button key={p} onClick={() => handlePresetChange(p)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${datePreset === p ? 'bg-yellow-500 text-black shadow-sm' : 'text-zinc-400 hover:text-white'}`}>
                    {p === 'today' ? 'Hoje' : p === 'yesterday' ? 'Ontem' : p === 'last7' ? '7D' : p === 'last30' ? '30D' : 'Tudo'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1">
                <DatePicker
                  selected={new Date(startDate + 'T12:00:00')}
                  onChange={(date) => { if(date) { setStartDate(format(date, 'yyyy-MM-dd')); setDatePreset('custom'); } }}
                  className="bg-transparent text-white text-sm w-24 outline-none text-center focus:ring-0"
                  dateFormat="dd/MM/yyyy"
                  minDate={new Date('2026-09-29T12:00:00')}
                />
                <span className="text-zinc-500 text-sm">até</span>
                <DatePicker
                  selected={new Date(endDate + 'T12:00:00')}
                  onChange={(date) => { if(date) { setEndDate(format(date, 'yyyy-MM-dd')); setDatePreset('custom'); } }}
                  className="bg-transparent text-white text-sm w-24 outline-none text-center focus:ring-0"
                  dateFormat="dd/MM/yyyy"
                  minDate={new Date('2026-09-29T12:00:00')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Notice Banner */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 sm:p-4 flex items-start gap-3 shadow-sm">
          <Info className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5 animate-bounce" />
          <div className="text-xs sm:text-sm text-zinc-300">
            <span className="font-bold text-yellow-500 font-mono">AVISO IMPORTANTE:</span> Os dados deste funil de Workshop só estão disponíveis e estruturados a partir de <span className="font-bold text-white">29/09/2026</span> devido a falhas prévias de configuração no Google Tag Manager e nas automações de infraestrutura.
          </div>
        </div>

        {activeTab === 'geral' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-6 gap-4">
              <MetricCard title="Investimento Total" value={formatCurrency(metrics.resumo.investimento)} />
              <MetricCard title="Vendas Totais" value={metrics.resumo.vendas} />
              <MetricCard title="Leads Totais" value={metrics.resumo.leads} subtitle={`${metrics.resumo.leadsPagas} paga(s)`} />
              <MetricCard title="MQLs Totais" value={metrics.resumo.mqls} subtitle={`${metrics.resumo.mqlsPagas} paga(s)`} />
              <MetricCard title="CPL Médio" value={metrics.resumo.cpl} type="currency" valueClassName={metrics.resumo.cpl > 0 ? (metrics.resumo.cpl <= 13 ? 'text-emerald-500' : metrics.resumo.cpl <= 14 ? 'text-yellow-500' : 'text-red-500') : 'text-white'} subtitle={`${formatCurrency(metrics.resumo.cplPago)} pago`} />
              <MetricCard title="Qualificação" value={`${metrics.resumo.qualificacao.toFixed(1)}%`} />
            </div>

            <div className="relative">
              {Object.keys(metrics.pracas).length > 4 && (
                <>
                  <button 
                    onClick={() => setPracaIndex(Math.max(0, pracaIndex - 4))}
                    disabled={pracaIndex === 0}
                    className="absolute -left-6 top-1/2 -translate-y-1/2 z-20 p-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-full shadow-[0_0_15px_rgba(234,179,8,0.3)] disabled:opacity-0 disabled:pointer-events-none transition-all cursor-pointer"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button 
                    onClick={() => setPracaIndex(Math.min(Object.keys(metrics.pracas).length - 4, pracaIndex + 4))}
                    disabled={pracaIndex >= Object.keys(metrics.pracas).length - 4}
                    className="absolute -right-6 top-1/2 -translate-y-1/2 z-20 p-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-full shadow-[0_0_15px_rgba(234,179,8,0.3)] disabled:opacity-0 disabled:pointer-events-none transition-all cursor-pointer"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
              <div className="overflow-hidden">
                <div 
                  className="flex gap-4 transition-transform duration-300 ease-in-out"
                  style={{ transform: `translateX(-${pracaIndex * (100 / 4)}%)` }}
                >
                  {Object.entries(metrics.pracas).map(([praca, d]: any) => (
                    <div key={praca} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 min-w-[calc(25%-12px)] flex-1">
                      <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider mb-4">{praca}</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center"><span className="text-sm text-zinc-400">Investimento</span><span className="text-base text-white font-bold">{formatCurrency(d.investimento)}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm text-zinc-400">Vendas</span><span className="text-base text-white font-bold">{d.vendas}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm text-zinc-400">Leads</span><span className="text-base text-white font-bold">{d.leads}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm text-zinc-400">MQLs</span><span className="text-base text-white font-bold">{d.mqls}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm text-zinc-400">Custo por Lead</span><span className={`text-base font-bold ${d.cpl > 0 ? (d.cpl <= 13 ? 'text-emerald-500' : d.cpl <= 14 ? 'text-yellow-500' : 'text-red-500') : 'text-white'}`}>{formatCurrency(d.cpl)}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm text-zinc-400">Qualificação</span><span className="text-base text-white font-bold">{d.qualificacao.toFixed(1)}%</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4">
                <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wider">Histórico de Leads e MQLs</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={metrics.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                      <YAxis stroke="#71717a" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a' }} />
                      <Legend />
                      <Bar name="Leads" dataKey="leadsTotal" fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Line name="MQLs" type="monotone" dataKey="mqlsTotal" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4">
                <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wider">Taxas de Conversão e Conexão</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                      <YAxis stroke="#71717a" fontSize={11} tickFormatter={(v) => `${v}%`} />
                      <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a' }} />
                      <Legend />
                      <Area name="Taxa de Conexão" type="monotone" dataKey="connectRate" stroke="#eab308" fill="rgba(234,179,8,0.05)" strokeWidth={2} />
                      <Area name="Conversão de Página" type="monotone" dataKey="pageConversion" stroke="#3b82f6" fill="rgba(59,130,246,0.05)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Pages conversion list */}
            {metrics.pagesData && metrics.pagesData.length > 0 && (
              <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4">
                <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wider">Métricas por Página de Destino</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {metrics.pagesData.map((p: any) => (
                    <div key={p.name} className="bg-black/40 border border-white/5 rounded-lg p-3">
                      <div className="text-yellow-500 font-bold mb-2 font-mono text-sm">{p.name}</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-zinc-400"><span>Cliques:</span><span className="font-semibold text-white font-mono">{formatNumber(p.cliques)}</span></div>
                        <div className="flex justify-between text-zinc-400"><span>Page Views:</span><span className="font-semibold text-white font-mono">{formatNumber(p.pageViews)}</span></div>
                        <div className="flex justify-between text-zinc-400"><span>Leads:</span><span className="font-semibold text-yellow-500 font-mono">{formatNumber(p.leads)}</span></div>
                        <div className="flex justify-between text-zinc-400"><span>Taxa de Conexão:</span><span className="font-semibold text-white font-mono">{p.connectRate.toFixed(1)}%</span></div>
                        <div className="flex justify-between text-zinc-400"><span>Conversão Página:</span><span className="font-semibold text-yellow-400 font-mono">{p.pageConversion.toFixed(1)}%</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Creatives Block */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-base font-bold text-white uppercase tracking-wider">Análise de Criativos do Workshop</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 font-medium">Visualizar por Praça:</span>
                  <select 
                    value={pracaFilter} 
                    onChange={e => setPracaFilter(e.target.value)}
                    className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-yellow-500 font-bold outline-none cursor-pointer"
                  >
                    <option value="todos">Todas as Praças</option>
                    <option value="Joinville">Joinville</option>
                    <option value="Cuiabá">Cuiabá</option>
                    <option value="Porto Alegre">Porto Alegre</option>
                    <option value="São Paulo">São Paulo</option>
                    <option value="Goiânia">Goiânia</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-white/5">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-zinc-400 uppercase tracking-wider font-semibold">
                      <th className="p-3">Criativo</th>
                      <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('investimento')}>Investimento {getSortIcon('investimento')}</th>
                      <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('impressoes')}>Impressões {getSortIcon('impressoes')}</th>
                      <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('cliques')}>Cliques {getSortIcon('cliques')}</th>
                      <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('ctr')}>CTR {getSortIcon('ctr')}</th>
                      <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('cpc')}>CPC {getSortIcon('cpc')}</th>
                      <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('leads')}>Leads {getSortIcon('leads')}</th>
                      <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('cpl')}>CPL {getSortIcon('cpl')}</th>
                      <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('mqls')}>MQLs {getSortIcon('mqls')}</th>
                      <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('cpmql')}>CPMQL {getSortIcon('cpmql')}</th>
                      <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('qualificacao')}>Qualificação {getSortIcon('qualificacao')}</th>
                      <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('hookRate')}>Hook Rate {getSortIcon('hookRate')}</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCreatives.map((c, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                        <td className="p-3 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            {c.thumbnail && (
                              <img src={c.thumbnail} alt="" className="w-8 h-8 rounded object-cover" />
                            )}
                            <div className="flex flex-col">
                              <span>{c.nome}</span>
                              {c.link && (
                                <a href={c.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-yellow-500 hover:underline flex items-center gap-0.5">
                                  Ver no Instagram <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-zinc-300">{formatCurrency(c.investimento)}</td>
                        <td className="p-3 font-mono text-zinc-400">{formatNumber(c.impressoes)}</td>
                        <td className="p-3 font-mono text-zinc-400">{formatNumber(c.cliques)}</td>
                        <td className="p-3 font-mono text-zinc-400">{c.ctr.toFixed(2)}%</td>
                        <td className="p-3 font-mono text-zinc-400">{formatCurrency(c.cpc)}</td>
                        <td className="p-3 font-mono font-bold text-yellow-500">{formatNumber(c.leads)}</td>
                        <td className="p-3 font-mono font-bold text-yellow-400">{formatCurrency(c.cpl)}</td>
                        <td className="p-3 font-mono text-blue-400">{formatNumber(c.mqls)}</td>
                        <td className="p-3 font-mono text-blue-300">{formatCurrency(c.cpmql)}</td>
                        <td className="p-3 font-mono text-zinc-400">{c.qualificacao.toFixed(1)}%</td>
                        <td className="p-3 font-mono text-zinc-400">{c.hookRate.toFixed(1)}%</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.ativo ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-zinc-800 text-zinc-500 border border-transparent'}`}>
                            {c.ativo ? 'ATIVO' : 'PAUSADO'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'audiencia' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap bg-[#0a0a0a] border border-white/5 rounded-xl p-3">
              <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Filtrar Respostas por Praça:</span>
              <div className="flex bg-zinc-900 border border-white/10 rounded-lg p-0.5">
                <button onClick={() => setAudienciaPraca('todos')} className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${audienciaPraca === 'todos' ? 'bg-yellow-500 text-black shadow-sm font-bold' : 'text-zinc-400 hover:text-white'}`}>Todas as Praças</button>
                {['Joinville', 'Cuiabá', 'Porto Alegre', 'São Paulo', 'Goiânia'].map(p => (
                  <button key={p} onClick={() => setAudienciaPraca(p)} className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${audienciaPraca === p ? 'bg-yellow-500 text-black shadow-sm font-bold' : 'text-zinc-400 hover:text-white'}`}>{p}</button>
                ))}
              </div>
            </div>
            
            <PesquisaAudiencia data={pesquisaFiltered} isLoading={false} />
          </div>
        )}
      </div>
    </div>
  );
}

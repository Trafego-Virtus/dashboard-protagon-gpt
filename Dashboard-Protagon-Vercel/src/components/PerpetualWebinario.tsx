import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useMemo } from 'react';
import { format, subDays, startOfToday } from 'date-fns';
import { fetchRawDashboardData } from '../utils/dataFetching';
import { DashboardId } from '../utils/api';
import { calculateWebinarioMetrics, WebinarioMetrics } from '../utils/webinarioCalculator';

const CITIES: DashboardId[] = ['protagon-joinville', 'protagon-cuiaba', 'protagon-porto-alegre', 'protagon-sao-paulo', 'protagon-goiania'];

interface WebinarioRawData {
  geral: any[];
  captura: any[];
  ingressos: any[];
}
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Copy, Check, ExternalLink, Menu, ArrowDown, ArrowUp, Info, X, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell, ComposedChart, Line } from 'recharts';
import { PesquisaAudiencia } from './PesquisaAudiencia';

export function PerpetualWebinario({ onOpenAppMenu }: { onOpenAppMenu: () => void }) {
  const [rawData, setRawData] = useState<WebinarioRawData | null>(null);
  const [startDate, setStartDate] = useState(format(subDays(startOfToday(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(startOfToday(), 'yyyy-MM-dd'));
  const [datePreset, setDatePreset] = useState('last7');
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'geral' | 'audiencia'>('geral');
  const [audienciaPraca, setAudienciaPraca] = useState<string>('todos');
  const [showKPIs, setShowKPIs] = useState(false);
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
  const [cplFilter, setCplFilter] = useState<'all' | 'excelente' | 'medio' | 'critico'>('all');
  const [cpmqlFilter, setCpmqlFilter] = useState<'all' | 'excelente' | 'medio' | 'critico'>('all');

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const cityPromises = CITIES.map(cid => fetchRawDashboardData(cid, true));
      const results = await Promise.all(cityPromises);
      
      const mergedWebinarioTraffic = results.flatMap(r => r.webinario || []);
      const mergedGeral = results.flatMap(r => r.geral || []);
      const mergedIngressos = results.flatMap(r => r.ingressos || []);
      
      setRawData({
        captura: mergedWebinarioTraffic,
        geral: mergedGeral,
        ingressos: mergedIngressos
      });
    } catch (e) {
      console.error("Error loading webinario data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  const metrics = useMemo(() => {
    if (!rawData) return null;
    return calculateWebinarioMetrics(rawData, startDate, endDate);
  }, [rawData, startDate, endDate]);

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
    } else if (preset === 'last30') {
      setStartDate(format(subDays(today, 30), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'all') {
      setStartDate('2020-01-01');
      setEndDate(format(today, 'yyyy-MM-dd'));
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc'); // Default to descending when changing fields
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 inline-block ml-1" /> : <ArrowDown className="w-3 h-3 inline-block ml-1" />;
  };

  if (loading || !metrics) {
    return <div className="flex-1 flex items-center justify-center bg-[#050505] h-full"><div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full"></div></div>;
  }

  // Filter creatives
  let filteredCreatives = metrics.creatives.filter(c => {
    let passCpl = true;
    let passCpmql = true;
    
    if (cplFilter !== 'all') {
      if (c.leads === 0) passCpl = false;
      else if (cplFilter === 'excelente') passCpl = c.cpl <= 13;
      else if (cplFilter === 'medio') passCpl = c.cpl > 13 && c.cpl <= 14;
      else if (cplFilter === 'critico') passCpl = c.cpl > 14;
    }
    
    if (cpmqlFilter !== 'all') {
      if (c.mqls === 0) passCpmql = false;
      else if (cpmqlFilter === 'excelente') passCpmql = c.cpmql <= 31;
      else if (cpmqlFilter === 'medio') passCpmql = c.cpmql > 31 && c.cpmql <= 40;
      else if (cpmqlFilter === 'critico') passCpmql = c.cpmql > 40;
    }
    
    return passCpl && passCpmql;
  });

  // Sort creatives
  filteredCreatives = [...filteredCreatives].sort((a, b) => {
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
        const atr = String(r['Atribuição'] || '').trim();
        if (audienciaPraca === 'Orgânico') {
          return !Object.keys(metrics.pracas).includes(atr) || atr === 'Orgânico';
        }
        return atr === audienciaPraca;
      });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050505] overflow-y-auto">
      <div className="bg-[#0a0a0a] border-b border-white/5 sticky top-0 z-30">
        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onOpenAppMenu} className="xl:hidden p-2 -ml-2 text-zinc-400 hover:text-white">
                <Menu size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Funil de Webnário</h1>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Análise Perpétua</p>
              </div>
            </div>
            
            <div className="flex bg-zinc-900 border border-white/10 rounded-lg p-1">
              <button onClick={() => setActiveTab('geral')} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'geral' ? 'bg-yellow-500 text-black shadow-sm' : 'text-zinc-400 hover:text-white'}`}>Visão Geral</button>
              <button onClick={() => setActiveTab('audiencia')} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'audiencia' ? 'bg-yellow-500 text-black shadow-sm' : 'text-zinc-400 hover:text-white'}`}>Pesquisa de Audiência</button>
            </div>
            
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
              <button 
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 bg-zinc-900 border border-white/10 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center justify-center"
                title="Atualizar dados"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
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
                  className="bg-transparent text-white text-sm w-24 outline-none text-center"
                  dateFormat="dd/MM/yyyy"
                />
                <span className="text-zinc-500 text-sm">até</span>
                <DatePicker
                  selected={new Date(endDate + 'T12:00:00')}
                  onChange={(date) => { if(date) { setEndDate(format(date, 'yyyy-MM-dd')); setDatePreset('custom'); } }}
                  className="bg-transparent text-white text-sm w-24 outline-none text-center"
                  dateFormat="dd/MM/yyyy"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        
        {activeTab === 'geral' && (
          <>
            {/* KPIs References Removed */}
            

            <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
              <MetricCard title="Investimento Total" value={formatCurrency(metrics.resumo.investimento)} />
              <MetricCard title="Vendas Totais" value={metrics.resumo.vendas} />
              <MetricCard title="Leads Totais" value={metrics.resumo.leads} subValue={<span>{metrics.resumo.leadsPagas} paga(s)</span>} />
              <MetricCard title="MQLs Totais" value={metrics.resumo.mqls} subValue={<span>{metrics.resumo.mqlsPagas} paga(s)</span>} />
              <MetricCard title="CPL Médio" value={formatCurrency(metrics.resumo.cpl)} valueColor={metrics.resumo.cpl > 0 ? (metrics.resumo.cpl <= 13 ? 'text-emerald-500' : metrics.resumo.cpl <= 14 ? 'text-yellow-500' : 'text-red-500') : 'text-white'} subValue={<span>{formatCurrency(metrics.resumo.cplPago)} pago</span>} />
              <MetricCard title="Custo por MQL" value={formatCurrency(metrics.resumo.cpmql)} valueColor={metrics.resumo.cpmql > 0 ? (metrics.resumo.cpmql <= 31 ? 'text-emerald-500' : metrics.resumo.cpmql <= 40 ? 'text-yellow-500' : 'text-red-500') : 'text-white'} subValue={<span>{formatCurrency(metrics.resumo.cpmqlPago)} pago</span>} />
              <MetricCard title="Qualificação" value={`${metrics.resumo.qualificacao.toFixed(1)}%`} />
              <MetricCard title="Inscritos Quiz" value={`${metrics.resumo.webinarioAbs} (${metrics.resumo.webinarioPercent.toFixed(1)}%)`} />
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
                    <div key={praca} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 min-w-[calc(25%-12px)]">
                  <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider mb-4">{praca}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center"><span className="text-sm text-zinc-400">Investimento</span><span className="text-base text-white font-bold">{formatCurrency(d.investimento)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm text-zinc-400">Vendas</span><span className="text-base text-white font-bold">{d.vendas}</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm text-zinc-400">Leads</span><span className="text-base text-white font-bold">{d.leads}</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm text-zinc-400">MQLs</span><span className="text-base text-white font-bold">{d.mqls}</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm text-zinc-400">Custo por Lead</span><span className={`text-base font-bold ${d.cpl > 0 ? (d.cpl <= 13 ? 'text-emerald-500' : d.cpl <= 14 ? 'text-yellow-500' : 'text-red-500') : 'text-white'}`}>{formatCurrency(d.cpl)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm text-zinc-400">Custo por MQL</span><span className={`text-base font-bold ${d.cpmql > 0 ? (d.cpmql <= 31 ? 'text-emerald-500' : d.cpmql <= 40 ? 'text-yellow-500' : 'text-red-500') : 'text-white'}`}>{formatCurrency(d.cpmql)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm text-zinc-400">Taxa Qualificação</span><span className="text-base text-white font-bold">{d.qualificacao.toFixed(1)}%</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm text-zinc-400">Inscritos Quiz</span><span className="text-base text-white font-bold">{d.webinarioAbs} ({d.webinarioPercent.toFixed(1)}%)</span></div>
                  </div>
                </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
               <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 h-80">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Custo por Lead (Geral)</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickMargin={10} />
                      <YAxis stroke="#52525b" fontSize={10} tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '12px', borderRadius: '8px' }} 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-zinc-900 border border-white/10 p-3 rounded-lg shadow-xl">
                                <p className="text-white font-bold mb-2">{label}</p>
                                <p className="text-zinc-300 text-sm">CPL Geral: <span className="font-bold">{formatCurrency(data.cplTotal)}</span></p>
                                <p className="text-zinc-300 text-sm">Vendas: <span className="font-bold">{data.vendasTotal}</span></p>
                                <p className="text-zinc-300 text-sm">Leads: <span className="font-bold">{data.leadsTotal}</span></p>
                              </div>
                            );
                          }
                          return null;
                        }} 
                      />
                      <Bar dataKey="cplTotal" name="CPL Geral" radius={[2, 2, 0, 0]} fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
               


               <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 h-80">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Investimento Total por Dia</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickMargin={10} />
                      <YAxis stroke="#52525b" fontSize={10} tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '12px' }} formatter={(val) => formatCurrency(val as number)} />
                      <Bar dataKey="investimentoTotal" name="Investimento Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl flex flex-col md:flex-row h-auto min-h-80 w-full overflow-hidden">
              <div className="flex-1 p-4 flex flex-col min-h-[320px]">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Connect Rate e Conversão (Diário)</h3>
                <div className="flex-1 w-full min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={metrics.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickMargin={10} />
                      <YAxis yAxisId="left" stroke="#52525b" fontSize={10} tickFormatter={(v) => `${v}%`} />
                      <YAxis yAxisId="right" orientation="right" stroke="#52525b" fontSize={10} tickFormatter={(v) => `${v}%`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '12px', borderRadius: '8px' }}
                        formatter={(value: any, name: string) => [`${Number(value).toFixed(2)}%`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line yAxisId="left" type="monotone" dataKey="connectRate" name="Connect Rate" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6' }} />
                      <Line yAxisId="right" type="monotone" dataKey="pageConversion" name="Conversão" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="w-full md:w-80 bg-zinc-900/50 p-4 border-t md:border-t-0 md:border-l border-white/5 flex flex-col overflow-y-auto">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Resumo por Página</h3>
                <div className="flex flex-col gap-3 flex-1">
                  {metrics.pagesData.length === 0 && (
                    <div className="text-zinc-500 text-sm italic">Nenhum dado encontrado para o período.</div>
                  )}
                  {metrics.pagesData.map(p => (
                    <div key={p.name} className="bg-black/40 border border-white/5 rounded-lg p-3">
                      <h4 className="text-sm font-bold text-white mb-2">{p.name}</h4>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-zinc-400">Connect Rate</span>
                        <span className="text-sm font-mono text-[#8b5cf6]">{p.connectRate.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-zinc-400">Conversão</span>
                        <span className="text-sm font-mono text-[#10b981]">{p.pageConversion.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-zinc-500">Page Views</span>
                          <span className="text-xs text-white">{p.pageViews}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] text-zinc-500">Leads</span>
                          <span className="text-xs text-white">{p.leads}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl flex flex-col">
              <div className="p-4 border-b border-white/5 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider">Criativos de Captação</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 p-1 rounded-lg">
                    <span className="text-xs text-zinc-500 px-2">CPL:</span>
                    {['all', 'excelente', 'medio', 'critico'].map(f => (
                      <button key={f} onClick={() => setCplFilter(f as any)} className={`px-2 py-1 text-xs font-medium rounded-md ${cplFilter === f ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>
                        {f === 'all' ? 'Todos' : f === 'excelente' ? 'Exc.' : f === 'medio' ? 'Médio' : 'Crítico'}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 p-1 rounded-lg">
                    <span className="text-xs text-zinc-500 px-2">MQL:</span>
                    {['all', 'excelente', 'medio', 'critico'].map(f => (
                      <button key={f} onClick={() => setCpmqlFilter(f as any)} className={`px-2 py-1 text-xs font-medium rounded-md ${cpmqlFilter === f ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>
                        {f === 'all' ? 'Todos' : f === 'excelente' ? 'Exc.' : f === 'medio' ? 'Médio' : 'Crítico'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-zinc-500 uppercase tracking-wider bg-black/20">
                      <th className="p-4 font-medium min-w-[300px]">Criativo</th>
                      <th className="p-4 font-medium text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('investimento')}>Investimento {getSortIcon('investimento')}</th>
                      <th className="p-4 font-medium text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('vendas')}>Vendas {getSortIcon('vendas')}</th>
                      <th className="p-4 font-medium text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('leads')}>Leads {getSortIcon('leads')}</th>
                      <th className="p-4 font-medium text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('mqls')}>MQLs {getSortIcon('mqls')}</th>
                      <th className="p-4 font-medium text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('qualificacao')}>Qualificação {getSortIcon('qualificacao')}</th>
                      <th className="p-4 font-medium text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('ctr')}>CTR {getSortIcon('ctr')}</th>
                      <th className="p-4 font-medium text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('cpc')}>CPC {getSortIcon('cpc')}</th>
                      <th className="p-4 font-medium text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('hookRate')}>Hook Rate {getSortIcon('hookRate')}</th>
                      <th className="p-4 font-medium text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('cpl')}>Custo por Lead {getSortIcon('cpl')}</th>
                      <th className="p-4 font-medium text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('cpmql')}>Custo MQL {getSortIcon('cpmql')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredCreatives.map((c, i) => {
                      let bgCpl = '';
                      if (c.leads > 0) {
                        if (c.cpl <= 13) bgCpl = 'bg-emerald-500/20 text-emerald-400';
                        else if (c.cpl <= 14) bgCpl = 'bg-yellow-500/20 text-yellow-400';
                        else bgCpl = 'bg-red-500/20 text-red-400';
                      } else {
                        bgCpl = 'text-zinc-500';
                      }
                      
                      let bgMql = '';
                      if (c.mqls > 0) {
                        if (c.cpmql <= 31) bgMql = 'bg-emerald-500/20 text-emerald-400';
                        else if (c.cpmql <= 40) bgMql = 'bg-yellow-500/20 text-yellow-400';
                        else bgMql = 'bg-red-500/20 text-red-400';
                      } else {
                        bgMql = 'text-zinc-500';
                      }
                      
                      return (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-zinc-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                                {c.thumbnail ? <img src={c.thumbnail} alt={c.nome} className="w-full h-full object-cover" /> : <span className="text-[10px] text-zinc-600">Sem img</span>}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 group">
                                  <span className={`w-1.5 h-1.5 rounded-full ${c.ativo ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></span>
                                  <p className="text-sm text-white font-medium line-clamp-1">{c.nome}</p>
                                  <button
                                    onClick={() => handleCopy(c.nome, c.nome)}
                                    className="transition-colors p-1 hover:bg-white/10 rounded shrink-0"
                                    title="Copiar nome"
                                  >
                                    {copiedId === c.nome ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5 text-zinc-400 hover:text-white" />
                                    )}
                                  </button>
                                </div>
                                {c.link && (
                                  <a href={c.link} target="_blank" rel="noreferrer" className="text-[10px] text-yellow-500 hover:text-yellow-400 mt-1 flex items-center gap-1">Ver anúncio <ExternalLink className="w-2.5 h-2.5" /></a>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right text-sm text-zinc-300 font-medium">{formatCurrency(c.investimento)}</td>
                          <td className="p-4 text-right text-sm text-zinc-300">{c.vendas}</td>
                          <td className="p-4 text-right text-sm text-zinc-300">{c.leads}</td>
                          <td className="p-4 text-right text-sm text-zinc-300">{c.mqls}</td>
                          <td className="p-4 text-right text-sm text-zinc-300">{c.qualificacao.toFixed(1)}%</td>
                          <td className="p-4 text-right text-sm text-zinc-300">{c.ctr?.toFixed(2)}%</td>
                          <td className="p-4 text-right text-sm text-zinc-300">{formatCurrency(c.cpc || 0)}</td>
                          <td className="p-4 text-right text-sm text-zinc-300">{c.hookRate?.toFixed(2)}%</td>
                          <td className="p-4 text-right text-sm">
                             <span className={`px-2 py-1 rounded-md font-bold text-xs ${bgCpl}`}>
                               {formatCurrency(c.cpl)}
                             </span>
                          </td>
                          <td className="p-4 text-right text-sm">
                             <span className={`px-2 py-1 rounded-md font-bold text-xs ${bgMql}`}>
                               {formatCurrency(c.cpmql)}
                             </span>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredCreatives.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-zinc-500 text-sm">Nenhum criativo encontrado para os filtros selecionados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'audiencia' && (
          <div className="flex flex-col gap-4">
             <div className="flex items-center gap-4 bg-[#0a0a0a] border border-white/5 rounded-xl p-4">
               <span className="text-sm font-bold text-zinc-300">Praça:</span>
               <div className="flex bg-zinc-900 border border-white/10 rounded-lg p-1">
                 {['todos', ...Object.keys(metrics.pracas)].map(p => (
                   <button 
                     key={p} 
                     onClick={() => setAudienciaPraca(p)} 
                     className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${audienciaPraca === p ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                   >
                     {p === 'todos' ? 'Todas' : p}
                   </button>
                 ))}
               </div>
               <div className="ml-auto text-sm text-zinc-400">
                 Total de leads: <span className="font-bold text-white">{pesquisaFiltered.length}</span>
               </div>
             </div>
             
             {/* Use existing PesquisaAudiencia component */}
             <PesquisaAudiencia data={pesquisaFiltered} isLoading={false} />
          </div>
        )}
      </div>

      {/* KPIs References Modal Removed */}
    </div>
  );
}

function MetricCard({ title, value, valueColor = 'text-white', subValue }: { title: string, value: string | number, valueColor?: string, subValue?: React.ReactNode }) {
  return (
    <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
      <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-widest">{title}</h3>
      <div className="mt-2">
        <p className={`text-xl sm:text-2xl font-bold ${valueColor}`}>{value}</p>
        {subValue && <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">{subValue}</div>}
      </div>
    </div>
  );
}

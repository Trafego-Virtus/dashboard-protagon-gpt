import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useMemo } from 'react';
import { format, subDays, startOfToday } from 'date-fns';
import { fetchQuizData, QuizRawData } from '../utils/quizData';
import { calculateQuizMetrics, QuizMetrics } from '../utils/quizCalculator';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Copy, Check, ExternalLink, Menu, ArrowDown, ArrowUp, Info, X, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell, ComposedChart, Line } from 'recharts';
import { PesquisaAudiencia } from './PesquisaAudiencia';

export function PerpetualQuiz({ onOpenAppMenu }: { onOpenAppMenu: () => void }) {
  const [rawData, setRawData] = useState<QuizRawData | null>(null);
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

  const handleRefresh = () => {
    setLoading(true);
    fetchQuizData().then(data => {
      setRawData(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  const metrics = useMemo(() => {
    if (!rawData) return null;
    return calculateQuizMetrics(rawData, startDate, endDate);
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
      else if (cplFilter === 'excelente') passCpl = c.cpl <= 8;
      else if (cplFilter === 'medio') passCpl = c.cpl > 8 && c.cpl <= 10;
      else if (cplFilter === 'critico') passCpl = c.cpl > 10;
    }
    
    if (cpmqlFilter !== 'all') {
      if (c.mqls === 0) passCpmql = false;
      else if (cpmqlFilter === 'excelente') passCpmql = c.cpmql <= 19;
      else if (cpmqlFilter === 'medio') passCpmql = c.cpmql > 19 && c.cpmql <= 26;
      else if (cpmqlFilter === 'critico') passCpmql = c.cpmql > 26;
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
          return atr !== 'Joinville' && atr !== 'Cuiaba' && atr !== 'Cuiabá' && atr !== 'Porto Alegre' && atr !== 'São Paulo' && atr !== 'Sao Paulo' && atr !== 'Goiânia' && atr !== 'Goiania';
        }
        return atr.toLowerCase() === audienciaPraca.toLowerCase();
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
                <h1 className="text-xl font-bold text-white tracking-tight">Funil de Quiz</h1>
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
            {/* KPIs References */}
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowKPIs(true)} className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors border border-white/5 text-sm font-medium">
                <Info className="w-4 h-4 text-blue-400" />
                Referências de KPIs
              </button>
            </div>
            

            <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
              <MetricCard title="Investimento Total" value={formatCurrency(metrics.resumo.investimento)} />
              <MetricCard title="Leads Totais" value={metrics.resumo.leads} />
              <MetricCard title="MQLs Totais" value={metrics.resumo.mqls} />
              <MetricCard title="CPL Médio" value={formatCurrency(metrics.resumo.cpl)} valueColor={metrics.resumo.cpl > 0 ? (metrics.resumo.cpl <= 8 ? 'text-emerald-500' : metrics.resumo.cpl <= 10 ? 'text-yellow-500' : 'text-red-500') : 'text-white'} />
              <MetricCard title="Custo por MQL" value={formatCurrency(metrics.resumo.cpmql)} valueColor={metrics.resumo.cpmql > 0 ? (metrics.resumo.cpmql <= 19 ? 'text-emerald-500' : metrics.resumo.cpmql <= 26 ? 'text-yellow-500' : 'text-red-500') : 'text-white'} />
              <MetricCard title="Qualificação" value={`${metrics.resumo.qualificacao.toFixed(1)}%`} />
              <MetricCard title="Inscritos Webnário" value={`${metrics.resumo.webinarioAbs} (${metrics.resumo.webinarioPercent.toFixed(1)}%)`} />
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
                        <div className="flex justify-between items-center"><span className="text-sm text-zinc-400">Leads</span><span className="text-base text-white font-bold">{d.leads}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm text-zinc-400">MQLs</span><span className="text-base text-white font-bold">{d.mqls}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm text-zinc-400">Custo por Lead</span><span className={`text-base font-bold ${d.cpl > 0 ? (d.cpl <= 8 ? 'text-emerald-500' : d.cpl <= 10 ? 'text-yellow-500' : 'text-red-500') : 'text-white'}`}>{formatCurrency(d.cpl)}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm text-zinc-400">Custo por MQL</span><span className={`text-base font-bold ${d.cpmql > 0 ? (d.cpmql <= 19 ? 'text-emerald-500' : d.cpmql <= 26 ? 'text-yellow-500' : 'text-red-500') : 'text-white'}`}>{formatCurrency(d.cpmql)}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm text-zinc-400">Taxa Qualificação</span><span className="text-base text-white font-bold">{d.qualificacao.toFixed(1)}%</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm text-zinc-400">Inscritos Webnário</span><span className="text-base text-white font-bold">{d.webinarioAbs} ({d.webinarioPercent.toFixed(1)}%)</span></div>
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
                      contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '12px' }} 
                      formatter={(val) => formatCurrency(val)} 
                    />
                    <Bar dataKey="cplTotal" name="CPL Total">
                      {metrics.chartData.map((entry, index) => {
                        let fill = '#ef4444'; // Red default
                        if (entry.cplTotal <= 19) fill = '#10b981'; // Green
                        else if (entry.cplTotal <= 26) fill = '#eab308'; // Yellow
                        return <Cell key={`cell-${index}`} fill={fill} />;
                      })}
                    </Bar>
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
                    <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '12px' }} formatter={(val) => formatCurrency(val)} />
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
                <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider">Criativos de Captação (Quiz)</h3>
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
                        if (c.cpl <= 8) bgCpl = 'bg-emerald-500/20 text-emerald-400';
                        else if (c.cpl <= 10) bgCpl = 'bg-yellow-500/20 text-yellow-400';
                        else bgCpl = 'bg-red-500/20 text-red-400';
                      } else {
                        bgCpl = 'text-zinc-500';
                      }
                      
                      let bgMql = '';
                      if (c.mqls > 0) {
                        if (c.cpmql <= 19) bgMql = 'bg-emerald-500/20 text-emerald-400';
                        else if (c.cpmql <= 26) bgMql = 'bg-yellow-500/20 text-yellow-400';
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
                 {['todos', 'Joinville', 'Cuiaba', 'Porto Alegre', 'São Paulo', 'Goiânia', 'Orgânico'].map(p => (
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

      <AnimatePresence>
        {showKPIs && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-400" />
                  Referências de KPIs (Quiz)
                </h2>
                <button onClick={() => setShowKPIs(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar max-h-[70vh]">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest text-center">Custo por Lead</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-center">
                      <p className="text-emerald-500 font-bold text-lg">&le; R$8</p>
                      <p className="text-xs text-emerald-500/80 uppercase mt-1">Excelente</p>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg text-center">
                      <p className="text-yellow-500 font-bold text-lg">R$8 - R$10</p>
                      <p className="text-xs text-yellow-500/80 uppercase mt-1">Médio</p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
                      <p className="text-red-500 font-bold text-lg">&gt; R$10</p>
                      <p className="text-xs text-red-500/80 uppercase mt-1">Crítico</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest text-center">Custo por MQL</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-center">
                      <p className="text-emerald-500 font-bold text-lg">&le; R$19</p>
                      <p className="text-xs text-emerald-500/80 uppercase mt-1">Excelente</p>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg text-center">
                      <p className="text-yellow-500 font-bold text-lg">R$19 - R$26</p>
                      <p className="text-xs text-yellow-500/80 uppercase mt-1">Médio</p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
                      <p className="text-red-500 font-bold text-lg">&gt; R$26</p>
                      <p className="text-xs text-red-500/80 uppercase mt-1">Crítico</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricCard({ title, value, valueColor = 'text-white' }: { title: string, value: string | number, valueColor?: string }) {
  return (
    <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
      <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-widest">{title}</h3>
      <p className={`text-xl sm:text-2xl font-bold mt-2 ${valueColor}`}>{value}</p>
    </div>
  );
}

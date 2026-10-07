import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useMemo } from 'react';
import { format, subDays, startOfToday } from 'date-fns';
import { fetchGuardiansData, GuardiansRawData } from '../utils/guardiansData';
import { calculateGuardiansMetrics, GuardiansMetrics } from '../utils/guardiansCalculator';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Copy, Check, ExternalLink, Menu, ArrowDown, ArrowUp, Info, X, RefreshCw, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell, ComposedChart, Line } from 'recharts';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

export function PerpetualGuardians({ onOpenAppMenu }: { onOpenAppMenu: () => void }) {
  const [rawData, setRawData] = useState<GuardiansRawData | null>(null);
  const [startDate, setStartDate] = useState(format(subDays(startOfToday(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(startOfToday(), 'yyyy-MM-dd'));
  const [datePreset, setDatePreset] = useState('last30');
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'geral' | 'criativos'>('geral');
  const [showKPIs, setShowKPIs] = useState(false);

  const [sortFieldBranding, setSortFieldBranding] = useState<string>('spend');
  const [sortDirBranding, setSortDirBranding] = useState<'asc' | 'desc'>('desc');
  
  const [sortFieldCaptacao, setSortFieldCaptacao] = useState<string>('spend');
  const [sortDirCaptacao, setSortDirCaptacao] = useState<'asc' | 'desc'>('desc');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchGuardiansData().then(data => {
      setRawData(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  const processed = useMemo(() => {
    if (!rawData || !startDate || !endDate) return null;
    return calculateGuardiansMetrics(rawData, {
      start: new Date(startDate + 'T00:00:00'),
      end: new Date(endDate + 'T23:59:59')
    });
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
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  const sortedBranding = processed ? [...processed.creativeDataBranding].sort((a, b) => {
    const valA = a[sortFieldBranding] || 0;
    const valB = b[sortFieldBranding] || 0;
    return sortDirBranding === 'asc' ? valA - valB : valB - valA;
  }) : [];

  const sortedCaptacao = processed ? [...processed.creativeDataCaptacao].sort((a, b) => {
    const valA = a[sortFieldCaptacao] || 0;
    const valB = b[sortFieldCaptacao] || 0;
    return sortDirCaptacao === 'asc' ? valA - valB : valB - valA;
  }) : [];

  return (
    <div className="flex-1 flex flex-col bg-[#09090b] h-screen overflow-hidden text-zinc-100 font-sans">
      <header className="flex-none bg-[#09090b] border-b border-zinc-800/50 p-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onOpenAppMenu} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors md:hidden">
              <Menu size={20} className="text-zinc-400" />
            </button>
            <div className="w-8 h-8 rounded bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <Filter size={16} className="text-zinc-950" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Guardians 2020</h1>
              <p className="text-xs text-zinc-400 font-medium tracking-wide">FUNIL PERPÉTUO</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-sm rounded-lg px-3 py-2 text-zinc-300 focus:outline-none focus:border-yellow-500/50"
            >
              <option value="custom">Personalizado</option>
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="last7">Últimos 7 dias</option>
              <option value="last30">Últimos 30 dias</option>
            </select>
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 flex-1 sm:flex-none">
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setDatePreset('custom'); }}
                className="bg-transparent text-sm text-zinc-200 outline-none w-full sm:w-auto"
              />
              <span className="text-zinc-500">até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setDatePreset('custom'); }}
                className="bg-transparent text-sm text-zinc-200 outline-none w-full sm:w-auto"
              />
            </div>
            <button onClick={handleRefresh} className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-colors group flex-none">
              <RefreshCw size={18} className="text-zinc-400 group-hover:text-zinc-200" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-none bg-[#09090b] border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto hide-scrollbar">
            {[
              { id: 'geral', label: 'Visão Geral' },
              { id: 'criativos', label: 'Criativos e Anúncios' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 text-sm font-medium whitespace-nowrap transition-colors relative ${
                  activeTab === tab.id ? 'text-yellow-500' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div layoutId="guardians-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">
          {processed && activeTab === 'geral' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Investimento Total" value={formatCurrency(processed.investTotal)} subtitle={`Impulsionamento Live: ${formatCurrency(processed.investBranding)} | Captação: ${formatCurrency(processed.investCaptacao)}`} highlight />
                <MetricCard title="Leads Captados" value={formatNumber(processed.totalLeads)} subtitle={`CPL (Impulsionamento Live + Captação): ${formatCurrency(processed.cpl)}`} />
                <MetricCard title="Connect Rate (Geral)" value={`${processed.connectRate.toFixed(1)}%`} subtitle="Cliques ➔ Views" />
                <MetricCard title="Conversão de Página" value={`${processed.pageConversion.toFixed(1)}%`} subtitle="Views ➔ Leads" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-6">Investimento e CPL por Dia</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={processed.dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="date" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" stroke="#52525b" fontSize={12} tickFormatter={v => `R$${v}`} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" stroke="#52525b" fontSize={12} tickFormatter={v => `R$${v}`} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                          itemStyle={{ color: '#e4e4e7' }}
                          formatter={(value: number, name: string) => [formatCurrency(value), name]}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
                        <Bar yAxisId="left" dataKey="investDist" name="Impulsionamento Live" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar yAxisId="left" dataKey="investLeads" name="Captação" stackId="a" fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Line yAxisId="right" type="monotone" dataKey="cpa" name="CPL Captação" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-6">Funil de Captação (Tráfego)</h3>
                  <div className="space-y-5">
                    <FunnelStep label="Impressões" value={formatNumber(processed.captacaoImpressions)} subValue={`CPM: ${formatCurrency(processed.captacaoCpm)}`} />
                    <div className="pl-4 border-l-2 border-zinc-800 ml-4 py-2 text-xs text-zinc-500 font-medium">CTR: {processed.captacaoCtr.toFixed(2)}%</div>
                    <FunnelStep label="Cliques no Link" value={formatNumber(processed.captacaoClicks)} subValue={`CPC: ${formatCurrency(processed.captacaoCpc)}`} />
                    <div className="pl-4 border-l-2 border-zinc-800 ml-4 py-2 text-xs text-zinc-500 font-medium">Connect Rate: {processed.captacaoConnectRate.toFixed(2)}%</div>
                    <FunnelStep label="Visualizações de Página" value={formatNumber(processed.captacaoLandingViews)} subValue="Carregamento completo" />
                    <div className="pl-4 border-l-2 border-zinc-800 ml-4 py-2 text-xs text-zinc-500 font-medium">Conversão: {processed.captacaoPageConversion.toFixed(2)}%</div>
                    <FunnelStep label="Leads Captação" value={formatNumber(processed.totalLeads)} subValue={`CPL (Somente Captação): ${formatCurrency(processed.captacaoCpl)}`} highlight />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {processed && activeTab === 'criativos' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              {/* BRANDING TABLE */}
              <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-zinc-800/50 bg-zinc-900/50 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-zinc-200">Performance por Criativo - Impulsionamento Live</h3>
                  <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md font-medium">{sortedBranding.length} Anúncios</span>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-zinc-900/30 text-zinc-400 text-xs font-semibold">
                      <tr>
                        <th className="p-4 rounded-tl-xl">Criativo</th>
                        <th className="p-4 cursor-pointer hover:text-zinc-200" onClick={() => { setSortFieldBranding('spend'); setSortDirBranding(prev => prev === 'asc' ? 'desc' : 'asc'); }}>Investimento</th>
                        <th className="p-4 cursor-pointer hover:text-zinc-200" onClick={() => { setSortFieldBranding('impressions'); setSortDirBranding(prev => prev === 'asc' ? 'desc' : 'asc'); }}>Impressões</th>
                        <th className="p-4 cursor-pointer hover:text-zinc-200" onClick={() => { setSortFieldBranding('hookRate'); setSortDirBranding(prev => prev === 'asc' ? 'desc' : 'asc'); }}>Hook Rate (3s)</th>
                        <th className="p-4 cursor-pointer hover:text-zinc-200" onClick={() => { setSortFieldBranding('ctr'); setSortDirBranding(prev => prev === 'asc' ? 'desc' : 'asc'); }}>CTR</th>
                        <th className="p-4 cursor-pointer hover:text-zinc-200" onClick={() => { setSortFieldBranding('cpc'); setSortDirBranding(prev => prev === 'asc' ? 'desc' : 'asc'); }}>CPC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                      {sortedBranding.map((c, i) => (
                        <tr key={i} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="p-4 max-w-[300px] truncate">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium text-zinc-200">{c.name}</span>
                              {c.link && (
                                <a href={c.link} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-yellow-500 flex-shrink-0">
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-zinc-300">{formatCurrency(c.spend)}</td>
                          <td className="p-4 text-zinc-400">{formatNumber(c.impressions)}</td>
                          <td className="p-4 text-zinc-300">{c.hookRate.toFixed(1)}%</td>
                          <td className="p-4 text-zinc-300">{c.ctr.toFixed(2)}%</td>
                          <td className="p-4 text-zinc-400">{formatCurrency(c.cpc)}</td>
                        </tr>
                      ))}
                      {sortedBranding.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-zinc-500">Nenhum dado de impulsionamento live no período.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CAPTAÇÃO TABLE */}
              <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-zinc-800/50 bg-zinc-900/50 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-zinc-200">Performance por Criativo - Captação</h3>
                  <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md font-medium">{sortedCaptacao.length} Anúncios</span>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-zinc-900/30 text-zinc-400 text-xs font-semibold">
                      <tr>
                        <th className="p-4 rounded-tl-xl">Criativo</th>
                        <th className="p-4 cursor-pointer hover:text-zinc-200" onClick={() => { setSortFieldCaptacao('spend'); setSortDirCaptacao(prev => prev === 'asc' ? 'desc' : 'asc'); }}>Investimento</th>
                        <th className="p-4 cursor-pointer hover:text-zinc-200" onClick={() => { setSortFieldCaptacao('sales'); setSortDirCaptacao(prev => prev === 'asc' ? 'desc' : 'asc'); }}>Leads</th>
                        <th className="p-4 cursor-pointer hover:text-zinc-200" onClick={() => { setSortFieldCaptacao('cpa'); setSortDirCaptacao(prev => prev === 'asc' ? 'desc' : 'asc'); }}>CPL</th>
                        <th className="p-4 cursor-pointer hover:text-zinc-200" onClick={() => { setSortFieldCaptacao('ctr'); setSortDirCaptacao(prev => prev === 'asc' ? 'desc' : 'asc'); }}>CTR</th>
                        <th className="p-4 cursor-pointer hover:text-zinc-200" onClick={() => { setSortFieldCaptacao('conversion'); setSortDirCaptacao(prev => prev === 'asc' ? 'desc' : 'asc'); }}>Conversão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                      {sortedCaptacao.map((c, i) => (
                        <tr key={i} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="p-4 max-w-[300px] truncate">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium text-zinc-200">{c.name}</span>
                              {c.link && (
                                <a href={c.link} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-yellow-500 flex-shrink-0">
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-zinc-300">{formatCurrency(c.spend)}</td>
                          <td className="p-4 font-medium text-zinc-200">{formatNumber(c.sales)}</td>
                          <td className="p-4 text-red-400 font-medium">{formatCurrency(c.cpa)}</td>
                          <td className="p-4 text-zinc-300">{c.ctr.toFixed(2)}%</td>
                          <td className="p-4 text-zinc-300">{c.conversion.toFixed(1)}%</td>
                        </tr>
                      ))}
                      {sortedCaptacao.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-zinc-500">Nenhum dado de captação no período.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, highlight = false }: { title: string, value: string | number, subtitle?: string, highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-5 border ${highlight ? 'bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/30' : 'bg-[#18181b] border-zinc-800/50'} shadow-sm`}>
      <h3 className={`text-sm font-medium ${highlight ? 'text-yellow-500/80' : 'text-zinc-400'}`}>{title}</h3>
      <div className={`text-2xl font-bold mt-2 ${highlight ? 'text-yellow-500' : 'text-zinc-100'}`}>{value}</div>
      {subtitle && <p className={`text-xs mt-1 font-medium ${highlight ? 'text-yellow-500/60' : 'text-zinc-500'}`}>{subtitle}</p>}
    </div>
  );
}

function FunnelStep({ label, value, subValue, highlight = false }: { label: string, value: string, subValue: string, highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className={`text-sm font-semibold ${highlight ? 'text-yellow-500' : 'text-zinc-200'}`}>{label}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{subValue}</div>
      </div>
      <div className={`text-lg font-bold ${highlight ? 'text-yellow-500' : 'text-zinc-300'}`}>{value}</div>
    </div>
  );
}

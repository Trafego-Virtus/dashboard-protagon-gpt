import React, { useState, useMemo } from 'react';
import { PlayCircle, Target, TrendingUp, LayoutGrid, X, ExternalLink, ArrowUpDown, Filter, DollarSign, Search, Copy, Check } from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import { RawDashboardData } from '../utils/dataFetching';
import { CreativeDataRow } from '../types';
import { processDashboardMetrics } from '../utils/metricsCalculator';
import { startOfToday, subDays, eachDayOfInterval, format } from 'date-fns';
import { parseDate, parseNumber, formatCurrency } from '../utils/format';

interface AnaliseKPIsProps {
  rawData: RawDashboardData;
  metrics?: any;
  dashboardId?: any;
}

export function AnaliseKPIs({ rawData }: AnaliseKPIsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'geral' | 'hooks'>('geral');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyName = (nome: string) => {
    navigator.clipboard.writeText(nome);
    setCopiedId(nome);
    setTimeout(() => setCopiedId(null), 2000);
  };
  const [selectedFunil, setSelectedFunil] = useState<string>('all');
  const [kpiPeriod, setKpiPeriod] = useState<'24h'|'7d'|'14d'|'30d'|'max'>('7d');
  const [statusFilter, setStatusFilter] = useState<'all'|'ativo'|'inativo'>('all');
  const [hsrFilter, setHsrFilter] = useState<string>('all');
  const [ctrFilter, setCtrFilter] = useState<string>('all');
  const [cpmFilter, setCpmFilter] = useState<string>('all');
  
  const [selectedCreativeForChart, setSelectedCreativeForChart] = useState<(CreativeDataRow & { funilLabel: string }) | null>(null);
  const [chartPeriod, setChartPeriod] = useState<'7d'|'14d'|'30d'|'max'>('7d');

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'investimento', direction: 'desc' });
  const [selectedHookCampaigns, setSelectedHookCampaigns] = useState<string[]>([]);
  const [isCampaignDropdownOpen, setIsCampaignDropdownOpen] = useState(false);

  const scaleMetrics = useMemo(() => {
    if (!rawData) return {} as any;
    let startDate = '';
    const endDate = format(startOfToday(), 'yyyy-MM-dd');

    if (kpiPeriod === 'max') {
      startDate = '2000-01-01';
    } else {
      let days = 7;
      if (kpiPeriod === '24h') days = 1;
      if (kpiPeriod === '14d') days = 14;
      if (kpiPeriod === '30d') days = 30;
      startDate = format(subDays(startOfToday(), days), 'yyyy-MM-dd');
    }
    
    return processDashboardMetrics(rawData, startDate, endDate, 'all');
  }, [rawData, kpiPeriod]);

  const modalChartData = useMemo(() => {
    if (!selectedCreativeForChart || !rawData) return [];
    
    const end = startOfToday();
    let start = new Date(2020, 0, 1);
    
    if (chartPeriod !== 'max') {
      let days = 7;
      if (chartPeriod === '14d') days = 14;
      if (chartPeriod === '30d') days = 30;
      start = subDays(end, days - 1);
    }
    
    const creativeNameLower = selectedCreativeForChart.nome.toLowerCase();
    
    let dataSubset: any[] = [];
    if (selectedCreativeForChart.funilLabel === 'Form Nativo' || selectedCreativeForChart.funilLabel === 'Página de Captura' || selectedCreativeForChart.funilLabel === 'Inlead') {
      dataSubset = rawData.gd || [];
    } else if (selectedCreativeForChart.funilLabel === 'Venda Direta') {
      dataSubset = rawData.vd || [];
    } else if (selectedCreativeForChart.funilLabel === 'Meteórico') {
      dataSubset = rawData.met || [];
    } else if (selectedCreativeForChart.funilLabel === 'Distribuição de Conteúdo') {
      dataSubset = rawData.dc || [];
    }

    const byDate = new Map<string, { view3s: number, view25: number, impressoes: number, cliques: number, investimento: number }>();
    let minDateStr = format(end, 'yyyy-MM-dd');

    dataSubset.forEach(r => {
      const nome = (r['NOME DO ANÚNCIO'] || r['Nome do Anúncio'] || '').trim().toLowerCase();
      if (nome === creativeNameLower) {
        const pd = parseDate(r['Data'] || r['data_hora'] || r['Reporting Starts'] || '');
        if (pd) {
          const pdStr = format(pd, 'yyyy-MM-dd');
          const startStr = format(start, 'yyyy-MM-dd');
          const endStr = format(end, 'yyyy-MM-dd');
          if (pdStr >= startStr && pdStr <= endStr) {
            if (pdStr < minDateStr) minDateStr = pdStr;
            const dateStr = pdStr;
            if (!byDate.has(dateStr)) byDate.set(dateStr, { view3s: 0, view25: 0, impressoes: 0, cliques: 0, investimento: 0 });
            const curr = byDate.get(dateStr)!;
            
            curr.view3s += parseNumber(r['View 3s'] || r['Reproduções de vídeo de 3 segundos'] || r['Reproduções contínuas de vídeo de 2 segundos'] || '0');
            curr.view25 += parseNumber(r['View 25%'] || r['View 2%'] || r['Reproduções a 25%'] || r['Reproduções do vídeo a 25%'] || r['Reproduções de vídeo a 25%'] || '0');
            curr.impressoes += parseNumber(r['Impressões'] || '0');
            curr.cliques += parseNumber(r['Cliques'] || r['Cliques no link'] || r['Cliques (todos)'] || '0');
            curr.investimento += parseNumber(r['Valor Gasto'] || r['Valor gasto'] || '0');
          }
        }
      }
    });
    
    let intervalStart = start;
    if (chartPeriod === 'max') {
      intervalStart = parseDate(minDateStr) || startOfToday();
    }
    
    const interval = eachDayOfInterval({ start: intervalStart, end });

    return interval.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const stats = byDate.get(dateStr) || { view3s: 0, view25: 0, impressoes: 0, cliques: 0, investimento: 0 };
      
      const hook = stats.view3s > 0 ? (stats.view25 / stats.view3s) * 100 : 0;
      const ctr = stats.impressoes > 0 ? (stats.cliques / stats.impressoes) * 100 : 0;
      const cpm = stats.impressoes > 0 ? (stats.investimento / (stats.impressoes / 1000)) : 0;
      
      return {
        date: format(date, 'dd/MM'),
        hook,
        ctr,
        cpm,
        investimento: stats.investimento
      };
    }).filter(d => activeSubTab === 'hooks' ? (d.ctr > 0 || d.investimento > 0) : (d.hook > 0 || d.ctr > 0));
  }, [selectedCreativeForChart, chartPeriod, rawData, activeSubTab]);

  const allCreatives = useMemo(() => {
    if (!scaleMetrics || Object.keys(scaleMetrics).length === 0) return [];
    const list: (CreativeDataRow & { funilLabel: string })[] = [];
    if (scaleMetrics.creativesForm) scaleMetrics.creativesForm.forEach((c: any) => list.push({ ...c, funilLabel: 'Form Nativo' }));
    if (scaleMetrics.creativesCaptura) scaleMetrics.creativesCaptura.forEach((c: any) => list.push({ ...c, funilLabel: 'Página de Captura' }));
    if (scaleMetrics.creativesInlead) scaleMetrics.creativesInlead.forEach((c: any) => list.push({ ...c, funilLabel: 'Inlead' }));
    if (scaleMetrics.creativesVD) scaleMetrics.creativesVD.forEach((c: any) => list.push({ ...c, funilLabel: 'Venda Direta' }));
    if (scaleMetrics.creativesMET) scaleMetrics.creativesMET.forEach((c: any) => list.push({ ...c, funilLabel: 'Meteórico' }));
    if (scaleMetrics.creativesDC) scaleMetrics.creativesDC.forEach((c: any) => list.push({ ...c, funilLabel: 'Distribuição de Conteúdo' }));
    return list;
  }, [scaleMetrics]);

  const getHookLevel = (rate: number, isImage: boolean = false) => {
    if (isImage) return { label: 'N/A', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    if (rate < 30) return { label: 'Ruim', color: 'bg-red-500/20 text-red-500 border-red-500/30' };
    if (rate <= 50) return { label: 'Médio', color: 'bg-orange-500/20 text-orange-500 border-orange-500/30' };
    if (rate <= 70) return { label: 'Bom', color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' };
    return { label: 'Excel.', color: 'bg-blue-500/20 text-blue-500 border-blue-500/30' };
  };

  const getCTRLevel = (rate: number) => {
    if (rate < 0.8) return { label: 'Ruim', color: 'bg-red-500/20 text-red-500 border-red-500/30' };
    if (rate <= 1.5) return { label: 'Médio', color: 'bg-orange-500/20 text-orange-500 border-orange-500/30' };
    if (rate <= 3.0) return { label: 'Bom', color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' };
    return { label: 'Excel.', color: 'bg-blue-500/20 text-blue-500 border-blue-500/30' };
  };

  const getHookTestCTRLevel = (rate: number) => {
    if (rate < 0.8) return { label: 'Ruim', color: 'bg-red-500/20 text-red-500 border-red-500/30' };
    if (rate <= 1.5) return { label: 'Médio', color: 'bg-orange-500/20 text-orange-500 border-orange-500/30' };
    if (rate <= 2.5) return { label: 'Bom', color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' };
    return { label: 'Excel.', color: 'bg-blue-500/20 text-blue-500 border-blue-500/30' };
  };

  const getHookTestCPMLevel = (cpm: number) => {
    if (cpm === 0) return { label: 'N/A', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    if (cpm > 40) return { label: 'Ruim', color: 'bg-red-500/20 text-red-500 border-red-500/30' };
    if (cpm >= 20) return { label: 'Médio', color: 'bg-orange-500/20 text-orange-500 border-orange-500/30' };
    if (cpm >= 10) return { label: 'Bom', color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' };
    return { label: 'Excel.', color: 'bg-blue-500/20 text-blue-500 border-blue-500/30' };
  };

  const uniqueCampaigns = useMemo(() => {
    const campaigns = new Set<string>();
    allCreatives.forEach(c => {
      if (selectedFunil === 'all' || c.funilLabel === selectedFunil) {
        if (c.campanhas) {
          c.campanhas.forEach(camp => campaigns.add(camp));
        }
      }
    });
    return Array.from(campaigns).sort();
  }, [allCreatives, selectedFunil]);

  const filteredCreatives = useMemo(() => {
    return allCreatives.filter(c => {
      if (searchQuery.trim() !== '') {
        if (!c.nome.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
      }
      if (selectedFunil !== 'all' && c.funilLabel !== selectedFunil) return false;
      if (statusFilter === 'ativo' && !c.ativo) return false;
      if (statusFilter === 'inativo' && c.ativo) return false;
      
      if (activeSubTab === 'hooks' && selectedHookCampaigns.length > 0) {
        if (!c.campanhas || !c.campanhas.some(camp => selectedHookCampaigns.includes(camp))) {
          return false;
        }
      }

      const isImage = c.view3s === 0;
      const hookRate = c.view3s > 0 ? (c.view25 / c.view3s) * 100 : 0;
      const ctr = c.impressoes > 0 ? (c.cliques / c.impressoes) * 100 : 0;
      const cpm = c.impressoes > 0 ? (c.investimento / (c.impressoes / 1000)) : 0;

      if (hsrFilter !== 'all') {
        const lvl = getHookLevel(hookRate, isImage).label;
        if (lvl !== hsrFilter) return false;
      }
      
      if (ctrFilter !== 'all') {
        const lvl = activeSubTab === 'hooks' ? getHookTestCTRLevel(ctr).label : getCTRLevel(ctr).label;
        if (lvl !== ctrFilter) return false;
      }

      if (cpmFilter !== 'all' && activeSubTab === 'hooks') {
        const lvl = getHookTestCPMLevel(cpm).label;
        if (lvl !== cpmFilter) return false;
      }

      return true;
    }).sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortConfig.key === 'hsr') {
        valA = a.view3s > 0 ? (a.view25 / a.view3s) * 100 : -1;
        valB = b.view3s > 0 ? (b.view25 / b.view3s) * 100 : -1;
      } else if (sortConfig.key === 'ctr') {
        valA = a.impressoes > 0 ? (a.cliques / a.impressoes) * 100 : -1;
        valB = b.impressoes > 0 ? (b.cliques / b.impressoes) * 100 : -1;
      } else if (sortConfig.key === 'cpm') {
        valA = a.impressoes > 0 ? (a.investimento / (a.impressoes / 1000)) : 999999;
        valB = b.impressoes > 0 ? (b.investimento / (b.impressoes / 1000)) : 999999;
      } else if (sortConfig.key === 'cpc') {
        valA = a.cliques > 0 ? (a.investimento / a.cliques) : 999999;
        valB = b.cliques > 0 ? (b.investimento / b.cliques) : 999999;
      } else if (sortConfig.key === 'investimento') {
        valA = a.investimento || 0;
        valB = b.investimento || 0;
      } else if (sortConfig.key === 'view3s') {
        valA = a.view3s || 0;
        valB = b.view3s || 0;
      } else if (sortConfig.key === 'view25') {
        valA = a.view25 || 0;
        valB = b.view25 || 0;
      } else if (sortConfig.key === 'impressoes') {
        valA = a.impressoes || 0;
        valB = b.impressoes || 0;
      } else if (sortConfig.key === 'cliques') {
        valA = a.cliques || 0;
        valB = b.cliques || 0;
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [allCreatives, selectedFunil, sortConfig, activeSubTab, selectedHookCampaigns, statusFilter, hsrFilter, ctrFilter, cpmFilter, searchQuery]);

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const toggleHookCampaign = (camp: string) => {
    setSelectedHookCampaigns(curr => 
      curr.includes(camp) ? curr.filter(c => c !== camp) : [...curr, camp]
    );
  };

  const SortableHeader = ({ label, sortKey, align = 'left' }: { label: string, sortKey: string, align?: 'left'|'right'|'center' }) => (
    <th className={`p-4 font-semibold text-${align} cursor-pointer hover:bg-white/5 transition-colors group`} onClick={() => handleSort(sortKey)}>
      <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortConfig.key === sortKey ? 'text-yellow-500' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
      </div>
    </th>
  );

  const generalChartData = useMemo(() => {
    if (!rawData || filteredCreatives.length === 0) return [];
    
    const end = startOfToday();
    let start = new Date(2020, 0, 1);
    
    if (kpiPeriod !== 'max') {
      let days = 7;
      if (kpiPeriod === '24h') days = 1;
      if (kpiPeriod === '14d') days = 14;
      if (kpiPeriod === '30d') days = 30;
      start = subDays(end, days - 1);
    }
    
    const allowedNames = new Set(filteredCreatives.map(c => c.nome.toLowerCase()));
    const byDate = new Map<string, { view3s: number, view25: number, impressoes: number, cliques: number, investimento: number }>();
    let minDateStr = format(end, 'yyyy-MM-dd');

    const datasets = [rawData.gd || [], rawData.vd || [], rawData.met || [], rawData.dc || []];
    
    datasets.forEach(subset => {
      subset.forEach((r: any) => {
        const nome = (r['NOME DO ANÚNCIO'] || r['Nome do Anúncio'] || '').trim().toLowerCase();
        if (allowedNames.has(nome)) {
          const pd = parseDate(r['Data'] || r['data_hora'] || r['Reporting Starts'] || '');
          if (pd) {
            const pdStr = format(pd, 'yyyy-MM-dd');
            const startStr = format(start, 'yyyy-MM-dd');
            const endStr = format(end, 'yyyy-MM-dd');
            if (pdStr >= startStr && pdStr <= endStr) {
              if (pdStr < minDateStr) minDateStr = pdStr;
              if (!byDate.has(pdStr)) byDate.set(pdStr, { view3s: 0, view25: 0, impressoes: 0, cliques: 0, investimento: 0 });
              const curr = byDate.get(pdStr)!;
              
              curr.view3s += parseNumber(r['View 3s'] || r['Reproduções de vídeo de 3 segundos'] || r['Reproduções contínuas de vídeo de 2 segundos'] || '0');
              curr.view25 += parseNumber(r['View 25%'] || r['View 2%'] || r['Reproduções a 25%'] || r['Reproduções do vídeo a 25%'] || r['Reproduções de vídeo a 25%'] || '0');
              curr.impressoes += parseNumber(r['Impressões'] || '0');
              curr.cliques += parseNumber(r['Cliques'] || r['Cliques no link'] || r['Cliques (todos)'] || '0');
              curr.investimento += parseNumber(r['Valor Gasto'] || r['Valor gasto'] || '0');
            }
          }
        }
      });
    });

    let intervalStart = start;
    if (kpiPeriod === 'max') {
      intervalStart = parseDate(minDateStr) || startOfToday();
    }
    
    const interval = eachDayOfInterval({ start: intervalStart, end });

    return interval.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const stats = byDate.get(dateStr) || { view3s: 0, view25: 0, impressoes: 0, cliques: 0, investimento: 0 };
      
      const hook = stats.view3s > 0 ? (stats.view25 / stats.view3s) * 100 : 0;
      const ctr = stats.impressoes > 0 ? (stats.cliques / stats.impressoes) * 100 : 0;
      const cpm = stats.impressoes > 0 ? (stats.investimento / (stats.impressoes / 1000)) : 0;
      
      return {
        name: format(date, 'dd/MM'),
        hook,
        ctr,
        cpm,
        _view3s: stats.view3s,
        _view25: stats.view25,
      };
    }).filter(d => activeSubTab === 'hooks' ? (d.ctr > 0 || d.cpm > 0) : (d.hook > 0 || d.ctr > 0));
  }, [rawData, filteredCreatives, kpiPeriod, activeSubTab]);


  const renderTableAndCharts = (isHooksTab: boolean) => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {isHooksTab && (
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 shadow-xl">
          <div className="relative">
            <button 
              onClick={() => setIsCampaignDropdownOpen(!isCampaignDropdownOpen)}
              className="w-full flex items-center justify-between bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-sm text-white hover:border-yellow-500/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-yellow-500" />
                {selectedHookCampaigns.length === 0 
                  ? 'Todas as Campanhas (Selecione para filtrar)' 
                  : `${selectedHookCampaigns.length} campanha(s) selecionada(s)`}
              </span>
              <ArrowUpDown className="w-4 h-4 text-zinc-500" />
            </button>
            
            {isCampaignDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-white/10 rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto">
                <div className="p-2 border-b border-white/5 sticky top-0 bg-zinc-800 flex justify-between items-center">
                  <span className="text-xs text-zinc-400">Filtrar Campanhas</span>
                  <button 
                    onClick={() => setSelectedHookCampaigns([])}
                    className="text-xs text-yellow-500 hover:text-yellow-400 font-medium"
                  >
                    Limpar
                  </button>
                </div>
                <div className="p-2 space-y-1">
                  {uniqueCampaigns.map(camp => (
                    <label key={camp} className="flex items-start gap-3 p-2 hover:bg-white/5 rounded cursor-pointer group">
                      <input 
                        type="checkbox"
                        checked={selectedHookCampaigns.includes(camp)}
                        onChange={() => toggleHookCampaign(camp)}
                        className="mt-0.5 rounded bg-zinc-900 border-white/10 text-yellow-500 focus:ring-yellow-500 focus:ring-offset-zinc-800 cursor-pointer"
                      />
                      <span className="text-sm text-zinc-300 group-hover:text-white line-clamp-2">{camp}</span>
                    </label>
                  ))}
                  {uniqueCampaigns.length === 0 && (
                    <div className="p-4 text-center text-sm text-zinc-500">
                      Nenhuma campanha encontrada neste funil/praça.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 shadow-xl">
           <div className="mb-4">
             <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
               {isHooksTab ? <Target className="w-4 h-4 text-blue-500" /> : <PlayCircle className="w-4 h-4 text-yellow-500" />}
               {isHooksTab ? 'CTR — Teste de Gancho (F1)' : 'HSR — Hook Successful Rate Médio'}
             </h3>
             <p className="text-xs text-zinc-500 mt-1">Evolução do {isHooksTab ? 'CTR' : 'HSR'} no período selecionado</p>
           </div>
           
           <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={generalChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} tickMargin={10} />
                  <YAxis stroke="#a1a1aa" fontSize={10} tickFormatter={(val) => `${val}%`} domain={[0, isHooksTab ? 'auto' : 100]} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }}
                    formatter={(val: number) => [`${Number(val).toFixed(2)}%`, isHooksTab ? 'CTR' : 'Hook Rate']}
                    labelFormatter={(label) => label}
                  />
                  {isHooksTab ? (
                    <>
                      <ReferenceArea y1={0} y2={0.8} fill="rgba(239, 68, 68, 0.4)" />
                      <ReferenceArea y1={0.8} y2={1.5} fill="rgba(249, 115, 22, 0.4)" />
                      <ReferenceArea y1={1.5} y2={2.5} fill="rgba(16, 185, 129, 0.4)" />
                      <ReferenceArea y1={2.5} y2={10} fill="rgba(59, 130, 246, 0.4)" />
                      <Line type="monotone" dataKey="ctr" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#18181b', strokeWidth: 2 }} name="CTR" />
                    </>
                  ) : (
                    <>
                      <ReferenceArea y1={0} y2={30} fill="rgba(239, 68, 68, 0.4)" />
                      <ReferenceArea y1={30} y2={50} fill="rgba(249, 115, 22, 0.4)" />
                      <ReferenceArea y1={50} y2={70} fill="rgba(16, 185, 129, 0.4)" />
                      <ReferenceArea y1={70} y2={100} fill="rgba(59, 130, 246, 0.4)" />
                      <Line type="monotone" dataKey="hook" stroke="#eab308" strokeWidth={3} dot={{ r: 4, fill: '#18181b', strokeWidth: 2 }} name="Hook Rate" />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 shadow-xl">
           <div className="mb-4">
             <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
               {isHooksTab ? <DollarSign className="w-4 h-4 text-emerald-500" /> : <Target className="w-4 h-4 text-blue-500" />}
               {isHooksTab ? 'CPM — Custo por Mil Impressões' : 'CTR — Click Through Rate Médio'}
             </h3>
             <p className="text-xs text-zinc-500 mt-1">Evolução do {isHooksTab ? 'CPM' : 'CTR'} no período selecionado</p>
           </div>
           
           <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={generalChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} tickMargin={10} />
                  <YAxis 
                    stroke="#a1a1aa" 
                    fontSize={10} 
                    tickFormatter={(val) => isHooksTab ? `R$${val}` : `${val}%`} 
                    domain={[0, 'auto']} 
                  />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }}
                    formatter={(val: number) => [isHooksTab ? formatCurrency(val) : `${Number(val).toFixed(2)}%`, isHooksTab ? 'CPM' : 'CTR']}
                    labelFormatter={(label) => label}
                  />
                  {isHooksTab ? (
                    <>
                      <ReferenceArea y1={0} y2={10} fill="rgba(59, 130, 246, 0.7)" />
                      <ReferenceArea y1={10} y2={20} fill="rgba(16, 185, 129, 0.7)" />
                      <ReferenceArea y1={20} y2={40} fill="rgba(249, 115, 22, 0.7)" />
                      <ReferenceArea y1={40} y2={200} fill="rgba(239, 68, 68, 0.7)" />
                      <Line type="monotone" dataKey="cpm" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#18181b', strokeWidth: 2 }} name="CPM" />
                    </>
                  ) : (
                    <>
                      <ReferenceArea y1={0} y2={0.8} fill="rgba(239, 68, 68, 0.4)" />
                      <ReferenceArea y1={0.8} y2={1.5} fill="rgba(249, 115, 22, 0.4)" />
                      <ReferenceArea y1={1.5} y2={3.0} fill="rgba(16, 185, 129, 0.4)" />
                      <ReferenceArea y1={3.0} y2={10} fill="rgba(59, 130, 246, 0.4)" />
                      <Line type="monotone" dataKey="ctr" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#18181b', strokeWidth: 2 }} name="CTR" />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" />
            Desempenho dos Criativos {isHooksTab ? '(Testes de Gancho)' : '(Todos)'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-zinc-500 bg-black/40">
                <th className="p-4 font-semibold w-16">Miniatura</th>
                <th className="p-4 font-semibold">Criativo / Praça / Status</th>
                <SortableHeader label="Investimento" sortKey="investimento" align="right" />
                {!isHooksTab && (
                  <>
                    <SortableHeader label="View 3s" sortKey="view3s" align="right" />
                    <SortableHeader label="View 25%" sortKey="view25" align="right" />
                    <SortableHeader label="HSR" sortKey="hsr" align="center" />
                  </>
                )}
                <SortableHeader label="Impressões" sortKey="impressoes" align="right" />
                <SortableHeader label="Cliques" sortKey="cliques" align="right" />
                <SortableHeader label="CTR" sortKey="ctr" align="center" />
                {isHooksTab && (
                  <SortableHeader label="CPM" sortKey="cpm" align="center" />
                )}
                <SortableHeader label="CPC" sortKey="cpc" align="center" />
                <th className="p-4 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {filteredCreatives.slice(0, 100).map((row, i) => {
                const isImage = row.view3s === 0; // && row.impressoes > 0
                const hookRate = row.view3s > 0 ? (row.view25 / row.view3s) * 100 : 0;
                const hookLvl = getHookLevel(hookRate, isImage);
                const ctr = row.impressoes > 0 ? (row.cliques / row.impressoes) * 100 : 0;
                const cpm = row.impressoes > 0 ? (row.investimento / (row.impressoes / 1000)) : 0;
                const cpc = row.cliques > 0 ? (row.investimento / row.cliques) : 0;
                
                const ctrLvl = isHooksTab ? getHookTestCTRLevel(ctr) : getCTRLevel(ctr);
                const cpmLvl = getHookTestCPMLevel(cpm);

                return (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="w-10 h-10 rounded-md bg-zinc-800 overflow-hidden shrink-0 border border-white/10 relative">
                        {row.thumbnail ? (
                          <img src={row.thumbnail} alt="thumb" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-600 text-center leading-tight px-1">Sem Capa</div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col max-w-[280px]">
                        <div className="flex items-start gap-2">
                          <span className="font-bold text-white break-words" title={row.nome}>{row.nome}</span>
                          <button
                            onClick={() => handleCopyName(row.nome)}
                            className={`p-1 shrink-0 rounded-lg transition-colors border ${copiedId === row.nome ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 border-white/5'}`}
                            title="Copiar Nome"
                          >
                            {copiedId === row.nome ? <Check className="w-3 h-3 animate-in zoom-in" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 text-[9px] rounded uppercase font-semibold">
                            {row.funilLabel}
                          </span>
                          {row.pracas?.map((p, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] rounded uppercase font-semibold">
                              {p}
                            </span>
                          ))}
                          {row.ativo ? (
                            <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] rounded uppercase font-semibold">Ativo</span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] rounded uppercase font-semibold">Inativo</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right text-zinc-300 font-medium">
                      {formatCurrency(row.investimento)}
                    </td>
                    {!isHooksTab && (
                      <>
                        <td className="p-4 text-right text-zinc-300">{isImage ? '-' : row.view3s.toLocaleString('pt-BR')}</td>
                        <td className="p-4 text-right text-zinc-300">{isImage ? '-' : row.view25.toLocaleString('pt-BR')}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-bold border ${hookLvl.color}`} title={isImage ? 'Não Aplicável para Imagens' : ''}>
                            {isImage ? 'N/A' : `${hookRate.toFixed(2)}%`}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="p-4 text-right text-zinc-300">{row.impressoes.toLocaleString('pt-BR')}</td>
                    <td className="p-4 text-right text-zinc-300">{row.cliques.toLocaleString('pt-BR')}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-bold border ${ctrLvl.color}`}>
                        {ctr.toFixed(2)}%
                      </span>
                    </td>
                    {isHooksTab && (
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-bold border ${cpmLvl.color}`}>
                          {cpm > 0 ? formatCurrency(cpm) : 'N/A'}
                        </span>
                      </td>
                    )}
                    <td className="p-4 text-center">
                      <span className="text-zinc-300 font-bold">
                        {cpc > 0 ? formatCurrency(cpc) : 'N/A'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedCreativeForChart(row)}
                          className="p-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-lg transition-colors border border-yellow-500/20"
                          title="Ver Gráficos"
                        >
                          <TrendingUp className="w-4 h-4" />
                        </button>
                        {row.link && (
                          <a 
                            href={row.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg transition-colors border border-blue-500/20"
                            title="Acessar Criativo"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-end bg-zinc-900/50 p-4 rounded-xl border border-white/5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Período de Análise</label>
          <div className="flex bg-zinc-800 rounded-lg p-1 border border-white/10">
            {(['24h', '7d', '14d', '30d', 'max'] as const).map(p => (
              <button
                key={p}
                onClick={() => setKpiPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${kpiPeriod === p ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'}`}
              >
                {p === '24h' ? 'Últimas 24h' : p === '7d' ? 'Últimos 7d' : p === '14d' ? 'Últimos 14d' : p === '30d' ? 'Últimos 30d' : 'Máx'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Funil</label>
          <select 
            value={selectedFunil} 
            onChange={(e) => setSelectedFunil(e.target.value)}
            className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/50 h-[36px]"
          >
            <option value="all">Visão Global</option>
            <option value="Form Nativo">Geração de Demanda - Form Nativo</option>
            <option value="Página de Captura">Geração de Demanda - Página de Captura</option>
            <option value="Inlead">Geração de Demanda - Inlead</option>
            <option value="Venda Direta">Venda Direta</option>
            <option value="Meteórico">Meteórico</option>
            <option value="Distribuição de Conteúdo">Distribuição de Conteúdo</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</label>
          <div className="flex bg-zinc-800 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${statusFilter === 'all' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('ativo')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${statusFilter === 'ativo' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm border border-emerald-500/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'}`}
            >
              Ativos
            </button>
            <button
              onClick={() => setStatusFilter('inativo')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${statusFilter === 'inativo' ? 'bg-red-500/20 text-red-400 shadow-sm border border-red-500/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'}`}
            >
              Inativos
            </button>
          </div>
        </div>

        {activeSubTab !== 'hooks' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">HSR</label>
            <select
              value={hsrFilter}
              onChange={(e) => setHsrFilter(e.target.value)}
              className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/50 h-[36px]"
            >
              <option value="all">Todos</option>
              <option value="Excel.">Excelente</option>
              <option value="Bom">Bom</option>
              <option value="Médio">Médio</option>
              <option value="Ruim">Ruim</option>
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">CTR</label>
          <select
            value={ctrFilter}
            onChange={(e) => setCtrFilter(e.target.value)}
            className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/50 h-[36px]"
          >
            <option value="all">Todos</option>
            <option value="Excel.">Excelente</option>
            <option value="Bom">Bom</option>
            <option value="Médio">Médio</option>
            <option value="Ruim">Ruim</option>
          </select>
        </div>
        {activeSubTab === 'hooks' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">CPM</label>
            <select
              value={cpmFilter}
              onChange={(e) => setCpmFilter(e.target.value)}
              className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/50 h-[36px]"
            >
              <option value="all">Todos</option>
              <option value="Excel.">Excelente</option>
              <option value="Bom">Bom</option>
              <option value="Médio">Médio</option>
              <option value="Ruim">Ruim</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveSubTab('geral')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSubTab === 'geral' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
          >
            Análise Geral das Campanhas
          </button>
          <button
            onClick={() => setActiveSubTab('hooks')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSubTab === 'hooks' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
          >
            Análise dos Testes de Hook
          </button>
        </div>
        <div className="relative max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-zinc-500" />
          </div>
          <input
            type="text"
            placeholder="Pesquisar por criativo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-lg bg-zinc-900 text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50 sm:text-sm transition-colors"
          />
        </div>
      </div>

      {activeSubTab === 'geral' && renderTableAndCharts(false)}
      
      {activeSubTab === 'hooks' && renderTableAndCharts(true)}
      
      {selectedCreativeForChart && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-4xl shadow-2xl relative my-auto flex flex-col">
            <button 
              onClick={() => setSelectedCreativeForChart(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full transition-colors z-10"
            >
              <X size={20} />
            </button>
            
            <div className="flex flex-col md:flex-row gap-6 mb-6 pb-6 border-b border-white/10 shrink-0">
               <div className="w-full md:w-32 h-48 md:h-32 rounded-xl overflow-hidden bg-zinc-800 shrink-0 border border-white/5 shadow-inner">
                 {selectedCreativeForChart.thumbnail ? (
                    <img src={selectedCreativeForChart.thumbnail} alt={selectedCreativeForChart.nome} className="w-full h-full object-cover" />
                 ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                      <PlayCircle size={32} opacity={0.5} />
                      <span className="text-xs font-medium uppercase tracking-wider">Sem Capa</span>
                    </div>
                 )}
               </div>
               <div className="flex-1 min-w-0 flex flex-col">
                 <div className="flex flex-col gap-2 mb-4">
                   <div className="flex flex-wrap gap-2">
                     <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-[10px] font-bold rounded uppercase tracking-wider border border-yellow-500/20">
                       {selectedCreativeForChart.funilLabel}
                     </span>
                     {selectedCreativeForChart.pracas?.map((p, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] rounded uppercase font-semibold">
                          {p}
                        </span>
                     ))}
                     {selectedCreativeForChart.ativo ? (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] rounded uppercase font-semibold">Ativo</span>
                     ) : (
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] rounded uppercase font-semibold">Inativo</span>
                     )}
                   </div>
                   <h3 className="text-lg font-bold text-white leading-tight break-words">{selectedCreativeForChart.nome}</h3>
                 </div>
                 
                 <div className="flex gap-4 mt-auto">
                    {activeSubTab !== 'hooks' ? (
                      <>
                        <div className="bg-black/30 p-3 rounded-lg border border-white/5 flex-1 text-center">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Hook Rate Médio</p>
                          <p className={`text-xl font-black ${getHookLevel(selectedCreativeForChart.view3s > 0 ? (selectedCreativeForChart.view25 / selectedCreativeForChart.view3s) * 100 : 0, selectedCreativeForChart.view3s === 0).color.split(' ')[1]}`}>
                            {selectedCreativeForChart.view3s === 0 ? 'N/A' : `${((selectedCreativeForChart.view25 / selectedCreativeForChart.view3s) * 100).toFixed(1)}%`}
                          </p>
                        </div>
                        <div className="bg-black/30 p-3 rounded-lg border border-white/5 flex-1 text-center">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">CTR Médio</p>
                          <p className={`text-xl font-black ${getCTRLevel(selectedCreativeForChart.impressoes > 0 ? (selectedCreativeForChart.cliques / selectedCreativeForChart.impressoes) * 100 : 0).color.split(' ')[1]}`}>
                            {(selectedCreativeForChart.impressoes > 0 ? (selectedCreativeForChart.cliques / selectedCreativeForChart.impressoes) * 100 : 0).toFixed(2)}%
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-black/30 p-3 rounded-lg border border-white/5 flex-1 text-center">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">CTR Teste de Gancho</p>
                          <p className={`text-xl font-black ${getHookTestCTRLevel(selectedCreativeForChart.impressoes > 0 ? (selectedCreativeForChart.cliques / selectedCreativeForChart.impressoes) * 100 : 0).color.split(' ')[1]}`}>
                            {(selectedCreativeForChart.impressoes > 0 ? (selectedCreativeForChart.cliques / selectedCreativeForChart.impressoes) * 100 : 0).toFixed(2)}%
                          </p>
                        </div>
                        <div className="bg-black/30 p-3 rounded-lg border border-white/5 flex-1 text-center">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">CPM Médio</p>
                          <p className={`text-xl font-black ${getHookTestCPMLevel(selectedCreativeForChart.impressoes > 0 ? (selectedCreativeForChart.investimento / (selectedCreativeForChart.impressoes / 1000)) : 0).color.split(' ')[1]}`}>
                            {selectedCreativeForChart.impressoes > 0 ? formatCurrency(selectedCreativeForChart.investimento / (selectedCreativeForChart.impressoes / 1000)) : 'N/A'}
                          </p>
                        </div>
                      </>
                    )}
                 </div>
               </div>
            </div>
            
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">Evolução do Criativo</h4>
              <div className="flex bg-zinc-800 rounded-lg p-1 border border-white/10">
                {(['7d', '14d', '30d', 'max'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setChartPeriod(p)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${chartPeriod === p ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-300'}`}
                  >
                    {p === '7d' ? '7 dias' : p === '14d' ? '14 dias' : p === '30d' ? '30 dias' : 'Máx'}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full h-64 md:h-[300px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={modalChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="#a1a1aa" fontSize={10} tickMargin={10} />
                  
                  {activeSubTab !== 'hooks' ? (
                    <>
                      <YAxis yAxisId="left" stroke="#eab308" fontSize={10} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                      <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={10} tickFormatter={(val) => `${val}%`} />
                      <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }}
                        labelFormatter={(label) => label}
                      />
                      <Line yAxisId="left" type="monotone" dataKey="hook" stroke="#eab308" strokeWidth={3} dot={{ r: 4, fill: '#18181b', strokeWidth: 2 }} name="Hook Rate" />
                      <Line yAxisId="right" type="monotone" dataKey="ctr" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#18181b', strokeWidth: 2 }} name="CTR" />
                    </>
                  ) : (
                    <>
                      <YAxis yAxisId="left" stroke="#3b82f6" fontSize={10} tickFormatter={(val) => `${val}%`} />
                      <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={10} tickFormatter={(val) => `R$${val}`} />
                      <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }}
                        labelFormatter={(label) => label}
                      />
                      <Line yAxisId="left" type="monotone" dataKey="ctr" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#18181b', strokeWidth: 2 }} name="CTR" />
                      <Line yAxisId="right" type="monotone" dataKey="cpm" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#18181b', strokeWidth: 2 }} name="CPM" />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/10 shrink-0">
               {selectedCreativeForChart.link ? (
                  <a 
                    href={selectedCreativeForChart.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 border border-yellow-500/20"
                  >
                    Abrir no Instagram <ExternalLink className="w-4 h-4" />
                  </a>
               ) : (
                  <button 
                    disabled
                    className="w-full py-3 bg-zinc-800 text-zinc-500 text-sm font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-2 border border-white/5"
                  >
                    Sem Link Disponível
                  </button>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

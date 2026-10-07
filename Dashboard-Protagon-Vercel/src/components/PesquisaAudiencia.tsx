import React, { useMemo, useState } from 'react';
import { PesquisaRow, CreativeDataRow } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, X, Eye, EyeOff, Loader2, ExternalLink, Copy, Check, Trophy, Video, ChevronRight } from 'lucide-react';
import { MultiSelect } from './MultiSelect';

interface PesquisaAudienciaProps {
  data: PesquisaRow[];
  creatives?: CreativeDataRow[];
  isLoading?: boolean;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#14b8a6', '#6366f1', '#d946ef', '#f43f5e', '#0ea5e9', '#64748b'];

const isAbove5k = (str: string) => {
  const s = str.toLowerCase();
  const matches = s.match(/[\d.]+/g);
  if (matches) {
     const nums = matches.map(m => parseInt(m.replace(/\./g, ''), 10)).filter(n => !isNaN(n) && n >= 100);
     if (nums.length >= 2) {
        return nums[0] >= 5000;
     } else if (nums.length === 1) {
        return nums[0] >= 5000 && (s.includes('acima') || s.includes('mais') || s.includes('>') || nums[0] > 5000);
     }
  }
  return false;
};

const isAbove10k = (str: string) => {
  const s = str.toLowerCase();
  const matches = s.match(/[\d.]+/g);
  if (matches) {
     const nums = matches.map(m => parseInt(m.replace(/\./g, ''), 10)).filter(n => !isNaN(n) && n >= 100);
     if (nums.length >= 2) {
        return nums[0] >= 10000;
     } else if (nums.length === 1) {
        return nums[0] >= 10000 && (s.includes('acima') || s.includes('mais') || s.includes('>') || nums[0] > 10000);
     }
  }
  return false;
};

const capitalizeWord = (s: string) => {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

const normalizeCategory = (str: string | undefined | null) => {
  if (typeof str !== 'string') return str;
  if (!str || str.trim() === '') return str;
  
  let cleaned = str.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  
  const smallWords = new Set(['e', 'de', 'do', 'da', 'dos', 'das', 'com', 'sem', 'a', 'o', 'as', 'os', 'em', 'no', 'na', 'nos', 'nas', 'ou', 'para', 'por']);
  
  cleaned = cleaned.split(' ').map((word, i) => {
    if (i > 0 && smallWords.has(word.toLowerCase())) {
      return word.toLowerCase();
    }
    return capitalizeWord(word);
  }).join(' ');

  // Fix R$ formatting
  cleaned = cleaned.replace(/r\$/gi, 'R$$').replace(/R\$\s*/g, 'R$$ ');
  
  return cleaned;
};

export function PesquisaAudiencia({ data, creatives, isLoading }: PesquisaAudienciaProps) {
  const normalizedData = useMemo(() => {
    return data.map(row => ({
      ...row,
      renda: normalizeCategory(row.renda as string),
      escolaridade: normalizeCategory(row.escolaridade as string),
      atuacao: normalizeCategory(row.atuacao as string),
      estado_civil: normalizeCategory(row.estado_civil as string)
    }));
  }, [data]);

  const [selectedRenda, setSelectedRenda] = useState<string | null>(null);
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const handleCopy = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(name);
    setCopiedName(name);
    setTimeout(() => setCopiedName(null), 2000);
  };

  const creativesMap = useMemo(() => {
    const map = new Map<string, CreativeDataRow>();
    if (creatives) {
      creatives.forEach(c => {
        if (!c.nome) return;
        const key = c.nome.toLowerCase().trim();
        if (!map.has(key)) {
          map.set(key, c);
        }
      });
    }
    return map;
  }, [creatives]);

  const [filters, setFilters] = useState<Record<string, string[]>>({
    renda: [],
    escolaridade: [],
    atuacao: [],
    estado_civil: []
  });

  const [hiddenItems, setHiddenItems] = useState<Record<string, string[]>>({});

  const toggleHiddenItem = (chartKey: string, itemName: string) => {
    setHiddenItems(prev => {
      const current = prev[chartKey] || [];
      const updated = current.includes(itemName) 
        ? current.filter(v => v !== itemName)
        : [...current, itemName];
      return { ...prev, [chartKey]: updated };
    });
  };

  const toggleFilter = (key: string, value: string) => {
    setFilters(prev => {
      const current = prev[key] || [];
      const updated = current.includes(value) 
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  const clearFilters = () => {
    setFilters({
      renda: [],
      escolaridade: [],
      atuacao: [],
      estado_civil: []
    });
  };

  const filteredData = useMemo(() => {
    return normalizedData.filter(row => {
      return Object.entries(filters).every(([key, values]: [string, string[]]) => {
        if (values.length === 0) return true;
        const rowVal = (row as any)[key];
        if (!rowVal || String(rowVal).trim() === '' || String(rowVal).trim() === '(Vazio)') return false;
        return values.includes(rowVal);
      });
    });
  }, [data, filters]);

  const getOptions = (key: keyof PesquisaRow) => {
    const counts: Record<string, number> = {};
    normalizedData.forEach(row => {
      const val = row[key];
      if (!val || String(val).trim() === '' || String(val).trim() === '(Vazio)') return;
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  };

  const filterOptions = {
    renda: getOptions('renda'),
    escolaridade: getOptions('escolaridade'),
    atuacao: getOptions('atuacao'),
    estado_civil: getOptions('estado_civil')
  };

  const getChartData = (key: keyof PesquisaRow) => {
    const counts: Record<string, number> = {};
    filteredData.forEach(row => {
      const val = row[key];
      if (!val || String(val).trim() === '' || String(val).trim() === '(Vazio)') return;
      counts[val] = (counts[val] || 0) + 1;
    });
    
    // Sort and limit to top 15 to avoid clutter
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, value]) => ({ name, value }));
  };

  const charts = [
    { key: 'renda', title: 'Renda' },
    { key: 'escolaridade', title: 'Escolaridade' },
    { key: 'atuacao', title: 'Atuação' },
    { key: 'estado_civil', title: 'Estado Civil' }
  ] as const;

  const topCreativesForSelectedRenda = useMemo(() => {
    if (!selectedRenda) return [];

    const leadsInFaixa = filteredData.filter(row => row.renda === selectedRenda);
    const totalInFaixa = leadsInFaixa.length;
    if (totalInFaixa === 0) return [];

    const counts: Record<string, { count: number; sample: PesquisaRow }> = {};

    leadsInFaixa.forEach(lead => {
      let content = (lead.utm_content || lead['Utm Content'] || '').trim();
      const rawJson = (lead as any).json;
      if (!content && rawJson) {
        try {
          const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
          content = (parsed.ad_name || parsed.ad_id || '').trim();
        } catch (_) {}
      }
      if (!content) {
        content = 'Sem UTM / Tráfego Direto';
      }

      if (!counts[content]) {
        counts[content] = { count: 0, sample: lead };
      }
      counts[content].count++;
    });

    const entries = Object.entries(counts);
    const validEntries = entries.filter(([name]) => name !== 'Sem UTM / Tráfego Direto' || entries.length === 1);

    const sorted = validEntries
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    return sorted.map(([name, { count, sample }], index) => {
      const lowerName = name.toLowerCase().trim();
      const creative = creativesMap.get(lowerName);

      const shareOfFaixa = (count / totalInFaixa) * 100;
      const totalCreativeLeads = creative?.leads || count;
      const concentrationInCreative = totalCreativeLeads > 0 ? (count / totalCreativeLeads) * 100 : 0;

      let link = creative?.link || '';
      if (!link) {
        if (sample.pageurl && sample.pageurl.startsWith('http')) {
          link = sample.pageurl;
        } else if (name && name !== 'Sem UTM / Tráfego Direto') {
          link = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=BR&q=${encodeURIComponent(name)}`;
        }
      }

      return {
        rank: index + 1,
        nome: creative?.nome || name,
        thumbnail: creative?.thumbnail || '',
        link,
        count,
        totalInFaixa,
        shareOfFaixa,
        concentrationInCreative,
        totalCreativeLeads,
        atribuicao: creative?.atribuicao || sample['Atribuição'] || sample.Subfunil || ''
      };
    });
  }, [selectedRenda, filteredData, creativesMap]);

  const hasActiveFilters = Object.values(filters).some((arr: string[]) => arr.length > 0);

  if (isLoading && normalizedData.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[400px] py-20 text-zinc-500">
        <Loader2 className="animate-spin mb-4 text-yellow-500" size={32} />
        <p className="text-sm">Carregando dados da pesquisa...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Filters Section */}
      <div className="bg-zinc-900/50 p-6 rounded-xl border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-yellow-500">
            <Filter size={20} />
            <h2 className="font-bold tracking-tight uppercase">Filtros</h2>
          </div>
          {hasActiveFilters && (
            <button 
              onClick={clearFilters}
              className="text-xs font-semibold text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
            >
              <X size={14} />
              Limpar Todos
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(filterOptions).map(([key, options]) => (
            <MultiSelect
              key={key}
              label={key.replace('_', ' ')}
              options={options}
              selectedValues={filters[key]}
              onChange={(val) => toggleFilter(key, val)}
              onClear={() => setFilters(prev => ({ ...prev, [key]: [] }))}
            />
          ))}
        </div>
      </div>

      <div className="text-sm text-zinc-400">
        Mostrando <strong className="text-white">{filteredData.length}</strong> de <strong className="text-white">{normalizedData.length}</strong> respostas.
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6">
        {charts.map(chart => {
          const allChartData = getChartData(chart.key);
          if (allChartData.length === 0) return null;
          
          const currentHidden = hiddenItems[chart.key] || [];
          const visibleChartData = allChartData.filter(item => !currentHidden.includes(item.name));
          
          const isRenda = chart.key === 'renda';
          const totalRenda = isRenda ? allChartData.reduce((acc, curr) => acc + curr.value, 0) : 0;
          const above5k = isRenda ? allChartData.filter(d => isAbove5k(d.name)).reduce((acc, curr) => acc + curr.value, 0) : 0;
          const above5kPercentage = totalRenda > 0 ? ((above5k / totalRenda) * 100).toFixed(1) : '0.0';
          const above10k = isRenda ? allChartData.filter(d => isAbove10k(d.name)).reduce((acc, curr) => acc + curr.value, 0) : 0;
          const above10kPercentage = totalRenda > 0 ? ((above10k / totalRenda) * 100).toFixed(1) : '0.0';

          return (
            <div key={chart.key} className="bg-zinc-900/50 p-6 rounded-xl border border-white/10 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-sm font-bold tracking-tight uppercase text-zinc-300">{chart.title}</h3>
                  {isRenda && (
                    <span className="hidden sm:inline-flex text-[11px] text-yellow-400/90 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-0.5 rounded-full font-medium items-center gap-1.5">
                      <Trophy size={12} className="text-yellow-500" /> Clique em uma faixa para ver o Top 5 Criativos
                    </span>
                  )}
                </div>
                {isRenda && (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg shrink-0">
                      <span className="text-blue-500 font-bold text-lg">{above10kPercentage}%</span>
                      <span className="text-xs text-blue-500/80 uppercase font-semibold leading-tight max-w-[140px]">
                        Leads com renda &gt; R$ 10.000
                      </span>
                    </div>
                    <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg shrink-0">
                      <span className="text-emerald-500 font-bold text-lg">{above5kPercentage}%</span>
                      <span className="text-xs text-emerald-500/80 uppercase font-semibold leading-tight max-w-[140px]">
                        Leads com renda &gt; R$ 5.000
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-full md:w-2/5 lg:w-1/3 h-64 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={visibleChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        cursor={isRenda ? 'pointer' : 'default'}
                        onClick={(entry: any) => {
                          if (isRenda && entry && entry.name) {
                            setSelectedRenda(prev => prev === entry.name ? null : entry.name);
                          }
                        }}
                      >
                        {visibleChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[allChartData.findIndex(d => d.name === entry.name) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: number, name: string) => [`${value} respostas`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-3/5 lg:w-2/3 max-h-64 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                  {allChartData.map((entry, index) => {
                    const isHidden = currentHidden.includes(entry.name);
                    const totalVisible = visibleChartData.reduce((sum, item) => sum + item.value, 0);
                    const percentage = isHidden || totalVisible === 0 ? '0.0' : ((entry.value / totalVisible) * 100).toFixed(1);
                    const color = COLORS[index % COLORS.length];
                    const isSelected = isRenda && selectedRenda === entry.name;

                    return (
                      <div 
                        key={index} 
                        onClick={() => {
                          if (isRenda) {
                            setSelectedRenda(prev => prev === entry.name ? null : entry.name);
                          }
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                          isRenda ? 'cursor-pointer' : ''
                        } ${
                          isSelected
                            ? 'bg-yellow-500/15 border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.2)] ring-1 ring-yellow-500/40'
                            : isHidden 
                              ? 'bg-black/10 border-transparent opacity-50' 
                              : isRenda 
                                ? 'bg-black/20 border-white/5 hover:border-yellow-500/30 hover:bg-white/5' 
                                : 'bg-black/20 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleHiddenItem(chart.key, entry.name);
                            }}
                            className="p-1 hover:bg-white/10 rounded-md transition-colors text-zinc-400 hover:text-white shrink-0"
                            title={isHidden ? "Mostrar no gráfico" : "Ocultar do gráfico"}
                          >
                            {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <div className={`w-3 h-3 rounded-full shrink-0 ${isHidden ? 'bg-zinc-600' : ''}`} style={{ backgroundColor: isHidden ? undefined : color }} />
                          <span className={`text-sm truncate ${isSelected ? 'text-yellow-400 font-semibold' : isHidden ? 'text-zinc-500 line-through' : 'text-zinc-300'}`} title={entry.name}>
                            {entry.name}
                          </span>
                          {isRenda && (
                            <span className={`text-[10px] px-2 py-0.5 rounded ml-auto mr-2 shrink-0 transition-colors ${
                              isSelected 
                                ? 'bg-yellow-500 text-black font-bold' 
                                : 'text-zinc-500 hover:text-yellow-400 bg-white/5'
                            }`}>
                              {isSelected ? 'Selecionado' : 'Top Criativos'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className={`text-sm font-medium ${isSelected ? 'text-yellow-400' : isHidden ? 'text-zinc-500' : 'text-white'}`}>{entry.value}</span>
                          <span className="text-sm text-zinc-500 w-12 text-right">{percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top 5 Creatives Section for Selected Income Bracket */}
              {isRenda && selectedRenda && (
                <div className="mt-6 pt-6 border-t border-white/10" id="top-5-criativos-renda">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center shrink-0">
                        <Trophy size={16} className="text-yellow-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                            Top 5 Criativos com Maior Impacto:
                          </h4>
                          <span className="text-sm font-extrabold text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-2.5 py-0.5 rounded-full">
                            {selectedRenda}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Criativos ordenados pelo maior volume e impacto percentual de leads nesta faixa ({filteredData.filter(r => r.renda === selectedRenda).length} leads totais da faixa).
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedRenda(null)}
                      className="self-start sm:self-center text-xs font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 border border-white/10 shrink-0"
                      title="Fechar Top 5 Criativos"
                    >
                      <X size={14} /> Fechar
                    </button>
                  </div>

                  {topCreativesForSelectedRenda.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 bg-black/20 rounded-xl border border-white/5 text-sm">
                      Nenhum criativo com identificação UTM encontrado para esta faixa no período selecionado.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                      {topCreativesForSelectedRenda.map((c) => (
                        <div
                          key={c.nome}
                          className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all relative overflow-hidden ${
                            c.rank === 1
                              ? 'bg-yellow-500/10 border-yellow-500/40 shadow-[0_4px_20px_rgba(234,179,8,0.12)]'
                              : 'bg-black/30 border-white/10 hover:border-white/20 hover:bg-black/40'
                          }`}
                        >
                          <div>
                            {/* Card Header: Rank & Copy */}
                            <div className="flex items-center justify-between gap-2 mb-2.5">
                              <span className={`text-[11px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                c.rank === 1
                                  ? 'bg-yellow-500 text-black shadow-sm'
                                  : c.rank === 2
                                  ? 'bg-zinc-300 text-black'
                                  : c.rank === 3
                                  ? 'bg-amber-700/60 text-amber-200 border border-amber-600/30'
                                  : 'bg-white/10 text-zinc-300'
                              }`}>
                                #{c.rank} Lugar
                              </span>
                              <button
                                onClick={(e) => handleCopy(c.nome, e)}
                                className="p-1 text-zinc-500 hover:text-white rounded hover:bg-white/10 transition-colors"
                                title="Copiar nome do criativo"
                              >
                                {copiedName === c.nome ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                              </button>
                            </div>

                            {/* Thumbnail & Title */}
                            <div className="flex items-start gap-2.5 mb-3">
                              <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                                {c.thumbnail ? (
                                  <img src={c.thumbnail} alt={c.nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <Video size={18} className="text-zinc-500" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-white text-xs leading-snug line-clamp-2" title={c.nome}>
                                  {c.nome}
                                </p>
                                {c.atribuicao && (
                                  <span className="inline-block mt-1 text-[10px] text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded truncate max-w-full">
                                    {c.atribuicao}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Impact Metrics */}
                            <div className="bg-black/30 rounded-lg p-2.5 border border-white/5 space-y-2">
                              <div>
                                <div className="flex items-baseline justify-between">
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Impacto na Faixa</span>
                                  <span className="text-base font-black text-yellow-400">{c.shareOfFaixa.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-1">
                                  <div className="bg-yellow-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(4, c.shareOfFaixa))}%` }} />
                                </div>
                                <div className="text-[10px] text-zinc-400 mt-1">
                                  <strong className="text-white font-medium">{c.count}</strong> de {c.totalInFaixa} leads desta faixa
                                </div>
                              </div>

                              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                                <span className="text-zinc-400">Audiência do Criativo:</span>
                                <span className="font-semibold text-zinc-200" title={`${c.count} de ${c.totalCreativeLeads} leads totais deste anúncio`}>
                                  {c.concentrationInCreative.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Link Button */}
                          <div className="mt-3 pt-2 border-t border-white/5">
                            {c.link ? (
                              <a
                                href={c.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-1.5 px-2.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 hover:text-yellow-300 border border-yellow-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                              >
                                Ver anúncio <ExternalLink size={12} />
                              </a>
                            ) : (
                              <span className="w-full py-1.5 px-2.5 rounded-lg bg-white/5 text-zinc-500 text-xs flex items-center justify-center gap-1">
                                Sem link disponível
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}

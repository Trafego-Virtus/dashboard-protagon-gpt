import React, { useState } from 'react';
import { ExternalLink, ArrowUpDown, FileSearch, CheckSquare, Copy, Check } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/format';
import { CreativeDataRow, MqlRule } from '../types';

export const isMqlByRule = (lead: any, rule: MqlRule) => {
  if (rule === 'padrao') {
    return (lead['clint'] || '').toUpperCase() === 'SIM';
  }
  
  const renda = String(lead['renda'] || '').toLowerCase();
  if (!renda || renda === 'null' || renda === '#n/a (no matches are found in filter evaluation.)') return false;

  const isAcima30k = renda.includes('30.000') || renda.includes('30.001') || (renda.includes('acima de') && renda.includes('30.000'));
  const isAcima20k = isAcima30k || renda.includes('20.000') || renda.includes('20.001') || (renda.includes('acima de') && renda.includes('20.000'));
  const isAcima10k = isAcima20k || renda.includes('10.001') || renda.includes('10.000,00');
  const isAcima7_5k = isAcima10k || renda.includes('7.501');

  switch (rule) {
    case '7.5k': return isAcima7_5k;
    case '10k': return isAcima10k;
    case '20k': return isAcima20k;
    case '30k': return isAcima30k;
    default: return false;
  }
};

interface CreativesTableProps {
  data: CreativeDataRow[];
  initialStatusFilter?: 'todos' | 'ativos' | 'inativos';
  onViewPesquisa?: (creative: CreativeDataRow) => void;
  showDistribuicaoMetrics?: boolean;
  audienceTemp?: 'all' | 'quente' | 'frio';
  setAudienceTemp?: (val: 'all' | 'quente' | 'frio') => void;
}

export function CreativesTable({ data, initialStatusFilter = 'ativos', onViewPesquisa, showDistribuicaoMetrics, audienceTemp, setAudienceTemp }: CreativesTableProps) {
  const [mqlRule, setMqlRule] = useState<MqlRule>('padrao');
  const [sortField, setSortField] = useState<keyof CreativeDataRow | 'ctr' | 'frequencia' | 'hookRate' | 'hookRateMarcos' | 'cpl' | 'cpmql' | 'qualificacao' | 'cpvp' | 'cac_ingresso'>('investimento');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedCreatives, setSelectedCreatives] = useState<Set<string>>(new Set());
  const [filterOnlySelected, setFilterOnlySelected] = useState(false);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const handleCopyName = (nome: string) => {
    navigator.clipboard.writeText(nome);
    setCopiedName(nome);
    setTimeout(() => {
      setCopiedName(null);
    }, 2000);
  };

  const handleSort = (field: keyof CreativeDataRow | 'ctr' | 'frequencia' | 'hookRate' | 'hookRateMarcos' | 'cpl' | 'cpmql' | 'qualificacao' | 'cpvp' | 'cac_ingresso') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

    const dynamicData = React.useMemo(() => {
    return data.map(d => {
      let dynamicMqls = d.mqls;
      if (mqlRule !== 'padrao') {
        dynamicMqls = d.pesquisa?.filter(lead => isMqlByRule(lead, mqlRule)).length || 0;
      }
      return {
        ...d,
        mqls: dynamicMqls
      };
    });
  }, [data, mqlRule]);

  let filteredData = dynamicData;
  if (filterOnlySelected && selectedCreatives.size > 0) {
    filteredData = filteredData.filter(d => selectedCreatives.has(d.nome));
  }
  if (statusFilter === 'ativos') {
    filteredData = filteredData.filter(d => d.ativo);
  } else if (statusFilter === 'inativos') {
    filteredData = filteredData.filter(d => !d.ativo);
  }

  const sortedData = [...filteredData].sort((a, b) => {
    let aVal = 0;
    let bVal = 0;

    if (sortField === 'ctr') {
      aVal = a.impressoes > 0 ? (a.cliques / a.impressoes) : 0;
      bVal = b.impressoes > 0 ? (b.cliques / b.impressoes) : 0;
    } else if (sortField === 'frequencia') {
      aVal = a.alcance > 0 ? (a.impressoes / a.alcance) : 0;
      bVal = b.alcance > 0 ? (b.impressoes / b.alcance) : 0;
    } else if (sortField === 'hookRate') {
      aVal = a.impressoes > 0 ? (a.view3s / a.impressoes) : 0;
      bVal = b.impressoes > 0 ? (b.view3s / b.impressoes) : 0;
    } else if (sortField === 'hookRateMarcos') {
      aVal = a.view25 > 0 ? (a.view3s / a.view25) : 0;
      bVal = b.view25 > 0 ? (b.view3s / b.view25) : 0;
    } else if (sortField === 'cpvp') {
      aVal = a.visitasPerfil > 0 ? (a.investimento / a.visitasPerfil) : 0;
      bVal = b.visitasPerfil > 0 ? (b.investimento / b.visitasPerfil) : 0;
    } else if (sortField === 'cpl') {
      aVal = a.leads > 0 ? (a.investimento / a.leads) : 0;
      bVal = b.leads > 0 ? (b.investimento / b.leads) : 0;
    } else if (sortField === 'cpmql') {
      aVal = a.mqls > 0 ? (a.investimento / a.mqls) : 0;
      bVal = b.mqls > 0 ? (b.investimento / b.mqls) : 0;
    } else if (sortField === 'cac_ingresso') {
      aVal = a.ingressos > 0 ? (a.investimento / a.ingressos) : 0;
      bVal = b.ingressos > 0 ? (b.investimento / b.ingressos) : 0;
    } else if (sortField === 'qualificacao') {
      aVal = a.leads > 0 ? (a.mqls / a.leads) : 0;
      bVal = b.leads > 0 ? (b.mqls / b.leads) : 0;
    } else {
      aVal = a[sortField] as number;
      bVal = b[sortField] as number;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }: { field: string }) => {
    return <ArrowUpDown className={`w-3 h-3 ml-1 inline-block ${sortField === field ? 'text-yellow-500' : 'text-zinc-600'}`} />;
  };

  const handleSelectCreative = (nome: string) => {
    const newSelected = new Set(selectedCreatives);
    if (newSelected.has(nome)) {
      newSelected.delete(nome);
    } else {
      newSelected.add(nome);
    }
    setSelectedCreatives(newSelected);
  };

  const validCpmqls = sortedData
    .map(d => d.mqls > 0 ? d.investimento / d.mqls : 0)
    .filter(val => val > 0)
    .sort((a, b) => a - b);

  const getCpmqlBgColor = (cpmql: number) => {
    if (cpmql === 0 || validCpmqls.length === 0) return 'transparent';
    
    let index = validCpmqls.findIndex(v => v >= cpmql);
    if (index === -1) index = validCpmqls.length - 1;
    const ratio = validCpmqls.length > 1 ? index / (validCpmqls.length - 1) : 0;
    
    let r, g, b;
    if (ratio < 0.5) {
      const t = ratio * 2;
      r = Math.round(16 + t * (234 - 16));
      g = Math.round(185 + t * (179 - 185));
      b = Math.round(129 + t * (8 - 129));
    } else {
      const t = (ratio - 0.5) * 2;
      r = Math.round(234 + t * (239 - 234));
      g = Math.round(179 + t * (68 - 179));
      b = Math.round(8 + t * (68 - 8));
    }
    return `rgba(${r}, ${g}, ${b}, 0.3)`;
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCreatives(new Set(sortedData.map(d => d.nome)));
    } else {
      setSelectedCreatives(new Set());
    }
  };

  const selectedData = data.filter(d => selectedCreatives.has(d.nome));
  const hasSelected = selectedData.length > 0;
  
  const summary = hasSelected ? {
    investimento: selectedData.reduce((acc, curr) => acc + curr.investimento, 0),
    cliques: selectedData.reduce((acc, curr) => acc + curr.cliques, 0),
    impressoes: selectedData.reduce((acc, curr) => acc + curr.impressoes, 0),
    alcance: selectedData.reduce((acc, curr) => acc + curr.alcance, 0),
    view3s: selectedData.reduce((acc, curr) => acc + curr.view3s, 0),
    view25: selectedData.reduce((acc, curr) => acc + curr.view25, 0),
    visitasPerfil: selectedData.reduce((acc, curr) => acc + curr.visitasPerfil, 0),
    leads: selectedData.reduce((acc, curr) => acc + curr.leads, 0),
    ingressos: selectedData.reduce((acc, curr) => acc + curr.ingressos, 0),
    mqls: selectedData.reduce((acc, curr) => acc + curr.mqls, 0),
  } : null;

  return (
    <div className="space-y-4">
      {hasSelected && summary && (
        <div className="bg-zinc-900 border border-yellow-500/30 rounded-xl p-4 shadow-md animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-bold text-yellow-500 uppercase flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              Resumo dos Selecionados ({selectedData.length})
            </h4>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setFilterOnlySelected(!filterOnlySelected)} 
                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${filterOnlySelected ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/30' : 'bg-zinc-800 text-zinc-300 border-white/10 hover:bg-zinc-700 hover:text-white'}`}
              >
                {filterOnlySelected ? 'Mostrar todos' : 'Filtrar na tabela'}
              </button>
              <button onClick={() => {
                setSelectedCreatives(new Set());
                setFilterOnlySelected(false);
              }} className="text-xs text-zinc-400 hover:text-white transition-colors">
                Limpar seleção
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Investimento</p>
              <p className="font-bold text-white text-sm">{formatCurrency(summary.investimento)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Ingressos</p>
              <p className="font-bold text-white text-sm">{formatNumber(summary.ingressos)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">CAC Ingresso</p>
              <p className="font-bold text-white text-sm">{summary.ingressos > 0 ? formatCurrency(summary.investimento / summary.ingressos) : 'R$ 0,00'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Leads</p>
              <p className="font-bold text-white text-sm">{formatNumber(summary.leads)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Custo por Lead</p>
              <p className="font-bold text-white text-sm">{summary.leads > 0 ? formatCurrency(summary.investimento / summary.leads) : 'R$ 0,00'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">MQLs</p>
              <p className="font-bold text-white text-sm">{formatNumber(summary.mqls)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Custo por MQL</p>
              <p className="font-bold text-white text-sm">{summary.mqls > 0 ? formatCurrency(summary.investimento / summary.mqls) : 'R$ 0,00'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Qualificação</p>
              <p className="font-bold text-white text-sm">{summary.leads > 0 ? `${((summary.mqls / summary.leads) * 100).toFixed(2)}%` : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">CTR</p>
              <p className="font-bold text-white text-sm">{summary.impressoes > 0 ? ((summary.cliques / summary.impressoes) * 100).toFixed(2) : '0.00'}%</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Frequência</p>
              <p className="font-bold text-white text-sm">{summary.alcance > 0 ? (summary.impressoes / summary.alcance).toFixed(2) : '0.00'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Hook Rate</p>
              <p className="font-bold text-white text-sm">{summary.impressoes > 0 ? ((summary.view3s / summary.impressoes) * 100).toFixed(2) : '0.00'}%</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Hook Rate Marcos</p>
              <p className="font-bold text-white text-sm">{summary.view25 > 0 ? (summary.view3s / summary.view25).toFixed(2) : '0.00'}%</p>
            </div>
            {showDistribuicaoMetrics && (
              <>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Visitas Perfil</p>
                  <p className="font-bold text-white text-sm">{formatNumber(summary.visitasPerfil)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Custo / Visita</p>
                  <p className="font-bold text-white text-sm">{summary.visitasPerfil > 0 ? formatCurrency(summary.investimento / summary.visitasPerfil) : 'R$ 0,00'}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
           <span className="text-sm text-zinc-400 whitespace-nowrap">{selectedCreatives.size} selecionados de {sortedData.length}</span>
           {setAudienceTemp && audienceTemp && (
             <div className="flex items-center bg-zinc-900/50 border border-white/10 rounded-lg p-1 shrink-0">
               <button onClick={() => setAudienceTemp('all')} className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${audienceTemp === 'all' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>Todos</button>
               <button onClick={() => setAudienceTemp('quente')} className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${audienceTemp === 'quente' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>Quente</button>
               <button onClick={() => setAudienceTemp('frio')} className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${audienceTemp === 'frio' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>Frio</button>
             </div>
           )}
           <div className="flex items-center gap-2 bg-zinc-900/50 border border-white/10 rounded-lg px-3 py-1.5 shrink-0 hover:bg-zinc-800/50 transition-colors">
             <span className="text-xs text-zinc-500 font-medium">Regra de MQL:</span>
             <select 
               className="bg-transparent text-sm text-white font-medium outline-none cursor-pointer"
               value={mqlRule}
               onChange={(e) => setMqlRule(e.target.value as MqlRule)}
             >
               <option value="padrao" className="bg-zinc-900">Padrão (Clint: Sim)</option>
               <option value="7.5k" className="bg-zinc-900">Renda &gt; 7.5k</option>
               <option value="10k" className="bg-zinc-900">Renda &gt; 10k</option>
               <option value="20k" className="bg-zinc-900">Renda &gt; 20k</option>
               <option value="30k" className="bg-zinc-900">Renda &gt; 30k</option>
             </select>
           </div>
        </div>
        
        <div className="flex items-center bg-zinc-900 border border-white/10 rounded-lg p-1 shrink-0">
          <button
            onClick={() => setStatusFilter('todos')}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${statusFilter === 'todos' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setStatusFilter('ativos')}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 font-medium ${statusFilter === 'ativos' ? 'bg-emerald-500/20 text-emerald-500 shadow-sm' : 'text-zinc-500 hover:text-emerald-500/50'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'ativos' ? 'bg-emerald-500' : 'bg-zinc-600'}`}></span>
            Ativos
          </button>
          <button
            onClick={() => setStatusFilter('inativos')}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 font-medium ${statusFilter === 'inativos' ? 'bg-red-500/20 text-red-500 shadow-sm' : 'text-zinc-500 hover:text-red-500/50'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'inativos' ? 'bg-red-500' : 'bg-zinc-600'}`}></span>
            Inativos
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-zinc-500 bg-black/20">
              <th className="p-4 w-12 text-center">
                <input 
                  type="checkbox" 
                  className="rounded border-zinc-600 bg-zinc-800 text-yellow-500 focus:ring-yellow-500/50 cursor-pointer"
                  checked={sortedData.length > 0 && selectedCreatives.size === sortedData.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="p-4 font-medium min-w-[200px]">Criativo</th>
              <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('investimento')}>
                Investimento <SortIcon field="investimento" />
              </th>
              <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('frequencia')}>
                Frequência <SortIcon field="frequencia" />
              </th>
              <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('ctr')}>
                CTR (%) <SortIcon field="ctr" />
              </th>
              <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('hookRate')}>
                Hook Rate <SortIcon field="hookRate" />
              </th>
              <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('hookRateMarcos')}>
                Hook Rate Marcos <SortIcon field="hookRateMarcos" />
              </th>
              {showDistribuicaoMetrics && (
                <>
                  <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('visitasPerfil')}>
                    Visitas Perfil <SortIcon field="visitasPerfil" />
                  </th>
                  <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('cpvp')}>
                    Custo / Visita <SortIcon field="cpvp" />
                  </th>
                </>
              )}
              <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('leads')}>
                Leads <SortIcon field="leads" />
              </th>
              <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('ingressos')}>
                Ingressos Vendidos <SortIcon field="ingressos" />
              </th>
              <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('cac_ingresso')}>
                CAC Ingresso <SortIcon field="cac_ingresso" />
              </th>
              <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('mqls')}>
                MQLs <SortIcon field="mqls" />
              </th>
              <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('cpl')}>
                Custo por Lead <SortIcon field="cpl" />
              </th>
              <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('cpmql')}>
                Custo por MQL <SortIcon field="cpmql" />
              </th>
              <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('qualificacao')}>
                % Qualificação <SortIcon field="qualificacao" />
              </th>
              {onViewPesquisa && (
                <th className="p-4 font-medium text-right">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
            {sortedData.map((row, i) => (
              <tr key={i} className={`hover:bg-white/5 transition-colors ${selectedCreatives.has(row.nome) ? 'bg-yellow-500/5' : ''}`}>
                <td className="p-4 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-zinc-600 bg-zinc-800 text-yellow-500 focus:ring-yellow-500/50 cursor-pointer"
                    checked={selectedCreatives.has(row.nome)}
                    onChange={() => handleSelectCreative(row.nome)}
                  />
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-zinc-800 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {row.thumbnail ? (
                        <img src={row.thumbnail} alt={row.nome} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-zinc-600 text-xs">Sem img</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${row.ativo ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} title={row.ativo ? 'Ativo' : 'Inativo'}></span>
                        <p className="font-medium text-white truncate max-w-[200px]" title={row.nome}>{row.nome}</p>
                        <button 
                          onClick={() => handleCopyName(row.nome)}
                          className={`p-1 rounded-md transition-colors ${copiedName === row.nome ? 'text-emerald-500 bg-emerald-500/10' : 'text-zinc-500 hover:text-white hover:bg-white/10'}`}
                          title="Copiar nome do criativo"
                        >
                          {copiedName === row.nome ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      {row.link && (
                        <a href={row.link} target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:text-yellow-400 text-xs flex items-center gap-1 mt-1 transition-colors">
                          Ver anúncio <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4 text-zinc-300">{formatCurrency(row.investimento)}</td>
                <td className="p-4 text-zinc-300">{row.alcance > 0 ? (row.impressoes / row.alcance).toFixed(2) : '0.00'}</td>
                <td className="p-4 text-zinc-300">{row.impressoes > 0 ? ((row.cliques / row.impressoes) * 100).toFixed(2) : '0.00'}%</td>
                <td className="p-4 text-zinc-300">{row.impressoes > 0 ? ((row.view3s / row.impressoes) * 100).toFixed(2) : '0.00'}%</td>
                <td className="p-4 text-zinc-300">{row.view25 > 0 ? (row.view3s / row.view25).toFixed(2) : '0.00'}%</td>
                {showDistribuicaoMetrics && (
                  <>
                    <td className="p-4 text-zinc-300">{formatNumber(row.visitasPerfil)}</td>
                    <td className="p-4 text-zinc-300">{row.visitasPerfil > 0 ? formatCurrency(row.investimento / row.visitasPerfil) : 'R$ 0,00'}</td>
                  </>
                )}
                <td className="p-4 text-zinc-300">{formatNumber(row.leads)}</td>
                <td className="p-4 text-zinc-300">{formatNumber(row.ingressos)}</td>
                <td className="p-4 text-zinc-300">{row.ingressos > 0 ? formatCurrency(row.investimento / row.ingressos) : 'R$ 0,00'}</td>
                <td className="p-4 text-zinc-300">{formatNumber(row.mqls)}</td>
                <td className="p-4 text-zinc-300">{row.leads > 0 ? formatCurrency(row.investimento / row.leads) : 'R$ 0,00'}</td>
                <td className="p-4 text-zinc-300" style={{ backgroundColor: getCpmqlBgColor(row.mqls > 0 ? row.investimento / row.mqls : 0) }}>{row.mqls > 0 ? formatCurrency(row.investimento / row.mqls) : 'R$ 0,00'}</td>
                <td className="p-4 text-zinc-300">
                  {row.leads > 0 
                    ? `${((row.mqls / row.leads) * 100).toFixed(2)}%` 
                    : '-'}
                </td>
                {onViewPesquisa && (
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => onViewPesquisa(row)}
                      className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-md border border-white/10 transition-colors"
                      title="Ver pesquisa"
                    >
                      <FileSearch className="w-4 h-4" />
                      <span>Ver pesquisa</span>
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {sortedData.length === 0 && (
              <tr>
                <td colSpan={13 + (onViewPesquisa ? 1 : 0) + (showDistribuicaoMetrics ? 2 : 0)} className="p-8 text-center text-zinc-500">
                  {dynamicData.length > 0 ? (
                    <>
                      <p>Os filtros atuais não exibem os criativos deste período.</p>
                      <button
                        onClick={() => { setStatusFilter('todos'); setFilterOnlySelected(false); }}
                        className="mt-3 text-sm font-medium text-yellow-500 hover:text-yellow-400"
                      >
                        Mostrar todos os criativos
                      </button>
                    </>
                  ) : 'Nenhum criativo encontrado para este período.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}

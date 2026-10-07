import React, { useState, useMemo } from 'react';
import { ExternalLink, Check, Copy, Info, X } from 'lucide-react';
import { CreativeDataRow } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';

interface CreativesTableDistribuicaoProps {
  data: CreativeDataRow[];
}

export function CreativesTableDistribuicao({ data }: CreativesTableDistribuicaoProps) {
  const [sortField, setSortField] = useState<keyof CreativeDataRow | 'hookRate' | 'bodyRate' | 'holdRate' | 'cpv25' | 'cpv50' | 'cpv75' | 'cpv95' | 'frequencia'>('investimento');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'inativos'>('ativos');
  const [atribuicaoFilter, setAtribuicaoFilter] = useState<string>('todas');
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [showKpiRef, setShowKpiRef] = useState(false);
  const [hookFilter, setHookFilter] = useState<'todos' | 'verde' | 'vermelho'>('todos');
  const [bodyFilter, setBodyFilter] = useState<'todos' | 'verde' | 'vermelho'>('todos');
  const [holdFilter, setHoldFilter] = useState<'todos' | 'verde' | 'amarelo' | 'vermelho'>('todos');

  const handleCopyName = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(name);
    setCopiedName(name);
    setTimeout(() => {
      setCopiedName(null);
    }, 2000);
  };

  const handleSort = (field: keyof CreativeDataRow | 'hookRate' | 'bodyRate' | 'holdRate' | 'cpv25' | 'cpv50' | 'cpv75' | 'cpv95' | 'frequencia') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="inline-block w-4" />;
    return <span className="inline-block w-4 text-yellow-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  const uniqueAtribuicoes = useMemo(() => {
    const s = new Set<string>();
    data.forEach(d => {
      if (d.atribuicao) s.add(d.atribuicao);
    });
    return Array.from(s).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(r => {
      if (statusFilter === 'ativos' && !r.ativo) return false;
      if (statusFilter === 'inativos' && r.ativo) return false;
      if (atribuicaoFilter !== 'todas' && r.atribuicao !== atribuicaoFilter) return false;
      
      const hook = r.impressoes > 0 ? (r.view3s / r.impressoes) : 0;
      if (hookFilter === 'verde' && hook < 0.40) return false;
      if (hookFilter === 'vermelho' && hook >= 0.40) return false;

      const body = r.view3s > 0 ? ((r.view50 || 0) / r.view3s) : 0;
      if (bodyFilter === 'verde' && body < 0.20) return false;
      if (bodyFilter === 'vermelho' && body >= 0.20) return false;

      const hold = r.view3s > 0 ? ((r.view95 || 0) / r.view3s) : 0;
      if (holdFilter === 'verde' && hold <= 0.10) return false;
      if (holdFilter === 'amarelo' && (hold < 0.05 || hold > 0.10)) return false;
      if (holdFilter === 'vermelho' && hold >= 0.05) return false;

      return true;
    });
  }, [data, statusFilter, atribuicaoFilter, hookFilter, bodyFilter, holdFilter]);

  const getHookColor = (val: number) => {
    if (val < 0.40) return 'bg-red-500/30 text-red-200 font-semibold';
    return 'bg-emerald-500/30 text-emerald-200 font-semibold';
  };

  const getBodyColor = (val: number) => {
    if (val < 0.20) return 'bg-red-500/30 text-red-200 font-semibold';
    return 'bg-emerald-500/30 text-emerald-200 font-semibold';
  };

  const getHoldColor = (val: number) => {
    if (val < 0.05) return 'bg-red-500/30 text-red-200 font-semibold';
    if (val <= 0.10) return 'bg-yellow-500/30 text-yellow-200 font-semibold';
    return 'bg-emerald-500/30 text-emerald-200 font-semibold';
  };

  const maxMin = useMemo(() => {
    let hookMin = Infinity, hookMax = -Infinity;
    let bodyMin = Infinity, bodyMax = -Infinity;
    let holdMin = Infinity, holdMax = -Infinity;
    
    filteredData.forEach(d => {
      const hook = d.impressoes > 0 ? d.view3s / d.impressoes : 0;
      const body = d.view3s > 0 ? (d.view50 || 0) / d.view3s : 0;
      const hold = d.view3s > 0 ? (d.view95 || 0) / d.view3s : 0;
      if (hook < hookMin) hookMin = hook;
      if (hook > hookMax) hookMax = hook;
      if (body < bodyMin) bodyMin = body;
      if (body > bodyMax) bodyMax = body;
      if (hold < holdMin) holdMin = hold;
      if (hold > holdMax) holdMax = hold;
    });
    
    return {
      hook: { min: hookMin === Infinity ? 0 : hookMin, max: hookMax === -Infinity ? 0 : hookMax },
      body: { min: bodyMin === Infinity ? 0 : bodyMin, max: bodyMax === -Infinity ? 0 : bodyMax },
      hold: { min: holdMin === Infinity ? 0 : holdMin, max: holdMax === -Infinity ? 0 : holdMax }
    };
  }, [filteredData]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let aVal = 0;
      let bVal = 0;

      if (sortField === 'hookRate') {
        aVal = a.impressoes > 0 ? (a.view3s / a.impressoes) : 0;
        bVal = b.impressoes > 0 ? (b.view3s / b.impressoes) : 0;
      } else if (sortField === 'bodyRate') {
        aVal = a.view3s > 0 ? ((a.view50 || 0) / a.view3s) : 0;
        bVal = b.view3s > 0 ? ((b.view50 || 0) / b.view3s) : 0;
      } else if (sortField === 'holdRate') {
        aVal = a.view3s > 0 ? ((a.view95 || 0) / a.view3s) : 0;
        bVal = b.view3s > 0 ? ((b.view95 || 0) / b.view3s) : 0;
      } else if (sortField === 'cpv25') {
        aVal = a.view25 > 0 ? (a.investimento / a.view25) : 0;
        bVal = b.view25 > 0 ? (b.investimento / b.view25) : 0;
      } else if (sortField === 'cpv50') {
        aVal = (a.view50 || 0) > 0 ? (a.investimento / (a.view50 || 0)) : 0;
        bVal = (b.view50 || 0) > 0 ? (b.investimento / (b.view50 || 0)) : 0;
      } else if (sortField === 'cpv75') {
        aVal = (a.view75 || 0) > 0 ? (a.investimento / (a.view75 || 0)) : 0;
        bVal = (b.view75 || 0) > 0 ? (b.investimento / (b.view75 || 0)) : 0;
      } else if (sortField === 'cpv95') {
        aVal = (a.view95 || 0) > 0 ? (a.investimento / (a.view95 || 0)) : 0;
        bVal = (b.view95 || 0) > 0 ? (b.investimento / (b.view95 || 0)) : 0;
      } else if (sortField === 'frequencia') {
        aVal = a.alcance > 0 ? (a.impressoes / a.alcance) : 0;
        bVal = b.alcance > 0 ? (b.impressoes / b.alcance) : 0;
      } else {
        aVal = (a as any)[sortField] || 0;
        bVal = (b as any)[sortField] || 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  return (
    <div className="bg-[#0a0a0a] border border-white/5 rounded-xl shadow-lg flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-4 bg-zinc-900/50">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
            <button onClick={() => setStatusFilter('ativos')} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${statusFilter === 'ativos' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Ativos</button>
            <button onClick={() => setStatusFilter('inativos')} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${statusFilter === 'inativos' ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Inativos</button>
            <button onClick={() => setStatusFilter('todos')} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${statusFilter === 'todos' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Todos</button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase">Atribuição:</span>
            <select 
              value={atribuicaoFilter} 
              onChange={e => setAtribuicaoFilter(e.target.value)}
              className="bg-black/40 border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-yellow-500/50"
            >
              <option value="todas">Todas as Etapas</option>
              {uniqueAtribuicoes.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase">Hook:</span>
            <select 
              value={hookFilter} 
              onChange={e => setHookFilter(e.target.value as any)}
              className="bg-black/40 border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/50"
            >
              <option value="todos">Todos</option>
              <option value="verde">≥ 40% (Verde)</option>
              <option value="vermelho">&lt; 40% (Vermelho)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase">Body:</span>
            <select 
              value={bodyFilter} 
              onChange={e => setBodyFilter(e.target.value as any)}
              className="bg-black/40 border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/50"
            >
              <option value="todos">Todos</option>
              <option value="verde">≥ 20% (Verde)</option>
              <option value="vermelho">&lt; 20% (Vermelho)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase">Hold:</span>
            <select 
              value={holdFilter} 
              onChange={e => setHoldFilter(e.target.value as any)}
              className="bg-black/40 border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/50"
            >
              <option value="todos">Todos</option>
              <option value="verde">&gt; 10% (Verde)</option>
              <option value="amarelo">5-10% (Amarelo)</option>
              <option value="vermelho">&lt; 5% (Vermelho)</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setShowKpiRef(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 rounded-lg text-sm font-semibold transition-colors shadow-sm whitespace-nowrap"
        >
          <Info size={16} />
          Referência de KPIs
        </button>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-zinc-900/80 text-zinc-400 border-b border-white/5">
            <tr>
              <th className="p-4 font-medium min-w-[250px]">Criativo</th>
              <th className="p-4 font-medium min-w-[120px]">Atribuição</th>
              <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('investimento')}>Investimento <SortIcon field="investimento" /></th>
              <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('frequencia')}>Frequência <SortIcon field="frequencia" /></th>
              <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('hookRate')}>Hook Rate <SortIcon field="hookRate" /></th>
              <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('bodyRate')}>Body Rate <SortIcon field="bodyRate" /></th>
              <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('holdRate')}>Hold Rate <SortIcon field="holdRate" /></th>
              <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('cpv25')}>CPV 25% <SortIcon field="cpv25" /></th>
              <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('cpv50')}>CPV 50% <SortIcon field="cpv50" /></th>
              <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('cpv75')}>CPV 75% <SortIcon field="cpv75" /></th>
              <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('cpv95')}>CPV 95% <SortIcon field="cpv95" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedData.map((row, idx) => {
              const hook = row.impressoes > 0 ? (row.view3s / row.impressoes) : 0;
              const body = row.view3s > 0 ? ((row.view50 || 0) / row.view3s) : 0;
              const hold = row.view3s > 0 ? ((row.view95 || 0) / row.view3s) : 0;
              
              return (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {row.thumbnail ? (
                        <div className="w-12 h-12 rounded bg-zinc-800 border border-white/10 overflow-hidden shrink-0">
                          <img src={row.thumbnail} alt="thumb" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0">
                          <span className="text-[10px] text-zinc-500">No Img</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-zinc-200 truncate" title={row.nome}>{row.nome}</p>
                          <button onClick={(e) => handleCopyName(row.nome, e)} className="p-1 text-zinc-500 hover:text-yellow-500 transition-colors" title="Copiar nome">
                            {copiedName === row.nome ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`w-2 h-2 rounded-full ${row.ativo ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {row.link && (
                            <a href={row.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                              Ver original <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-xs font-medium text-zinc-400">{row.atribuicao || '-'}</td>
                  <td className="p-4 font-semibold text-white">{formatCurrency(row.investimento)}</td>
                  <td className="p-4 font-semibold text-white">{row.alcance > 0 ? (row.impressoes / row.alcance).toFixed(2) : '0.00'}</td>
                  <td className={`p-4 ${getHookColor(hook)}`}>
                    {(hook * 100).toFixed(2)}%
                  </td>
                  <td className={`p-4 ${getBodyColor(body)}`}>
                    {(body * 100).toFixed(2)}%
                  </td>
                  <td className={`p-4 ${getHoldColor(hold)}`}>
                    {(hold * 100).toFixed(2)}%
                  </td>
                  <td className="p-4 text-zinc-300">{row.view25 > 0 ? formatCurrency(row.investimento / row.view25) : '-'}</td>
                  <td className="p-4 text-zinc-300">{(row.view50 || 0) > 0 ? formatCurrency(row.investimento / (row.view50 || 0)) : '-'}</td>
                  <td className="p-4 text-zinc-300">{(row.view75 || 0) > 0 ? formatCurrency(row.investimento / (row.view75 || 0)) : '-'}</td>
                  <td className="p-4 text-zinc-300">{(row.view95 || 0) > 0 ? formatCurrency(row.investimento / (row.view95 || 0)) : '-'}</td>
                </tr>
              );
            })}
            {sortedData.length === 0 && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-zinc-500">Nenhum criativo encontrado para este filtro.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showKpiRef && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowKpiRef(false)} />
          <div className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Info className="text-yellow-500" size={20} />
                Referência de KPIs (Taxas de Retenção)
              </h3>
              <button 
                onClick={() => setShowKpiRef(false)}
                className="p-1 text-zinc-400 hover:text-white bg-black/20 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="bg-black/40 rounded-lg border border-white/5 p-4">
                <h4 className="text-emerald-400 font-bold mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Hook Rate
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
                    <p className="text-emerald-400 font-bold text-lg">≥ 40%</p>
                    <p className="text-sm text-zinc-400">Excelente / Bom</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                    <p className="text-red-400 font-bold text-lg">&lt; 40%</p>
                    <p className="text-sm text-zinc-400">Atenção</p>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 rounded-lg border border-white/5 p-4">
                <h4 className="text-emerald-400 font-bold mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Body Rate
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
                    <p className="text-emerald-400 font-bold text-lg">≥ 20%</p>
                    <p className="text-sm text-zinc-400">Excelente / Bom</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                    <p className="text-red-400 font-bold text-lg">&lt; 20%</p>
                    <p className="text-sm text-zinc-400">Atenção</p>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 rounded-lg border border-white/5 p-4">
                <h4 className="text-emerald-400 font-bold mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Hold Rate
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
                    <p className="text-emerald-400 font-bold text-lg">&gt; 10%</p>
                    <p className="text-sm text-zinc-400">Excelente</p>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
                    <p className="text-yellow-400 font-bold text-lg">5% - 10%</p>
                    <p className="text-sm text-zinc-400">Bom</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                    <p className="text-red-400 font-bold text-lg">&lt; 5%</p>
                    <p className="text-sm text-zinc-400">Atenção</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-white/10 bg-zinc-900/50 flex justify-end">
              <button 
                onClick={() => setShowKpiRef(false)}
                className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

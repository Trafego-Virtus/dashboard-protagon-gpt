import React, { useState, useMemo } from 'react';
import {  Search, ArrowUpDown, ArrowUp, ArrowDown, Eye, X, Activity , ChevronDown, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PesquisaAudiencia } from './PesquisaAudiencia';
import { motion, AnimatePresence } from 'motion/react';

export function GeracaoDemandaEstudoPublico({ metrics }: { metrics: any }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'investimento', direction: 'desc' });
  const [selectedAudience, setSelectedAudience] = useState<any | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (nome: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome);
      else next.add(nome);
      return next;
    });
  };

  const data = metrics?.demanda?.estudoPublico || [];

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];
    if (searchTerm) {
      result = result.filter((item: any) => 
        item.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (sortConfig) {
      result.sort((a: any, b: any) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return result;
  }, [data, searchTerm, sortConfig]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  // Data for charts
  const topInvestimento = [...data].sort((a, b) => b.investimento - a.investimento).slice(0, 10);
  
  // Filter out audiences with 0 mqls for the Custo por MQL chart to avoid infinity
  const topCustoMql = [...data]
    .filter(d => d.mqls > 0)
    .sort((a, b) => a.custoMql - b.custoMql) // Lowest Custo MQL first
    .slice(0, 10)
    .sort((a, b) => b.custoMql - a.custoMql); // Reverse for vertical bar chart layout so lowest is at top

  // Calculate General Frequency
  const totalImpressoes = data.reduce((acc: number, curr: any) => acc + (curr.impressoes || 0), 0);
  const totalAlcance = data.reduce((acc: number, curr: any) => acc + (curr.alcance || 0), 0);
  const frequenciaGeral = totalAlcance > 0 ? (totalImpressoes / totalAlcance) : 0;

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40 hover:opacity-100" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 inline text-yellow-500" /> : <ArrowDown className="w-3 h-3 ml-1 inline text-yellow-500" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight border-l-4 border-yellow-500 pl-3 uppercase">
            Estudo do Público
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Análise aprofundada de desempenho por conjunto de anúncios na Geração de Demanda.
          </p>
        </div>
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Pesquisar por público..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900/50 border border-white/10 p-4 rounded-xl">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wider">Top 10 Públicos por Investimento</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topInvestimento} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={(v) => `R$ ${v/1000}k`} stroke="#666" fontSize={12} />
                <YAxis dataKey="nome" type="category" width={120} stroke="#666" fontSize={10} tickFormatter={(val) => val.length > 20 ? val.substring(0, 20) + '...' : val} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                />
                <Bar dataKey="investimento" name="Investimento" fill="#eab308" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-white/10 p-4 rounded-xl">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wider">Top 10 Custo por MQL (Menores Custos)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCustoMql} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={(v) => `R$ ${v}`} stroke="#666" fontSize={12} />
                <YAxis dataKey="nome" type="category" width={120} stroke="#666" fontSize={10} tickFormatter={(val) => val.length > 20 ? val.substring(0, 20) + '...' : val} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                />
                <Bar dataKey="custoMql" name="Custo por MQL" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 bg-zinc-900/80 border border-white/10 px-4 py-3 rounded-lg w-fit">
          <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium uppercase">Frequência Geral (Período)</p>
            <p className="text-xl font-bold text-white">{frequenciaGeral.toFixed(2)}x</p>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-400 bg-black/40 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('nome')}>
                    Conjunto de Anúncios <SortIcon columnKey="nome" />
                  </th>
                  <th className="px-4 py-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => handleSort('investimento')}>
                    Investimento <SortIcon columnKey="investimento" />
                  </th>
                  <th className="px-4 py-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => handleSort('leads')}>
                    Leads <SortIcon columnKey="leads" />
                  </th>
                  <th className="px-4 py-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => handleSort('cpl')}>
                    CPL <SortIcon columnKey="cpl" />
                  </th>
                  <th className="px-4 py-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => handleSort('mqls')}>
                    MQLs <SortIcon columnKey="mqls" />
                  </th>
                  <th className="px-4 py-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => handleSort('custoMql')}>
                    Custo / MQL <SortIcon columnKey="custoMql" />
                  </th>
                  <th className="px-4 py-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => handleSort('vendas')}>
                    Vendas <SortIcon columnKey="vendas" />
                  </th>
                  <th className="px-4 py-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => handleSort('cac')}>
                    CAC <SortIcon columnKey="cac" />
                  </th>
                  <th className="px-4 py-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => handleSort('frequencia')}>
                    Frequência <SortIcon columnKey="frequencia" />
                  </th>
                  <th className="px-4 py-3 font-medium text-center">
                    Pesquisa
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
              {filteredAndSortedData.map((item: any, idx: number) => {
                const isExpanded = expandedRows.has(item.nome);
                const hasSub = item.subPublicos && item.subPublicos.length > 1; // Only show expansion if there's more than 1 sub-audience or if it's named differently
                
                return (
                  <React.Fragment key={idx}>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-white font-medium whitespace-normal break-words min-w-[250px]">
                        <div className="flex items-center gap-2">
                          {hasSub ? (
                            <button onClick={() => toggleRow(item.nome)} className="p-1 hover:bg-white/10 rounded-md transition-colors text-zinc-400">
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          ) : (
                            <div className="w-6" /> // spacer
                          )}
                          {item.nome}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-300 text-right">{formatCurrency(item.investimento)}</td>
                      <td className="px-4 py-3 text-zinc-300 text-right">{formatNumber(item.leads)}</td>
                      <td className="px-4 py-3 text-zinc-300 text-right">{formatCurrency(item.cpl)}</td>
                      <td className="px-4 py-3 text-zinc-300 text-right">{formatNumber(item.mqls)}</td>
                      <td className="px-4 py-3 text-zinc-300 text-right">{formatCurrency(item.custoMql)}</td>
                      <td className="px-4 py-3 text-zinc-300 text-right">{formatNumber(item.vendas)}</td>
                      <td className="px-4 py-3 text-zinc-300 text-right">{formatCurrency(item.cac)}</td>
                      <td className="px-4 py-3 text-zinc-300 text-right">{item.frequencia.toFixed(2)}x</td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => setSelectedAudience(item)}
                          disabled={!item.leadsData || item.leadsData.length === 0}
                          className="p-1.5 rounded-md text-zinc-400 hover:text-yellow-500 hover:bg-yellow-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors inline-flex"
                          title={item.leadsData && item.leadsData.length > 0 ? "Ver Pesquisa de Audiência" : "Sem dados de pesquisa"}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && hasSub && item.subPublicos.map((sub: any, subIdx: number) => (
                      <tr key={`${idx}-${subIdx}`} className="bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                        <td className="px-4 py-2 text-zinc-400 text-xs pl-12 whitespace-normal break-words">
                          ↳ {sub.nome}
                        </td>
                        <td className="px-4 py-2 text-zinc-500 text-xs text-right">{formatCurrency(sub.investimento)}</td>
                        <td className="px-4 py-2 text-zinc-500 text-xs text-right">{formatNumber(sub.leads)}</td>
                        <td className="px-4 py-2 text-zinc-500 text-xs text-right">{formatCurrency(sub.cpl)}</td>
                        <td className="px-4 py-2 text-zinc-500 text-xs text-right">{formatNumber(sub.mqls)}</td>
                        <td className="px-4 py-2 text-zinc-500 text-xs text-right">{formatCurrency(sub.custoMql)}</td>
                        <td className="px-4 py-2 text-zinc-500 text-xs text-right">{formatNumber(sub.vendas)}</td>
                        <td className="px-4 py-2 text-zinc-500 text-xs text-right">{formatCurrency(sub.cac)}</td>
                        <td className="px-4 py-2 text-zinc-500 text-xs text-right">{sub.frequencia.toFixed(2)}x</td>
                        <td className="px-4 py-2 text-center">
                           <button 
                            onClick={() => setSelectedAudience(sub)}
                            disabled={!sub.leadsData || sub.leadsData.length === 0}
                            className="p-1 rounded-md text-zinc-500 hover:text-yellow-500 hover:bg-yellow-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors inline-flex"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
                {filteredAndSortedData.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-zinc-500">
                      Nenhum público encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-black/60 border-t border-white/10 font-bold">
                <tr>
                  <td className="px-4 py-4 text-white text-right">Total:</td>
                  <td className="px-4 py-4 text-white text-right">{formatCurrency(filteredAndSortedData.reduce((acc, curr) => acc + curr.investimento, 0))}</td>
                  <td className="px-4 py-4 text-white text-right">{formatNumber(filteredAndSortedData.reduce((acc, curr) => acc + curr.leads, 0))}</td>
                  <td className="px-4 py-4 text-white text-right">
                    {formatCurrency(
                      filteredAndSortedData.reduce((acc, curr) => acc + curr.leads, 0) > 0 
                      ? filteredAndSortedData.reduce((acc, curr) => acc + curr.investimento, 0) / filteredAndSortedData.reduce((acc, curr) => acc + curr.leads, 0) 
                      : 0
                    )}
                  </td>
                  <td className="px-4 py-4 text-white text-right">{formatNumber(filteredAndSortedData.reduce((acc, curr) => acc + curr.mqls, 0))}</td>
                  <td className="px-4 py-4 text-white text-right">
                    {formatCurrency(
                      filteredAndSortedData.reduce((acc, curr) => acc + curr.mqls, 0) > 0 
                      ? filteredAndSortedData.reduce((acc, curr) => acc + curr.investimento, 0) / filteredAndSortedData.reduce((acc, curr) => acc + curr.mqls, 0) 
                      : 0
                    )}
                  </td>
                  <td className="px-4 py-4 text-white text-right">{formatNumber(filteredAndSortedData.reduce((acc, curr) => acc + curr.vendas, 0))}</td>
                  <td className="px-4 py-4 text-white text-right">
                    {formatCurrency(
                      filteredAndSortedData.reduce((acc, curr) => acc + curr.vendas, 0) > 0 
                      ? filteredAndSortedData.reduce((acc, curr) => acc + curr.investimento, 0) / filteredAndSortedData.reduce((acc, curr) => acc + curr.vendas, 0) 
                      : 0
                    )}
                  </td>
                  <td className="px-4 py-4 text-white text-right">
                    {(
                      filteredAndSortedData.reduce((acc, curr) => acc + curr.alcance, 0) > 0 
                      ? filteredAndSortedData.reduce((acc, curr) => acc + curr.impressoes, 0) / filteredAndSortedData.reduce((acc, curr) => acc + curr.alcance, 0) 
                      : 0
                    ).toFixed(2)}x
                  </td>
                  <td className="px-4 py-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedAudience && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAudience(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-6xl max-h-[90vh] bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    Pesquisa de Audiência
                  </h3>
                  <p className="text-zinc-400 text-sm mt-1">
                    Conjunto de Anúncios: <span className="text-yellow-500 font-medium">{selectedAudience.nome}</span> ({selectedAudience.leadsData?.length || 0} leads com respostas)
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedAudience(null)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
                <PesquisaAudiencia data={selectedAudience.leadsData || []} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

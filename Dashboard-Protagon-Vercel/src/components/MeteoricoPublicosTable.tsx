import React, { useState, useMemo } from 'react';
import { ExternalLink, ArrowUpDown, FileSearch, Search, Users, DollarSign, Award, Target } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/format';
import { PesquisaRow } from '../types';

export interface PublicoDataRow {
  nome: string;
  investimento: number;
  impressoes: number;
  cliques: number;
  leads: number;
  custoPorLead: number;
  mqls: number;
  custoPorMql: number;
  qualificacao: number;
  pesquisa: PesquisaRow[];
}

interface MeteoricoPublicosTableProps {
  data: PublicoDataRow[];
  onViewPesquisa: (publico: { nome: string; pesquisa: PesquisaRow[] }) => void;
}

export function MeteoricoPublicosTable({ data, onViewPesquisa }: MeteoricoPublicosTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof PublicoDataRow>('investimento');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(item => item.nome.toLowerCase().includes(term));
  }, [data, searchTerm]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      const aNum = Number(aVal) || 0;
      const bNum = Number(bVal) || 0;
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    });
  }, [filteredData, sortField, sortDirection]);

  const handleSort = (field: keyof PublicoDataRow) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const totals = useMemo(() => {
    const totalInvestimento = filteredData.reduce((acc, curr) => acc + curr.investimento, 0);
    const totalLeads = filteredData.reduce((acc, curr) => acc + curr.leads, 0);
    const totalMqls = filteredData.reduce((acc, curr) => acc + curr.mqls, 0);
    const cpl = totalLeads > 0 ? totalInvestimento / totalLeads : 0;
    const cpmql = totalMqls > 0 ? totalInvestimento / totalMqls : 0;
    const qual = totalLeads > 0 ? (totalMqls / totalLeads) * 100 : 0;
    return {
      totalInvestimento,
      totalLeads,
      totalMqls,
      cpl,
      cpmql,
      qual
    };
  }, [filteredData]);

  // Color scale helper for Qualificação
  const getQualificacaoColor = (qual: number) => {
    if (qual >= 40) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (qual >= 20) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    if (qual > 0) return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    return 'text-zinc-500 bg-zinc-800/20 border-white/5';
  };

  return (
    <div className="space-y-4">
      {/* Search and Summary cards */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome do público / conjunto..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-white/5 self-start sm:self-auto">
          <span>Total de públicos: <strong className="text-white font-mono">{filteredData.length}</strong></span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-950/80 border-b border-white/5 text-zinc-400 font-semibold uppercase tracking-wider select-none">
                <th
                  onClick={() => handleSort('nome')}
                  className="p-3.5 cursor-pointer hover:text-white transition-colors min-w-[320px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Público</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === 'nome' ? 'text-yellow-500' : 'text-zinc-600'}`} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('investimento')}
                  className="p-3.5 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Investimento</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === 'investimento' ? 'text-yellow-500' : 'text-zinc-600'}`} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('leads')}
                  className="p-3.5 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Leads</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === 'leads' ? 'text-yellow-500' : 'text-zinc-600'}`} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('custoPorLead')}
                  className="p-3.5 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Custo / Lead</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === 'custoPorLead' ? 'text-yellow-500' : 'text-zinc-600'}`} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('mqls')}
                  className="p-3.5 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>MQLs</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === 'mqls' ? 'text-yellow-500' : 'text-zinc-600'}`} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('custoPorMql')}
                  className="p-3.5 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Custo / MQL</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === 'custoPorMql' ? 'text-yellow-500' : 'text-zinc-600'}`} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('qualificacao')}
                  className="p-3.5 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Qualificação</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortField === 'qualificacao' ? 'text-yellow-500' : 'text-zinc-600'}`} />
                  </div>
                </th>
                <th className="p-3.5 text-center">
                  <span>Pesquisa</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedData.map((row, idx) => (
                <tr
                  key={row.nome + idx}
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="p-3.5 font-medium text-white max-w-[380px] break-words">
                    <span className="text-sm font-semibold text-white group-hover:text-yellow-400 transition-colors">
                      {row.nome}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-mono text-zinc-300 font-semibold">
                    {formatCurrency(row.investimento)}
                  </td>
                  <td className="p-3.5 text-right font-mono text-white font-bold">
                    {formatNumber(row.leads)}
                  </td>
                  <td className="p-3.5 text-right font-mono text-zinc-300">
                    {row.leads > 0 ? formatCurrency(row.custoPorLead) : '-'}
                  </td>
                  <td className="p-3.5 text-right font-mono text-purple-300 font-bold">
                    {formatNumber(row.mqls)}
                  </td>
                  <td className="p-3.5 text-right font-mono text-purple-200">
                    {row.mqls > 0 ? formatCurrency(row.custoPorMql) : '-'}
                  </td>
                  <td className="p-3.5 text-right font-mono">
                    <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-bold ${getQualificacaoColor(row.qualificacao)}`}>
                      {row.leads > 0 ? `${row.qualificacao.toFixed(1)}%` : '-'}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => onViewPesquisa({ nome: row.nome, pesquisa: row.pesquisa })}
                      disabled={row.pesquisa.length === 0}
                      title={row.pesquisa.length > 0 ? `Ver pesquisa (${row.pesquisa.length} leads)` : 'Sem respostas de pesquisa'}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        row.pesquisa.length > 0
                          ? 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 shadow-sm'
                          : 'bg-zinc-800/40 text-zinc-600 border border-white/5 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <FileSearch className="w-3.5 h-3.5" />
                      <span>{row.pesquisa.length}</span>
                    </button>
                  </td>
                </tr>
              ))}

              {sortedData.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500">
                    Nenhum público encontrado para o período e filtro selecionados.
                  </td>
                </tr>
              )}
            </tbody>
            {sortedData.length > 0 && (
              <tfoot>
                <tr className="bg-zinc-950 font-bold text-white border-t-2 border-white/10 select-none">
                  <td className="p-3.5 uppercase tracking-wider text-zinc-400">
                    Total Geral ({filteredData.length} públicos)
                  </td>
                  <td className="p-3.5 text-right font-mono text-yellow-400">
                    {formatCurrency(totals.totalInvestimento)}
                  </td>
                  <td className="p-3.5 text-right font-mono text-yellow-400">
                    {formatNumber(totals.totalLeads)}
                  </td>
                  <td className="p-3.5 text-right font-mono text-zinc-300">
                    {totals.totalLeads > 0 ? formatCurrency(totals.cpl) : '-'}
                  </td>
                  <td className="p-3.5 text-right font-mono text-purple-400">
                    {formatNumber(totals.totalMqls)}
                  </td>
                  <td className="p-3.5 text-right font-mono text-purple-300">
                    {totals.totalMqls > 0 ? formatCurrency(totals.cpmql) : '-'}
                  </td>
                  <td className="p-3.5 text-right font-mono text-emerald-400">
                    {totals.totalLeads > 0 ? `${totals.qual.toFixed(1)}%` : '-'}
                  </td>
                  <td className="p-3.5 text-center font-mono text-zinc-500">
                    -
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

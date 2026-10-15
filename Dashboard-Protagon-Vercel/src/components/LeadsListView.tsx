import React, { useState, useMemo } from 'react';
import { PesquisaRow } from '../types';
import { 
  Search, Download, Copy, Check, Phone, Mail, ExternalLink, 
  ChevronLeft, ChevronRight, Users, MessageSquare, Tag, 
  FileSpreadsheet, Filter, CheckCircle2, ArrowUpDown
} from 'lucide-react';
import { extractPublicoName } from '../utils/metricsCalculator';

interface LeadsListViewProps {
  leads: PesquisaRow[];
  title?: string;
  subtitle?: string;
}

export function LeadsListView({ leads = [], title, subtitle }: LeadsListViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageFilter, setPageFilter] = useState<string>('all');
  const [publicFilter, setPublicFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'data_hora' | 'nome' | 'email'>('data_hora');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getLeadPage = (r: PesquisaRow): string => {
    const str = `${r.utm_campaign || ''} ${r.pageurl || ''}`.toUpperCase();
    if (str.includes('LONGA') || str.includes('PG04') || str.includes('PG-04')) return 'PG04';
    if (str.includes('CAPTACAO-2') || str.includes('PG02') || str.includes('PG-02')) return 'PG02';
    if (str.includes('CAPTACAO-3') || str.includes('PG03') || str.includes('PG-03')) return 'PG03';
    if (str.includes('PG01') || str.includes('PG-01') || str.includes('CAPTACAO')) return 'PG01';
    return '-';
  };

  const formatCleanPhone = (phoneRaw: string): { display: string; link: string } => {
    if (!phoneRaw) return { display: '-', link: '' };
    const digits = String(phoneRaw).replace(/\D/g, '');
    if (!digits) return { display: '-', link: '' };
    
    // Build whatsapp link (Brazil numbers)
    let waNumber = digits;
    if (digits.length === 10 || digits.length === 11) {
      waNumber = `55${digits}`;
    }
    const link = `https://wa.me/${waNumber}`;

    // Pretty display
    let display = digits;
    if (digits.length === 11) {
      display = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else if (digits.length === 13 && digits.startsWith('55')) {
      const d = digits.slice(2);
      display = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    }

    return { display, link };
  };

  // Distinct available pages
  const availablePages = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => {
      const pg = getLeadPage(l);
      if (pg && pg !== '-') set.add(pg);
    });
    return Array.from(set).sort();
  }, [leads]);

  // Distinct available publics
  const availablePublics = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => {
      const pub = extractPublicoName(l.utm_term || '');
      if (pub && pub.length > 2) set.add(pub);
    });
    return Array.from(set).sort();
  }, [leads]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const nome = String(lead.nome || '').toLowerCase();
        const email = String(lead.email || '').toLowerCase();
        const num = String(lead.numero || '').toLowerCase();
        const utmTerm = String(lead.utm_term || '').toLowerCase();
        const utmContent = String(lead.utm_content || '').toLowerCase();
        const utmCamp = String(lead.utm_campaign || '').toLowerCase();
        const acao = String(lead.acao || '').toLowerCase();
        const pageurl = String(lead.pageurl || '').toLowerCase();

        const match = 
          nome.includes(term) ||
          email.includes(term) ||
          num.includes(term) ||
          utmTerm.includes(term) ||
          utmContent.includes(term) ||
          utmCamp.includes(term) ||
          acao.includes(term) ||
          pageurl.includes(term);

        if (!match) return false;
      }

      // Page filter
      if (pageFilter !== 'all') {
        const pg = getLeadPage(lead);
        if (pg !== pageFilter) return false;
      }

      // Public filter
      if (publicFilter !== 'all') {
        const pub = extractPublicoName(lead.utm_term || '');
        if (pub !== publicFilter) return false;
      }

      return true;
    });
  }, [leads, searchTerm, pageFilter, publicFilter]);

  // Sorted leads
  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (sortField === 'data_hora') {
        const comp = String(valA).localeCompare(String(valB));
        return sortOrder === 'asc' ? comp : -comp;
      }
      const comp = String(valA).localeCompare(String(valB));
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [filteredLeads, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedLeads.slice(start, start + pageSize);
  }, [sortedLeads, currentPage, pageSize]);

  // Stats
  const stats = useMemo(() => {
    const withPhone = leads.filter(l => l.numero && String(l.numero).replace(/\D/g, '').length >= 8).length;
    const withPublic = leads.filter(l => l.utm_term && l.utm_term.trim() !== '').length;
    const withContent = leads.filter(l => l.utm_content && l.utm_content.trim() !== '').length;
    return {
      total: leads.length,
      withPhone,
      withPublic,
      withContent
    };
  }, [leads]);

  // Copy all emails
  const handleCopyAllEmails = () => {
    const emails = Array.from(new Set(filteredLeads.map(l => l.email).filter(Boolean))).join(', ');
    handleCopy(emails, 'all-emails');
  };

  // Copy all phones
  const handleCopyAllPhones = () => {
    const phones = Array.from(new Set(filteredLeads.map(l => l.numero).filter(Boolean))).join(', ');
    handleCopy(phones, 'all-phones');
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLeads.length === 0) return;
    const headers = ['Data/Hora', 'Nome', 'Email', 'Telefone', 'Página', 'Público (utm_term)', 'Criativo (utm_content)', 'Campanha', 'Origem (utm_source)', 'Mídia (utm_medium)', 'URL de Destino', 'Renda'];
    const rows = filteredLeads.map(l => [
      `"${String(l.data_hora || '').replace(/"/g, '""')}"`,
      `"${String(l.nome || '').replace(/"/g, '""')}"`,
      `"${String(l.email || '').replace(/"/g, '""')}"`,
      `"${String(l.numero || '').replace(/"/g, '""')}"`,
      `"${getLeadPage(l)}"`,
      `"${String(extractPublicoName(l.utm_term || '') || l.utm_term || '').replace(/"/g, '""')}"`,
      `"${String(l.utm_content || '').replace(/"/g, '""')}"`,
      `"${String(l.utm_campaign || '').replace(/"/g, '""')}"`,
      `"${String(l.utm_source || '').replace(/"/g, '""')}"`,
      `"${String(l.utm_medium || '').replace(/"/g, '""')}"`,
      `"${String(l.pageurl || '').replace(/"/g, '""')}"`,
      `"${String(l.renda || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_meteórico_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Total de Leads</p>
            <p className="text-xl font-bold font-mono text-white mt-0.5">{stats.total.toLocaleString('pt-BR')}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/5 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Com WhatsApp</p>
            <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{stats.withPhone.toLocaleString('pt-BR')}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Phone size={18} />
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/5 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Com Público</p>
            <p className="text-xl font-bold font-mono text-blue-400 mt-0.5">{stats.withPublic.toLocaleString('pt-BR')}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Tag size={18} />
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/5 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Com Anúncio</p>
            <p className="text-xl font-bold font-mono text-purple-400 mt-0.5">{stats.withContent.toLocaleString('pt-BR')}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <FileSpreadsheet size={18} />
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters, and Bulk Export Actions */}
      <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          {/* Live Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por nome, email, whatsapp, público, anúncio..."
              className="w-full pl-9 pr-8 py-2 bg-zinc-950 border border-white/10 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Page Filter */}
          {availablePages.length > 1 && (
            <select
              value={pageFilter}
              onChange={(e) => {
                setPageFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-zinc-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-yellow-500/50"
            >
              <option value="all">Todas as Páginas</option>
              {availablePages.map(pg => (
                <option key={pg} value={pg}>{pg}</option>
              ))}
            </select>
          )}

          {/* Public Filter */}
          {availablePublics.length > 1 && (
            <select
              value={publicFilter}
              onChange={(e) => {
                setPublicFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-zinc-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-yellow-500/50 max-w-[200px] truncate"
            >
              <option value="all">Todos os Públicos</option>
              {availablePublics.map(pub => (
                <option key={pub} value={pub}>{pub}</option>
              ))}
            </select>
          )}
        </div>

        {/* Action Buttons: Copy / Export */}
        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          <button
            onClick={handleCopyAllEmails}
            title="Copiar todos os e-mails filtrados"
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/5"
          >
            {copiedId === 'all-emails' ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400">E-mails Copiados!</span>
              </>
            ) : (
              <>
                <Mail size={13} />
                <span>Copiar E-mails</span>
              </>
            )}
          </button>

          <button
            onClick={handleCopyAllPhones}
            title="Copiar todos os telefones filtrados"
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/5"
          >
            {copiedId === 'all-phones' ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400">Telefones Copiados!</span>
              </>
            ) : (
              <>
                <Phone size={13} />
                <span>Copiar Telefones</span>
              </>
            )}
          </button>

          <button
            onClick={handleExportCSV}
            title="Baixar lista completa em formato CSV para Excel"
            className="px-3 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 hover:text-yellow-300 border border-yellow-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download size={13} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Main Leads Table */}
      <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-950/80 border-b border-white/5 text-zinc-400 font-semibold uppercase tracking-wider select-none">
                <th className="p-3 w-12 text-center text-zinc-500">#</th>
                <th className="p-3 cursor-pointer hover:text-white transition-colors" onClick={() => {
                  setSortField('data_hora');
                  setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                }}>
                  <div className="flex items-center gap-1">
                    <span>Data/Hora</span>
                    <ArrowUpDown size={12} className={sortField === 'data_hora' ? 'text-yellow-500' : 'text-zinc-600'} />
                  </div>
                </th>
                <th className="p-3 cursor-pointer hover:text-white transition-colors" onClick={() => {
                  setSortField('nome');
                  setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                }}>
                  <div className="flex items-center gap-1">
                    <span>Nome</span>
                    <ArrowUpDown size={12} className={sortField === 'nome' ? 'text-yellow-500' : 'text-zinc-600'} />
                  </div>
                </th>
                <th className="p-3 min-w-[200px]">Contato</th>
                <th className="p-3 text-center">Página</th>
                <th className="p-3 min-w-[180px]">Público (utm_term)</th>
                <th className="p-3 min-w-[200px]">Criativo (utm_content)</th>
                <th className="p-3 min-w-[180px]">Campanha / Origem</th>
                <th className="p-3 text-right">Renda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedLeads.length > 0 ? (
                paginatedLeads.map((lead, idx) => {
                  const absoluteIdx = (currentPage - 1) * pageSize + idx + 1;
                  const pg = getLeadPage(lead);
                  const publicName = extractPublicoName(lead.utm_term || '') || lead.utm_term || '-';
                  const adName = lead.utm_content || '-';
                  const phoneInfo = formatCleanPhone(lead.numero);

                  return (
                    <tr key={lead.email + idx} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-3 text-center text-zinc-500 font-mono text-[11px]">
                        {absoluteIdx}
                      </td>

                      <td className="p-3 text-zinc-300 font-mono text-[11px] whitespace-nowrap">
                        {lead.data_hora || '-'}
                      </td>

                      <td className="p-3 font-semibold text-white whitespace-nowrap">
                        {lead.nome || '-'}
                      </td>

                      <td className="p-3">
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center gap-1.5 text-zinc-300">
                              <Mail size={12} className="text-zinc-500 shrink-0" />
                              <span className="truncate max-w-[180px]" title={lead.email}>{lead.email}</span>
                              <button
                                onClick={() => handleCopy(lead.email, `mail-${absoluteIdx}`)}
                                title="Copiar e-mail"
                                className="text-zinc-500 hover:text-white p-0.5 rounded transition-colors"
                              >
                                {copiedId === `mail-${absoluteIdx}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                              </button>
                            </div>
                          )}

                          {lead.numero && (
                            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                              <Phone size={11} className="text-zinc-500 shrink-0" />
                              <span className="font-mono">{phoneInfo.display}</span>
                              {phoneInfo.link && (
                                <a
                                  href={phoneInfo.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Abrir no WhatsApp"
                                  className="text-emerald-400 hover:text-emerald-300 p-0.5 transition-colors"
                                >
                                  <ExternalLink size={11} />
                                </a>
                              )}
                              <button
                                onClick={() => handleCopy(lead.numero, `phone-${absoluteIdx}`)}
                                title="Copiar telefone"
                                className="text-zinc-500 hover:text-white p-0.5 rounded transition-colors"
                              >
                                {copiedId === `phone-${absoluteIdx}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          pg === 'PG04' 
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                            : pg === 'PG01'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-zinc-800 text-zinc-400 border border-white/5'
                        }`}>
                          {pg}
                        </span>
                      </td>

                      <td className="p-3 text-zinc-300 max-w-[200px] break-words">
                        <span className="font-medium text-white group-hover:text-yellow-400 transition-colors" title={lead.utm_term}>
                          {publicName}
                        </span>
                      </td>

                      <td className="p-3 text-zinc-300 max-w-[240px] truncate" title={lead.utm_content}>
                        {adName}
                      </td>

                      <td className="p-3 max-w-[200px]">
                        <p className="text-[11px] text-zinc-400 truncate" title={lead.utm_campaign}>
                          {lead.utm_campaign || lead.acao || '-'}
                        </p>
                        {lead.utm_source && (
                          <span className="inline-block mt-0.5 text-[10px] text-zinc-500 bg-white/5 px-1.5 py-0.2 rounded font-mono">
                            {lead.utm_source} {lead.utm_medium ? `(${lead.utm_medium})` : ''}
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right text-zinc-400 whitespace-nowrap font-medium">
                        {lead.renda && lead.renda.trim() !== '' ? (
                          <span className="text-emerald-400 font-semibold">{lead.renda}</span>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-zinc-500">
                    Nenhum lead encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-zinc-950/60 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-3">
            <span>
              Mostrando <strong className="text-white font-mono">{paginatedLeads.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> a <strong className="text-white font-mono">{Math.min(currentPage * pageSize, sortedLeads.length)}</strong> de <strong className="text-white font-mono">{sortedLeads.length}</strong> leads
            </span>
            <div className="flex items-center gap-1.5 pl-3 border-l border-white/10">
              <span className="text-zinc-500">Linhas por página:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-zinc-900 border border-white/10 rounded text-xs text-white focus:outline-none"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 text-white transition-colors flex items-center gap-1"
            >
              <ChevronLeft size={14} />
              <span>Anterior</span>
            </button>
            <span className="px-2 text-zinc-300 font-mono">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 text-white transition-colors flex items-center gap-1"
            >
              <span>Próxima</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

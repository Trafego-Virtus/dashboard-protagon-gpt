import React, { useState } from 'react';
import { formatCurrency, formatNumber } from '../utils/format';

export interface FunilPageItem {
  page: string;
  investimento: number;
  impressoes: number;
  cliques: number;
  pageViews: number;
  leads: number;
  mqls: number;
  cpm: number;
  ctr: number;
  cpc: number;
  connectRate: number;
  conversaoPagina: number;
  custoPorLead: number;
  qualificacao: number;
  cpmql: number;
}

interface MeteoricoFunilViewProps {
  pages?: FunilPageItem[];
}

export const MeteoricoFunilView: React.FC<MeteoricoFunilViewProps> = ({ pages = [] }) => {
  // Ensure GERAL is included as the fifth/last button if multiple pages exist
  const allPages = React.useMemo(() => {
    if (!pages || pages.length === 0) return [];
    if (pages.some(p => p.page.toUpperCase() === 'GERAL')) {
      const specific = pages.filter(p => p.page.toUpperCase() !== 'GERAL').sort((a, b) => a.page.localeCompare(b.page));
      const geral = pages.find(p => p.page.toUpperCase() === 'GERAL')!;
      return [...specific, geral];
    }
    if (pages.length > 1) {
      const totalInvestimento = pages.reduce((acc, p) => acc + (p.investimento || 0), 0);
      const totalImpressoes = pages.reduce((acc, p) => acc + (p.impressoes || 0), 0);
      const totalCliques = pages.reduce((acc, p) => acc + (p.cliques || 0), 0);
      const totalPageViews = pages.reduce((acc, p) => acc + (p.pageViews || 0), 0);
      const totalLeads = pages.reduce((acc, p) => acc + (p.leads || 0), 0);
      const totalMqls = pages.reduce((acc, p) => acc + (p.mqls || 0), 0);

      const cpm = totalImpressoes > 0 ? (totalInvestimento / totalImpressoes) * 1000 : 0;
      const ctr = totalImpressoes > 0 ? (totalCliques / totalImpressoes) * 100 : 0;
      const cpc = totalCliques > 0 ? totalInvestimento / totalCliques : 0;
      const connectRate = totalCliques > 0 ? (totalPageViews / totalCliques) * 100 : 0;
      const conversaoPagina = totalPageViews > 0 ? (totalLeads / totalPageViews) * 100 : 0;
      const custoPorLead = totalLeads > 0 ? totalInvestimento / totalLeads : 0;
      const qualificacao = totalLeads > 0 ? (totalMqls / totalLeads) * 100 : 0;
      const cpmql = totalMqls > 0 ? totalInvestimento / totalMqls : 0;

      const geralItem: FunilPageItem = {
        page: 'GERAL',
        investimento: totalInvestimento,
        impressoes: totalImpressoes,
        cliques: totalCliques,
        pageViews: totalPageViews,
        leads: totalLeads,
        mqls: totalMqls,
        cpm,
        ctr,
        cpc,
        connectRate,
        conversaoPagina,
        custoPorLead,
        qualificacao,
        cpmql
      };
      return [...pages, geralItem];
    }
    return pages;
  }, [pages]);

  const defaultPage = React.useMemo(() => {
    if (!allPages || allPages.length === 0) return '';
    const geral = allPages.find(p => p.page.toUpperCase() === 'GERAL');
    if (geral) return geral.page;
    return [...allPages].sort((a, b) => (b.leads || 0) - (a.leads || 0))[0]?.page || allPages[0].page;
  }, [allPages]);

  const [selectedPage, setSelectedPage] = useState<string>('');

  // If selectedPage is not in allPages, default to GERAL or the page with most leads
  const activePageKey = selectedPage && allPages.some(p => p.page === selectedPage)
    ? selectedPage
    : defaultPage;

  const activePageData = allPages.find(p => p.page === activePageKey);

  if (!allPages || allPages.length === 0) {
    return (
      <section className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8 pb-20">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-xl font-bold tracking-tight border-l-4 border-yellow-500 pl-3 uppercase">
            Meteórico - Funil por Página
          </h2>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-12 text-center text-zinc-400">
          <p className="text-lg font-medium text-zinc-300 mb-2">Nenhuma página PGX identificada</p>
          <p className="text-sm text-zinc-500">
            Não encontramos campanhas ou leads com identificador de página (ex: [PG01], [PG05]) no período e praça selecionados.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <h2 className="text-xl font-bold tracking-tight border-l-4 border-yellow-500 pl-3 uppercase">
          Meteórico - Funil por Página
        </h2>

        {/* Page Switcher Tabs */}
        {allPages.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap bg-zinc-900 p-1.5 rounded-xl border border-white/5">
            {allPages.map(p => {
              const isGeral = p.page.toUpperCase() === 'GERAL';
              return (
                <button
                  key={p.page}
                  onClick={() => setSelectedPage(p.page)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activePageKey === p.page
                      ? 'bg-yellow-500 text-zinc-950 shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {isGeral ? 'GERAL' : `FUNIL ${p.page}`}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {activePageData && (
        <div className="w-full flex flex-col items-center justify-center">
          {/* Header Title */}
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-6 text-center">
            {activePageData.page.toUpperCase() === 'GERAL'
              ? 'FUNIL GERAL (TODAS AS PÁGINAS)'
              : `FUNIL ${activePageData.page}`}
          </h3>

          {/* Funnel Container with central spine */}
          <div className="relative w-full max-w-xl flex flex-col items-center">
            {/* Center Dashed Vertical Line */}
            <div className="absolute left-1/2 top-10 bottom-10 -translate-x-1/2 w-0 border-l border-dashed border-zinc-700/60 pointer-events-none z-0" />

            {/* CARD 1: INVESTIMENTO */}
            <div className="relative z-10 w-full rounded-2xl border border-purple-500/30 bg-[#161124] p-6 text-center shadow-lg transition-all hover:border-purple-500/50">
              <p className="text-xs font-bold uppercase tracking-widest text-[#c084fc] mb-2">
                INVESTIMENTO
              </p>
              <p className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
                {formatCurrency(activePageData.investimento)}
              </p>
            </div>

            {/* CONNECTOR 1: CPM */}
            <div className="relative z-10 my-3 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-[#09090b] px-4 py-1.5 text-xs font-mono shadow-md">
              <span className="text-zinc-400 font-bold uppercase tracking-wider">CPM</span>
              <span className="text-emerald-400 font-bold">{formatCurrency(activePageData.cpm)}</span>
            </div>

            {/* CARD 2: IMPRESSÕES */}
            <div className="relative z-10 w-full rounded-2xl border border-purple-500/30 bg-[#161124] p-6 text-center shadow-lg transition-all hover:border-purple-500/50">
              <p className="text-xs font-bold uppercase tracking-widest text-[#c084fc] mb-2">
                IMPRESSÕES
              </p>
              <p className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
                {formatNumber(activePageData.impressoes)}
              </p>
            </div>

            {/* CONNECTOR 2: CTR | CPC */}
            <div className="relative z-10 my-3 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-[#09090b] px-4 py-1.5 text-xs font-mono shadow-md">
              <span className="text-zinc-400 font-bold uppercase tracking-wider">CTR</span>
              <span className="text-emerald-400 font-bold">{activePageData.ctr.toFixed(2)}%</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400 font-bold uppercase tracking-wider">CPC</span>
              <span className="text-emerald-400 font-bold">{formatCurrency(activePageData.cpc)}</span>
            </div>

            {/* CARD 3: CLIQUES NO LINK */}
            <div className="relative z-10 w-full rounded-2xl border border-sky-500/30 bg-[#0c1829] p-6 text-center shadow-lg transition-all hover:border-sky-500/50">
              <p className="text-xs font-bold uppercase tracking-widest text-[#38bdf8] mb-2">
                CLIQUES NO LINK
              </p>
              <p className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
                {formatNumber(activePageData.cliques)}
              </p>
            </div>

            {/* CONNECTOR 3: CONNECT RATE */}
            <div className="relative z-10 my-3 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-[#09090b] px-4 py-1.5 text-xs font-mono shadow-md">
              <span className="text-zinc-400 font-bold tracking-wider">Connect Rate</span>
              <span className="text-emerald-400 font-bold">{activePageData.connectRate.toFixed(2)}%</span>
            </div>

            {/* CARD 4: PAGE VIEWS (DESTINO) */}
            <div className="relative z-10 w-full rounded-2xl border border-sky-500/30 bg-[#0c1829] p-6 text-center shadow-lg transition-all hover:border-sky-500/50">
              <p className="text-xs font-bold uppercase tracking-widest text-[#38bdf8] mb-2">
                PAGE VIEWS (DESTINO)
              </p>
              <p className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
                {formatNumber(activePageData.pageViews)}
              </p>
            </div>

            {/* CONNECTOR 4: CONVERSÃO DA PÁGINA */}
            <div className="relative z-10 my-3 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-[#09090b] px-4 py-1.5 text-xs font-mono shadow-md">
              <span className="text-zinc-400 font-bold tracking-wider">Conversão da Página</span>
              <span className="text-emerald-400 font-bold">{activePageData.conversaoPagina.toFixed(2)}%</span>
            </div>

            {/* CARD 5: LEADS DO TRÁFEGO */}
            <div className="relative z-10 w-full rounded-2xl border border-indigo-500/30 bg-[#12162d] p-6 text-center shadow-lg transition-all hover:border-indigo-500/50">
              <p className="text-xs font-bold uppercase tracking-widest text-[#818cf8] mb-2">
                LEADS DO TRÁFEGO
              </p>
              <p className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
                {formatNumber(activePageData.leads)}
              </p>
              <div className="mt-3 inline-block rounded-full border border-[#4338ca]/50 bg-[#1e1b4b] px-3.5 py-1 text-xs font-mono text-indigo-300 shadow-sm">
                Custo por Lead: {formatCurrency(activePageData.custoPorLead)}
              </div>
            </div>

            {/* CONNECTOR 5: QUALIFICAÇÃO */}
            <div className="relative z-10 my-3 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-[#09090b] px-4 py-1.5 text-xs font-mono shadow-md">
              <span className="text-zinc-400 font-bold tracking-wider">Qualificação</span>
              <span className="text-emerald-400 font-bold">{activePageData.qualificacao.toFixed(2)}%</span>
            </div>

            {/* CARD 6: MQLS DO TRÁFEGO */}
            <div className="relative z-10 w-full rounded-2xl border border-purple-500/30 bg-[#161124] p-6 text-center shadow-lg transition-all hover:border-purple-500/50">
              <p className="text-xs font-bold uppercase tracking-widest text-[#c084fc] mb-2">
                MQLS DO TRÁFEGO
              </p>
              <p className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
                {formatNumber(activePageData.mqls)}
              </p>
              <div className="mt-3 inline-block rounded-full border border-[#6b21a8]/50 bg-[#2e1065] px-3.5 py-1 text-xs font-mono text-purple-300 shadow-sm">
                CPMQL: {formatCurrency(activePageData.cpmql)}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

import React, { useState } from 'react';
import { RawDashboardData } from '../utils/dataFetching';
import { parseDate, formatCurrency } from '../utils/format';
import { differenceInDays, format } from 'date-fns';
import { Loader2, Calculator, Info, ChevronDown, ChevronUp, AlertTriangle, Copy, Check, ExternalLink, Image as ImageIcon } from 'lucide-react';

interface Props {
  rawData: RawDashboardData;
}

interface SaleInfo {
  email: string;
  dataLead: Date;
  dataVenda: Date;
  cicloDias: number;
  gastoAcum: number;
  vendasAcum: number;
  cacPontual: number;
  observacao: string;
}

interface GroupedSale {
  criativo: string;
  criativoOriginal: string;
  vendasTotal: number;
  vendasCicloValido: number;
  gastoTotal: number;
  cacFinal: number;
  cicloMedio: number;
  permalink: string;
  thumbnail: string;
  vendas: SaleInfo[];
}

export function GDCacPontual({ rawData }: Props) {
  const [data, setData] = useState<GroupedSale[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleRow = (criativo: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(criativo)) {
      newExpanded.delete(criativo);
    } else {
      newExpanded.add(criativo);
    }
    setExpandedRows(newExpanded);
  };

  const handleCopy = (group: GroupedSale) => {
    const text = `Nome: ${group.criativoOriginal}\nLink: ${group.permalink || 'Sem link disponível'}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(group.criativo);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  const extractInfo = () => {
    setLoading(true);
    
    setTimeout(() => {
      const { geral = [], ingressos = [], gd = [] } = rawData;
      
      const gdLeads = geral.filter(l => {
        const atr = String(l['Atribuição'] || l['atribuição'] || l['atribuicao'] || '').toLowerCase();
        return atr.includes('demanda') || atr === 'geração de demanda' || atr === 'geracao de demanda';
      });

      const gdLeadsMap = new Map<string, any>();
      gdLeads.forEach(l => {
        const email = String(l.email).toLowerCase().trim();
        if (email) gdLeadsMap.set(email, l);
      });

      const sales: any[] = [];
      ingressos.forEach(sale => {
        const email = String(sale.email).toLowerCase().trim();
        if (gdLeadsMap.has(email)) {
           sales.push({ sale, lead: gdLeadsMap.get(email) });
        }
      });

      const adsList: { criativo: string, adId: string, data: number, gasto: number, permalink: string, thumbnail: string }[] = [];
      gd.forEach(ad => {
         const criativo = String(ad['NOME DO ANÚNCIO'] || ad['Nome do Anúncio'] || '').trim().toLowerCase();
         const adId = String(ad['ID ANÚNCIO'] || ad['Id Anúncio'] || ad['id anúncio'] || '').trim().toLowerCase();
         const dt = parseDate(ad['Data'] || ad['data']);
         if (!dt) return;
         
         const gastoStr = String(ad['Valor Gasto'] || '0').replace('R$', '').replace(/\./g, '').replace(',', '.');
         const gasto = parseFloat(gastoStr) || 0;
         
         const permalink = String(ad['Creative Instagram Permalink'] || '');
         const thumbnail = String(ad['Creative Thumbnail'] || '');
         
         if (gasto > 0 && (criativo || adId)) {
           adsList.push({ criativo, adId, data: dt.getTime(), gasto, permalink, thumbnail });
         }
      });

      const rawSalesInfo = sales.map(s => {
         const dataLead = parseDate(s.lead['data_hora'] || s.lead['Data']);
         const dataVenda = parseDate(s.sale['Data Compra'] || s.sale['data compra']);
         
         const utmContent = String(s.lead['utm_content'] || s.sale['Utm Content'] || '').trim();
         const utmTerm = String(s.lead['utm_term'] || s.sale['Utm Term'] || '').trim();
         
         let criativoOriginal = utmContent;
         if (!criativoOriginal && utmTerm) criativoOriginal = utmTerm;
         
         const criativo = criativoOriginal.toLowerCase();
         
         return {
           criativoOriginal,
           criativo,
           email: s.lead.email,
           dataLead,
           dataVenda
         };
      }).filter(s => s.dataLead && s.dataVenda && s.criativo);

      const groupedMap = new Map<string, GroupedSale>();

      const individualSales = rawSalesInfo.map(s => {
         const leadTime = s.dataLead.getTime();
         
         let gastoAcum = 0;
         adsList.forEach(ad => {
           const match = (ad.criativo && s.criativo.includes(ad.criativo)) || 
                         (s.criativo && ad.criativo.includes(s.criativo)) ||
                         (ad.adId && s.criativo === ad.adId);
                         
           if (match && ad.data <= leadTime) {
             gastoAcum += ad.gasto;
           }
         });

         let vendasAcum = 0;
         rawSalesInfo.forEach(otherS => {
           if (otherS.criativo === s.criativo && otherS.dataLead.getTime() <= leadTime) {
             vendasAcum++;
           }
         });

         const cicloDias = differenceInDays(s.dataVenda, s.dataLead);
         const cacPontual = vendasAcum > 0 ? gastoAcum / vendasAcum : 0;
         
         let observacao = "Conversão Padrão";
         if (cicloDias < 0) {
           observacao = "Venda anterior ao Lead (Compra direta ou re-cadastro)";
         } else if (cicloDias === 0) {
           observacao = "Conversão no mesmo dia";
         }

         return {
           ...s,
           cicloDias,
           gastoAcum,
           vendasAcum,
           cacPontual,
           observacao
         };
      });

      individualSales.forEach(s => {
         if (!groupedMap.has(s.criativo)) {
            let gastoTotal = 0;
            let firstPermalink = "";
            let firstThumbnail = "";
            
            adsList.forEach(ad => {
               const match = (ad.criativo && s.criativo.includes(ad.criativo)) || 
                             (s.criativo && ad.criativo.includes(s.criativo)) ||
                             (ad.adId && s.criativo === ad.adId);
               if (match) {
                 gastoTotal += ad.gasto;
                 if (ad.permalink && !firstPermalink) firstPermalink = ad.permalink;
                 if (ad.thumbnail && !firstThumbnail) firstThumbnail = ad.thumbnail;
               }
            });

            groupedMap.set(s.criativo, {
               criativo: s.criativo,
               criativoOriginal: s.criativoOriginal || s.criativo,
               vendasTotal: 0,
               vendasCicloValido: 0,
               gastoTotal,
               cacFinal: 0,
               cicloMedio: 0,
               permalink: firstPermalink,
               thumbnail: firstThumbnail,
               vendas: []
            });
         }
         
         const group = groupedMap.get(s.criativo)!;
         group.vendas.push(s);
         group.vendasTotal += 1;
         if (s.cicloDias >= 0) {
           group.cicloMedio += s.cicloDias;
           group.vendasCicloValido += 1;
         }
      });

      const groupedArray = Array.from(groupedMap.values()).map(g => {
         g.cicloMedio = g.vendasCicloValido > 0 ? Math.round(g.cicloMedio / g.vendasCicloValido) : 0;
         g.cacFinal = g.gastoTotal / g.vendasTotal;
         g.vendas.sort((a, b) => a.vendasAcum - b.vendasAcum);
         return g;
      });

      groupedArray.sort((a, b) => b.vendasTotal - a.vendasTotal);

      setData(groupedArray);
      setLoading(false);
    }, 600);
  };

  if (!data && !loading) {
     return (
       <div className="flex flex-col items-center justify-center min-h-[60vh] bg-zinc-900/50 border border-white/5 rounded-xl p-8">
         <div className="bg-yellow-500/10 p-4 rounded-full mb-6 text-yellow-500">
           <Calculator className="w-12 h-12" />
         </div>
         <h3 className="text-2xl font-bold text-white mb-4">CAC Pontual & Ciclo por Criativo</h3>
         <div className="max-w-2xl bg-zinc-950/50 p-6 rounded-lg border border-white/5 mb-8 text-zinc-400 space-y-4">
           <p className="flex items-start gap-3">
             <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
             <span className="text-sm">
               Essa ferramenta cruza a base de leads da <strong>Geração de Demanda</strong> com os dados de vendas, atribuindo o respectivo criativo (UTM).
             </span>
           </p>
           <p className="flex items-start gap-3">
             <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
             <span className="text-sm">
               Os resultados são <strong>agrupados por criativo</strong>. Ao expandir um criativo, você verá a miniatura, link e linha do tempo de vendas.
             </span>
           </p>
           <p className="flex items-start gap-3">
             <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
             <span className="text-sm">
               <strong>Atenção:</strong> Vendas que tiveram ciclos negativos (ex: o cliente comprou por outro link antes de virar lead) serão <strong>desconsideradas</strong> no cálculo do Ciclo Médio do criativo para não distorcer a métrica.
             </span>
           </p>
         </div>
         
         <button 
           onClick={extractInfo}
           className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg shadow-lg hover:shadow-yellow-500/20 transition-all flex items-center gap-2"
         >
           Extrair informações pontualmente
         </button>
       </div>
     );
  }

  if (loading) {
    return (
       <div className="flex flex-col items-center justify-center min-h-[60vh] bg-zinc-900/50 border border-white/5 rounded-xl p-8">
         <Loader2 className="w-10 h-10 text-yellow-500 animate-spin mb-4" />
         <p className="text-zinc-400">Processando, agrupando criativos e analisando ciclos...</p>
       </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight border-l-4 border-yellow-500 pl-3 uppercase text-white">CAC Pontual & Ciclo de Vendas</h2>
          <p className="text-sm text-zinc-400 mt-1">Análise agrupada por criativo das conversões e ciclos temporais.</p>
        </div>
        <button 
           onClick={() => setData(null)}
           className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg text-sm transition-all"
         >
           Nova extração
        </button>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-zinc-500 uppercase bg-zinc-950/80 border-b border-white/10 tracking-widest">
              <tr>
                <th className="px-4 py-3 font-semibold w-12">Visual</th>
                <th className="px-4 py-3 font-semibold">Criativo (UTM)</th>
                <th className="px-4 py-3 font-semibold text-center text-blue-400">Total Vendas</th>
                <th className="px-4 py-3 font-semibold text-center text-yellow-500/80">Ciclo Médio</th>
                <th className="px-4 py-3 font-semibold text-right">Total Investido Até Agora</th>
                <th className="px-4 py-3 font-semibold text-right text-emerald-400/80">CAC Médio Final</th>
                <th className="px-4 py-3 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data && data.length > 0 ? (
                data.map((group, i) => (
                  <React.Fragment key={i}>
                    <tr 
                      className={`border-b border-white/5 transition-colors cursor-pointer ${expandedRows.has(group.criativo) ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}
                      onClick={() => toggleRow(group.criativo)}
                    >
                      <td className="px-4 py-3">
                         {group.thumbnail ? (
                           <div className="w-10 h-10 rounded overflow-hidden border border-white/10 bg-zinc-800 flex-shrink-0">
                             <img src={group.thumbnail} alt={group.criativoOriginal} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                           </div>
                         ) : (
                           <div className="w-10 h-10 rounded border border-white/5 bg-zinc-800/50 flex items-center justify-center text-zinc-600">
                             <ImageIcon className="w-4 h-4" />
                           </div>
                         )}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs max-w-[240px] truncate text-white" title={group.criativoOriginal}>
                        {group.criativoOriginal}
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-blue-400 text-base">{group.vendasTotal}</td>
                      <td className="px-4 py-4 text-center text-yellow-500 font-medium">
                        {group.cicloMedio} {group.cicloMedio === 1 || group.cicloMedio === -1 ? 'dia' : 'dias'}
                      </td>
                      <td className="px-4 py-4 text-right text-zinc-400 font-mono">{formatCurrency(group.gastoTotal)}</td>
                      <td className="px-4 py-4 text-right font-mono font-bold text-emerald-400">{formatCurrency(group.cacFinal)}</td>
                      <td className="px-4 py-4 text-center">
                        <button className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                          {expandedRows.has(group.criativo) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                    
                    {expandedRows.has(group.criativo) && (
                      <tr className="bg-zinc-950/80 border-b border-white/5">
                        <td colSpan={7} className="p-0">
                          <div className="px-6 py-5 border-l-2 border-yellow-500/50 ml-4 my-2 flex flex-col xl:flex-row gap-6">
                            
                            {/* Card do Criativo */}
                            <div className="flex-shrink-0 w-full xl:w-72 bg-zinc-900 border border-white/10 rounded-lg p-4 flex flex-col gap-4">
                              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2">Detalhes do Anúncio</h4>
                              
                              <div className="flex gap-4">
                                {group.thumbnail ? (
                                  <div className="w-20 h-20 rounded border border-white/10 overflow-hidden bg-zinc-800 shadow-md">
                                    <img src={group.thumbnail} alt={group.criativoOriginal} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  </div>
                                ) : (
                                  <div className="w-20 h-20 rounded border border-white/5 bg-zinc-800/50 flex items-center justify-center text-zinc-600">
                                    <ImageIcon className="w-6 h-6" />
                                  </div>
                                )}
                                
                                <div className="flex flex-col flex-1 gap-2">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleCopy(group); }}
                                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-all duration-300 ${copiedId === group.criativo ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/5'}`}
                                  >
                                    {copiedId === group.criativo ? (
                                      <><Check className="w-3.5 h-3.5" /> Copiado!</>
                                    ) : (
                                      <><Copy className="w-3.5 h-3.5" /> Copiar Dados</>
                                    )}
                                  </button>
                                  
                                  {group.permalink ? (
                                    <a href={group.permalink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-all">
                                      <ExternalLink className="w-3.5 h-3.5" /> Ver Post
                                    </a>
                                  ) : (
                                    <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold bg-zinc-800/50 text-zinc-500 cursor-not-allowed">
                                      <ExternalLink className="w-3.5 h-3.5" /> Link Indisponível
                                    </div>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-zinc-400 font-mono break-words leading-relaxed mt-1">
                                {group.criativoOriginal}
                              </p>
                            </div>
                            
                            {/* Tabela de Vendas */}
                            <div className="flex-1">
                              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Linha do Tempo de Vendas</h4>
                              <div className="overflow-x-auto rounded border border-white/5 bg-zinc-900/50">
                                <table className="w-full text-xs text-left">
                                  <thead className="text-[10px] text-zinc-500 uppercase bg-zinc-900 border-b border-white/10">
                                    <tr>
                                      <th className="px-3 py-2">Lead / Cadastro</th>
                                      <th className="px-3 py-2">Venda Efetuada</th>
                                      <th className="px-3 py-2 text-center">Ciclo</th>
                                      <th className="px-3 py-2 text-right">Gasto até lead captada</th>
                                      <th className="px-3 py-2 text-center">Vendas vindas até então deste criativo</th>
                                      <th className="px-3 py-2 text-right text-emerald-400">CAC Pontual</th>
                                      <th className="px-3 py-2 text-yellow-500/80">Observação</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.vendas.map((venda, idx) => (
                                      <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="px-3 py-2 text-zinc-300 whitespace-nowrap">{format(venda.dataLead, 'dd/MM/yyyy')}</td>
                                        <td className="px-3 py-2 text-emerald-400 whitespace-nowrap">{format(venda.dataVenda, 'dd/MM/yyyy')}</td>
                                        <td className="px-3 py-2 text-center">
                                          <span className={`px-2 py-0.5 rounded-full ${venda.cicloDias < 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-yellow-500'}`}>
                                            {venda.cicloDias}d
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-right text-zinc-400 font-mono">{formatCurrency(venda.gastoAcum)}</td>
                                        <td className="px-3 py-2 text-center font-bold text-blue-400">{venda.vendasAcum}</td>
                                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400">{formatCurrency(venda.cacPontual)}</td>
                                        <td className="px-3 py-2">
                                          <span className={`text-[10px] ${venda.cicloDias < 0 ? 'text-red-400 font-medium' : 'text-zinc-500'}`}>
                                            {venda.observacao}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    Nenhuma venda com origem mapeada da Geração de Demanda encontrada.
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

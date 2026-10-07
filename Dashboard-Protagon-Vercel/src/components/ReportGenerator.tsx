import React, { useState } from 'react';
import { Copy, Loader2, Check, X } from 'lucide-react';
import { format, startOfToday, subDays } from 'date-fns';
import { fetchRawDashboardData } from '../utils/dataFetching';
import { processDashboardMetrics } from '../utils/metricsCalculator';
import { formatCurrency } from '../utils/format';
import { fetchQuizData } from '../utils/quizData';
import { calculateQuizMetrics } from '../utils/quizCalculator';
import { fetchWebinarioData } from '../utils/webinarioData';
import { calculateWebinarioMetrics } from '../utils/webinarioCalculator';
import { DashboardId } from '../utils/api';

export function ReportGenerator() {
  const [isGeneratingDaily, setIsGeneratingDaily] = useState(false);
  const [isGeneratingGeneral, setIsGeneratingGeneral] = useState(false);
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.prepend(textArea);
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setReportContent(null);
      }, 1500);
    } catch (e) {
      console.error("Clipboard copy failed:", e);
      alert('Erro ao copiar para a área de transferência.');
    }
  };

  const generateDailyReport = async () => {
    setIsGeneratingDaily(true);
    setSuccess(false);
    try {
      const nowBRT = new Date(new Date().getTime() - 3 * 3600 * 1000);
      const today = new Date(nowBRT.getFullYear(), nowBRT.getMonth(), nowBRT.getDate());
      const yesterday = subDays(today, 1);
      const last7DaysStart = subDays(today, 7);

      const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
      const last7DaysStartStr = format(last7DaysStart, 'yyyy-MM-dd');

      const cities = [
        { id: 'protagon-joinville', name: 'Joinville' },
        { id: 'protagon-cuiaba', name: 'Cuiabá' },
        { id: 'protagon-porto-alegre', name: 'Porto Alegre' },
        { id: 'protagon-sao-paulo', name: 'São Paulo' },
        { id: 'protagon-goiania', name: 'Goiânia' }
      ];

      let reportText = `📊 *Relatório Diário Protagon*\n📅 Data: ${format(yesterday, 'dd/MM/yyyy')}\n\n`;

      for (const city of cities) {
        const rawData = await fetchRawDashboardData(city.id as DashboardId);
        
        // Metrics for Yesterday
        const metricsYesterday = processDashboardMetrics(rawData, yesterdayStr, yesterdayStr);
        // Metrics for Last 7 days
        const metrics7Days = processDashboardMetrics(rawData, last7DaysStartStr, yesterdayStr);

        reportText += `🏢 *PRAÇA: ${city.name.toUpperCase()}*\n`;
        reportText += `💰 Investimento Total Ontem: ${formatCurrency(metricsYesterday.investimentoTotal)} (Média 7 dias: ${formatCurrency(metrics7Days.investimentoTotal / 7)}/dia)\n`;
        reportText += `🎟️ Ingressos Vendidos: ${metricsYesterday.ingressosVendidos} (Média 7 dias: ${(metrics7Days.ingressosVendidos / 7).toFixed(1)}/dia)\n\n`;

        // Subfunnels
        const subfunnels = [
          { key: 'meteorico', name: 'Meteórico', 
            invYest: metricsYesterday.meteorico?.investimento || 0, mqlsYest: metricsYesterday.meteorico?.mqls || 0, ingYest: metricsYesterday.meteorico?.ingressos || 0,
            inv7: metrics7Days.meteorico?.investimento || 0, mqls7: metrics7Days.meteorico?.mqls || 0, ing7: metrics7Days.meteorico?.ingressos || 0, creatives: metricsYesterday.creativesMET || [] },
          { key: 'vendaDireta', name: 'Venda Direta',
            invYest: metricsYesterday.vendaDireta?.investimento || 0, mqlsYest: metricsYesterday.vendaDireta?.mqls || 0, ingYest: metricsYesterday.vendaDireta?.ingressos || 0,
            inv7: metrics7Days.vendaDireta?.investimento || 0, mqls7: metrics7Days.vendaDireta?.mqls || 0, ing7: metrics7Days.vendaDireta?.ingressos || 0, creatives: metricsYesterday.creativesVD || [] },
          { key: 'demanda_geral', name: 'Geração de Demanda (Total)',
            invYest: metricsYesterday.demanda?.investimento || 0, mqlsYest: metricsYesterday.demanda?.mqls || 0, ingYest: metricsYesterday.demanda?.ingressos || 0,
            inv7: metrics7Days.demanda?.investimento || 0, mqls7: metrics7Days.demanda?.mqls || 0, ing7: metrics7Days.demanda?.ingressos || 0, creatives: [] },
          { key: 'form', name: 'Ger. Demanda (Form)',
            invYest: metricsYesterday.demanda?.formNativo?.investimento || 0, mqlsYest: metricsYesterday.demanda?.formNativo?.mqls || 0, ingYest: metricsYesterday.demanda?.formNativo?.ingressos || 0,
            inv7: metrics7Days.demanda?.formNativo?.investimento || 0, mqls7: metrics7Days.demanda?.formNativo?.mqls || 0, ing7: metrics7Days.demanda?.formNativo?.ingressos || 0, creatives: metricsYesterday.creativesForm || [] },
          { key: 'captura', name: 'Ger. Demanda (Captura)',
            invYest: metricsYesterday.demanda?.captura?.investimento || 0, mqlsYest: metricsYesterday.demanda?.captura?.mqls || 0, ingYest: metricsYesterday.demanda?.captura?.ingressos || 0,
            inv7: metrics7Days.demanda?.captura?.investimento || 0, mqls7: metrics7Days.demanda?.captura?.mqls || 0, ing7: metrics7Days.demanda?.captura?.ingressos || 0, creatives: metricsYesterday.creativesCaptura || [] },
          { key: 'distribuicao', name: 'Distribuição de Conteúdo',
            invYest: metricsYesterday.distribuicao?.investimento || 0, mqlsYest: 0, ingYest: 0,
            inv7: metrics7Days.distribuicao?.investimento || 0, mqls7: 0, ing7: 0, creatives: [] }
        ];

        for (const fun of subfunnels) {
          if (fun.invYest > 0 || fun.mqlsYest > 0 || fun.inv7 > 0 || fun.mqls7 > 0 || fun.ingYest > 0) {
            reportText += `🔸 *${fun.name}*\n`;
            reportText += `Investimento Ontem: ${formatCurrency(fun.invYest)} (Média 7 dias: ${formatCurrency(fun.inv7 / 7)}/dia)\n`;
            if (fun.key !== 'distribuicao') {
              reportText += `MQLs Ontem: ${fun.mqlsYest} (Média 7 dias: ${(fun.mqls7 / 7).toFixed(1)}/dia)\n`;
              reportText += `Custo por MQL Ontem: ${formatCurrency(fun.mqlsYest > 0 ? fun.invYest / fun.mqlsYest : 0)}\n`;
              reportText += `Ingressos Ontem: ${fun.ingYest} (Média 7 dias: ${(fun.ing7 / 7).toFixed(1)}/dia)\n`;
            }
            
            // Top 3 Creatives
            if (fun.mqlsYest > 0 && fun.creatives && fun.creatives.length > 0) {
              const topCreatives = [...fun.creatives]
                .filter(c => c.mqls > 0 && c.investimento > 0 && !c.nome.toLowerCase().includes('link in bio') && !c.nome.toLowerCase().includes('link_in_bio') && !c.nome.toLowerCase().includes('organic'))
                .sort((a, b) => {
                  if (b.mqls !== a.mqls) return b.mqls - a.mqls;
                  const cpaA = a.investimento / a.mqls;
                  const cpaB = b.investimento / b.mqls;
                  return cpaA - cpaB;
                })
                .slice(0, 3);
              
              if (topCreatives.length > 0) {
                reportText += `\n🏆 Top ${topCreatives.length} Criativos Ontem:\n\n`;
                topCreatives.forEach((c, idx) => {
                  reportText += `${idx + 1}. ${c.nome}\n`;
                  reportText += `Investimento Ontem: ${formatCurrency(c.investimento)} | MQLs Ontem: ${c.mqls} | Custo por MQL Ontem: ${formatCurrency(c.mqls > 0 ? c.investimento / c.mqls : 0)}\n`;
                  if (c.link) reportText += `🔗 Link: ${c.link}\n`;
                  reportText += `\n`;
                });
              }
            }
            reportText += `\n`;
          }
        }
        reportText += `------------------------\n\n`;
      }

      // Add Quiz and Webinario
      const quizRaw = await fetchQuizData();
      const webRaw = await fetchWebinarioData();

      const quizYest = calculateQuizMetrics(quizRaw, yesterdayStr, yesterdayStr);
      const quiz7 = calculateQuizMetrics(quizRaw, last7DaysStartStr, yesterdayStr);

      const webYest = calculateWebinarioMetrics(webRaw, yesterdayStr, yesterdayStr);
      const web7 = calculateWebinarioMetrics(webRaw, last7DaysStartStr, yesterdayStr);

      reportText += `📱 *PERPÉTUO - QUIZ*\n`;
      reportText += `Investimento Ontem: ${formatCurrency(quizYest.resumo.investimento)} (Média 7 dias: ${formatCurrency(quiz7.resumo.investimento / 7)}/dia)\n`;
      reportText += `Leads Ontem: ${quizYest.resumo.leads} (Média 7 dias: ${(quiz7.resumo.leads / 7).toFixed(1)}/dia)\n`;
      reportText += `CPL Ontem: ${formatCurrency(quizYest.resumo.cpl)} (Média 7 dias: ${formatCurrency(quiz7.resumo.leads > 0 ? quiz7.resumo.investimento / quiz7.resumo.leads : 0)})\n`;
      reportText += `MQLs Ontem: ${quizYest.resumo.mqls} (Média 7 dias: ${(quiz7.resumo.mqls / 7).toFixed(1)}/dia)\n`;
      reportText += `Custo por MQL Ontem: ${formatCurrency(quizYest.resumo.cpmql)} (Média 7 dias: ${formatCurrency(quiz7.resumo.mqls > 0 ? quiz7.resumo.investimento / quiz7.resumo.mqls : 0)})\n`;
      reportText += `------------------------\n\n`;

      reportText += `🖥️ *PERPÉTUO - WEBNÁRIO*\n`;
      reportText += `Investimento Ontem: ${formatCurrency(webYest.resumo.investimento)} (Média 7 dias: ${formatCurrency(web7.resumo.investimento / 7)}/dia)\n`;
      reportText += `Leads Ontem: ${webYest.resumo.leads} (Média 7 dias: ${(web7.resumo.leads / 7).toFixed(1)}/dia)\n`;
      reportText += `CPL Ontem: ${formatCurrency(webYest.resumo.cpl)} (Média 7 dias: ${formatCurrency(web7.resumo.leads > 0 ? web7.resumo.investimento / web7.resumo.leads : 0)})\n`;
      reportText += `MQLs Ontem: ${webYest.resumo.mqls} (Média 7 dias: ${(web7.resumo.mqls / 7).toFixed(1)}/dia)\n`;
      reportText += `Custo por MQL Ontem: ${formatCurrency(webYest.resumo.cpmql)} (Média 7 dias: ${formatCurrency(web7.resumo.mqls > 0 ? web7.resumo.investimento / web7.resumo.mqls : 0)})\n`;
      reportText += `------------------------\n\n`;

      setReportContent(reportText);
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar relatório.');
    } finally {
      setIsGeneratingDaily(false);
    }
  };

  
  const generateGeneralReport = async () => {
    setIsGeneratingGeneral(true);
    setSuccess(false);
    try {
      const nowBRT = new Date(new Date().getTime() - 3 * 3600 * 1000);
      const today = new Date(nowBRT.getFullYear(), nowBRT.getMonth(), nowBRT.getDate());
      const todayStr = format(today, 'yyyy-MM-dd');
      const startStr = '2020-01-01';

      const cities = [
        { id: 'protagon-joinville', name: 'Joinville' },
        { id: 'protagon-cuiaba', name: 'Cuiabá' },
        { id: 'protagon-porto-alegre', name: 'Porto Alegre' },
        { id: 'protagon-sao-paulo', name: 'São Paulo' },
        { id: 'protagon-goiania', name: 'Goiânia' }
      ];

      let reportText = `📊 *Relatório Geral Protagon*\n📅 Até: ${format(today, 'dd/MM/yyyy')}\n\n`;

      for (const city of cities) {
        const rawData = await fetchRawDashboardData(city.id as DashboardId);

        const metricsAll = processDashboardMetrics(rawData, startStr, todayStr);

        reportText += `🏢 *PRAÇA: ${city.name.toUpperCase()}*\n`;
        reportText += `💰 Investimento Total: ${formatCurrency(metricsAll.investimentoTotal)}\n`;
        reportText += `💵 Faturamento Total: ${formatCurrency(metricsAll.faturamentoTotal)}\n`;
        
        const roasGlobal = metricsAll.investimentoTotal > 0 ? metricsAll.faturamentoTotal / metricsAll.investimentoTotal : 0;
        reportText += `📈 ROAS Global: ${roasGlobal.toFixed(2)}\n`;
        reportText += `🎟️ Total de Ingressos: ${metricsAll.totalIngressos || metricsAll.ingressosVendidos}\n\n`;

        // Subfunnels
        const subfunnels = [
          { key: 'meteorico', name: 'Meteórico', inv: metricsAll.meteorico?.investimento || 0, mqls: metricsAll.meteorico?.mqls || 0, ing: metricsAll.meteorico?.ingressos || 0 },
          { key: 'vendaDireta', name: 'Venda Direta', inv: metricsAll.vendaDireta?.investimento || 0, mqls: metricsAll.vendaDireta?.mqls || 0, ing: metricsAll.vendaDireta?.ingressos || 0, ingOrg: metricsAll.vendaDireta?.ingressosOrganico || 0, ingTraf: metricsAll.vendaDireta?.ingressosTrafego || 0 },
          { key: 'demanda_geral', name: 'Geração de Demanda (Total)', inv: metricsAll.demanda?.investimento || 0, mqls: metricsAll.demanda?.mqls || 0, ing: metricsAll.demanda?.ingressos || 0 },
          { key: 'form', name: 'Ger. Demanda (Form)', inv: metricsAll.demanda?.formNativo?.investimento || 0, mqls: metricsAll.demanda?.formNativo?.mqls || 0, ing: metricsAll.demanda?.formNativo?.ingressos || 0 },
          { key: 'captura', name: 'Ger. Demanda (Captura)', inv: metricsAll.demanda?.captura?.investimento || 0, mqls: metricsAll.demanda?.captura?.mqls || 0, ing: metricsAll.demanda?.captura?.ingressos || 0 },
          { key: 'distribuicao', name: 'Distribuição de Conteúdo', inv: metricsAll.distribuicao?.investimento || 0, mqls: 0, ing: 0 }
        ];

        for (const fun of subfunnels) {
          if (fun.inv > 0 || fun.ing > 0) {
            reportText += `🔸 *${fun.name}*\n`;
            reportText += `Investimento: ${formatCurrency(fun.inv)}\n`;
            if (fun.key !== 'distribuicao') {
              if (fun.key === 'vendaDireta') {
                reportText += `Ingressos: ${fun.ing} (Orgânico: ${fun.ingOrg || 0} | Pago: ${fun.ingTraf || 0})\n`;
              } else {
                reportText += `Ingressos: ${fun.ing}\n`;
              }
              reportText += `CAC Ingresso: ${formatCurrency(fun.ing > 0 ? fun.inv / fun.ing : 0)}\n`;
            }
            reportText += `\n`;
          }
        }
        reportText += `------------------------\n\n`;
      }

      // Add Quiz and Webinario
      const quizRaw = await fetchQuizData();
      const webRaw = await fetchWebinarioData();

      const quizAll = calculateQuizMetrics(quizRaw, startStr, todayStr);
      const webAll = calculateWebinarioMetrics(webRaw, startStr, todayStr);

      reportText += `📱 *PERPÉTUO - QUIZ*\n`;
      reportText += `Investimento Total: ${formatCurrency(quizAll.resumo.investimento)}\n`;
      reportText += `Total de Leads: ${quizAll.resumo.leads}\n`;
      reportText += `CPL Global: ${formatCurrency(quizAll.resumo.cpl)}\n`;
      reportText += `Total de MQLs: ${quizAll.resumo.mqls}\n`;
      reportText += `Custo por MQL Global: ${formatCurrency(quizAll.resumo.cpmql)}\n`;
      reportText += `------------------------\n\n`;

      reportText += `🖥️ *PERPÉTUO - WEBNÁRIO*\n`;
      reportText += `Investimento Total: ${formatCurrency(webAll.resumo.investimento)}\n`;
      reportText += `Total de Leads: ${webAll.resumo.leads}\n`;
      reportText += `CPL Global: ${formatCurrency(webAll.resumo.cpl)}\n`;
      reportText += `Total de MQLs: ${webAll.resumo.mqls}\n`;
      reportText += `Custo por MQL Global: ${formatCurrency(webAll.resumo.cpmql)}\n`;
      reportText += `------------------------\n\n`;

      setReportContent(reportText);
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar relatório.');
    } finally {
      setIsGeneratingGeneral(false);
    }
  };

  return (
    <>
      
      <div className="flex flex-col gap-2 mt-4">
        <button
          onClick={generateDailyReport}
          disabled={isGeneratingDaily || isGeneratingGeneral}
          className={`px-3 py-2 w-full rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md bg-[#18181b] text-white hover:bg-[#27272a] border border-white/10`}
        >
          {isGeneratingDaily ? (
            <Loader2 size={16} className="animate-spin text-yellow-500" />
          ) : (
            <Copy size={16} className="text-yellow-500" />
          )}
          {isGeneratingDaily ? 'Gerando...' : 'Relatório WhatsApp Diário'}
        </button>

        <button
          onClick={generateGeneralReport}
          disabled={isGeneratingDaily || isGeneratingGeneral}
          className={`px-3 py-2 w-full rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md bg-[#18181b] text-white hover:bg-[#27272a] border border-white/10`}
        >
          {isGeneratingGeneral ? (
            <Loader2 size={16} className="animate-spin text-yellow-500" />
          ) : (
            <Copy size={16} className="text-yellow-500" />
          )}
          {isGeneratingGeneral ? 'Gerando...' : 'Relatório WhatsApp Geral'}
        </button>
      </div>


      {reportContent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Copy size={20} className="text-yellow-500" />
                Relatório Gerado
              </h3>
              <button 
                onClick={() => setReportContent(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap bg-[#18181b] p-4 rounded-lg border border-white/5">
                {reportContent}
              </pre>
            </div>

            <div className="p-4 border-t border-white/10 flex gap-3 justify-end">
              <button
                onClick={() => setReportContent(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => copyToClipboard(reportContent)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                  success 
                    ? 'bg-emerald-500 text-black' 
                    : 'bg-yellow-500 text-black hover:bg-yellow-400'
                }`}
              >
                {success ? (
                  <>
                    <Check size={16} />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copiar e Fechar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { FeedbackKPIsSummary } from './feedbackKpiCalculator';
import { DIAGNOSTIC_CHECKLIST_CONFIG } from '../data/diagnosticChecklist';
import { formatCurrency, formatNumber } from './format';

interface GenerateClipboardOptions {
  summary: FeedbackKPIsSummary;
  startDate: string;
  endDate: string;
  prevStartDate: string;
  prevEndDate: string;
  selectedPracasLabel: string;
}

const formatDateBR = (isoStr: string) => {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-');
  return `${d}/${m}/${y}`;
};

export function buildClipboardReportText({
  summary,
  startDate,
  endDate,
  prevStartDate,
  prevEndDate,
  selectedPracasLabel
}: GenerateClipboardOptions): string {
  const nowBR = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const prevInv = summary.prevTotalInvestimento ?? 0;
  const prevIng = summary.prevTotalIngressos ?? 0;
  const prevMql = summary.prevTotalMqls ?? 0;

  const diffInvPerc = prevInv > 0 ? ((summary.totalInvestimento - prevInv) / prevInv) * 100 : 0;
  const diffIngPerc = prevIng > 0 ? ((summary.totalIngressos - prevIng) / prevIng) * 100 : 0;
  const diffMqlPerc = prevMql > 0 ? ((summary.totalMqls - prevMql) / prevMql) * 100 : 0;

  const cacAtual = summary.totalIngressos > 0 ? summary.totalInvestimento / summary.totalIngressos : 0;
  const cacAnterior = prevIng > 0 ? prevInv / prevIng : 0;

  const lines: string[] = [];

  lines.push('====================================================');
  lines.push('📊 RELATÓRIO DE FEEDBACKS & KPIS — PROTAGON');
  lines.push('====================================================');
  lines.push(`📍 Praça: ${selectedPracasLabel}`);
  lines.push(`📅 Período Analisado: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`);
  lines.push(`🔄 Período Anterior: ${formatDateBR(prevStartDate)} a ${formatDateBR(prevEndDate)}`);
  lines.push(`⏱ Gerado em: ${nowBR}`);
  lines.push('');

  lines.push('----------------------------------------------------');
  lines.push('📌 RESUMO GERAL CONSOLIDADO');
  lines.push('----------------------------------------------------');
  lines.push(`• Investimento Total: ${formatCurrency(summary.totalInvestimento)}` + 
    (prevInv > 0 ? ` (Ant: ${formatCurrency(prevInv)} | ${diffInvPerc >= 0 ? '+' : ''}${diffInvPerc.toFixed(1)}%)` : ''));
  lines.push(`• Ingressos Vendidos: ${summary.totalIngressos}` + 
    (prevIng > 0 ? ` (Ant: ${prevIng} | ${diffIngPerc >= 0 ? '+' : ''}${diffIngPerc.toFixed(1)}%)` : ''));
  lines.push(`• MQLs Gerados: ${summary.totalMqls}` + 
    (prevMql > 0 ? ` (Ant: ${prevMql} | ${diffMqlPerc >= 0 ? '+' : ''}${diffMqlPerc.toFixed(1)}%)` : ''));
  lines.push(`• CAC Médio Global: ${cacAtual > 0 ? formatCurrency(cacAtual) : 'N/D'}` + 
    (cacAnterior > 0 ? ` (Ant: ${formatCurrency(cacAnterior)})` : ''));
  lines.push('');

  const funnelsList = [
    { key: 'vd', data: summary.funnels.vd },
    { key: 'gdForm', data: summary.funnels.gdForm },
    { key: 'gdCaptura', data: summary.funnels.gdCaptura },
    { key: 'gdInlead', data: summary.funnels.gdInlead },
    { key: 'meteorico', data: summary.funnels.meteorico },
  ];

  lines.push('----------------------------------------------------');
  lines.push('🎯 DETALHAMENTO POR FUNIL');
  lines.push('----------------------------------------------------');

  funnelsList.forEach(({ data }, idx) => {
    const bm = data.benchmark;
    const pPeriod = data.previousPeriod;

    lines.push('');
    lines.push(`[${idx + 1}] ${bm.name.toUpperCase()}`);
    lines.push(`• Investimento: ${formatCurrency(data.investimento)} | Ingressos: ${data.ingressos} | MQLs: ${data.mqls}`);
    lines.push(`• Semáforo de KPIs: ${data.outlierKpiCount.excelente} Excelente | ${data.outlierKpiCount.medio} Médio | ${data.outlierKpiCount.ruim} Ruim`);

    // Metrics table
    lines.push('• Métricas Avaliadas:');
    data.metrics.forEach(m => {
      const val = m.currentValue;
      const isCurr = m.metric.unit === 'currency';
      const isPct = m.metric.unit === 'percent';
      const fmt = (v: number) => isCurr ? formatCurrency(v) : isPct ? `${v.toFixed(2)}%` : v.toString();
      const lowerBetter = m.metric.direction === 'lower_is_better';

      if (m.metric.available === false) {
        lines.push(`  - ${m.metric.name}: Não disponível no relatório`);
        return;
      }

      const valStr = val > 0 ? fmt(val) : '-';
      const idealStr = `${lowerBetter ? '≤ ' : '≥ '}${fmt(m.metric.excelente)}`;
      const alertStr = `${lowerBetter ? '≥ ' : '≤ '}${fmt(m.metric.ruim)}`;

      lines.push(`  - ${m.metric.name}: ${valStr} [${m.classification.label.toUpperCase()}] (Meta Ideal: ${idealStr} | Ponto Médio: ${fmt(m.metric.medio)} | Alerta: ${alertStr})`);
    });

    // CAC Scenarios
    if (bm.cacScenarios && bm.cacScenarios.length > 0 && data.mqls > 0) {
      const actualMqlCost = data.investimento / data.mqls;
      lines.push(`• Análise de CAC Estimado (Custo MQL Atual: ${formatCurrency(actualMqlCost)}):`);
      bm.cacScenarios.forEach(sc => {
        const currentProjectedCac = actualMqlCost * (100 / sc.conversionRate);
        const diffCac = currentProjectedCac - sc.cac;
        const diffPerc = sc.cac > 0 ? (diffCac / sc.cac) * 100 : 0;
        const isFavorable = currentProjectedCac <= sc.cac;

        lines.push(`  * ${sc.title} (Conv. ${sc.conversionRate}%): CAC Atual Projetado ${formatCurrency(currentProjectedCac)} vs Ref. ${formatCurrency(sc.cac)} ` +
          `[${isFavorable ? 'FAVORÁVEL' : 'ACIMA'}: ${diffCac < 0 ? '-' : '+'}${formatCurrency(Math.abs(diffCac))} (${diffPerc >= 0 ? '+' : ''}${diffPerc.toFixed(1)}%)]`);
      });
    }

    // Previous Period Evolution
    if (pPeriod) {
      lines.push('• Evolução vs Período Anterior:');
      lines.push(`  - Ingressos: ${data.ingressos} vs ${pPeriod.ingressos} (${pPeriod.ingressosDiffPerc >= 0 ? '+' : ''}${pPeriod.ingressosDiffPerc.toFixed(1)}%)`);
      lines.push(`  - Investimento: ${formatCurrency(data.investimento)} vs ${formatCurrency(pPeriod.investimento)} (${pPeriod.investimentoDiffPerc >= 0 ? '+' : ''}${pPeriod.investimentoDiffPerc.toFixed(1)}%)`);
      lines.push(`  - MQLs: ${data.mqls} vs ${pPeriod.mqls} (${pPeriod.mqlsDiffPerc >= 0 ? '+' : ''}${pPeriod.mqlsDiffPerc.toFixed(1)}%)`);
    }

    // Recommended Actions & Tests (outliers)
    const outliers = data.metrics.filter(
      m => (m.classification.status === 'excelente' || m.classification.status === 'ruim') && m.currentValue > 0
    );

    if (outliers.length > 0) {
      lines.push('• Diagnóstico & Ações Recomendadas:');
      outliers.forEach(m => {
        const guide = DIAGNOSTIC_CHECKLIST_CONFIG[m.metric.id];
        const status = m.classification.status as 'excelente' | 'ruim';
        const diag = guide ? (status === 'excelente' ? guide.excelente : guide.ruim) : null;

        if (diag) {
          lines.push(`  * [${m.classification.label.toUpperCase()}] ${m.metric.name}:`);
          lines.push(`    - Hipótese: "${diag.hipotesePadrao}"`);
          lines.push(`    - Ação Prática: ${diag.acaoPadrao}`);
        }
      });
    }
  });

  lines.push('');
  lines.push('====================================================');
  lines.push('PROTAGON STRATEGY DASHBOARD — DADOS COPIADOS COM SUCESSO');
  lines.push('====================================================');

  return lines.join('\n');
}

/**
 * Copies the text to clipboard with iframe fallback support
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard failed, attempting fallback execCommand:', err);
  }

  // Fallback for iframe environments
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback execCommand failed:', err);
    return false;
  }
}

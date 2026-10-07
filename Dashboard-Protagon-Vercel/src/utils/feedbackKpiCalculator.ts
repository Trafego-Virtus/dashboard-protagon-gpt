import { ProcessedMetrics } from './metricsCalculator';
import { FUNNEL_BENCHMARKS, FunnelBenchmark, BenchmarkMetric, classifyMetric, MetricClassification } from '../data/benchmarkReferences';

export interface EvaluatedMetric {
  metric: BenchmarkMetric;
  currentValue: number;
  previousValue?: number;
  diffAbs?: number;
  diffPerc?: number;
  classification: {
    status: MetricClassification;
    label: string;
    color: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
  };
}

export interface ImpactCreative {
  nome: string;
  thumbnail: string;
  link: string;
  investimento: number;
  percentOfFunnelSpend: number;
  ativo: boolean;
  impressoes: number;
  cliques: number;
  alcance: number;
  view3s: number;
  leads: number;
  mqls: number;
  ingressos: number;
  // Specific creative KPI rates
  cpm: number;
  cpc: number;
  ctr: number;
  hookRate: number;
  hookMarcos: number;
  custoMql: number;
  // Deep dive impact on funnel KPIs
  affectedKpis: {
    metricId: string;
    metricName: string;
    creativeValue: number;
    benchmarkRef: number;
    unit: 'currency' | 'percent' | 'number';
    status: MetricClassification;
    isPrimaryDriver: boolean;
  }[];
  impactType: 'excelente' | 'ruim' | 'neutro';
  summaryBadge: {
    text: string;
    bg: string;
    border: string;
    textColor: string;
  };
}

export interface FunnelFeedbackAnalysis {
  benchmark: FunnelBenchmark;
  investimento: number;
  faturamento?: number;
  ingressos: number;
  leads: number;
  mqls: number;
  metrics: EvaluatedMetric[];
  hasOutlierKpis: boolean; // Has any KPI in 'excelente' or 'ruim'
  outlierKpiCount: { excelente: number; ruim: number; medio: number };
  averageCreativeSpend: number;
  totalCreativesCount: number;
  highSpendCreativesCount: number;
  impactCreatives: ImpactCreative[];
  // Previous period comparison metrics
  previousPeriod?: {
    investimento: number;
    ingressos: number;
    leads: number;
    mqls: number;
    metrics: EvaluatedMetric[];
    investimentoDiffPerc: number;
    ingressosDiffPerc: number;
    mqlsDiffPerc: number;
  };
}

export interface FeedbackKPIsSummary {
  funnels: {
    vd: FunnelFeedbackAnalysis;
    gdForm: FunnelFeedbackAnalysis;
    gdCaptura: FunnelFeedbackAnalysis;
    meteorico: FunnelFeedbackAnalysis;
    gdInlead: FunnelFeedbackAnalysis;
  };
  totalInvestimento: number;
  totalIngressos: number;
  totalMqls: number;
  prevTotalInvestimento?: number;
  prevTotalIngressos?: number;
  prevTotalMqls?: number;
}

function computeFunnelTotalsFromCreatives(creatives: any[], fallbackInv: number) {
  let impressoes = 0;
  let cliques = 0;
  let alcance = 0;
  let view3s = 0;
  let invFromCreatives = 0;

  creatives.forEach(c => {
    impressoes += (c.impressoes || 0);
    cliques += (c.cliques || 0);
    alcance += (c.alcance || 0);
    view3s += (c.view3s || 0);
    invFromCreatives += (c.investimento || 0);
  });

  const investimento = fallbackInv > 0 ? fallbackInv : invFromCreatives;

  return {
    investimento,
    impressoes,
    cliques,
    alcance,
    view3s,
    cpm: impressoes > 0 ? (investimento / impressoes) * 1000 : 0,
    cpc: cliques > 0 ? (investimento / cliques) : 0,
    ctr: impressoes > 0 ? (cliques / impressoes) * 100 : 0,
    hookRate: impressoes > 0 ? (view3s / impressoes) * 100 : 0,
    hookMarcos: alcance > 0 ? (view3s / alcance) * 100 : 0,
  };
}

export function analyzeFunnelKPIs(
  funnelId: 'vd' | 'gd-form' | 'gd-captura' | 'meteorico' | 'gd-inlead',
  currentMetrics: ProcessedMetrics,
  prevMetrics?: ProcessedMetrics | null
): FunnelFeedbackAnalysis {
  const benchmark = FUNNEL_BENCHMARKS[funnelId];
  let creatives: any[] = [];
  let prevCreatives: any[] = [];
  let investimento = 0;
  let faturamento = 0;
  let ingressos = 0;
  let leads = 0;
  let mqls = 0;
  let conversaoPagina = 0;

  let prevInv = 0;
  let prevIngressos = 0;
  let prevLeads = 0;
  let prevMqls = 0;
  let prevConversaoPagina = 0;

  if (funnelId === 'vd') {
    creatives = currentMetrics.creativesVD || [];
    investimento = currentMetrics.vendaDireta?.investimento || 0;
    faturamento = currentMetrics.vendaDireta?.faturamento || 0;
    ingressos = currentMetrics.vendaDireta?.ingressos || 0;
    leads = currentMetrics.vendaDireta?.leadsTrafego || currentMetrics.vendaDireta?.leadsTotal || 0;
    mqls = currentMetrics.vendaDireta?.mqls || 0;

    if (prevMetrics) {
      prevCreatives = prevMetrics.creativesVD || [];
      prevInv = prevMetrics.vendaDireta?.investimento || 0;
      prevIngressos = prevMetrics.vendaDireta?.ingressos || 0;
      prevLeads = prevMetrics.vendaDireta?.leadsTrafego || prevMetrics.vendaDireta?.leadsTotal || 0;
      prevMqls = prevMetrics.vendaDireta?.mqls || 0;
    }
  } else if (funnelId === 'gd-form') {
    creatives = currentMetrics.creativesForm || [];
    investimento = currentMetrics.demanda?.formNativo?.investimento || 0;
    ingressos = currentMetrics.demanda?.formNativo?.ingressos || 0;
    leads = currentMetrics.demanda?.formNativo?.leads || 0;
    mqls = currentMetrics.demanda?.formNativo?.mqls || 0;

    if (prevMetrics) {
      prevCreatives = prevMetrics.creativesForm || [];
      prevInv = prevMetrics.demanda?.formNativo?.investimento || 0;
      prevIngressos = prevMetrics.demanda?.formNativo?.ingressos || 0;
      prevLeads = prevMetrics.demanda?.formNativo?.leads || 0;
      prevMqls = prevMetrics.demanda?.formNativo?.mqls || 0;
    }
  } else if (funnelId === 'gd-captura') {
    creatives = currentMetrics.creativesCaptura || [];
    investimento = currentMetrics.demanda?.captura?.investimento || 0;
    ingressos = currentMetrics.demanda?.captura?.ingressos || 0;
    leads = currentMetrics.demanda?.captura?.leads || 0;
    mqls = currentMetrics.demanda?.captura?.mqls || 0;

    // Page conversion calculation
    const convAverages = currentMetrics.demanda?.captura?.conversaoDiariaPaginas?.averages;
    if (convAverages && Object.keys(convAverages).length > 0) {
      const vals = Object.values(convAverages).filter(v => typeof v === 'number' && v > 0);
      if (vals.length > 0) {
        conversaoPagina = vals.reduce((a, b) => a + b, 0) / vals.length;
      }
    }

    if (prevMetrics) {
      prevCreatives = prevMetrics.creativesCaptura || [];
      prevInv = prevMetrics.demanda?.captura?.investimento || 0;
      prevIngressos = prevMetrics.demanda?.captura?.ingressos || 0;
      prevLeads = prevMetrics.demanda?.captura?.leads || 0;
      prevMqls = prevMetrics.demanda?.captura?.mqls || 0;

      const prevConvAvg = prevMetrics.demanda?.captura?.conversaoDiariaPaginas?.averages;
      if (prevConvAvg && Object.keys(prevConvAvg).length > 0) {
        const vals = Object.values(prevConvAvg).filter(v => typeof v === 'number' && v > 0);
        if (vals.length > 0) {
          prevConversaoPagina = vals.reduce((a, b) => a + b, 0) / vals.length;
        }
      }
    }
  } else if (funnelId === 'gd-inlead') {
    creatives = currentMetrics.creativesInlead || [];
    investimento = currentMetrics.demanda?.inlead?.investimento || 0;
    ingressos = currentMetrics.demanda?.inlead?.ingressos || 0;
    leads = currentMetrics.demanda?.inlead?.leads || 0;
    mqls = currentMetrics.demanda?.inlead?.mqls || 0;

    if (prevMetrics) {
      prevCreatives = prevMetrics.creativesInlead || [];
      prevInv = prevMetrics.demanda?.inlead?.investimento || 0;
      prevIngressos = prevMetrics.demanda?.inlead?.ingressos || 0;
      prevLeads = prevMetrics.demanda?.inlead?.leads || 0;
      prevMqls = prevMetrics.demanda?.inlead?.mqls || 0;
    }
  } else if (funnelId === 'meteorico') {
    creatives = currentMetrics.creativesMET || [];
    investimento = currentMetrics.meteorico?.investimento || 0;
    faturamento = currentMetrics.meteorico?.faturamento || 0;
    ingressos = currentMetrics.meteorico?.ingressos || 0;
    leads = currentMetrics.meteorico?.leads || 0;
    mqls = currentMetrics.meteorico?.mqls || 0;

    if (prevMetrics) {
      prevCreatives = prevMetrics.creativesMET || [];
      prevInv = prevMetrics.meteorico?.investimento || 0;
      prevIngressos = prevMetrics.meteorico?.ingressos || 0;
      prevLeads = prevMetrics.meteorico?.leads || 0;
      prevMqls = prevMetrics.meteorico?.mqls || 0;
    }
  }

  const totals = computeFunnelTotalsFromCreatives(creatives, investimento);
  const prevTotals = computeFunnelTotalsFromCreatives(prevCreatives, prevInv);

  const getMetricValue = (metricId: string, isPrev = false) => {
    const t = isPrev ? prevTotals : totals;
    const inv = isPrev ? prevInv : investimento;
    const mq = isPrev ? prevMqls : mqls;
    const conv = isPrev ? prevConversaoPagina : conversaoPagina;

    switch (metricId) {
      case 'custo_mql':
        return mq > 0 ? inv / mq : 0;
      case 'conversao_pagina':
        return conv;
      case 'cpm':
        return t.cpm;
      case 'cpc':
        return t.cpc;
      case 'ctr':
        return t.ctr;
      case 'hook_rate':
        return t.hookRate;
      case 'hook_marcos':
        return t.hookMarcos;
      default:
        return 0;
    }
  };

  let excelenteCount = 0;
  let ruimCount = 0;
  let medioCount = 0;

  const evaluatedMetrics: EvaluatedMetric[] = benchmark.metrics.map(m => {
    const val = getMetricValue(m.id, false);
    const classification = classifyMetric(m, val);

    if (classification.status === 'excelente') excelenteCount++;
    else if (classification.status === 'ruim') ruimCount++;
    else if (classification.status === 'medio') medioCount++;

    let prevVal: number | undefined;
    let diffAbs: number | undefined;
    let diffPerc: number | undefined;

    if (prevMetrics) {
      prevVal = getMetricValue(m.id, true);
      diffAbs = val - prevVal;
      diffPerc = prevVal > 0 ? (diffAbs / prevVal) * 100 : 0;
    }

    return {
      metric: m,
      currentValue: val,
      previousValue: prevVal,
      diffAbs,
      diffPerc,
      classification
    };
  });

  const outlierMetrics = evaluatedMetrics.filter(
    em => em.classification.status === 'excelente' || em.classification.status === 'ruim'
  );
  const hasOutlierKpis = outlierMetrics.length > 0;

  // Impact Creatives Analysis
  // Condition: Creative spend >= average spend of all creatives of that funnel for the period
  const validCreatives = creatives.filter(c => (c.investimento || 0) > 0);
  const totalCreativeSpend = validCreatives.reduce((sum, c) => sum + (c.investimento || 0), 0);
  const averageCreativeSpend = validCreatives.length > 0 ? totalCreativeSpend / validCreatives.length : 0;

  const highSpendCreatives = validCreatives.filter(c => (c.investimento || 0) >= averageCreativeSpend);

  const impactCreatives: ImpactCreative[] = highSpendCreatives.map(c => {
    const inv = c.investimento || 0;
    const impr = c.impressoes || 0;
    const cliq = c.cliques || 0;
    const alc = c.alcance || 0;
    const v3s = c.view3s || 0;
    const mq = c.mqls || 0;

    const cCpm = impr > 0 ? (inv / impr) * 1000 : 0;
    const cCpc = cliq > 0 ? inv / cliq : 0;
    const cCtr = impr > 0 ? (cliq / impr) * 100 : 0;
    const cHook = impr > 0 ? (v3s / impr) * 100 : 0;
    const cHookMarcos = alc > 0 ? (v3s / alc) * 100 : 0;
    const cCustoMql = mq > 0 ? inv / mq : 0;

    const percentOfFunnelSpend = totalCreativeSpend > 0 ? (inv / totalCreativeSpend) * 100 : 0;

    // Check which of the funnel's outlier KPIs (or benchmark metrics) this creative impacted
    const affectedKpis: ImpactCreative['affectedKpis'] = [];

    benchmark.metrics.forEach(bm => {
      let creativeVal = 0;
      switch (bm.id) {
        case 'cpm': creativeVal = cCpm; break;
        case 'cpc': creativeVal = cCpc; break;
        case 'ctr': creativeVal = cCtr; break;
        case 'hook_rate': creativeVal = cHook; break;
        case 'hook_marcos': creativeVal = cHookMarcos; break;
        case 'custo_mql': creativeVal = cCustoMql; break;
      }

      if (creativeVal > 0) {
        const cls = classifyMetric(bm, creativeVal);
        // Is this one of the outlier KPIs of the funnel?
        const isFunnelOutlier = outlierMetrics.some(om => om.metric.id === bm.id);

        if (cls.status === 'excelente' || cls.status === 'ruim' || isFunnelOutlier) {
          affectedKpis.push({
            metricId: bm.id,
            metricName: bm.name,
            creativeValue: creativeVal,
            benchmarkRef: cls.status === 'excelente' ? bm.excelente : cls.status === 'ruim' ? bm.ruim : bm.medio,
            unit: bm.unit,
            status: cls.status,
            isPrimaryDriver: isFunnelOutlier
          });
        }
      }
    });

    // Determine overall creative impact
    const hasRuim = affectedKpis.some(k => k.status === 'ruim');
    const hasExcelente = affectedKpis.some(k => k.status === 'excelente');

    let impactType: 'excelente' | 'ruim' | 'neutro' = 'neutro';
    let summaryBadge = {
      text: 'Neutro / Estável',
      bg: 'bg-zinc-800',
      border: 'border-zinc-700',
      textColor: 'text-zinc-300'
    };

    if (hasExcelente && !hasRuim) {
      impactType = 'excelente';
      summaryBadge = {
        text: 'Impulso Positivo (Excelente)',
        bg: 'bg-emerald-500/15',
        border: 'border-emerald-500/30',
        textColor: 'text-emerald-400'
      };
    } else if (hasRuim && !hasExcelente) {
      impactType = 'ruim';
      summaryBadge = {
        text: 'Detrator Crítico (Ruim)',
        bg: 'bg-rose-500/15',
        border: 'border-rose-500/30',
        textColor: 'text-rose-400'
      };
    } else if (hasRuim && hasExcelente) {
      impactType = 'ruim'; // Mixed but has critical red flag
      summaryBadge = {
        text: 'Misto / Atenção',
        bg: 'bg-amber-500/15',
        border: 'border-amber-500/30',
        textColor: 'text-amber-400'
      };
    }

    return {
      nome: c.nome,
      thumbnail: c.thumbnail || '',
      link: c.link || '',
      investimento: inv,
      percentOfFunnelSpend,
      ativo: !!c.ativo,
      impressoes: impr,
      cliques: cliq,
      alcance: alc,
      view3s: v3s,
      leads: c.leads || 0,
      mqls: mq,
      ingressos: c.ingressos || 0,
      cpm: cCpm,
      cpc: cCpc,
      ctr: cCtr,
      hookRate: cHook,
      hookMarcos: cHookMarcos,
      custoMql: cCustoMql,
      affectedKpis,
      impactType,
      summaryBadge
    };
  }).sort((a, b) => b.investimento - a.investimento);

  // Previous period info
  let previousPeriod: FunnelFeedbackAnalysis['previousPeriod'];
  if (prevMetrics) {
    const invDiff = investimento - prevInv;
    const ingDiff = ingressos - prevIngressos;
    const mqlDiff = mqls - prevMqls;

    previousPeriod = {
      investimento: prevInv,
      ingressos: prevIngressos,
      leads: prevLeads,
      mqls: prevMqls,
      metrics: evaluatedMetrics.map(em => ({
        ...em,
        currentValue: em.previousValue || 0,
        classification: classifyMetric(em.metric, em.previousValue || 0)
      })),
      investimentoDiffPerc: prevInv > 0 ? (invDiff / prevInv) * 100 : 0,
      ingressosDiffPerc: prevIngressos > 0 ? (ingDiff / prevIngressos) * 100 : 0,
      mqlsDiffPerc: prevMqls > 0 ? (mqlDiff / prevMqls) * 100 : 0,
    };
  }

  return {
    benchmark,
    investimento,
    faturamento,
    ingressos,
    leads,
    mqls,
    metrics: evaluatedMetrics,
    hasOutlierKpis,
    outlierKpiCount: {
      excelente: excelenteCount,
      ruim: ruimCount,
      medio: medioCount
    },
    averageCreativeSpend,
    totalCreativesCount: validCreatives.length,
    highSpendCreativesCount: highSpendCreatives.length,
    impactCreatives,
    previousPeriod
  };
}

export function buildFeedbackKPIsSummary(
  currentMetrics: ProcessedMetrics,
  prevMetrics?: ProcessedMetrics | null
): FeedbackKPIsSummary {
  const vd = analyzeFunnelKPIs('vd', currentMetrics, prevMetrics);
  const gdForm = analyzeFunnelKPIs('gd-form', currentMetrics, prevMetrics);
  const gdCaptura = analyzeFunnelKPIs('gd-captura', currentMetrics, prevMetrics);
  const gdInlead = analyzeFunnelKPIs('gd-inlead', currentMetrics, prevMetrics);
  const meteorico = analyzeFunnelKPIs('meteorico', currentMetrics, prevMetrics);

  const totalInvestimento = vd.investimento + gdForm.investimento + gdCaptura.investimento + gdInlead.investimento + meteorico.investimento;
  const totalIngressos = vd.ingressos + gdForm.ingressos + gdCaptura.ingressos + gdInlead.ingressos + meteorico.ingressos;
  const totalMqls = vd.mqls + gdForm.mqls + gdCaptura.mqls + gdInlead.mqls + meteorico.mqls;

  let prevTotalInvestimento: number | undefined;
  let prevTotalIngressos: number | undefined;
  let prevTotalMqls: number | undefined;

  if (prevMetrics) {
    prevTotalInvestimento = (vd.previousPeriod?.investimento || 0) +
      (gdForm.previousPeriod?.investimento || 0) +
      (gdCaptura.previousPeriod?.investimento || 0) +
      (gdInlead.previousPeriod?.investimento || 0) +
      (meteorico.previousPeriod?.investimento || 0);

    prevTotalIngressos = (vd.previousPeriod?.ingressos || 0) +
      (gdForm.previousPeriod?.ingressos || 0) +
      (gdCaptura.previousPeriod?.ingressos || 0) +
      (gdInlead.previousPeriod?.ingressos || 0) +
      (meteorico.previousPeriod?.ingressos || 0);

    prevTotalMqls = (vd.previousPeriod?.mqls || 0) +
      (gdForm.previousPeriod?.mqls || 0) +
      (gdCaptura.previousPeriod?.mqls || 0) +
      (gdInlead.previousPeriod?.mqls || 0) +
      (meteorico.previousPeriod?.mqls || 0);
  }

  return {
    funnels: {
      vd,
      gdForm,
      gdCaptura,
      gdInlead,
      meteorico
    },
    totalInvestimento,
    totalIngressos,
    totalMqls,
    prevTotalInvestimento,
    prevTotalIngressos,
    prevTotalMqls
  };
}

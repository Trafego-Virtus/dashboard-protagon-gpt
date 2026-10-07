import { GuardiansRawData } from './guardiansData';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';

export interface GuardiansMetrics {
  investTotal: number;
  investBranding: number;
  investCaptacao: number;
  totalLeads: number;
  cpl: number;
  totalImpressions: number;
  totalClicks: number;
  totalLandingViews: number;
  ctr: number;
  cpm: number;
  cpc: number;
  connectRate: number;
  pageConversion: number;
  dailyData: any[];
  audienceData: any[];
  creativeDataBranding: any[];
  creativeDataCaptacao: any[];
  captacaoImpressions: number;
  captacaoClicks: number;
  captacaoLandingViews: number;
  captacaoCtr: number;
  captacaoConnectRate: number;
  captacaoPageConversion: number;
  captacaoCpm: number;
  captacaoCpc: number;
  captacaoCpl: number;
}

const parseBrDate = (dStr: string) => {
  let parts = dStr.trim().split(/\s+/)[0].split('/');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2].length === 2 ? '20' + parts[2] : parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  parts = dStr.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }
  return new Date();
};

const parseBrNumber = (val: string) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const clean = val.replace(/R\$\s*/g, '').replace(/[^\d,-]/g, '').replace(',', '.');
  return parseFloat(clean) || 0;
};

const getNum = (obj: any, keys: string[]) => {
  for (const k of keys) {
    if (obj[k] !== undefined) return parseBrNumber(String(obj[k]));
  }
  return 0;
};

export const calculateGuardiansMetrics = (data: GuardiansRawData, dateRange: { start: Date; end: Date }): GuardiansMetrics => {
  const adsBranding = (data.meta_ads_dados_v2 || []).map((c: any) => ({ ...c, _sourceTab: 'branding' }));
  const adsCaptacao = (data.meta_ads_dados || []).map((c: any) => ({ ...c, _sourceTab: 'captacao' }));
  const criativos = [...adsBranding, ...adsCaptacao];
  const leadsData = data.base_lovable || [];
  
  const linkMap = new Map<string, string>();
  criativos.forEach(c => {
    const name = String(c.ad_name || c['Ad Name'] || c['Nome do anúncio'] || c['NOME DO ANÚNCIO'] || '').trim();
    const link = String(c['Creative Instagram Permalink'] || c.permalink || '').trim();
    if (name && link && !linkMap.has(name)) {
      linkMap.set(name, link);
    }
  });

  const startLimit = startOfDay(dateRange.start).getTime();
  const endLimit = endOfDay(dateRange.end).getTime();

  const filteredCriativos = criativos.filter(c => {
    const dateStr = c.date_start || c.Date || c.date || c.Data;
    if (!dateStr || !String(dateStr).trim()) return false;
    const dTime = parseBrDate(dateStr).getTime();
    return dTime >= startLimit && dTime <= endLimit;
  });

  const filteredLeads = leadsData.filter(l => {
    const dateStr = l.Data || l.data || l.date || l.Date || l.created_at || l['Criado em'];
    if (!dateStr || !String(dateStr).trim()) return false;
    const dTime = parseBrDate(dateStr).getTime();
    return dTime >= startLimit && dTime <= endLimit;
  });

  const investBranding = filteredCriativos.filter(c => c._sourceTab === 'branding').reduce((acc, curr) => acc + getNum(curr, ['spend', 'Spend', 'amount_spent', 'Valor Usado', 'Valor gasto (BRL)', 'Valor Gasto']), 0);
  const investCaptacao = filteredCriativos.filter(c => c._sourceTab === 'captacao').reduce((acc, curr) => acc + getNum(curr, ['spend', 'Spend', 'amount_spent', 'Valor Usado', 'Valor gasto (BRL)', 'Valor Gasto']), 0);
  const investTotal = investBranding + investCaptacao;

  const totalImpressions = filteredCriativos.reduce((acc, curr) => acc + getNum(curr, ['impressions', 'Impressions', 'Impressões']), 0);
  const totalClicks = filteredCriativos.reduce((acc, curr) => acc + getNum(curr, ['link_click', 'inline_link_clicks', 'clicks', 'Clicks', 'Cliques no link', 'Cliques']), 0);
  const totalLandingViews = filteredCriativos.reduce((acc, curr) => acc + getNum(curr, ['landing_page_view', 'Visualizações da página de destino', 'Page Views']), 0);

  const totalLeads = filteredLeads.length;

  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const connectRate = totalClicks > 0 ? (totalLandingViews / totalClicks) * 100 : 0;
  const pageConversion = totalLandingViews > 0 ? (totalLeads / totalLandingViews) * 100 : 0;
  const cpm = totalImpressions > 0 ? (investTotal / (totalImpressions / 1000)) : 0;
  const cpc = totalClicks > 0 ? (investTotal / totalClicks) : 0;
  const cpl = totalLeads > 0 ? (investTotal / totalLeads) : 0;

  const audienceMap = new Map<string, any>();
  audienceMap.set('Quente [Q]', { name: 'Quente [Q]', spend: 0, leads: 0, views: 0, clicks: 0, impressions: 0 });
  audienceMap.set('Frio [F]', { name: 'Frio [F]', spend: 0, leads: 0, views: 0, clicks: 0, impressions: 0 });
  audienceMap.set('Outros', { name: 'Outros', spend: 0, leads: 0, views: 0, clicks: 0, impressions: 0 });

  filteredCriativos.forEach(c => {
    const audName = String(c.adset_name || c['Ad Set Name'] || c['NOME DO CONJUNTO'] || '');
    let audKey = 'Outros';
    if (audName.includes('[Q]')) audKey = 'Quente [Q]';
    else if (audName.includes('[F]')) audKey = 'Frio [F]';
    
    const entry = audienceMap.get(audKey)!;
    entry.spend += getNum(c, ['spend', 'Spend', 'amount_spent', 'Valor Usado', 'Valor gasto (BRL)', 'Valor Gasto']);
    entry.leads += getNum(c, ['leads', 'Leads', 'Resultados', 'Cadastro']);
    entry.views += getNum(c, ['landing_page_view', 'Visualizações da página de destino', 'Page Views']);
    entry.clicks += getNum(c, ['link_click', 'inline_link_clicks', 'clicks', 'Clicks', 'Cliques no link', 'Cliques']);
    entry.impressions += getNum(c, ['impressions', 'Impressions', 'Impressões']);
  });

  const audienceData = Array.from(audienceMap.values())
    .filter(a => a.impressions > 0 || a.spend > 0)
    .map(a => ({
      ...a,
      cpl: a.leads > 0 ? a.spend / a.leads : 0,
      ctr: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0,
      cpc: a.clicks > 0 ? a.spend / a.clicks : 0,
      conversion: a.views > 0 ? (a.leads / a.views) * 100 : 0
    })).sort((a, b) => b.spend - a.spend);

  const dailyMap = new Map<string, any>();
  let current = startOfDay(dateRange.start);
  while (current <= endOfDay(dateRange.end)) {
    const dStr = format(current, 'yyyy-MM-dd');
    dailyMap.set(dStr, {
      date: dStr,
      displayDate: format(current, 'dd/MM'),
      investLeads: 0,
      investDist: 0,
      investTotal: 0,
      vendasTrafego: 0,
      impressions: 0,
      clicks: 0,
      views: 0
    });
    current = subDays(current, -1);
  }

  filteredCriativos.forEach(c => {
    const dateStr = c.date_start || c.Date || c.date || c.Data;
    if (!dateStr) return;
    const dStr = format(parseBrDate(dateStr), 'yyyy-MM-dd');
    if (dailyMap.has(dStr)) {
      const entry = dailyMap.get(dStr)!;
      const invest = getNum(c, ['spend', 'Spend', 'amount_spent', 'Valor Usado', 'Valor gasto (BRL)', 'Valor Gasto']);
      entry.investTotal += invest;
      if (c._sourceTab === 'branding') {
        entry.investDist += invest;
      } else {
        entry.investLeads += invest;
        entry.impressions += getNum(c, ['impressions', 'Impressions', 'Impressões']);
        entry.clicks += getNum(c, ['link_click', 'inline_link_clicks', 'clicks', 'Clicks', 'Cliques no link', 'Cliques']);
        entry.views += getNum(c, ['landing_page_view', 'Visualizações da página de destino', 'Page Views']);
      }
    }
  });

  filteredLeads.forEach(l => {
    const dateStr = l.Data || l.data || l.date || l.Date || l.created_at || l['Criado em'];
    if (!dateStr) return;
    const dStr = format(parseBrDate(dateStr), 'yyyy-MM-dd');
    if (dailyMap.has(dStr)) {
      dailyMap.get(dStr)!.vendasTrafego += 1;
    }
  });

  let rawDailyData = Array.from(dailyMap.values()).map(d => ({
    ...d,
    date: d.displayDate,
    rawDate: d.date,
    cpa: d.vendasTrafego > 0 ? d.investLeads / d.vendasTrafego : 0,
    cpm: d.impressions > 0 ? (d.investLeads / (d.impressions / 1000)) : 0,
    ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
    connectRate: d.clicks > 0 ? (d.views / d.clicks) * 100 : 0,
    pageConversion: d.views > 0 ? (d.vendasTrafego / d.views) * 100 : 0
  }));

  const firstDataIdx = rawDailyData.findIndex(d => d.impressions > 0 || d.investTotal > 0);
  let lastDataIdx = -1;
  for (let i = rawDailyData.length - 1; i >= 0; i--) {
    if (rawDailyData[i].impressions > 0 || rawDailyData[i].investTotal > 0) {
      lastDataIdx = i;
      break;
    }
  }

  const trimmedDailyData = (firstDataIdx !== -1 && lastDataIdx !== -1)
    ? rawDailyData.slice(firstDataIdx, lastDataIdx + 1)
    : [];

  const creativeMap = new Map<string, any>();
  filteredCriativos.forEach(c => {
    let name = c.ad_name || c['Ad Name'] || c['Nome do anúncio'] || c['NOME DO ANÚNCIO'] || 'Desconhecido';
    if (!creativeMap.has(name)) {
      creativeMap.set(name, {
        _sourceTab: c._sourceTab,
        name,
        link: linkMap.get(name) || '',
        spend: 0,
        impressions: 0,
        clicks: 0,
        views: 0,
        sales: 0,
        hookEvents: 0
      });
    }
    const entry = creativeMap.get(name)!;
    entry.spend += getNum(c, ['spend', 'Spend', 'amount_spent', 'Valor Usado', 'Valor gasto (BRL)', 'Valor Gasto']);
    entry.impressions += getNum(c, ['impressions', 'Impressions', 'Impressões']);
    entry.clicks += getNum(c, ['link_click', 'inline_link_clicks', 'clicks', 'Clicks', 'Cliques no link', 'Cliques']);
    entry.views += getNum(c, ['landing_page_view', 'Visualizações da página de destino', 'Page Views']);
    entry.hookEvents += getNum(c, ['video_view', '3s_video_view', 'video_play_actions', 'View 3s']);
  });

  filteredLeads.forEach(l => {
    const adName = l.ad_name || '';
    if (adName && creativeMap.has(adName)) {
      creativeMap.get(adName).sales += 1;
    } else if (adName) {
      creativeMap.set(adName, {
        _sourceTab: 'captacao',
        name: adName,
        link: linkMap.get(adName) || '',
        spend: 0, impressions: 0, clicks: 0, views: 0, sales: 1, hookEvents: 0
      });
    }
  });

  const mapCreative = (c: any) => ({
    ...c,
    cpa: c.sales > 0 ? c.spend / c.sales : 0,
    ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
    conversion: c.views > 0 ? (c.sales / c.views) * 100 : 0,
    cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
    hookRate: c.impressions > 0 ? (c.hookEvents / c.impressions) * 100 : 0
  });

  const creativeDataBranding = Array.from(creativeMap.values())
    .filter(c => c._sourceTab === 'branding')
    .map(mapCreative).sort((a, b) => b.spend - a.spend);

  const creativeDataCaptacao = Array.from(creativeMap.values())
    .filter(c => c._sourceTab === 'captacao')
    .map(mapCreative).sort((a, b) => b.spend - a.spend);

  const captacaoImpressions = filteredCriativos.filter(c => c._sourceTab === 'captacao').reduce((acc, curr) => acc + getNum(curr, ['impressions', 'Impressions', 'Impressões']), 0);
  const captacaoClicks = filteredCriativos.filter(c => c._sourceTab === 'captacao').reduce((acc, curr) => acc + getNum(curr, ['link_click', 'inline_link_clicks', 'clicks', 'Clicks', 'Cliques no link', 'Cliques']), 0);
  const captacaoLandingViews = filteredCriativos.filter(c => c._sourceTab === 'captacao').reduce((acc, curr) => acc + getNum(curr, ['landing_page_view', 'Visualizações da página de destino', 'Page Views']), 0);
  const captacaoLeads = totalLeads;
  
  return {
    investTotal, investBranding, investCaptacao, totalLeads, cpl, totalImpressions,
    totalClicks, totalLandingViews, ctr, cpm, cpc, connectRate, pageConversion,
    dailyData: trimmedDailyData, audienceData, creativeDataBranding, creativeDataCaptacao,
    captacaoImpressions, captacaoClicks, captacaoLandingViews,
    captacaoCtr: captacaoImpressions > 0 ? (captacaoClicks / captacaoImpressions) * 100 : 0,
    captacaoConnectRate: captacaoClicks > 0 ? (captacaoLandingViews / captacaoClicks) * 100 : 0,
    captacaoPageConversion: captacaoLandingViews > 0 ? (captacaoLeads / captacaoLandingViews) * 100 : 0,
    captacaoCpm: captacaoImpressions > 0 ? (investCaptacao / (captacaoImpressions / 1000)) : 0,
    captacaoCpc: captacaoClicks > 0 ? (investCaptacao / captacaoClicks) : 0,
    captacaoCpl: captacaoLeads > 0 ? (investCaptacao / captacaoLeads) : 0,
  };
};

import { parse, isAfter, isBefore, startOfDay, endOfDay, format } from 'date-fns';
import { WebinarioRawData } from './webinarioData';
import { parseDate, parseNumber } from './format';

export interface WebinarioMetrics {
  resumo: {
    investimento: number;
    leads: number;
    mqls: number;
    vendas: number;
    cpl: number;
    cpmql: number;
    qualificacao: number;
    webinarioPercent: number;
    webinarioAbs: number;
    leadsPagas: number;
    mqlsPagas: number;
    cplPago: number;
    cpmqlPago: number;
  };
  pracas: Record<string, {
    investimento: number;
    leads: number;
    mqls: number;
    vendas: number;
    cpl: number;
    cpmql: number;
    qualificacao: number;
    webinarioPercent: number;
    webinarioAbs: number;
  }>;
  chartData: any[];
  creatives: any[];
  pesquisa: any[];
  pagesData: any[];
}

export function calculateWebinarioMetrics(rawData: WebinarioRawData, startDateStr: string, endDateStr: string): WebinarioMetrics {
  const start = startOfDay(new Date(startDateStr + 'T12:00:00'));
  const end = endOfDay(new Date(endDateStr + 'T12:00:00'));

  
  const getDay = (dateStr: string) => {
    if (!dateStr) return null;
    const pd = parseDate(dateStr);
    if (!pd) return null;
    return `${pd.getFullYear()}-${String(pd.getMonth()+1).padStart(2,'0')}-${String(pd.getDate()).padStart(2,'0')}`;
  };

  const isWithinDateRange = (dateStr: string) => {
    if (!dateStr) return false;
    let date;
    if (dateStr.includes('/')) {
      const parts = dateStr.split(' ')[0].split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
        } else {
          date = new Date(`20${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
        }
      }
    } else if (dateStr.includes('-')) {
      date = new Date(dateStr.split(' ')[0] + 'T12:00:00');
    }
    if (!date || isNaN(date.getTime())) return false;
    
    const t = date.getTime();
    return t >= start.getTime() && t <= end.getTime();
  };

  const parseCurrency = (val: string) => {
    if (!val) return 0;
    const num = parseFloat(val.toString().replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.'));
    return isNaN(num) ? 0 : num;
  };

  const isMql = (renda: string) => {
    if (!renda) return false;
    const lower = renda.toLowerCase();
    return lower.includes('7.501 a r$10.000') || 
           lower.includes('10.001 a r$20.000') || 
           lower.includes('5.001 a r$7.500') || 
           lower.includes('20.001 a r$30.000') || 
           lower.includes('acima de r$ 30.000') ||
           lower.includes('5.001 a r$10.000') || 
           lower.includes('20.001 a r$50.000') || 
           lower.includes('acima de r$50.000');
  };

  const fGeral = (() => {
    // 1. Count cells helper
    const countCells = (row: any) => {
      
      let c = 0;
      for (const k in row) {
        
        const v = row[k];
        if (v !== null && v !== undefined && String(v).trim() !== '') c++;
      }
      
      return c;
    };

    // 2. Filter by date, must have UUID, deduplicate by UUID picking most cells
    const uuidMap = new Map<string, any>();
    for (const r of rawData.geral) {
      if (!isWithinDateRange(r['data_hora'] || '')) continue;
      const uuid = (r['uuid']?.trim() || r['uidd']?.trim() || '').toLowerCase();
      if (!uuid) continue;
      
      if (!uuidMap.has(uuid)) {
        uuidMap.set(uuid, r);
      } else {
        if (countCells(r) > countCells(uuidMap.get(uuid))) {
          uuidMap.set(uuid, r);
        }
      }
    }
    const uniqueByUuid = Array.from(uuidMap.values());
    
    // 3. Get phone helper
    const getPhone = (row: any) => {
      const raw = String(row['Telefone'] || row['telefone'] || row['Celular'] || row['celular'] || row['WhatsApp'] || row['whatsapp'] || '');
      return raw.replace(/\D/g, '');
    };

    const emailMap = new Map<string, any>();
    const phoneMap = new Map<string, any>();
    const noContactInfo = [];

    // 4. Deduplicate by Email, then Phone, picking most cells
    for (const r of uniqueByUuid) {
      const email = (r['email'] || r['E-mail'] || '').trim().toLowerCase();
      
      if (email) {
        if (!emailMap.has(email)) {
          emailMap.set(email, r);
        } else {
          if (countCells(r) > countCells(emailMap.get(email))) {
            emailMap.set(email, r);
          }
        }
      } else {
        const phone = getPhone(r);
        if (phone) {
          if (!phoneMap.has(phone)) {
            phoneMap.set(phone, r);
          } else {
            if (countCells(r) > countCells(phoneMap.get(phone))) {
              phoneMap.set(phone, r);
            }
          }
        } else {
          noContactInfo.push(r);
        }
      }
    }

    return [...Array.from(emailMap.values()), ...Array.from(phoneMap.values()), ...noContactInfo];
  })();
  const fMeta = rawData.captura.filter(r => isWithinDateRange(r['Data']));

      const basePracas = ['Joinville', 'Cuiabá', 'Porto Alegre', 'São Paulo', 'Goiânia', 'Orgânico', 'Geral', 'Quiz'];
  const pracasSet = new Set<string>(basePracas);
  const campaignToAtrib = new Map<string, string>();
  
  const normalizeAtr = (raw: string) => {
    const upper = String(raw || '').trim().toUpperCase();
    if (upper === 'JOINVILLE') return 'Joinville';
    if (upper === 'CUIABÁ' || upper === 'CUIABA') return 'Cuiabá';
    if (upper === 'PORTO ALEGRE') return 'Porto Alegre';
    if (upper === 'SÃO PAULO' || upper === 'SAO PAULO' || upper === 'SP') return 'São Paulo';
    if (upper === 'GOIÂNIA' || upper === 'GOIANIA' || upper === 'GO') return 'Goiânia';
    if (upper === 'GERAL') return 'Geral';
    if (upper === 'ORGÂNICO' || upper === 'ORGANICO') return 'Orgânico';
    if (upper === 'VEIO DIRETAMENTE DO QUIZ') return 'Quiz';
    if (upper === '') return '';
    return String(raw || '').trim();
  };

  fMeta.forEach(r => {
    const atr = normalizeAtr(r['Atribuição']);
    const campaign = String(r['NOME DA CAMPANHA'] || '').trim();
    if (atr) {
      pracasSet.add(atr);
    }
    if (campaign && atr) {
      campaignToAtrib.set(campaign, atr);
    }
  });

  const pracas = Array.from(pracasSet);
  
  const metrics: any = {
    resumo: { investimento: 0, leads: 0, mqls: 0, vendas: 0, cpl: 0, cpmql: 0, qualificacao: 0, webinarioPercent: 0, webinarioAbs: 0, leadsPagas: 0, mqlsPagas: 0, cplPago: 0, cpmqlPago: 0 },
    pracas: {},
    chartData: [],
    creatives: [],
    pesquisa: fGeral,
    pagesData: []
  };
  
  pracas.forEach(p => {
    metrics.pracas[p] = { investimento: 0, leads: 0, mqls: 0, vendas: 0, cpl: 0, cpmql: 0, qualificacao: 0, webinarioPercent: 0, webinarioAbs: 0 };
  });

  const chartMap = new Map<string, any>();
  const uniqueEmails: any = {
    resumo: { all: new Set<string>(), webinario: new Set<string>() },
    pracas: {}
  };
  
  pracas.forEach(p => {
    uniqueEmails.pracas[p] = { all: new Set<string>(), webinario: new Set<string>() };
  });

  const pageMap = new Map<string, any>();

  const getPageKey = (name) => {
    if (!name) return null;
    const match = name.match(/PG\d+/i);
    return match ? match[0].toUpperCase() : null;
  };

  // Process Investimento
  fMeta.forEach(r => {
    const pageKey = getPageKey(r['NOME DA CAMPANHA']);
    if (pageKey) {
      if (!pageMap.has(pageKey)) {
        pageMap.set(pageKey, { name: pageKey, cliques: 0, pageViews: 0, impressoes: 0, leads: 0 });
      }
      const p = pageMap.get(pageKey);
      p.cliques += parseNumber(r['Cliques no link'] || r['Cliques'] || '0');
      p.impressoes += parseNumber(r['Impressões'] || '0');
      p.pageViews += parseNumber(r['Visualizações de página de destino'] || r['Page Views'] || r['Pageviews'] || '0');
    }

    const atr = normalizeAtr(r['Atribuição']);
    const praca = pracas.includes(atr) ? atr : 'Orgânico';

    const inv = parseCurrency(r['Valor Gasto']);
    metrics.pracas[praca].investimento += inv;
    metrics.resumo.investimento += inv;

    // Chart Data
    const dateStr = getDay(r['Data']) || r['Data'];
    if (!chartMap.has(dateStr)) chartMap.set(dateStr, { name: dateStr, investimentoTotal: 0, leadsTotal: 0, mqlsTotal: 0, cliquesTotal: 0, pageViewsTotal: 0, vendasTotal: 0 });
    const cData = chartMap.get(dateStr);
    cData.investimentoTotal += inv;
    cData.cliquesTotal += parseNumber(r['Cliques no link'] || r['Cliques'] || '0');
    cData.pageViewsTotal += parseNumber(r['Visualizações de página de destino'] || r['Page Views'] || r['Pageviews'] || '0');
    cData[`inv_${praca}`] = (cData[`inv_${praca}`] || 0) + inv;
  });

  // Process Leads
  const emailToGeralRow = new Map<string, any>();
  fGeral.forEach(r => {
    const pageKey = getPageKey(r['utm_campaign']);
    if (pageKey) {
      if (!pageMap.has(pageKey)) {
        pageMap.set(pageKey, { name: pageKey, cliques: 0, pageViews: 0, impressoes: 0, leads: 0 });
      }
      pageMap.get(pageKey).leads += 1;
    }

    const atr = normalizeAtr(r['Atribuição']);

    const praca = pracas.includes(atr) ? atr : 'Orgânico';
    const mql = isMql(r['renda']);
    
    const email = r['email']?.trim().toLowerCase();
    if (email) {
      if (!emailToGeralRow.has(email)) emailToGeralRow.set(email, r);
      uniqueEmails.resumo.all.add(email);
      uniqueEmails.pracas[praca].all.add(email);
      const isWebinario = String(r['Inscrito no Quiz'] || '').trim() === 'Inscrito(a) no quiz';
      if (isWebinario) {
        uniqueEmails.resumo.webinario.add(email);
        uniqueEmails.pracas[praca].webinario.add(email);
      }
    }
    
    metrics.pracas[praca].leads += 1;
    metrics.resumo.leads += 1;
    
    if (mql) {
      metrics.pracas[praca].mqls += 1;
      metrics.resumo.mqls += 1;
    }

    const dateStr = getDay(r['data_hora']) || r['data_hora'].split(' ')[0];
    if (!chartMap.has(dateStr)) chartMap.set(dateStr, { name: dateStr, investimentoTotal: 0, leadsTotal: 0, mqlsTotal: 0, cliquesTotal: 0, pageViewsTotal: 0 });
    const cData = chartMap.get(dateStr);
    cData.leadsTotal += 1;
    cData.mqlsTotal += mql ? 1 : 0;
    cData[`leads_${praca}`] = (cData[`leads_${praca}`] || 0) + 1;
    cData[`mqls_${praca}`] = (cData[`mqls_${praca}`] || 0) + (mql ? 1 : 0);
  });

  // Calculate chart CPL
  for (const cData of chartMap.values()) {
    ['Orgânico', ...pracas].forEach(p => {
      cData[`cpl_${p}`] = cData[`leads_${p}`] > 0 ? (cData[`inv_${p}`] || 0) / cData[`leads_${p}`] : 0;
    });
    cData.cplTotal = cData.leadsTotal > 0 ? (cData.investimentoTotal || 0) / cData.leadsTotal : 0;
  }

  // Calculate ratios
  Object.keys(metrics.pracas).forEach(k => {
    const p = metrics.pracas[k];
    p.cpl = p.leads > 0 ? p.investimento / p.leads : 0;
    p.cpmql = p.mqls > 0 ? p.investimento / p.mqls : 0;
    p.qualificacao = p.leads > 0 ? (p.mqls / p.leads) * 100 : 0;
    
    const uniquePraca = uniqueEmails.pracas[k];
    p.webinarioPercent = uniquePraca.all.size > 0 ? (uniquePraca.webinario.size / uniquePraca.all.size) * 100 : 0;
    p.webinarioAbs = uniquePraca.webinario.size;
  });
  
  metrics.resumo.cpl = metrics.resumo.leads > 0 ? metrics.resumo.investimento / metrics.resumo.leads : 0;
  metrics.resumo.cpmql = metrics.resumo.mqls > 0 ? metrics.resumo.investimento / metrics.resumo.mqls : 0;
  metrics.resumo.qualificacao = metrics.resumo.leads > 0 ? (metrics.resumo.mqls / metrics.resumo.leads) * 100 : 0;
  
  const leadsPagas = metrics.resumo.leads - (metrics.pracas['Orgânico']?.leads || 0);
  const mqlsPagas = metrics.resumo.mqls - (metrics.pracas['Orgânico']?.mqls || 0);
  metrics.resumo.leadsPagas = leadsPagas;
  metrics.resumo.mqlsPagas = mqlsPagas;
  metrics.resumo.cplPago = leadsPagas > 0 ? metrics.resumo.investimento / leadsPagas : 0;
  metrics.resumo.cpmqlPago = mqlsPagas > 0 ? metrics.resumo.investimento / mqlsPagas : 0;
  
  metrics.resumo.webinarioPercent = uniqueEmails.resumo.all.size > 0 ? (uniqueEmails.resumo.webinario.size / uniqueEmails.resumo.all.size) * 100 : 0;
  metrics.resumo.webinarioAbs = uniqueEmails.resumo.webinario.size;

  metrics.chartData = Array.from(chartMap.values()).sort((a, b) => {
    const getD = (ds) => {
       if (ds.includes('/')) {
         const p = ds.split('/');
         return new Date(`20${p[2].length === 2 ? p[2] : p[2].slice(-2)}-${p[1]}-${p[0]}`).getTime();
       }
       return new Date(ds).getTime();
    };
    return getD(a.name) - getD(b.name);
  }).map(d => {
     if (d.name.includes('-')) {
       const [y,m,day] = d.name.split('-');
       d.name = `${day}/${m}`;
     } else if (d.name.includes('/')) {
       const p = d.name.split('/');
       d.name = `${p[0]}/${p[1]}`;
     }
  
     d.connectRate = d.cliquesTotal > 0 ? (d.pageViewsTotal / d.cliquesTotal) * 100 : 0;
     d.pageConversion = d.pageViewsTotal > 0 ? (d.leadsTotal / d.pageViewsTotal) * 100 : 0;
     return d;
  });

  // Process Creatives
  const cMap = new Map<string, any>();
  
  // Clean names helper
  const cleanAdName = (n) => {
    if (!n) return '';
    let c = n.toLowerCase().trim();
    if (c.includes('-')) c = c.split('-').slice(0, -1).join('-').trim();
    return c;
  };

  const getCreativeKey = (m: any) => cleanAdName(m['NOME DO ANÚNCIO']);

  // PRE-CALCULATE ACTIVE CREATIVES FOR CURRENT (MAX) DATE
  let maxDateObj = 0;
  let maxDateStr = '';
  
  const parseAnyDate = (dateStr: string) => {
    if (!dateStr) return 0;
    const cleanStr = dateStr.trim().split(/\s+/)[0].split(',')[0];
    let parts = cleanStr.split('/');
    if (parts.length !== 3) {
      parts = cleanStr.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).getTime();
      }
    }
    if (parts.length === 3) {
      return new Date(parseInt(parts[2].length === 2 ? '20'+parts[2] : parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
    }
    return 0;
  };

  rawData.captura.forEach(r => {
    const d = r['Data'] || r['data'] || r['DATA'] || '';
    const t = parseAnyDate(d);
    if (t > maxDateObj) {
      maxDateObj = t;
      maxDateStr = d;
    }
  });

  const activeCreativesGlobal = new Set<string>();
  if (maxDateObj > 0) {
    rawData.captura.forEach(r => {
      const d = r['Data'] || r['data'] || r['DATA'] || '';
      const t = parseAnyDate(d);
      if (t === maxDateObj) {
        const stCamp = String(r['STATUS CAMPANHA'] || r['Status Campanha'] || r['Campanha Status'] || '').toUpperCase();
        const stConj = String(r['STATUS CONJUNTO'] || r['Status Conjunto'] || r['Conjunto Status'] || '').toUpperCase();
        const stAnun = String(r['STATUS ANÚNCIO'] || r['Status Anúncio'] || r['Anúncio Status'] || '').toUpperCase();
        if (stCamp === 'ACTIVE' && stConj === 'ACTIVE' && stAnun === 'ACTIVE') {
           const k = typeof getCreativeKey === 'function' ? getCreativeKey(r) : (r['NOME DO ANÚNCIO'] || r['Nome do Anúncio'] || '').trim().toLowerCase();
           if (k) activeCreativesGlobal.add(k);
        }
      }
    });
  }
fMeta.forEach(r => {
    const k = getCreativeKey(r);
    if (!k) return;
    if (!cMap.has(k)) {
       cMap.set(k, {
         nome: r['NOME DO ANÚNCIO'],
         thumbnail: r['Creative Thumbnail'],
         link: r['Creative Instagram Permalink'],
         investimento: 0,
         impressoes: 0,
         cliques: 0,
         view3s: 0,
         leads: 0,
         mqls: 0,
         vendas: 0,
         ativo: activeCreativesGlobal.has(k)
       });
    }
    const c = cMap.get(k);
    c.investimento += parseCurrency(r['Valor Gasto']);
    c.impressoes += parseNumber(r['Impressões'] || '0');
    c.cliques += parseNumber(r['Cliques no link'] || r['Cliques'] || '0');
    c.view3s += parseNumber(r['View 3s'] || r['Reproduções de vídeo de 3 segundos'] || r['Reproduções contínuas de vídeo de 2 segundos'] || '0');
    if (!c.thumbnail && r['Creative Thumbnail']) c.thumbnail = r['Creative Thumbnail'];
    if (!c.link && r['Creative Instagram Permalink']) c.link = r['Creative Instagram Permalink'];
  });

  fGeral.forEach(r => {
    const k = cleanAdName(r['utm_content']);
    if (!k || !cMap.has(k)) return;
    const c = cMap.get(k);
    c.leads += 1;
    if (isMql(r['renda'])) c.mqls += 1;
  });

  // Process Ingressos
  if (rawData.ingressos) {
    rawData.ingressos.forEach(r => {
      if (!isWithinDateRange(r['Data Compra'] || '')) return;
      const attr = (r['Atribuição'] || '').toLowerCase();
      if (attr.includes('webinario') || attr.includes('webinário') || attr.includes('webnario') || attr.includes('webnaeio')) {
        const email = (r['email'] || '').trim().toLowerCase();
        let praca = 'Orgânico';
        let utm_content = '';
        
        if (email) {
           const geralRow = emailToGeralRow.get(email);
           if (geralRow) {
             const atrGeral = normalizeAtr(geralRow['Atribuição']);
             praca = pracas.includes(atrGeral) ? atrGeral : 'Orgânico';
             utm_content = geralRow['utm_content'];
           }
        }
        
        metrics.resumo.vendas += 1;
        if (metrics.pracas[praca]) {
           metrics.pracas[praca].vendas += 1;
        }

        const dateStr = getDay(r['Data Compra']) || r['Data Compra'].split(' ')[0];
        if (!chartMap.has(dateStr)) chartMap.set(dateStr, { name: dateStr, investimentoTotal: 0, leadsTotal: 0, mqlsTotal: 0, cliquesTotal: 0, pageViewsTotal: 0, vendasTotal: 0 });
        const cData = chartMap.get(dateStr);
        cData.vendasTotal += 1;
        cData[`vendas_${praca}`] = (cData[`vendas_${praca}`] || 0) + 1;
        
        // Creatives
        if (utm_content) {
          const k = cleanAdName(utm_content);
          if (k && cMap.has(k)) {
            cMap.get(k).vendas += 1;
          }
        }
      }
    });
  }

  metrics.creatives = Array.from(cMap.values()).map(c => {
    c.cpl = c.leads > 0 ? c.investimento / c.leads : 0;
    c.cpmql = c.mqls > 0 ? c.investimento / c.mqls : 0;
    c.qualificacao = c.leads > 0 ? (c.mqls / c.leads) * 100 : 0;
    c.ctr = c.impressoes > 0 ? (c.cliques / c.impressoes) * 100 : 0;
    c.cpc = c.cliques > 0 ? c.investimento / c.cliques : 0;
    c.hookRate = c.impressoes > 0 ? (c.view3s / c.impressoes) * 100 : 0;
    return c;
  }).sort((a,b) => b.investimento - a.investimento);

  metrics.pagesData = Array.from(pageMap.values()).map(p => {
    p.connectRate = p.cliques > 0 ? (p.pageViews / p.cliques) * 100 : 0;
    p.pageConversion = p.pageViews > 0 ? (p.leads / p.pageViews) * 100 : 0;
    return p;
  }).sort((a,b) => a.name.localeCompare(b.name));

  return metrics;
}

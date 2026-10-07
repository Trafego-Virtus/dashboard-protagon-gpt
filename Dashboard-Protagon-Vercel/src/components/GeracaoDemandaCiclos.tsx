import React, { useMemo, useState } from 'react';
import { RawDashboardData } from '../utils/dataFetching';
import { processDashboardMetrics, ProcessedMetrics } from '../utils/metricsCalculator';
import { format, addDays, isAfter, startOfDay } from 'date-fns';
import { MetricCard } from './MetricCard';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, Line } from 'recharts';

interface Props {
  cycleLength?: 7 | 17;
  rawData: RawDashboardData;
  audienceTemp: 'all' | 'quente' | 'frio';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 p-3 rounded-lg shadow-xl">
        <p className="text-white font-medium mb-1">{label}</p>
        <p className="text-zinc-400 text-xs mb-3">{payload[0].payload.period}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
            {entry.name}: {entry.name.includes('CAC') || entry.name.includes('CPMQL') || entry.name.includes('Faturamento') || entry.name.includes('Investimento')
              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function GeracaoDemandaCiclos({ rawData, audienceTemp, cycleLength = 17 }: Props) {
  
  const cycles = useMemo(() => {
    let minDate = new Date();
    let found = false;
    
    if (rawData.gd) {
      rawData.gd.forEach((row: any) => {
        const d = row['Data'] || row['data'] || row['DATA'];
        if (d) {
          let dateObj;
          if (String(d).includes('/')) {
             const parts = String(d).split('/');
             if (parts.length === 3) {
               dateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
             }
          } else {
             dateObj = new Date(d);
          }
          if (dateObj && !isNaN(dateObj.getTime())) {
            if (!found || dateObj < minDate) {
              minDate = dateObj;
              found = true;
            }
          }
        }
      });
    }

    if (!found) return [];

    minDate = startOfDay(minDate);
    const today = startOfDay(new Date());

    const result = [];
    let currentStart = minDate;
    while (!isAfter(currentStart, today)) {
      const currentEnd = addDays(currentStart, cycleLength - 1);
      const startDateStr = format(currentStart, 'yyyy-MM-dd');
      const endDateStr = format(currentEnd, 'yyyy-MM-dd');
      
      const metrics = processDashboardMetrics(rawData, startDateStr, endDateStr, audienceTemp);
      
      result.push({
        startDate: currentStart,
        endDate: currentEnd,
        startDateStr,
        endDateStr,
        metrics
      });

      currentStart = addDays(currentEnd, 1);
    }
    
    return result.reverse(); 
  }, [rawData, audienceTemp, cycleLength]);

  const chartData = useMemo(() => {
    const reversed = [...cycles].reverse();
    return reversed.map((c, i) => {
      const cac = c.metrics.demanda.ingressos > 0 ? c.metrics.demanda.investimento / c.metrics.demanda.ingressos : 0;
      const cpmql = c.metrics.demanda.mqls > 0 ? c.metrics.demanda.investimento / c.metrics.demanda.mqls : 0;
      return {
        name: `Ciclo ${i + 1}`,
        displayName: `Ciclo ${i + 1} (${format(c.startDate, 'dd/MM')} - ${format(c.endDate, 'dd/MM')})`,
        period: `${format(c.startDate, 'dd/MM')} - ${format(c.endDate, 'dd/MM')}`,
        investimento: c.metrics.demanda.investimento,
        faturamento: c.metrics.demanda.faturamento,
        cac,
        cpmql
      };
    });
  }, [cycles]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 mt-4">
      <h2 className="text-xl font-bold tracking-tight border-l-4 border-yellow-500 pl-3 uppercase">Ciclo de Vendas ({cycleLength} Dias)</h2>
      
      {cycles.length === 0 && (
        <p className="text-zinc-500 text-center py-8">Nenhum dado encontrado para gerar ciclos.</p>
      )}

      {cycles.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 sm:p-6">
              <h3 className="text-white font-medium mb-6">Evolução do Investimento</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis 
                      dataKey="displayName" 
                      stroke="#ffffff50" 
                      fontSize={12} 
                      tickMargin={10} 
                    />
                    <YAxis 
                      stroke="#ffffff50" 
                      fontSize={12} 
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="investimento" name="Investimento" fill="#eab308" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 sm:p-6">
              <h3 className="text-white font-medium mb-6">CPMQL por Ciclo</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis 
                      dataKey="displayName" 
                      stroke="#ffffff50" 
                      fontSize={12} 
                      tickMargin={10} 
                    />
                    <YAxis 
                      stroke="#ffffff50" 
                      fontSize={12} 
                      tickFormatter={(value) => `R$ ${value.toFixed(0)}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="cpmql" name="CPMQL" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 sm:p-6">
            <h3 className="text-white font-medium mb-6">Faturamento vs CAC</h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis 
                      dataKey="displayName" 
                    stroke="#ffffff50" 
                    fontSize={12} 
                    tickMargin={10} 
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#ffffff50" 
                    fontSize={12} 
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#ffffff50" 
                    fontSize={12} 
                    tickFormatter={(value) => `R$ ${value.toFixed(0)}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar yAxisId="left" dataKey="faturamento" name="Faturamento" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="cac" name="CAC" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {cycles.map((cycle, i) => {
        const prevCycle = cycles[i + 1];
        
        const getTrend = (curr: number, prev: number, type: 'cost' | 'revenue') => {
          if (!prevCycle) return undefined;
          if (prev === 0) return undefined;
          const diff = curr - prev;
          if (diff === 0) return { direction: 'neutral' as const, isGood: true };
          const perc = Math.abs(diff / prev) * 100;
          const valStr = `${diff > 0 ? '+' : '-'}${perc.toFixed(1)}%`;
          return {
            direction: diff > 0 ? 'up' as const : 'down' as const,
            isGood: type === 'cost' ? diff < 0 : diff > 0,
            value: valStr
          };
        };

        return (
          <div key={cycle.startDateStr} className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 sm:p-6 overflow-hidden relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-yellow-500 text-black px-3 py-1 rounded-md font-bold text-sm">
                Ciclo {cycles.length - i}
              </div>
              <h3 className="text-white font-medium">
                {format(cycle.startDate, 'dd/MM/yyyy')} até {format(cycle.endDate, 'dd/MM/yyyy')}
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <MetricCard title="Investimento (Total)" value={cycle.metrics.demanda.investimento} type="currency" trend={getTrend(cycle.metrics.demanda.investimento, prevCycle?.metrics.demanda.investimento || 0, 'revenue')} />
              <MetricCard title="Faturamento (Total)" value={cycle.metrics.demanda.faturamento} type="currency" trend={getTrend(cycle.metrics.demanda.faturamento, prevCycle?.metrics.demanda.faturamento || 0, 'revenue')} />
              <MetricCard title="Ingressos (Total)" value={cycle.metrics.demanda.ingressos} type="number" trend={getTrend(cycle.metrics.demanda.ingressos, prevCycle?.metrics.demanda.ingressos || 0, 'revenue')} />
              <MetricCard title="CAC Ingressos" value={cycle.metrics.demanda.ingressos > 0 ? cycle.metrics.demanda.investimento / cycle.metrics.demanda.ingressos : 0} type="currency" trend={getTrend(cycle.metrics.demanda.ingressos > 0 ? cycle.metrics.demanda.investimento / cycle.metrics.demanda.ingressos : 0, prevCycle?.metrics.demanda.ingressos > 0 ? prevCycle?.metrics.demanda.investimento / prevCycle?.metrics.demanda.ingressos : 0, 'cost')} />
              <MetricCard title="Pace Diário (Ingressos)" value={cycle.metrics.demanda.ingressos / cycleLength} type="number" decimals={2} trend={getTrend(cycle.metrics.demanda.ingressos / cycleLength, prevCycle?.metrics.demanda.ingressos ? prevCycle?.metrics.demanda.ingressos / cycleLength : 0, 'revenue')} />
              <MetricCard title="Leads (Total)" value={cycle.metrics.demanda.leads} type="number" trend={getTrend(cycle.metrics.demanda.leads, prevCycle?.metrics.demanda.leads || 0, 'revenue')} />
              <MetricCard title="MQLs (Total)" value={cycle.metrics.demanda.mqls} type="number" trend={getTrend(cycle.metrics.demanda.mqls, prevCycle?.metrics.demanda.mqls || 0, 'revenue')} />
              <MetricCard title="Custo por Lead" value={cycle.metrics.demanda.leads > 0 ? cycle.metrics.demanda.investimento / cycle.metrics.demanda.leads : 0} type="currency" trend={getTrend(cycle.metrics.demanda.leads > 0 ? cycle.metrics.demanda.investimento / cycle.metrics.demanda.leads : 0, prevCycle?.metrics.demanda.leads > 0 ? prevCycle?.metrics.demanda.investimento / prevCycle?.metrics.demanda.leads : 0, 'cost')} />
              <MetricCard title="CPMQL" value={cycle.metrics.demanda.mqls > 0 ? cycle.metrics.demanda.investimento / cycle.metrics.demanda.mqls : 0} type="currency" trend={getTrend(cycle.metrics.demanda.mqls > 0 ? cycle.metrics.demanda.investimento / cycle.metrics.demanda.mqls : 0, prevCycle?.metrics.demanda.mqls > 0 ? prevCycle?.metrics.demanda.investimento / prevCycle?.metrics.demanda.mqls : 0, 'cost')} />
              <MetricCard title="Pace Diário (MQLs)" value={cycle.metrics.demanda.mqls / cycleLength} type="number" decimals={2} trend={getTrend(cycle.metrics.demanda.mqls / cycleLength, prevCycle?.metrics.demanda.mqls ? prevCycle?.metrics.demanda.mqls / cycleLength : 0, 'revenue')} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

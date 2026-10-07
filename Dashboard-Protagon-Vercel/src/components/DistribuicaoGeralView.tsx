import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, LineChart, Line } from 'recharts';
import { MetricCard } from './MetricCard';
import { formatCurrency } from '../utils/format';

interface DistribuicaoGeralViewProps {
  title: string;
  distData: {
    investimento: number;
    chartData: any[];
    etapas: any;
  };
  creatives: any[];
  tooltipFormatter: any;
}

export function DistribuicaoGeralView({ title, distData, creatives, tooltipFormatter }: DistribuicaoGeralViewProps) {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#a3e635', '#f43f5e'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-4">
        <h2 className="text-xl font-bold tracking-tight border-l-4 border-yellow-500 pl-3 uppercase">{title}</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
        <MetricCard title="Investimento Total" value={distData.investimento} type="currency" className="bg-yellow-500/10 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]" />
      </div>

      {/* Etapas Breakdown */}
      <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 shadow-md mt-6">
        <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Investimento por Etapa</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.values(distData.etapas || {}).sort((a: any, b: any) => b.investimento - a.investimento).map((et: any, i) => (
            <div key={i} className="bg-black/40 border border-white/10 p-4 rounded-lg flex flex-col justify-between">
              <p className="text-xs text-zinc-500 font-medium mb-1 truncate" title={et.nome || 'Sem Atribuição'}>{et.nome || 'Sem Atribuição'}</p>
              <div className="flex items-end justify-between">
                <p className="text-lg font-bold text-white">{formatCurrency(et.investimento)}</p>
                <p className="text-xs font-semibold text-zinc-400">
                  {distData.investimento > 0 ? ((et.investimento / distData.investimento) * 100).toFixed(1) : '0.0'}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Frequência Breakdown */}
      <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 shadow-md mt-6">
        <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Frequência por Etapa</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.values(distData.etapas || {}).sort((a: any, b: any) => b.investimento - a.investimento).map((et: any, i) => {
            const frequencia = et.alcance > 0 ? (et.impressoes / et.alcance) : 0;
            return (
              <div key={i} className="bg-black/40 border border-white/10 p-4 rounded-lg flex flex-col justify-between">
                <p className="text-xs text-zinc-500 font-medium mb-1 truncate" title={et.nome || 'Sem Atribuição'}>{et.nome || 'Sem Atribuição'}</p>
                <div className="flex items-end justify-between">
                  <p className="text-lg font-bold text-white">{frequencia.toFixed(2)}</p>
                  <p className="text-xs font-semibold text-zinc-400">
                    Alcance: {new Intl.NumberFormat('pt-BR').format(et.alcance)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overall Stacked Bar Chart for Investimento */}
      <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 shadow-md mt-6">
        <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Investimento Diário por Etapa (Gráfico Empilhado)</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distData.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickFormatter={(tick) => tick ? tick.substring(5, 10) : ""} />
              <YAxis stroke="#a1a1aa" fontSize={12} tickFormatter={(val) => `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)' }}
                itemStyle={{ fontSize: '12px' }}
                formatter={(val, name) => [`R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name]}
                labelFormatter={(label) => label ? String(label).split('-').reverse().join('/') : ''}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {Object.keys(distData.etapas || {}).map((etName, i) => {
                return <Bar key={etName} dataKey={etName || 'Sem Atribuição'} name={etName || 'Sem Atribuição'} stackId="a" fill={colors[i % colors.length]} radius={i === Object.keys(distData.etapas || {}).length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed charts per stage */}
      {Object.values(distData.etapas || {}).filter((et: any) => et.nome && !et.nome.toLowerCase().includes('live avulsa')).sort((a: any, b: any) => b.investimento - a.investimento).map((et: any, i) => {
        const hook = et.impressoes > 0 ? (et.view3s / et.impressoes) : 0;
        const body = et.view3s > 0 ? ((et.view50 || 0) / et.view3s) : 0;
        const hold = et.view3s > 0 ? ((et.view95 || 0) / et.view3s) : 0;
        const cpv25 = et.view25 > 0 ? (et.investimento / et.view25) : 0;
        const cpv50 = (et.view50 || 0) > 0 ? (et.investimento / (et.view50 || 0)) : 0;
        const cpv75 = (et.view75 || 0) > 0 ? (et.investimento / (et.view75 || 0)) : 0;
        const cpv95 = (et.view95 || 0) > 0 ? (et.investimento / (et.view95 || 0)) : 0;
        
        const stageChartData = et.chartData.map((d: any) => {
          return {
            date: d.date,
            hookRate: d.impressoes > 0 ? (d.view3s / d.impressoes) * 100 : 0,
            bodyRate: d.view3s > 0 ? ((d.view50 || 0) / d.view3s) * 100 : 0,
            holdRate: d.view3s > 0 ? ((d.view95 || 0) / d.view3s) * 100 : 0,
            cpv25: d.view25 > 0 ? (d.investimento / d.view25) : 0,
            cpv50: (d.view50 || 0) > 0 ? (d.investimento / (d.view50 || 0)) : 0,
            cpv75: (d.view75 || 0) > 0 ? (d.investimento / (d.view75 || 0)) : 0,
            cpv95: (d.view95 || 0) > 0 ? (d.investimento / (d.view95 || 0)) : 0,
          };
        });

        return (
          <div key={i} className="mt-8 border-t border-white/10 pt-8">
            <h3 className="text-xl font-bold text-yellow-500 mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              Etapa: {et.nome}
              <span className="text-sm font-medium text-emerald-400 ml-2 flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                {creatives.filter(c => c.atribuicao === et.nome && c.ativo).length} Criativos Ativos
              </span>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
              <MetricCard title="Investimento" value={et.investimento} type="currency" />
              <MetricCard title="Hook Rate" value={`${(hook * 100).toFixed(2)}%`} type="string" tooltip="Visualizações de 3s ÷ Impressões" />
              <MetricCard title="Body Rate" value={`${(body * 100).toFixed(2)}%`} type="string" tooltip="Visualizações de 50% ÷ Visualizações de 3s" />
              <MetricCard title="Hold Rate" value={`${(hold * 100).toFixed(2)}%`} type="string" tooltip="Visualizações de 95% ÷ Visualizações de 3s" />
              <MetricCard title="CPV 25%" value={cpv25} type="currency" />
              <MetricCard title="CPV 50%" value={cpv50} type="currency" />
              <MetricCard title="CPV 75%" value={cpv75} type="currency" />
              <MetricCard title="CPV 95%" value={cpv95} type="currency" />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hook, Body, Hold Line Chart */}
              <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 shadow-md">
                <h4 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Taxas de Retenção (%)</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stageChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickFormatter={(tick) => tick ? tick.substring(5, 10) : ""} />
                      <YAxis stroke="#a1a1aa" fontSize={12} tickFormatter={(val) => `${val}%`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)' }}
                        itemStyle={{ fontSize: '12px' }}
                        formatter={(val) => `${Number(val).toFixed(2)}%`}
                        labelFormatter={(label) => label ? String(label).split('-').reverse().join('/') : ''}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line type="monotone" dataKey="hookRate" name="Hook Rate" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="bodyRate" name="Body Rate" stroke="#10b981" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="holdRate" name="Hold Rate" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* CPVs Line/Bar Chart */}
              <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 shadow-md">
                <h4 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Custos por Visualização (R$)</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stageChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickFormatter={(tick) => tick ? tick.substring(5, 10) : ""} />
                      <YAxis stroke="#a1a1aa" fontSize={12} tickFormatter={(val) => `R$ ${Number(val).toFixed(2)}`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)' }}
                        itemStyle={{ fontSize: '12px' }}
                        formatter={(val) => `R$ ${Number(val).toFixed(2)}`}
                        labelFormatter={(label) => label ? String(label).split('-').reverse().join('/') : ''}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line type="monotone" dataKey="cpv25" name="CPV 25%" stroke="#a3e635" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="cpv50" name="CPV 50%" stroke="#eab308" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="cpv75" name="CPV 75%" stroke="#f97316" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="cpv95" name="CPV 95%" stroke="#ef4444" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            <div className="mt-6 bg-zinc-800/80 rounded-xl p-4 border border-zinc-600 shadow-inner">
              <h4 className="text-sm font-bold text-yellow-500 mb-3 uppercase tracking-wider">Públicos Gerados da Fase de {et.nome}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                  <p className="text-xs text-zinc-400 font-semibold uppercase mb-1">View 25%</p>
                  <p className="text-xl font-bold text-white">{new Intl.NumberFormat('pt-BR').format(et.view25)}</p>
                </div>
                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                  <p className="text-xs text-zinc-400 font-semibold uppercase mb-1">View 50%</p>
                  <p className="text-xl font-bold text-white">{new Intl.NumberFormat('pt-BR').format(et.view50 || 0)}</p>
                </div>
                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                  <p className="text-xs text-zinc-400 font-semibold uppercase mb-1">View 75%</p>
                  <p className="text-xl font-bold text-white">{new Intl.NumberFormat('pt-BR').format(et.view75 || 0)}</p>
                </div>
                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                  <p className="text-xs text-zinc-400 font-semibold uppercase mb-1">View 95%</p>
                  <p className="text-xl font-bold text-white">{new Intl.NumberFormat('pt-BR').format(et.view95 || 0)}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

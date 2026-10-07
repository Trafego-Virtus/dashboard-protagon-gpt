import React, { useState, useEffect } from 'react';
import { fetchRawDashboardData, RawDashboardData } from '../utils/dataFetching';
import { DashboardId } from '../utils/api';
import { processDashboardMetrics, ProcessedMetrics } from '../utils/metricsCalculator';
import { AnaliseKPIs } from './AnaliseKPIs';
import { Menu, BarChart2, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { subDays, startOfToday, format } from 'date-fns';

interface GlobalAnaliseKPIsProps {
  onOpenAppMenu: () => void;
}

export function GlobalAnaliseKPIs({ onOpenAppMenu }: GlobalAnaliseKPIsProps) {
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardId | 'all'>('all');
  const [showReferences, setShowReferences] = useState(false);
  const [rawData, setRawData] = useState<RawDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ProcessedMetrics | null>(null);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    
    const loadData = async () => {
      try {
        if (selectedDashboard === 'all') {
          const [j, c, p, sp, g] = await Promise.all([
            fetchRawDashboardData('protagon-joinville'),
            fetchRawDashboardData('protagon-cuiaba'),
            fetchRawDashboardData('protagon-porto-alegre'),
            fetchRawDashboardData('protagon-sao-paulo'),
            fetchRawDashboardData('protagon-goiania')
          ]);
          if (!ignore) {
            const addPraca = (data, pName) => (data || []).map(r => ({ ...r, praca: pName }));
            setRawData({
              main: [...addPraca(j.main, 'Joinville'), ...addPraca(c.main, 'Cuiabá'), ...addPraca(p.main, 'Porto Alegre'), ...addPraca(sp.main, 'São Paulo'), ...addPraca(g.main, 'Goiânia')],
              ingressos: [...addPraca(j.ingressos, 'Joinville'), ...addPraca(c.ingressos, 'Cuiabá'), ...addPraca(p.ingressos, 'Porto Alegre'), ...addPraca(sp.ingressos, 'São Paulo'), ...addPraca(g.ingressos, 'Goiânia')],
              cadeiras: [...addPraca(j.cadeiras, 'Joinville'), ...addPraca(c.cadeiras, 'Cuiabá'), ...addPraca(p.cadeiras, 'Porto Alegre'), ...addPraca(sp.cadeiras, 'São Paulo'), ...addPraca(g.cadeiras, 'Goiânia')],
              geral: [...addPraca(j.geral, 'Joinville'), ...addPraca(c.geral, 'Cuiabá'), ...addPraca(p.geral, 'Porto Alegre'), ...addPraca(sp.geral, 'São Paulo'), ...addPraca(g.geral, 'Goiânia')],
              met: [...addPraca(j.met, 'Joinville'), ...addPraca(c.met, 'Cuiabá'), ...addPraca(p.met, 'Porto Alegre'), ...addPraca(sp.met, 'São Paulo'), ...addPraca(g.met, 'Goiânia')],
              vd: [...addPraca(j.vd, 'Joinville'), ...addPraca(c.vd, 'Cuiabá'), ...addPraca(p.vd, 'Porto Alegre'), ...addPraca(sp.vd, 'São Paulo'), ...addPraca(g.vd, 'Goiânia')],
              gd: [...addPraca(j.gd, 'Joinville'), ...addPraca(c.gd, 'Cuiabá'), ...addPraca(p.gd, 'Porto Alegre'), ...addPraca(sp.gd, 'São Paulo'), ...addPraca(g.gd, 'Goiânia')],
              dc: [...addPraca(j.dc, 'Joinville'), ...addPraca(c.dc, 'Cuiabá'), ...addPraca(p.dc, 'Porto Alegre'), ...addPraca(sp.dc, 'São Paulo'), ...addPraca(g.dc, 'Goiânia')]
            } as any);
          }
        } else {
          const data = await fetchRawDashboardData(selectedDashboard as DashboardId);
          if (!ignore) {
            setRawData(data);
          }
        }
      } catch (err: any) {
        if (!ignore) {
          setError(err.message || 'Erro ao carregar dados');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    loadData();
    
    return () => { ignore = true; };
  }, [selectedDashboard]);

  useEffect(() => {
    if (!rawData) return;
    const startDate = format(subDays(startOfToday(), 7), 'yyyy-MM-dd');
    const endDate = format(startOfToday(), 'yyyy-MM-dd');
    const result = processDashboardMetrics(rawData, startDate, endDate, 'all');
    setMetrics(result);
  }, [rawData]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a]">
      <header className="flex-none p-4 xl:p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onOpenAppMenu}
            className="xl:hidden p-2 -ml-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg"
          >
            <Menu size={24} />
          </button>
          <div>
            <h1 className="text-xl xl:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-yellow-500" />
              Análise Estratégica
            </h1>
            <p className="text-sm text-zinc-500 hidden sm:block">Análise profunda de KPIs e criativos</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowReferences(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors border border-white/5 text-sm font-medium mr-2"
          >
            <Info className="w-4 h-4 text-blue-400" />
            Referências de KPIs
          </button>
          
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden sm:block">Praça:</label>
          <select 
            value={selectedDashboard}
            onChange={(e) => setSelectedDashboard(e.target.value as DashboardId | 'all')}
            className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/50"
          >
            <option value="all">Todas as Praças</option>
            <option value="protagon-joinville">Joinville</option>
            <option value="protagon-cuiaba">Cuiabá</option>
            <option value="protagon-porto-alegre">Porto Alegre</option>
            <option value="protagon-sao-paulo">São Paulo</option>
            <option value="protagon-goiania">Goiânia</option>
          </select>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 xl:p-6 custom-scrollbar relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">
            {error}
          </div>
        ) : metrics && rawData ? (
          <AnaliseKPIs metrics={metrics} dashboardId={selectedDashboard} rawData={rawData} />
        ) : null}
      </main>

      <AnimatePresence>
        {showReferences && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-400" />
                  Referências de KPIs
                </h2>
                <button onClick={() => setShowReferences(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar max-h-[70vh]">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest text-center">HSR (Hook Successful Rate)</h3>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
                      <p className="text-red-500 font-bold text-lg">&lt; 30%</p>
                      <p className="text-xs text-red-500/80 uppercase mt-1">Ruim</p>
                    </div>
                    <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg text-center">
                      <p className="text-orange-500 font-bold text-lg">30-50%</p>
                      <p className="text-xs text-orange-500/80 uppercase mt-1">Médio</p>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-center">
                      <p className="text-emerald-500 font-bold text-lg">50-70%</p>
                      <p className="text-xs text-emerald-500/80 uppercase mt-1">Bom</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg text-center">
                      <p className="text-blue-500 font-bold text-lg">&gt; 70%</p>
                      <p className="text-xs text-blue-500/80 uppercase mt-1">Excelente</p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 text-center mt-2">Porcentagem de pessoas que continuam assistindo após os 3 primeiros segundos.</p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest text-center">CTR (Análise Geral)</h3>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
                      <p className="text-red-500 font-bold text-lg">&lt; 0.8%</p>
                      <p className="text-xs text-red-500/80 uppercase mt-1">Ruim</p>
                    </div>
                    <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg text-center">
                      <p className="text-orange-500 font-bold text-lg">0.8-1.5%</p>
                      <p className="text-xs text-orange-500/80 uppercase mt-1">Médio</p>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-center">
                      <p className="text-emerald-500 font-bold text-lg">1.5-3.0%</p>
                      <p className="text-xs text-emerald-500/80 uppercase mt-1">Bom</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg text-center">
                      <p className="text-blue-500 font-bold text-lg">&gt; 3.0%</p>
                      <p className="text-xs text-blue-500/80 uppercase mt-1">Excelente</p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 text-center mt-2">Porcentagem de pessoas que clicaram no anúncio após visualizá-lo.</p>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest text-center">CTR (Teste de Gancho - F1)</h3>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
                      <p className="text-red-500 font-bold text-lg">&lt; 0.8%</p>
                      <p className="text-xs text-red-500/80 uppercase mt-1">Ruim</p>
                    </div>
                    <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg text-center">
                      <p className="text-orange-500 font-bold text-lg">0.8-1.5%</p>
                      <p className="text-xs text-orange-500/80 uppercase mt-1">Médio</p>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-center">
                      <p className="text-emerald-500 font-bold text-lg">1.5-2.5%</p>
                      <p className="text-xs text-emerald-500/80 uppercase mt-1">Bom</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg text-center">
                      <p className="text-blue-500 font-bold text-lg">&gt; 2.5%</p>
                      <p className="text-xs text-blue-500/80 uppercase mt-1">Excelente</p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 text-center mt-2">Porcentagem de cliques para fase de testes de gancho estáticos.</p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest text-center">CPM (Custo por Mil Impressões)</h3>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
                      <p className="text-red-500 font-bold text-lg">&gt; R$40</p>
                      <p className="text-xs text-red-500/80 uppercase mt-1">Ruim</p>
                    </div>
                    <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg text-center">
                      <p className="text-orange-500 font-bold text-lg">R$20-40</p>
                      <p className="text-xs text-orange-500/80 uppercase mt-1">Médio</p>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-center">
                      <p className="text-emerald-500 font-bold text-lg">R$10-20</p>
                      <p className="text-xs text-emerald-500/80 uppercase mt-1">Bom</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg text-center">
                      <p className="text-blue-500 font-bold text-lg">&lt; R$10</p>
                      <p className="text-xs text-blue-500/80 uppercase mt-1">Excelente</p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 text-center mt-2">Custo para exibir o anúncio 1.000 vezes. Valores para a fase de testes de gancho.</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

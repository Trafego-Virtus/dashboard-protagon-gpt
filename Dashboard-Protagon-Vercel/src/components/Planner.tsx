import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Save, MapPin, Lock, User, Clock, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

interface PlannerProps {
  onBack?: () => void;
}

const LOCATIONS = [
  { id: 'protagon-joinville', name: 'Protagon Joinville' },
  { id: 'protagon-cuiaba', name: 'Protagon Cuiabá' },
  { id: 'protagon-porto-alegre', name: 'Protagon Porto Alegre' },
  { id: 'protagon-sao-paulo', name: 'Protagon São Paulo' },
  { id: 'protagon-goiania', name: 'Protagon Goiânia' }
];

export interface PeriodGoal {
  id: string;
  dataInicial: string;
  dataFinal: string;
  metaMqlsPorDia: string;
  metaCadeiras: string;
  metaCpmql: string;
  metaCustoPorIngresso: string;
  isSaved?: boolean;
}

interface LocationConfig {
  ultimoDiaTrafego: string;
  lastUpdated: string;
  periods: PeriodGoal[];
}

export function Planner({ onBack }: PlannerProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [metas, setMetas] = useState<Record<string, LocationConfig>>({});
  const [loading, setLoading] = useState(true);
  const [savingLocId, setSavingLocId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    const unsubscribes = LOCATIONS.map(loc => {
      const configDoc = doc(db, 'config', `dashboard_${loc.id}`);
      return onSnapshot(configDoc, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const periods = (data.periods || []).map((p: any) => ({
            id: p.id || Math.random().toString(36).substring(7),
            dataInicial: p.dataInicial || '',
            dataFinal: p.dataFinal || '',
            metaMqlsPorDia: p.metaMqlsPorDia?.toString() || '',
            metaCadeiras: (p.metaCadeiras || p.metaCadeirasPorDia)?.toString() || '',
            metaCpmql: p.metaCpmql?.toString() || '',
            metaCustoPorIngresso: p.metaCustoPorIngresso?.toString() || '',
            isSaved: true
          }));
          
          setMetas(prev => ({
            ...prev,
            [loc.id]: {
              ultimoDiaTrafego: data.ultimoDiaTrafego || '',
              lastUpdated: data.lastUpdated || '',
              periods: periods
            }
          }));
        } else {
          setMetas(prev => ({
            ...prev,
            [loc.id]: {
              ultimoDiaTrafego: '',
              lastUpdated: '',
              periods: []
            }
          }));
        }
      }, (err) => console.error("Firestore onSnapshot error:", err));
    });
    setLoading(false);
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === 'karina.admin' && password === 'Protagon2026@') {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Credenciais inválidas. Verifique o usuário e senha e tente novamente.');
    }
  };

  const handleUltimoDiaChange = (locId: string, value: string) => {
    setMetas(prev => ({
      ...prev,
      [locId]: {
        ...(prev[locId] || { ultimoDiaTrafego: '', lastUpdated: '', periods: [] }),
        ultimoDiaTrafego: value
      }
    }));
  };

  const addPeriod = (locId: string) => {
    setMetas(prev => {
      const locData = prev[locId] || { ultimoDiaTrafego: '', lastUpdated: '', periods: [] };
      return {
        ...prev,
        [locId]: {
          ...locData,
          periods: [...locData.periods, { id: Math.random().toString(36).substring(7), dataInicial: '', dataFinal: '', metaMqlsPorDia: '', metaCadeiras: '', metaCpmql: '', metaCustoPorIngresso: '', isSaved: false }]
        }
      };
    });
  };

  const removePeriod = (locId: string, periodId: string) => {
    setMetas(prev => {
      const locData = prev[locId];
      if (!locData) return prev;
      return {
        ...prev,
        [locId]: {
          ...locData,
          periods: locData.periods.filter(p => p.id !== periodId)
        }
      };
    });
  };

  const updatePeriod = (locId: string, periodId: string, field: keyof PeriodGoal, value: string) => {
    setMetas(prev => {
      const locData = prev[locId];
      if (!locData) return prev;
      return {
        ...prev,
        [locId]: {
          ...locData,
          periods: locData.periods.map(p => p.id === periodId ? { ...p, [field]: value, isSaved: false } : p)
        }
      };
    });
  };

  const checkOverlap = (periods: PeriodGoal[]) => {
    const validPeriods = periods.filter(p => p.dataInicial && p.dataFinal);
    const sorted = [...validPeriods].sort((a, b) => new Date(a.dataInicial).getTime() - new Date(b.dataInicial).getTime());
    for (let i = 0; i < sorted.length - 1; i++) {
      if (new Date(sorted[i].dataFinal) >= new Date(sorted[i+1].dataInicial)) {
        return true;
      }
    }
    return false;
  };

  const handleSave = async (locId: string) => {
    setErrorMsg(null);
    const locData = metas[locId];
    if (!locData) return;

    if (checkOverlap(locData.periods)) {
      setErrorMsg(`Conflito de datas na praça ${LOCATIONS.find(l => l.id === locId)?.name}. Não é possível ter períodos sobrepostos.`);
      return;
    }

    setSavingLocId(locId);
    try {
      const payload = {
        ultimoDiaTrafego: locData.ultimoDiaTrafego,
        lastUpdated: new Date().toISOString(),
        periods: locData.periods.map(p => ({
          id: p.id,
          dataInicial: p.dataInicial,
          dataFinal: p.dataFinal,
          metaMqlsPorDia: p.metaMqlsPorDia ? Number(p.metaMqlsPorDia) : null,
          metaCadeiras: p.metaCadeiras ? Number(p.metaCadeiras) : null,
          metaCpmql: p.metaCpmql ? Number(p.metaCpmql) : null,
          metaCustoPorIngresso: p.metaCustoPorIngresso ? Number(p.metaCustoPorIngresso) : null,
        }))
      };

      await setDoc(doc(db, 'config', `dashboard_${locId}`), payload, { merge: true });
    } catch (err) {
      console.error("Failed to save goals", err);
    } finally {
      setTimeout(() => setSavingLocId(null), 500);
    }
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return 'Nunca atualizado';
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    }).format(d);
  };

  if (!isLoggedIn) {
    return (
      <div className="h-full flex items-center justify-center bg-black text-white p-4 font-sans w-full">
        {onBack && (
          <button 
            onClick={onBack}
            className="absolute top-6 left-6 p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
          >
            <ArrowLeft size={24} />
          </button>
        )}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-sm w-full relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 blur-[50px] rounded-full"></div>
          
          <div className="mb-8 text-center relative z-10">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500 mx-auto mb-4">
              <Lock size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight uppercase">Acesso Restrito</h1>
            <p className="text-sm text-zinc-400 mt-2">Área do Planejador de Praças</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-1 block">Usuário</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50 transition-colors text-sm"
                  placeholder="Nome de usuário"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-1 block">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50 transition-colors text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            {loginError && (
              <p className="text-red-500 text-xs font-medium text-center">{loginError}</p>
            )}
            <button
              type="submit"
              className="w-full bg-yellow-500 text-black font-bold uppercase tracking-widest text-sm py-3 rounded-lg hover:bg-yellow-400 transition-colors mt-2"
            >
              Entrar
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-black text-white p-4 sm:p-8 font-sans w-full">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mt-6 sm:mt-10">
          <div className="flex items-center gap-4">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
              >
                <ArrowLeft size={24} />
              </button>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase">Planejador de Praças</h1>
              <p className="text-sm text-zinc-500 mt-1">Configure as metas por período para cada praça ativa</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
            <User size={14} className="text-yellow-500" />
            <span className="text-xs font-medium text-yellow-500 capitalize">{username}</span>
          </div>
        </header>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3">
            <AlertTriangle size={20} />
            <span className="text-sm font-semibold">{errorMsg}</span>
          </div>
        )}

        <main className="grid grid-cols-1 gap-6 pb-20">
          {LOCATIONS.map((loc) => {
            const m = metas[loc.id] || { ultimoDiaTrafego: '', lastUpdated: '', periods: [] };
            
            return (
              <motion.div
                key={loc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900 border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/5 blur-[60px] rounded-full"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10 border-b border-white/10 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 shrink-0">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight uppercase">{loc.name}</h2>
                      {m.lastUpdated && (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
                          <Clock size={12} />
                          Atualizado em: {formatDate(m.lastUpdated)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 w-full sm:w-64">
                    <label className="text-xs text-zinc-400 uppercase tracking-widest font-semibold block text-yellow-500">Último Dia de Tráfego</label>
                    <input
                      type="date"
                      className="w-full bg-black/50 border border-yellow-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-yellow-500/50 transition-colors text-sm [color-scheme:dark]"
                      value={m.ultimoDiaTrafego}
                      onChange={(e) => handleUltimoDiaChange(loc.id, e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-4 relative z-10 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Períodos de Metas</h3>
                    <button 
                      onClick={() => addPeriod(loc.id)}
                      className="text-xs flex items-center gap-1.5 text-yellow-500 hover:bg-yellow-500/10 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-yellow-500/20"
                    >
                      <Plus size={14} /> Adicionar Período
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {m.periods.map((period, index) => {
                      const maxDate = m.ultimoDiaTrafego || undefined;
                      const isAfterMax = period.dataFinal && maxDate && new Date(period.dataFinal) > new Date(maxDate);

                      return (
                        <div key={period.id} className={`rounded-xl p-4 flex flex-col xl:flex-row gap-4 items-start xl:items-center transition-colors ${period.isSaved ? 'bg-yellow-500/10 border-2 border-yellow-500/50' : 'bg-black/40 border border-white/5'}`}>
                          <div className="flex items-center justify-between w-full xl:w-auto">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-zinc-500 shrink-0">
                                {index + 1}
                              </span>
                              
  {period.isSaved && (
                                <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 px-2 py-1 rounded-md text-xs uppercase font-black tracking-widest whitespace-nowrap inline-block shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                                  Meta Ativa
                                </span>
                              )}

                            </div>
                            <button 
                              onClick={() => removePeriod(loc.id, period.id)}
                              className="xl:hidden p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Remover período"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 flex-1 w-full items-end">
                            <div className="space-y-1.5">
                              <label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold block">Data Inicial</label>
                              <input
                                type="date"
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-500/50 transition-colors text-sm [color-scheme:dark]"
                                value={period.dataInicial}
                                onChange={(e) => updatePeriod(loc.id, period.id, 'dataInicial', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold block">Data Final</label>
                              <input
                                type="date"
                                max={maxDate}
                                className={`w-full bg-black/50 border ${isAfterMax ? 'border-red-500/50' : 'border-white/10'} rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-500/50 transition-colors text-sm [color-scheme:dark]`}
                                value={period.dataFinal}
                                onChange={(e) => updatePeriod(loc.id, period.id, 'dataFinal', e.target.value)}
                              />
                              {isAfterMax && <p className="text-[10px] text-red-500">Excede o último dia.</p>}
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold block">Meta MQLs/Dia</label>
                              <input
                                type="number"
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-500/50 transition-colors text-sm"
                                placeholder="Ex: 50"
                                value={period.metaMqlsPorDia}
                                onChange={(e) => updatePeriod(loc.id, period.id, 'metaMqlsPorDia', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold block">Meta Ingressos</label>
                              <input
                                type="number"
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-500/50 transition-colors text-sm"
                                placeholder="Ex: 500"
                                value={period.metaCadeiras}
                                onChange={(e) => updatePeriod(loc.id, period.id, 'metaCadeiras', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold block">Meta CPMQL (R$)</label>
                              <input
                                type="number"
                                step="0.01"
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-500/50 transition-colors text-sm"
                                placeholder="Ex: 5.50"
                                value={period.metaCpmql}
                                onChange={(e) => updatePeriod(loc.id, period.id, 'metaCpmql', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold block">Meta CPA (R$)</label>
                              <input
                                type="number"
                                step="0.01"
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-500/50 transition-colors text-sm"
                                placeholder="Ex: 15.00"
                                value={period.metaCustoPorIngresso}
                                onChange={(e) => updatePeriod(loc.id, period.id, 'metaCustoPorIngresso', e.target.value)}
                              />
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => removePeriod(loc.id, period.id)}
                            className="hidden xl:block p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors mt-6 xl:mt-0"
                            title="Remover período"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      );
                    })}
                    {m.periods.length === 0 && (
                      <div className="text-center p-8 border border-dashed border-white/10 rounded-xl">
                        <p className="text-zinc-500 text-sm">Nenhuma meta configurada para esta praça.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10 relative z-10">
                  <button 
                    onClick={() => handleSave(loc.id)}
                    disabled={savingLocId === loc.id}
                    className="w-full sm:w-auto px-6 py-2.5 bg-yellow-500/10 text-yellow-500 rounded-lg hover:bg-yellow-500/20 transition-colors border border-yellow-500/20 flex items-center justify-center gap-2 font-semibold text-sm uppercase tracking-wider ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={18} />
                    {savingLocId === loc.id ? 'Salvando...' : 'Salvar Metas'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </main>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { DashboardId } from './utils/api';
import { LayoutDashboard, Settings, MapPin, Menu, X, BarChart2, FlaskConical } from 'lucide-react';
import { ReportGenerator } from './components/ReportGenerator';
import { FeedbacksKPIsView } from './components/FeedbacksKPIs/FeedbacksKPIsView';
import { PerpetualQuiz } from './components/PerpetualQuiz';
import { PerpetualWebinario } from './components/PerpetualWebinario';
import { PerpetualWorkshop } from './components/PerpetualWorkshop';
import { PerpetualGuardians } from './components/PerpetualGuardians';
import { TestesAgilView } from './components/TestesAgil/TestesAgilView';
import { Filter } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'feedbacks-kpis' | 'testes' | 'quiz' | 'webinario' | 'workshop' | 'guardians' | DashboardId>('protagon-joinville');
  const [previousDashboard, setPreviousDashboard] = useState<DashboardId>('protagon-joinville');
  const [isAppMenuOpen, setIsAppMenuOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    
    if (viewParam) {
      switch (viewParam.toLowerCase()) {
        case 'joinville':
          setCurrentView('protagon-joinville');
          setPreviousDashboard('protagon-joinville');
          break;
        case 'cuiaba':
          setCurrentView('protagon-cuiaba');
          setPreviousDashboard('protagon-cuiaba');
          break;
        case 'porto-alegre':
          setCurrentView('protagon-porto-alegre');
          setPreviousDashboard('protagon-porto-alegre');
          break;
        case 'sao-paulo':
        case 'sp':
          setCurrentView('protagon-sao-paulo');
          setPreviousDashboard('protagon-sao-paulo');
          break;
        case 'goiania':
        case 'gyn':
          setCurrentView('protagon-goiania');
          setPreviousDashboard('protagon-goiania');
          break;
        case 'feedbacks-kpis':
        case 'kpis':
          setCurrentView('feedbacks-kpis');
          break;
        case 'testes':
          setCurrentView('testes');
          break;
        case 'quiz':
          setCurrentView('quiz');
          break;
        case 'webinario':
          setCurrentView('webinario');
          break;
        case 'workshop':
          setCurrentView('workshop');
          break;
        case 'guardians':
          setCurrentView('guardians');
          break;
        default:
          break;
      }
    }
  }, []);

  const handleDashboardChange = (id: DashboardId) => {
    setPreviousDashboard(id);
    setCurrentView(id);
    setIsAppMenuOpen(false);
  };
  
  const handleFeedbacksKPIsOpen = () => {
    setCurrentView('feedbacks-kpis');
    setIsAppMenuOpen(false);
  };

  const handleTestesOpen = () => {
    setCurrentView('testes');
    setIsAppMenuOpen(false);
  };

  const handleQuizOpen = () => {
    setCurrentView('quiz');
    setIsAppMenuOpen(false);
  };
  const handleGuardiansOpen = () => {
    setCurrentView('guardians');
    setIsAppMenuOpen(false);
  };
  const handleWebinarioOpen = () => {
    setCurrentView('webinario');
    setIsAppMenuOpen(false);
  };

  const handleWorkshopOpen = () => {
    setCurrentView('workshop');
    setIsAppMenuOpen(false);
  };

  const handlePlannerBack = () => {
    setCurrentView(previousDashboard);
  };

  const DASHBOARDS = [
    { id: 'protagon-joinville', name: 'Joinville' },
    { id: 'protagon-cuiaba', name: 'Cuiabá' },
    { id: 'protagon-porto-alegre', name: 'Porto Alegre' },
    { id: 'protagon-sao-paulo', name: 'São Paulo' },
    { id: 'protagon-goiania', name: 'Goiânia' }
  ];

  return (
    <div className="flex h-screen bg-[#050505] text-zinc-100 overflow-hidden font-sans">
      {/* Mobile overlay */}
      {isAppMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 xl:hidden backdrop-blur-sm"
          onClick={() => setIsAppMenuOpen(false)}
        />
      )}
      {/* Global Sidebar for Dashboards */}
      <div className={`w-56 bg-[#0a0a0a] border-r border-white/10 flex flex-col shrink-0 fixed inset-y-0 left-0 z-50 transform ${isAppMenuOpen ? 'translate-x-0' : '-translate-x-full'} xl:relative xl:translate-x-0 transition-transform duration-200 ease-in-out`}>
        <div className="p-4 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center font-black text-black text-xl shadow-[0_0_15px_rgba(234,179,8,0.2)]">P</div>
              <div>
                <h1 className="text-lg font-bold tracking-tight uppercase">Protagon</h1>
                <p className="text-[10px] text-zinc-500 tracking-widest uppercase">Dashboards</p>
              </div>
            </div>
            <button onClick={() => setIsAppMenuOpen(false)} className="xl:hidden p-2 text-zinc-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1 px-2 font-semibold">Praças</div>
          
          {DASHBOARDS.map(dash => (
            <button
              key={dash.id}
              onClick={() => handleDashboardChange(dash.id as DashboardId)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-3 transition-all ${
                currentView === dash.id 
                  ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' 
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <LayoutDashboard size={18} className={currentView === dash.id ? 'text-yellow-500' : 'text-zinc-500'} />
              {dash.name}
            </button>
          ))}

          <div className="mt-8 text-[10px] uppercase tracking-widest text-zinc-500 mb-1 px-2 font-semibold">Análise Estratégica</div>
          <button
            onClick={handleFeedbacksKPIsOpen}
            className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-3 transition-all ${
              currentView === 'feedbacks-kpis' 
                ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' 
                : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <BarChart2 size={18} className={currentView === 'feedbacks-kpis' ? 'text-yellow-500' : 'text-zinc-500'} />
            Feedbacks KPIs
          </button>
          <button
            onClick={handleTestesOpen}
            className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-3 transition-all ${
              currentView === 'testes' 
                ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' 
                : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <FlaskConical size={18} className={currentView === 'testes' ? 'text-yellow-500' : 'text-zinc-500'} />
            Testes
          </button>
          
          <div className="mt-8 text-[10px] uppercase tracking-widest text-zinc-500 mb-1 px-2 font-semibold">Funis Perpétuos</div>
          <button
            onClick={handleQuizOpen}
            className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-3 transition-all ${
              currentView === 'quiz' 
                ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' 
                : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Filter size={18} className={currentView === 'quiz' ? 'text-yellow-500' : 'text-zinc-500'} />
            Quiz
          </button>
          
          <button
            onClick={handleWebinarioOpen}
            className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-3 transition-all ${
              currentView === 'webinario' 
                ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' 
                : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Filter size={18} className={currentView === 'webinario' ? 'text-yellow-500' : 'text-zinc-500'} />
            Webinário
          </button>

          <button
            onClick={handleWorkshopOpen}
            className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-3 transition-all ${
              currentView === 'workshop' 
                ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' 
                : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Filter size={18} className={currentView === 'workshop' ? 'text-yellow-500' : 'text-zinc-500'} />
            Workshop
          </button>
          
          <button
            onClick={handleGuardiansOpen}
            className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-3 transition-all ${
              currentView === 'guardians' 
                ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' 
                : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Filter size={18} className={currentView === 'guardians' ? 'text-yellow-500' : 'text-zinc-500'} />
            Guardians 2020
          </button>

          
          <div className="mt-auto">
            <ReportGenerator />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {currentView === 'feedbacks-kpis' ? (
          <FeedbacksKPIsView onOpenAppMenu={() => setIsAppMenuOpen(true)} />
        ) : currentView === 'testes' ? (
          <TestesAgilView onOpenAppMenu={() => setIsAppMenuOpen(true)} />
        ) : currentView === 'quiz' ? (
          <PerpetualQuiz onOpenAppMenu={() => setIsAppMenuOpen(true)} />
        ) : currentView === 'webinario' ? (
          <PerpetualWebinario onOpenAppMenu={() => setIsAppMenuOpen(true)} />
        ) : currentView === 'workshop' ? (
          <PerpetualWorkshop onOpenAppMenu={() => setIsAppMenuOpen(true)} />
        ) : currentView === 'guardians' ? (
          <PerpetualGuardians onOpenAppMenu={() => setIsAppMenuOpen(true)} />
        ) : (
          <Dashboard dashboardId={currentView as DashboardId} onBack={undefined} onOpenAppMenu={() => setIsAppMenuOpen(true)} />
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Lock, KeyRound, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface RestrictedLoginProps {
  onSuccess: () => void;
}

export function RestrictedLogin({ onSuccess }: RestrictedLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const cleanUser = username.trim().toLowerCase();
      const cleanPass = password.trim();

      if (cleanUser === 'musy' && cleanPass === 'Saopaulo5@') {
        localStorage.setItem('protagon_auth_musy', 'true');
        localStorage.setItem('protagon_auth_musy_user', 'Musy');
        onSuccess();
      } else {
        setError('Acesso negado. Usuário ou senha incorretos.');
      }
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[80vh] p-4 bg-[#0a0a0a]">
      <div className="w-full max-w-md bg-zinc-900/90 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center mb-8 relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(234,179,8,0.15)]">
            <Lock className="w-7 h-7 text-yellow-500" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Acesso Restrito</h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs">
            Esta seção estratégica de <span className="text-yellow-500 font-semibold">Feedbacks KPIs</span> é exclusiva e protegida por autenticação.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-2.5 text-xs text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Usuário
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <User size={16} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu login"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <KeyRound size={16} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(234,179,8,0.25)] hover:shadow-[0_0_25px_rgba(234,179,8,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Entrar no Painel</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
          <ShieldCheck size={14} className="text-zinc-500" />
          <span>Autenticação de Segurança Protagon</span>
        </div>
      </div>
    </div>
  );
}

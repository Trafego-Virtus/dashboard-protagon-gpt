import React from 'react';

export interface TicketData {
  executivo: number;
  vip: number;
  diamond: number;
  semIdentificacao: number;
}

interface Props {
  data: TicketData;
}

export function TicketTypeMetrics({ data }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
      <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-3 flex flex-col items-center justify-center">
        <span className="text-xs text-zinc-500 uppercase tracking-wider mb-1 text-center">Executivo</span>
        <span className="text-2xl font-bold text-white">{data.executivo}</span>
      </div>
      <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-3 flex flex-col items-center justify-center">
        <span className="text-xs text-zinc-500 uppercase tracking-wider mb-1 text-center">VIP</span>
        <span className="text-2xl font-bold text-white">{data.vip}</span>
      </div>
      <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-3 flex flex-col items-center justify-center">
        <span className="text-xs text-zinc-500 uppercase tracking-wider mb-1 text-center">Diamond</span>
        <span className="text-2xl font-bold text-white">{data.diamond}</span>
      </div>
      <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-3 flex flex-col items-center justify-center opacity-80">
        <span className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider mb-1 text-center">Sem Identificação</span>
        <span className="text-xl sm:text-2xl font-bold text-zinc-400">{data.semIdentificacao}</span>
      </div>
    </div>
  );
}

export function MiniTicketTypeMetrics({ data }: Props) {
  return (
    <div className="mt-4 pt-4 border-t border-white/10">
      <p className="text-[10px] text-zinc-500 font-bold mb-3 uppercase tracking-widest text-center">Tipos de Ingresso</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-zinc-950/50 border border-white/5 rounded-md p-2 flex justify-between items-center">
          <span className="text-[10px] text-zinc-500 uppercase font-medium">Executivo</span>
          <span className="text-sm font-bold text-white">{data.executivo}</span>
        </div>
        <div className="bg-zinc-950/50 border border-white/5 rounded-md p-2 flex justify-between items-center">
          <span className="text-[10px] text-zinc-500 uppercase font-medium">VIP</span>
          <span className="text-sm font-bold text-white">{data.vip}</span>
        </div>
        <div className="bg-zinc-950/50 border border-white/5 rounded-md p-2 flex justify-between items-center">
          <span className="text-[10px] text-zinc-500 uppercase font-medium">Diamond</span>
          <span className="text-sm font-bold text-white">{data.diamond}</span>
        </div>
        <div className="bg-zinc-950/50 border border-white/5 rounded-md p-2 flex justify-between items-center opacity-70">
          <span className="text-[10px] text-zinc-500 uppercase font-medium">Sem Ident.</span>
          <span className="text-sm font-bold text-zinc-400">{data.semIdentificacao}</span>
        </div>
      </div>
    </div>
  );
}

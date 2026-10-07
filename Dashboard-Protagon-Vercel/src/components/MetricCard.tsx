import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon, TrendingUp, TrendingDown, Activity, Info } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/format';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  subtitle?: string;
  valueClassName?: string;
  className?: string;
  type?: 'currency' | 'number' | 'string';
  decimals?: number;
  tooltip?: string;
  trend?: 'up' | 'down' | {
    direction: 'up' | 'down' | 'neutral';
    isGood: boolean;
    value?: string;
  };
}

export function MetricCard({ title, value, icon: Icon, subtitle, valueClassName, className, type, decimals, tooltip, trend }: MetricCardProps) {
  
  let displayValue = String(value);
  
  if (typeof value === 'number') {
    if (type === 'currency') {
      displayValue = formatCurrency(value);
    } else if (type === 'number') {
      if (decimals !== undefined) {
        displayValue = value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      } else {
        displayValue = formatNumber(value);
      }
    }
  }

  // Use a default icon if none is provided
  const DisplayIcon = Icon || Activity;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className={`relative overflow-hidden bg-zinc-900/50 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/5 hover:border-yellow-500/30 flex flex-col group transition-all ${className || ''}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 to-yellow-500/0 group-hover:from-yellow-500/5 group-hover:to-transparent transition-colors duration-500" />
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-1.5 pr-2">
          <h3 className="text-[10px] sm:text-xs font-bold text-zinc-400 group-hover:text-zinc-300 transition-colors uppercase tracking-widest leading-tight">{title}</h3>
          {tooltip && (
            <div className="relative group/tip cursor-help" title={tooltip}>
              <Info size={13} className="text-zinc-500 hover:text-yellow-500 transition-colors shrink-0" />
            </div>
          )}
        </div>
        <div className="p-2.5 bg-black/40 group-hover:bg-yellow-500/10 rounded-lg text-zinc-400 group-hover:text-yellow-500 transition-all shadow-inner border border-white/5 group-hover:border-yellow-500/20 shrink-0">
          <DisplayIcon size={18} />
        </div>
      </div>
      
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-2">
        <div className={`text-base sm:text-lg xl:text-xl font-bold tracking-tight shrink min-w-0 break-words ${valueClassName || 'text-zinc-100 group-hover:text-white transition-colors'}`}>
          {displayValue}
        </div>
        {trend && (() => {
          if (typeof trend === 'string') {
            return (
              <div className={`flex items-center gap-1 text-xs font-medium mb-1 ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              </div>
            );
          }
          const { direction, isGood, value: trendVal } = trend;
          if (direction === 'neutral') return null;
          return (
            <div className={`flex items-center gap-1 text-xs font-medium mb-1 ${isGood ? 'text-emerald-500' : 'text-red-500'}`} title={isGood ? 'Melhorou' : 'Piorou'}>
              {direction === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {trendVal && <span>{trendVal}</span>}
            </div>
          );
        })()}
      </div>
      {subtitle && (
        <p className="text-sm text-zinc-500 mt-2 font-medium relative z-10">{subtitle}</p>
      )}
    </motion.div>
  );
}

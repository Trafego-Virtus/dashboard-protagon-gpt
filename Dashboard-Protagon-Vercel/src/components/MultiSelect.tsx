import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MultiSelectProps {
  key?: string;
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (value: string) => void;
  onClear: () => void;
}

export function MultiSelect({ label, options, selectedValues, onChange, onClear }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasSelection = selectedValues.length > 0;

  return (
    <div className="relative space-y-1.5 w-full" ref={containerRef}>
      <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">{label}</label>
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-black/40 border rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${isOpen ? 'border-yellow-500/50' : 'border-white/10 hover:border-white/20'}`}
      >
        <div className="flex-1 truncate pr-2">
          {hasSelection ? (
            <span className="text-sm text-yellow-500 font-medium">
              {selectedValues.length} selecionado{selectedValues.length > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-sm text-zinc-500">Selecionar...</span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {hasSelection && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="p-1 hover:bg-white/10 rounded-md transition-colors text-zinc-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={16} className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-[#18181b] border border-white/10 rounded-lg shadow-xl overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
              {options.map((opt) => {
                const isSelected = selectedValues.includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => onChange(opt)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                      isSelected ? 'bg-yellow-500/10 text-yellow-500 font-medium' : 'text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate pr-2 text-left">{opt}</span>
                    {isSelected && <Check size={16} className="shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

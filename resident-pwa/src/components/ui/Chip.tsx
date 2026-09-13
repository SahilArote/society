import React from 'react';
import { cn } from '../../lib/utils';

interface ChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all select-none focus:outline-none tap-target',
        active
          ? 'bg-indigo-600 text-white shadow-xs'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 active:bg-slate-200'
      )}
    >
      {label}
    </button>
  );
}

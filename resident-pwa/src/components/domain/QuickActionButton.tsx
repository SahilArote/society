import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  className?: string;
}

export default function QuickActionButton({ icon: Icon, label, onClick, className }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex flex-col items-center justify-center p-2.5 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-all gap-1.5 focus:outline-none select-none tap-target',
        className
      )}
    >
      <div className="w-11 h-11 rounded-2xl bg-indigo-50/80 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-100/80 group-active:scale-95 transition-all border border-indigo-100/60 shadow-2xs">
        <Icon className="w-5 h-5 text-indigo-600" strokeWidth={2} />
      </div>
      <span className="text-[11px] font-bold text-slate-700 text-center leading-tight tracking-tight">
        {label}
      </span>
    </button>
  );
}

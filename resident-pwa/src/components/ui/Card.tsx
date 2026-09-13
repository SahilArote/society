import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  noPadding?: boolean;
}

export function Card({ children, className, onClick, noPadding }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-2xl border border-slate-200/60 shadow-2xs',
        !noPadding && 'p-3.5',
        onClick && 'cursor-pointer card-pressable hover:bg-slate-50/80 active:bg-slate-100/80 transition-all select-none',
        className
      )}
    >
      {children}
    </div>
  );
}

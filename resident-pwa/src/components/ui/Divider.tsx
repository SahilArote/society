import React from 'react';
import { cn } from '../../lib/utils';

interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className }: DividerProps) {
  if (!label) {
    return <hr className={cn('border-t border-slate-200 my-4', className)} />;
  }

  return (
    <div className={cn('relative flex py-3 items-center', className)}>
      <div className="flex-grow border-t border-slate-200" />
      <span className="flex-shrink mx-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex-grow border-t border-slate-200" />
    </div>
  );
}

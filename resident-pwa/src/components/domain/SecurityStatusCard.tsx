import React from 'react';
import { Shield } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SecurityStatusCardProps {
  className?: string;
}

export default function SecurityStatusCard({ className }: SecurityStatusCardProps) {
  return (
    <div className={cn('flex items-center gap-3 p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-xl select-none shadow-2xs', className)}>
      <div className="w-9 h-9 rounded-xl bg-emerald-100/80 flex items-center justify-center flex-shrink-0 text-emerald-700">
        <Shield className="w-4.5 h-4.5" />
      </div>
      <div>
        <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Gate Security</p>
        <p className="text-xs font-bold text-emerald-900 leading-tight mt-0.5">All society gates operational</p>
      </div>
    </div>
  );
}

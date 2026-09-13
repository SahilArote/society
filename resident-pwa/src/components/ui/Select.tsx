import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, error, options, placeholder, className, id, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-bold text-slate-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            'w-full h-10 pl-3 pr-10 text-xs bg-white border border-slate-200 rounded-xl appearance-none transition-all focus:outline-none font-medium shadow-2xs text-slate-900',
            error
              ? 'border-rose-400 focus:ring-2 focus:ring-rose-100'
              : 'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100',
            !props.value && 'text-slate-400',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
      {error && <p className="mt-1 text-[11px] text-rose-500 font-medium">{error}</p>}
    </div>
  );
}

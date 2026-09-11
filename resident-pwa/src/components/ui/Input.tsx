import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  helperText?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, prefix, suffix, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold text-slate-700 mb-1"
          >
            {label}
          </label>
        )}
        <div
          className={cn(
            'flex items-center h-10 w-full rounded-xl border bg-white transition-all shadow-2xs',
            error
              ? 'border-rose-400 focus-within:ring-2 focus-within:ring-rose-100'
              : 'border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100'
          )}
        >
          {prefix && (
            <div className="flex items-center pl-3 text-slate-400 flex-shrink-0">
              {prefix}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'flex-1 h-full bg-transparent px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none font-medium',
              prefix && 'pl-2',
              suffix && 'pr-2',
              className
            )}
            {...props}
          />
          {suffix && (
            <div className="flex items-center pr-3 text-slate-400 flex-shrink-0">
              {suffix}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-[11px] text-rose-500 font-medium">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-[11px] text-slate-400 font-medium">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

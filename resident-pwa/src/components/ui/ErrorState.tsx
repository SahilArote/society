import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this content. Please try again.",
  onRetry,
  retryLabel = 'Try Again',
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center select-none">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-3 text-rose-600 shadow-2xs">
        <AlertTriangle className="w-7 h-7 text-rose-600" strokeWidth={1.8} />
      </div>
      <h3 className="text-sm font-extrabold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-xs leading-relaxed font-medium">{description}</p>
      {onRetry && (
        <Button
          variant="primary"
          onClick={onRetry}
          className="mt-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-sm shadow-indigo-600/20 h-10 text-xs font-bold rounded-xl"
          size="sm"
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
}: EmptyStateProps) {
  const finalActionLabel = actionLabel || action?.label;
  const finalOnAction = onAction || action?.onClick;

  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center select-none">
      <div className="w-14 h-14 rounded-2xl bg-indigo-50/80 border border-indigo-100/60 flex items-center justify-center mb-3 text-indigo-600 shadow-2xs">
        <Icon className="w-7 h-7 text-indigo-600" strokeWidth={1.8} />
      </div>
      <h3 className="text-sm font-extrabold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-xs leading-relaxed font-medium">{description}</p>
      {finalActionLabel && finalOnAction && (
        <Button
          variant="primary"
          onClick={finalOnAction}
          className="mt-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-sm shadow-indigo-600/20 h-10 text-xs font-bold rounded-xl"
          size="sm"
        >
          {finalActionLabel}
        </Button>
      )}
    </div>
  );
}

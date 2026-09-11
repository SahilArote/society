import React from 'react';
import { cn } from '../../lib/utils';
import type { VisitorStatus } from '../../types';

interface BadgeProps {
  status?: VisitorStatus | 'active' | 'inactive' | string;
  variant?: 'solid' | 'outline' | string;
  children?: React.ReactNode;
  className?: string;
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200/80',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200/80',
  entered: 'bg-sky-50 text-sky-700 border-sky-200/80',
  'checked in': 'bg-sky-50 text-sky-700 border-sky-200/80',
  'checked out': 'bg-slate-100 text-slate-600 border-slate-200/80',
  exited: 'bg-slate-100 text-slate-600 border-slate-200/80',
  expired: 'bg-slate-100 text-slate-500 border-slate-200/80',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200/80',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  inactive: 'bg-slate-100 text-slate-500 border-slate-200/80',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  entered: 'Entered',
  'checked in': 'Checked In',
  'checked out': 'Checked Out',
  exited: 'Checked Out',
  expired: 'Expired',
  cancelled: 'Cancelled',
  active: 'Active',
  inactive: 'Inactive',
};

export function Badge({ status, variant = 'solid', children, className }: BadgeProps) {
  const normalizedStatus = (status || '').toLowerCase();
  const colorClass = statusStyles[normalizedStatus] || 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight border capitalize leading-none whitespace-nowrap',
        variant === 'outline' ? 'bg-transparent border-slate-200 text-slate-700' : colorClass,
        normalizedStatus === 'pending' && 'status-pulse',
        className
      )}
    >
      {children || statusLabels[normalizedStatus] || status}
    </span>
  );
}

import React from 'react';
import { cn } from '../../lib/utils';

export function SkeletonText({ className, width }: { className?: string; width?: string }) {
  return (
    <div
      className={cn('animate-pulse bg-slate-200/80 h-3.5 rounded-md', className)}
      style={{ width: width || '100%' }}
    />
  );
}

export function SkeletonCircle({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn('animate-pulse bg-slate-200/80 rounded-full flex-shrink-0', className)}
      style={{ width: size, height: size }}
    />
  );
}

export function SkeletonRect({ width, height, className }: { width?: string | number; height?: string | number; className?: string }) {
  return (
    <div
      className={cn('animate-pulse bg-slate-200/80 rounded-xl', className)}
      style={{ width: width || '100%', height: height || 80 }}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white rounded-xl border border-slate-200/60 p-3 shadow-2xs select-none', className)}>
      <div className="flex items-center gap-3">
        <SkeletonCircle size={38} />
        <div className="flex-1 space-y-1.5">
          <SkeletonText width="55%" className="h-3" />
          <SkeletonText width="35%" className="h-2.5" />
        </div>
      </div>
    </div>
  );
}

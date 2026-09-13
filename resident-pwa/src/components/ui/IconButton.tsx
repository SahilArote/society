import React from 'react';
import { cn } from '../../lib/utils';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  'aria-label': string;
}

export function IconButton({
  children,
  variant = 'default',
  size = 'md',
  className,
  ...props
}: IconButtonProps) {
  const variants = {
    default: 'text-slate-600 hover:bg-slate-100 active:bg-slate-200',
    ghost: 'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
    danger: 'text-danger-500 hover:bg-danger-50',
  };

  const sizes = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-13 h-13',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-full btn-press transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

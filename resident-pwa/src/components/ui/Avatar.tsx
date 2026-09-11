import React from 'react';
import { cn, getInitials } from '../../lib/utils';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  initials?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const sizeMap = {
  xs: 'w-8 h-8 text-xs',
  sm: 'w-10 h-10 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-20 h-20 text-xl',
};

export function Avatar({ src, alt, name, initials, size = 'md', className, onClick }: AvatarProps) {
  const displayInitials = initials || (name ? getInitials(name) : alt ? getInitials(alt) : '?');


  if (src) {
    return (
      <img
        src={src}
        alt={alt || name || 'Avatar'}
        onClick={onClick}
        className={cn(
          'rounded-full object-cover flex-shrink-0',
          sizeMap[size],
          onClick && 'cursor-pointer',
          className
        )}
      />
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-full flex items-center justify-center flex-shrink-0 bg-primary-100 text-primary-700 font-semibold',
        sizeMap[size],
        onClick && 'cursor-pointer',
        className
      )}
    >
      {displayInitials}
    </div>
  );
}

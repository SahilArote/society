import React from 'react';
import { cn } from '../../lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function PageContainer({
  children,
  className,
  noPadding = false,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'w-full flex-1 flex flex-col pb-24 pt-2 transition-all',
        !noPadding && 'px-4',
        className
      )}
    >
      {children}
    </div>
  );
}

export default PageContainer;

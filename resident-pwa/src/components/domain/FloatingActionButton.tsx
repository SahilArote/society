import React from 'react';
import { UserPlus } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface FloatingActionButtonProps {
  className?: string;
  onClick?: () => void;
}

export default function FloatingActionButton({ className, onClick }: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed right-4 bottom-20 z-40 w-14 h-14 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-lg hover:bg-primary-700 active:scale-95 transition-all',
        className
      )}
      aria-label="Invite Visitor"
    >
      <UserPlus className="w-6 h-6" />
    </button>
  );
}

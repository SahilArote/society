import React from 'react';
import { Visitor } from '../../types';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { cn, formatRelativeTime } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface VisitorCardProps {
  visitor: Visitor;
  className?: string;
}

export default function VisitorCard({ visitor, className }: VisitorCardProps) {
  const navigate = useNavigate();

  const formattedTime = formatRelativeTime(
    visitor.requestedAt instanceof Date ? visitor.requestedAt : new Date(visitor.requestedAt)
  );

  const backendOrigin = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const photoSrc = (visitor as any).photoUrl
    ? (visitor as any).photoUrl.startsWith('http')
      ? (visitor as any).photoUrl
      : `${backendOrigin}${(visitor as any).photoUrl}`
    : visitor.photo
    ? visitor.photo.startsWith('http')
      ? visitor.photo
      : `${backendOrigin}${visitor.photo}`
    : undefined;

  return (
    <Card 
      className={cn(
        'card-pressable p-3 rounded-xl border border-slate-200/60 bg-white hover:bg-slate-50/80 active:bg-slate-100/80 transition-all cursor-pointer shadow-2xs select-none',
        className
      )}
      onClick={() => navigate(`/visitors/${visitor.id}`)}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Avatar & Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar 
            src={photoSrc}
            name={visitor.name} 
            size="md"
            className="bg-indigo-50 text-indigo-700 font-bold flex-shrink-0 object-cover"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-extrabold text-slate-900 truncate leading-tight">
              {visitor.name}
            </h4>
            <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5 capitalize">
              <span className="font-medium text-slate-600">{visitor.purpose}</span>
              <span className="mx-1 text-slate-300">·</span>
              <span className="text-slate-400">{formattedTime}</span>
            </p>
          </div>
        </div>
        
        {/* Right: Status Chip & Chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge status={visitor.status} />
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </div>
      </div>
    </Card>
  );
}

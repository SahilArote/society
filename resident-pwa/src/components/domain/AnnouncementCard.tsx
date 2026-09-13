import React from 'react';
import { Announcement } from '../../types';
import { Card } from '../ui/Card';
import { Megaphone, Info } from 'lucide-react';
import { cn, formatRelativeTime } from '../../lib/utils';

export interface AnnouncementCardProps {
  announcement: Announcement;
  className?: string;
}

export default function AnnouncementCard({ announcement, className }: AnnouncementCardProps) {
  const isUrgent = announcement.priority === 'urgent';
  const isImportant = announcement.priority === 'important';
  
  const Icon = isUrgent || isImportant ? Megaphone : Info;
  const iconColor = isUrgent ? 'text-rose-600' : isImportant ? 'text-amber-600' : 'text-indigo-600';
  const bgColor = isUrgent ? 'bg-rose-50 border-rose-100' : isImportant ? 'bg-amber-50 border-amber-100' : 'bg-indigo-50 border-indigo-100';

  return (
    <Card className={cn('p-3 rounded-xl border border-slate-200/60 bg-white hover:bg-slate-50/80 active:bg-slate-100/80 transition-all cursor-pointer shadow-2xs select-none', className)}>
      <div className="flex gap-3 items-start">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border', bgColor)}>
          <Icon className={cn('w-4.5 h-4.5', iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-extrabold text-slate-900 leading-tight truncate">
              {announcement.title}
            </h4>
            {isUrgent && <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded">Urgent</span>}
            {isImportant && <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">Notice</span>}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">
            {announcement.body || (announcement as any).content}
          </p>
          <div className="mt-1.5 text-[10px] font-medium text-slate-400">
            {formatRelativeTime(announcement.timestamp instanceof Date ? announcement.timestamp : new Date(announcement.timestamp || (announcement as any).date))}
          </div>
        </div>
      </div>
    </Card>
  );
}

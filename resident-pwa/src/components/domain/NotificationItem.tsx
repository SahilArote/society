import React from 'react';
import { Notification } from '../../types';
import { cn, formatRelativeTime } from '../../lib/utils';
import { Users, Shield, Megaphone, AlertCircle } from 'lucide-react';

export interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
  className?: string;
}

export default function NotificationItem({ notification, onClick, className }: NotificationItemProps) {
  const getIconAndColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'visitor': return { Icon: Users, color: 'text-primary-600', bg: 'bg-primary-50' };
      case 'security': return { Icon: Shield, color: 'text-danger-600', bg: 'bg-danger-50' };
      case 'society': return { Icon: Megaphone, color: 'text-success-600', bg: 'bg-success-50' };
      case 'important': return { Icon: AlertCircle, color: 'text-warning-600', bg: 'bg-warning-50' };
      default: return { Icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-50' };
    }
  };

  const { Icon, color, bg } = getIconAndColor(notification.type);

  return (
    <div 
      className={cn(
        'relative flex items-start gap-4 p-4 border-b border-slate-100 last:border-0 transition-colors',
        !notification.read ? 'bg-primary-50/50' : 'bg-white',
        onClick && 'cursor-pointer hover:bg-slate-50 card-pressable',
        className
      )}
      onClick={onClick}
    >
      {!notification.read && (
        <div className="absolute top-4 left-2 w-2 h-2 rounded-full bg-primary-600" />
      )}
      
      <div className={cn('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ml-1', bg)}>
        <Icon className={cn('w-5 h-5', color)} />
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-slate-900 text-sm mb-0.5 truncate">{notification.title}</h4>
        <p className="text-sm text-slate-500 line-clamp-2 leading-snug mb-1">
          {notification.body || (notification as any).message}
        </p>
        <span className="text-xs text-slate-400">
          {formatRelativeTime(notification.timestamp instanceof Date ? notification.timestamp : new Date(notification.timestamp))}
        </span>
      </div>
    </div>
  );
}

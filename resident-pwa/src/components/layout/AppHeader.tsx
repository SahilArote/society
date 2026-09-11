import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../lib/utils';
import { mockResident } from '../../data/mockResident';
import { getUnreadCount } from '../../data/mockNotifications';
import { useGreeting } from '../../hooks';

interface AppHeaderProps {
  isHome?: boolean;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
  className?: string;
}

export function AppHeader({
  isHome = false,
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  transparent = false,
  className,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const greeting = useGreeting();
  const unreadCount = getUnreadCount();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-all select-none pt-safe',
        transparent ? 'bg-transparent' : 'bg-white/95 backdrop-blur-md border-b border-slate-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
        className
      )}
    >
      <div className="w-full px-4 h-16 flex items-center justify-between">
        {isHome ? (
          /* Home Screen Compact App Header */
          <div className="flex items-center justify-between w-full">
            <div
              onClick={() => navigate('/profile')}
              className="flex items-center gap-3.5 cursor-pointer group tap-target -ml-1 py-1"
            >
              <Avatar
                name={mockResident.name}
                size="md"
                className="ring-2 ring-indigo-500/20 shadow-sm transition-transform group-active:scale-95 flex-shrink-0"
              />
              <div className="text-left leading-tight">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-0.5">
                  {greeting}
                </span>
                <p className="text-sm font-extrabold text-slate-900 leading-snug tracking-tight">
                  {mockResident.name}
                </p>
                <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                  {mockResident.society.name.split(' ')[0]} Residency · <span className="font-semibold text-slate-700">Flat {mockResident.flat.number}</span>
                </p>
              </div>
            </div>

            {/* Notifications Bell */}
            <button
              onClick={() => navigate('/notifications')}
              className="relative w-9 h-9 flex items-center justify-center rounded-full bg-slate-100/80 text-slate-700 hover:bg-slate-200/80 active:scale-95 transition-all tap-target focus:outline-none flex-shrink-0"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4 text-slate-700" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
              )}
            </button>
          </div>
        ) : (
          /* Inner Screens Compact Header */
          <>
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {showBack && (
                <button
                  onClick={handleBack}
                  className="w-9 h-9 -ml-1.5 flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors focus:outline-none tap-target"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-700" />
                </button>
              )}
              <div className="truncate">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight truncate leading-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-[11px] text-slate-500 font-medium truncate leading-none mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {rightAction && (
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                {rightAction}
              </div>
            )}
          </>
        )}
      </div>
    </header>
  );
}

export default AppHeader;

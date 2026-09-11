import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, UsersRound, Shield, Megaphone, AlertCircle } from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { PageContainer } from '../components/layout/PageContainer';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/EmptyState';
import { mockNotifications } from '../data/mockNotifications';
import { formatRelativeTime } from '../lib/utils';
import { useToast } from '../hooks';
import type { Notification, NotificationType } from '../types';

export default function Notifications() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredNotifications = useMemo(() => {
    if (activeCategory === 'all') return notifications;
    return notifications.filter((n) => n.type === activeCategory);
  }, [notifications, activeCategory]);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('All notifications marked as read', 'info');
  };

  const handleItemClick = (notif: Notification) => {
    // Mark clicked as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );

    if (notif.visitorId) {
      navigate(`/visitors/${notif.visitorId}`);
    } else {
      showToast(notif.body, 'info');
    }
  };

  const getCategoryIcon = (type: NotificationType) => {
    switch (type) {
      case 'visitor':
        return <UsersRound className="w-4 h-4 text-indigo-600" />;
      case 'security':
        return <Shield className="w-4 h-4 text-rose-600" />;
      case 'society':
        return <Megaphone className="w-4 h-4 text-emerald-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-0 select-none">
      <AppHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} new alerts` : 'All caught up'}
        rightAction={
          unreadCount > 0 ? (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100 text-xs font-bold focus:outline-none tap-target"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all</span>
            </button>
          ) : undefined
        }
      />

      <PageContainer className="pt-3 pb-24 space-y-3">
        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
          {[
            { label: 'All', value: 'all' },
            { label: 'Visitors', value: 'visitor' },
            { label: 'Security', value: 'security' },
            { label: 'Society', value: 'society' },
          ].map((cat) => (
            <Chip
              key={cat.value}
              label={cat.label}
              active={activeCategory === cat.value}
              onClick={() => setActiveCategory(cat.value)}
            />
          ))}
        </div>

        {/* Native Notification Feed */}
        {filteredNotifications.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`flex items-start gap-3 p-3.5 hover:bg-slate-50 cursor-pointer card-pressable transition-colors relative ${
                  !notif.read ? 'bg-indigo-50/40' : 'bg-white'
                }`}
              >
                {/* Unread indicator bullet */}
                <div className="pt-1.5 flex-shrink-0 flex items-center justify-center w-3">
                  {!notif.read ? (
                    <span className="w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-indigo-200" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  )}
                </div>

                {/* Category Icon Badge */}
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  {getCategoryIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3
                      className={`text-xs truncate ${
                        !notif.read ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-800'
                      }`}
                    >
                      {notif.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 flex-shrink-0 font-medium">
                      {formatRelativeTime(
                        notif.timestamp instanceof Date ? notif.timestamp : new Date(notif.timestamp)
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                    {notif.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Bell}
            title="You're all caught up"
            description="No pending alerts in this category. We will notify you when someone arrives at the gate."
          />
        )}
      </PageContainer>
    </div>
  );
}

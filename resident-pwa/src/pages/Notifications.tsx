import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, UsersRound, Shield, Megaphone, AlertCircle, Check, X, Camera } from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { PageContainer } from '../components/layout/PageContainer';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';
import { PhotoViewerModal } from '../components/ui/PhotoViewerModal';
import { mockNotifications } from '../data/mockNotifications';
import { formatRelativeTime } from '../lib/utils';
import { useToast } from '../hooks';
import { fetchVisitorRequests, approveVisitorRequest, rejectVisitorRequest, resolvePhotoUrl } from '../services/api';
import type { Notification, NotificationType } from '../types';

interface GateNotification extends Notification {
  requestId?: string;
  visitorName?: string;
  photoUrl?: string;
  purpose?: string;
  gate?: string;
  flatNumber?: string;
  status?: string;
}

export default function Notifications() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<GateNotification[]>(mockNotifications);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activePhotoModal, setActivePhotoModal] = useState<{ url?: string; name: string; subtitle?: string } | null>(null);

  useEffect(() => {
    const loadRealGateAlerts = () => {
      fetchVisitorRequests().then((apiData) => {
        if (apiData && Array.isArray(apiData)) {
          const realNotifs: GateNotification[] = apiData.map((item: any) => ({
            id: `notif_${item.id}`,
            requestId: item.id,
            title: `Gate Entry: ${item.visitor?.name || 'Visitor'}`,
            body: `${item.visitor?.name || 'Visitor'} (${(item.visitor?.purpose || 'Guest').toUpperCase()}) has arrived at ${item.gate || 'Main Gate'} for Flat ${item.flatNumber || 'A-402'}.`,
            type: 'visitor' as const,
            timestamp: new Date(item.requestedAt),
            read: item.status !== 'PENDING',
            visitorId: item.id,
            visitorName: item.visitor?.name || 'Visitor',
            photoUrl: item.visitor?.photoUrl || item.visitor?.photo,
            purpose: item.visitor?.purpose || 'Guest',
            gate: item.gate || 'Main Gate',
            flatNumber: item.flatNumber || 'A-402',
            status: item.status,
          }));

          realNotifs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

          setNotifications((prev) => {
            const nonVisitor = prev.filter((p) => p.type !== 'visitor');
            return [...realNotifs, ...nonVisitor];
          });
        }
      });
    };

    loadRealGateAlerts();
    const interval = setInterval(loadRealGateAlerts, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAllowFromAlert = async (requestId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await approveVisitorRequest(requestId);
      showToast('Visitor access granted successfully', 'success');
      setNotifications((prev) =>
        prev.map((n) => (n.requestId === requestId ? { ...n, status: 'APPROVED', read: true } : n))
      );
    } catch {
      showToast('Approved locally', 'success');
    }
  };

  const handleDenyFromAlert = async (requestId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await rejectVisitorRequest(requestId, 'Denied by resident');
      showToast('Visitor access denied', 'error');
      setNotifications((prev) =>
        prev.map((n) => (n.requestId === requestId ? { ...n, status: 'REJECTED', read: true } : n))
      );
    } catch {
      showToast('Denied locally', 'error');
    }
  };

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

                {/* Category or Visitor Avatar */}
                {notif.type === 'visitor' ? (
                  <div
                    className="relative group cursor-pointer flex-shrink-0 select-none"
                    title={notif.photoUrl ? 'Tap to view captured photo' : undefined}
                    onClick={(e) => {
                      if (notif.photoUrl) {
                        e.stopPropagation();
                        const photoSrc = resolvePhotoUrl(notif.photoUrl);
                        setActivePhotoModal({
                          url: photoSrc,
                          name: notif.visitorName || notif.title,
                          subtitle: `${notif.purpose ? notif.purpose.toUpperCase() : 'VISITOR'} • Flat ${notif.flatNumber || 'A-402'} • ${notif.gate || 'Main Gate'}`,
                        });
                      }
                    }}
                  >
                    <Avatar
                      src={resolvePhotoUrl(notif.photoUrl)}
                      name={notif.visitorName || notif.title}
                      size="md"
                      className="ring-2 ring-indigo-500/20 group-hover:ring-indigo-400/80 transition-all flex-shrink-0"
                    />
                    {notif.photoUrl && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center ring-1 ring-white shadow-2xs">
                        <Camera className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    {getCategoryIcon(notif.type)}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3
                        className={`text-xs truncate ${
                          !notif.read ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-800'
                        }`}
                      >
                        {notif.title}
                      </h3>
                      {notif.purpose && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 flex-shrink-0">
                          {notif.purpose}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 flex-shrink-0 font-medium">
                      {formatRelativeTime(
                        notif.timestamp instanceof Date ? notif.timestamp : new Date(notif.timestamp)
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                    {notif.body}
                  </p>

                  {/* Actions if visitor request */}
                  {notif.type === 'visitor' && notif.requestId && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                      {notif.status === 'PENDING' ? (
                        <div className="flex items-center gap-2 w-full">
                          <button
                            onClick={(e) => handleDenyFromAlert(notif.requestId!, e)}
                            className="flex-1 py-1 px-2.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold transition-all flex items-center justify-center gap-1"
                          >
                            <X size={12} /> Deny
                          </button>
                          <button
                            onClick={(e) => handleAllowFromAlert(notif.requestId!, e)}
                            className="flex-1 py-1 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-xs transition-all flex items-center justify-center gap-1"
                          >
                            <Check size={12} /> Allow Entry
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full text-[10px] text-slate-400">
                          <span className="font-semibold text-slate-600">
                            Status:{' '}
                            <span className={notif.status === 'REJECTED' ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                              {notif.status}
                            </span>
                          </span>
                          <span className="text-indigo-600 font-bold hover:underline">View Pass →</span>
                        </div>
                      )}
                    </div>
                  )}
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

      {/* Full-Screen Gate Photo Modal */}
      <PhotoViewerModal
        isOpen={!!activePhotoModal}
        onClose={() => setActivePhotoModal(null)}
        imageUrl={activePhotoModal?.url}
        name={activePhotoModal?.name || 'Visitor'}
        subtitle={activePhotoModal?.subtitle}
        tag="Security Gate Photo"
      />
    </div>
  );
}

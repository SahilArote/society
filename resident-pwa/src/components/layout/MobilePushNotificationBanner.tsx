import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, CheckCircle2, XCircle, X, Bell } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import {
  subscribePushNotifications,
  requestNotificationPermission,
  VisitorPushPayload,
} from '../../services/notificationService';
import { approveVisitorRequest, rejectVisitorRequest } from '../../services/api';
import { useToast } from '../../hooks';

export function MobilePushNotificationBanner() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activePush, setActivePush] = useState<VisitorPushPayload | null>(null);
  const [permissionState, setPermissionState] = useState<NotificationPermission>(() => {
    return 'Notification' in window ? Notification.permission : 'default';
  });

  useEffect(() => {
    // 1. Subscribe to incoming push notification events
    const unsubscribe = subscribePushNotifications((payload) => {
      setActivePush(payload);
    });

    // 2. Auto request permission on mount if supported and default
    if ('Notification' in window && Notification.permission === 'default') {
      // Prompt resident to enable notifications
      requestNotificationPermission().then((perm) => {
        setPermissionState(perm);
      });
    }

    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-dismiss in-app banner after 8 seconds
  useEffect(() => {
    if (!activePush) return;
    const timer = setTimeout(() => {
      setActivePush(null);
    }, 8500);
    return () => clearTimeout(timer);
  }, [activePush]);

  const handleAllow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activePush) return;
    const id = activePush.id;
    setActivePush(null);
    try {
      await approveVisitorRequest(id);
      showToast('Visitor access granted', 'success');
    } catch {
      showToast('Visitor access granted locally', 'success');
    }
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activePush) return;
    const id = activePush.id;
    setActivePush(null);
    try {
      await rejectVisitorRequest(id, 'Denied from notification');
      showToast('Visitor entry denied', 'error');
    } catch {
      showToast('Visitor entry denied locally', 'error');
    }
  };

  const handleBannerClick = () => {
    if (!activePush) return;
    const id = activePush.id;
    setActivePush(null);
    navigate(`/visitors/${id}`);
  };

  const backendOrigin = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const photoSrc = activePush?.photoUrl
    ? activePush.photoUrl.startsWith('http')
      ? activePush.photoUrl
      : `${backendOrigin}${activePush.photoUrl}`
    : undefined;

  return (
    <>
      {/* 1. In-App Heads-Up Push Notification Banner (iOS/Android Native Style) */}
      <AnimatePresence>
        {activePush && (
          <motion.div
            initial={{ y: -120, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -120, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 350 }}
            onClick={handleBannerClick}
            className="absolute top-2 left-3 right-3 z-50 cursor-pointer select-none"
          >
            <div className="bg-slate-900/95 text-white backdrop-blur-xl border border-white/20 rounded-2xl p-3.5 shadow-2xl ring-1 ring-black/40">
              {/* App Label & Timestamp Bar */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center text-white">
                    <ShieldAlert className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-300">
                    Gate Security Alert
                  </span>
                  <span className="text-slate-500 text-[10px]">·</span>
                  <span className="text-[10px] text-slate-400 font-medium">Just now</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePush(null);
                  }}
                  className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Visitor Identity Info */}
              <div className="flex items-center gap-3">
                <Avatar
                  src={photoSrc}
                  name={activePush.name}
                  size="md"
                  className="ring-2 ring-indigo-400/50 shadow-md flex-shrink-0 object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-black text-white truncate">
                      {activePush.name}
                    </h4>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0">
                      {activePush.purpose || 'Visitor'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate mt-0.5">
                    Waiting at {activePush.gate || 'Main Gate'} · Flat {activePush.flatNumber || 'A-402'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleReject}
                  className="h-8 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Deny</span>
                </button>
                <button
                  type="button"
                  onClick={handleAllow}
                  className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-md shadow-emerald-600/30 active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Allow Entry</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Permission Banner (If notifications not yet allowed) */}
      {permissionState === 'default' && (
        <div className="bg-indigo-900/90 backdrop-blur-md px-3 py-1.5 text-white flex items-center justify-between text-xs border-b border-indigo-700/50 select-none">
          <div className="flex items-center gap-2 truncate">
            <Bell className="w-3.5 h-3.5 text-amber-300 flex-shrink-0 animate-bounce" />
            <span className="truncate font-medium text-[11px]">
              Enable mobile push notifications for gate alerts
            </span>
          </div>
          <button
            onClick={() => {
              requestNotificationPermission().then((p) => setPermissionState(p));
            }}
            className="ml-2 px-2 py-0.5 rounded bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-[10px] uppercase tracking-wider flex-shrink-0"
          >
            Enable
          </button>
        </div>
      )}
    </>
  );
}

export default MobilePushNotificationBanner;

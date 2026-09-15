import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X, ChevronRight } from 'lucide-react';
import { playDoorbellChime } from '../../services/notificationService';

export interface VisitorPopupData {
  requestId: string;
  visitorName: string;
  gateName?: string;
  flatNumber?: string;
  photoUrl?: string;
  purpose?: string;
}

export function VisitorHeadsUpPopup() {
  const [data, setData] = useState<VisitorPopupData | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handlePopupEvent = (e: Event) => {
      const detail = (e as CustomEvent<VisitorPopupData>).detail;
      if (detail && detail.visitorName) {
        showPopup(detail);
      }
    };

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
        const payload = event.data.payload || {};
        const pData = payload.data || {};
        const visitorName = pData.visitorName || payload.title?.replace('🚨 Visitor at Gate: ', '') || 'Visitor';
        showPopup({
          requestId: pData.requestId || `REQ-${Date.now()}`,
          visitorName,
          gateName: pData.gateName || 'Main Gate',
          flatNumber: pData.flatNumber || '',
          photoUrl: payload.image || pData.photoUrl,
          purpose: pData.purpose || 'Visitor',
        });
      }
    };

    window.addEventListener('nexgate-visitor-popup', handlePopupEvent);

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      window.removeEventListener('nexgate-visitor-popup', handlePopupEvent);
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  const showPopup = (popupData: VisitorPopupData) => {
    setData(popupData);
    playDoorbellChime();

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([500, 200, 500]);
      } catch (_) {}
    }
  };

  useEffect(() => {
    if (!data) return;
    const timer = setTimeout(() => {
      setData(null);
    }, 12000); // 12 seconds auto-dismiss
    return () => clearTimeout(timer);
  }, [data]);

  const handleOpenHome = () => {
    setData(null);
    navigate('/home');
  };

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          initial={{ opacity: 0, y: -80, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -70, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="fixed top-3 left-3 right-3 z-[99999] max-w-[420px] mx-auto pointer-events-auto"
        >
          <div
            onClick={handleOpenHome}
            className="relative flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/95 text-white shadow-2xl backdrop-blur-xl border border-indigo-500/40 cursor-pointer active:scale-[0.98] transition-transform select-none"
          >
            {/* Left Photo or Alert Badge */}
            <div className="relative flex-shrink-0">
              {data.photoUrl ? (
                <img
                  src={data.photoUrl}
                  alt={data.visitorName}
                  className="w-13 h-13 rounded-xl object-cover ring-2 ring-indigo-400/50"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-13 h-13 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                  <ShieldAlert className="w-7 h-7 text-indigo-400 animate-pulse" />
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900"></span>
              </span>
            </div>

            {/* Content info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-500 text-white">
                  Visitor At Gate
                </span>
                {data.flatNumber && (
                  <span className="text-[11px] font-bold text-slate-300">
                    • Flat {data.flatNumber}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-extrabold text-white truncate leading-snug">
                {data.visitorName}
              </h4>
              <p className="text-[11px] text-slate-300 truncate">
                Waiting at {data.gateName || 'Main Gate'}
              </p>
              <span className="inline-flex items-center text-[10px] font-bold text-indigo-300 mt-1">
                Tap to open Home screen <ChevronRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>

            {/* Dismiss X button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setData(null);
              }}
              className="flex-shrink-0 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { motion, AnimatePresence } from 'framer-motion';
import { Share, PlusSquare, CheckCircle, Smartphone, MoreVertical, X, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { BRAND_CONFIG } from '../../config/branding';

interface PwaInstallSheetProps {
  isOpen: boolean;
  onClose: () => void;
  platform: 'ios' | 'android' | 'desktop';
  onTryNativeInstall?: () => void;
  canNativeInstall?: boolean;
}

export function PwaInstallSheet({
  isOpen,
  onClose,
  platform,
  onTryNativeInstall,
  canNativeInstall,
}: PwaInstallSheetProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Bottom Sheet Modal */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-lg bg-white rounded-t-[32px] p-6 pb-safe shadow-2xl z-10 max-h-[90vh] overflow-y-auto mobile-scroll-container"
        >
          {/* Drag Handle */}
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-0.5 shadow-sm overflow-hidden flex-shrink-0">
                <img src={BRAND_CONFIG.logo.src} alt={BRAND_CONFIG.logo.alt} className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Install {BRAND_CONFIG.name} App</h3>
                <p className="text-[11px] text-slate-500">Fast, 1-tap visitor access from Home Screen</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {canNativeInstall ? (
            /* Direct Native Install Trigger */
            <div className="py-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto ring-4 ring-indigo-100/50">
                <Download className="w-8 h-8 animate-bounce" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Ready to Install</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  Tap below to add GreenGate to your phone's home screen.
                </p>
              </div>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => {
                  onTryNativeInstall?.();
                  onClose();
                }}
                className="h-13 font-bold text-sm rounded-xl shadow-md"
              >
                Install Now
              </Button>
            </div>
          ) : platform === 'ios' ? (
            /* iOS Safari Instructions */
            <div className="space-y-4 my-2">
              <p className="text-xs text-slate-600 bg-amber-50 p-3 rounded-xl border border-amber-100/80">
                Apple requires installing progressive web apps directly through Safari:
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    <Share className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">1. Tap the Share button</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      In Safari's bottom toolbar, tap the square Share icon with the arrow pointing up.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">2. Select "Add to Home Screen"</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Scroll down the options list and tap <strong>Add to Home Screen</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">3. Tap "Add" in top-right</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Confirm by tapping Add. The Society icon will appear on your iPhone screen!
                    </p>
                  </div>
                </div>
              </div>

              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={onClose}
                className="mt-4 rounded-xl"
              >
                Got It
              </Button>
            </div>
          ) : (
            /* Android / Desktop Browser Menu Fallback */
            <div className="space-y-4 my-2">
              {typeof window !== 'undefined' && !window.isSecureContext && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs leading-relaxed">
                  <strong>⚠️ Unencrypted HTTP Detected:</strong> Chrome strictly blocks 1-tap native install prompts on LAN IPs (like <span className="font-mono text-[11px] font-semibold">{window.location.host}</span>).
                  <p className="mt-1 text-[11px] text-amber-800">
                    To trigger Chrome's real native dialog, access over <strong>HTTPS</strong> (e.g. ngrok tunnel) or use the manual browser menu below:
                  </p>
                </div>
              )}

              {typeof window !== 'undefined' && /VivoBrowser|HeyTapBrowser|MiuiBrowser|HuaweiBrowser|UCBrowser|OppoBrowser/i.test(navigator.userAgent) && (
                <div className="p-3.5 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-950 text-xs leading-relaxed">
                  <p className="font-bold text-indigo-900 mb-1 flex items-center gap-1.5">
                    <span>📱 Notice: Vivo / Default Phone Browser</span>
                  </p>
                  <p className="text-[11px] text-indigo-800 mb-2.5">
                    Your phone's default browser doesn't support Chrome's 1-tap WebAPK install. To get the real native app install dialog, open this link in <strong>Google Chrome</strong>:
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(window.location.href);
                      }
                      window.location.href = `intent://${window.location.host}${window.location.pathname}#Intent;scheme=https;package=com.android.chrome;end`;
                    }}
                    className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95"
                  >
                    Open in Google Chrome
                  </button>
                </div>
              )}

              <p className="text-xs text-slate-600 bg-slate-100 p-3 rounded-xl border border-slate-200">
                To install manually from your browser:
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    <MoreVertical className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">1. Open Browser Menu</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tap the three dots (⋮) in the top-right corner of Chrome or Edge.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">2. Tap "Install App"</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Choose "Install App" or "Add to Home screen" from the menu.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={onClose}
                className="mt-4 rounded-xl"
              >
                Got It
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default PwaInstallSheet;

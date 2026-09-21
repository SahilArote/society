import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield, Smartphone, ArrowRight, CheckCircle2,
  Building2, Camera, Zap, Download, Lock
} from 'lucide-react';
import { PwaInstallSheet } from '../components/common/PwaInstallSheet';
import { usePwaInstall, useToast } from '../hooks';
import { BRAND_CONFIG } from '../config/branding';
import { isAuthenticatedSession } from '../services/authSession';
import { pwaInstallManager } from '../services/pwaInstallManager';

export default function Landing() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isInstallable, isStandalone, isInstalling, platform } = usePwaInstall();
  const [showInstallSheet, setShowInstallSheet] = useState(false);

  // Standalone mode auto-redirects to app home or login
  useEffect(() => {
    if (isStandalone) {
      navigate(isAuthenticatedSession() ? '/home' : '/login', { replace: true });
    }
  }, [isStandalone, navigate]);

  const handleInstallCTA = async () => {
    if (isStandalone) {
      navigate(isAuthenticatedSession() ? '/home' : '/login');
      return;
    }

    const result = await pwaInstallManager.promptInstall();

    if (result.outcome === 'accepted') {
      showToast(`${BRAND_CONFIG.name} installed! Launch from your home screen`, 'success');
      return;
    } else if (result.outcome === 'dismissed') {
      return;
    }

    setShowInstallSheet(true);
  };

  const isIOS = platform === 'ios';

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none">
      {/* ── Top Header Navigation Bar ────────────────────────────── */}
      <header className="flex items-center justify-between max-w-sm mx-auto w-full pt-1 flex-shrink-0">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 shadow-sm p-1 flex items-center justify-center">
            <Shield className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-slate-900 leading-none">
              {BRAND_CONFIG.name}
            </div>
            <div className="text-[10px] font-medium text-slate-500 tracking-wider uppercase mt-0.5">
              Resident App
            </div>
          </div>
        </div>

        {/* Society Pill Badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200/80 shadow-sm text-[11px] font-medium text-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <Building2 className="w-3 h-3 text-slate-400" />
          <span className="max-w-[130px] truncate">callalily chs ltd</span>
        </div>
      </header>

      {/* ── Main Hero Section (Fits tightly with zero vertical scroll) ─ */}
      <main className="max-w-sm mx-auto w-full my-auto py-2 flex flex-col items-center text-center flex-shrink-0">
        {/* Clean, Elevated App Icon */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="mb-3 sm:mb-4"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-slate-200 shadow-md p-2 flex items-center justify-center">
            <img
              src={BRAND_CONFIG.logo.src}
              alt={BRAND_CONFIG.logo.alt}
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
        </motion.div>

        {/* Headline & Subtitle */}
        <motion.div
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05, duration: 0.2 }}
        >
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-1">
            Smart Access. <span className="text-indigo-600">Safer Living.</span>
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            Instant visitor approval alerts and real-time gate entry verification directly on your phone.
          </p>
        </motion.div>

        {/* Feature Highlights (Clean, Decent Cards) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.2 }}
          className="grid grid-cols-3 gap-2 w-full mt-3.5 mb-4 sm:mb-5"
        >
          <div className="bg-white border border-slate-200/80 rounded-xl p-2 sm:p-2.5 flex flex-col items-center text-center shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">1-Tap Entry</span>
            <span className="text-[9px] text-slate-500 mt-0.5">Instant approve</span>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-2 sm:p-2.5 flex flex-col items-center text-center shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
              <Camera className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">Guard Photos</span>
            <span className="text-[9px] text-slate-500 mt-0.5">Real-time image</span>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-2 sm:p-2.5 flex flex-col items-center text-center shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-1">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">Digital Pass</span>
            <span className="text-[9px] text-slate-500 mt-0.5">Pre-invite guests</span>
          </div>
        </motion.div>

        {/* ── Action Buttons Container ─────────────────────────── */}
        <div className="w-full space-y-2.5">
          {/* Primary Decent & Premium Install CTA Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleInstallCTA}
            disabled={isInstalling}
            className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold py-3 sm:py-3.5 px-5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all text-sm cursor-pointer"
          >
            {isStandalone ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Launch Resident App</span>
              </>
            ) : isInstalling ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Preparing Installation...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-slate-300" />
                <span>Install Resident App</span>
              </>
            )}
          </motion.button>

          {/* Contextual Platform Detection Indicator */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <Smartphone className="w-3.5 h-3.5 text-slate-400" />
            {isStandalone ? (
              <span className="text-emerald-600 font-semibold">App installed on this device</span>
            ) : isIOS ? (
              <span>iPhone: Tap Share ➔ Add to Home Screen</span>
            ) : (
              <span>Android & Chrome: Tap Install for 1-Tap Access</span>
            )}
          </div>

          {/* Secondary Action: Sign In directly in browser */}
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 py-1 transition-colors cursor-pointer"
          >
            <span>Already registered? Sign in with Mobile</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </main>

      {/* ── Footer Trust Note ─────────────────────────────────── */}
      <footer className="text-center pb-1 flex-shrink-0">
        <div className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 font-medium tracking-wide">
          <Lock className="w-3 h-3 text-emerald-600" />
          <span>256-Bit Encrypted Gate Access · Official Society Security Platform</span>
        </div>
      </footer>

      {/* Fallback Install Bottom Sheet (for iOS Safari Share sheet guide) */}
      <PwaInstallSheet
        isOpen={showInstallSheet}
        onClose={() => setShowInstallSheet(false)}
        platform={platform}
        canNativeInstall={isInstallable}
        onTryNativeInstall={handleInstallCTA}
      />
    </div>
  );
}

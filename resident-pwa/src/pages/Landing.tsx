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
  const { isInstallable, isStandalone, isInstalling, platform, install } = usePwaInstall();
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
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-[#0B0F19] text-white flex flex-col justify-between p-4 sm:p-6 overflow-y-auto sm:overflow-hidden relative select-none">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-indigo-600/20 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-emerald-500/15 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[110px] pointer-events-none" />

      {/* ── Top Header Navigation Bar ────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between max-w-lg mx-auto w-full pt-1 sm:pt-2">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 p-1.5 shadow-md shadow-indigo-600/30 flex items-center justify-center">
            <Shield className="w-full h-full text-white" />
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-tight text-white leading-none">
              {BRAND_CONFIG.name}
            </div>
            <div className="text-[10px] font-semibold text-indigo-300/80 tracking-wider uppercase mt-0.5">
              Resident App
            </div>
          </div>
        </div>

        {/* Society Pill Badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-medium text-slate-300 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <Building2 className="w-3 h-3 text-indigo-400" />
          <span className="max-w-[120px] sm:max-w-[160px] truncate">callalily chs ltd</span>
        </div>
      </header>

      {/* ── Main Hero Card (Fits without scrolling) ─────────────── */}
      <main className="relative z-10 max-w-md mx-auto w-full my-auto py-3 sm:py-4 flex flex-col items-center text-center">
        {/* Glowing App Icon Frame */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="relative mb-4 sm:mb-5"
        >
          <div className="absolute -inset-1.5 bg-gradient-to-tr from-indigo-500 to-emerald-500 rounded-3xl blur opacity-40 animate-pulse" />
          <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl sm:rounded-3xl bg-slate-900 border border-white/20 p-2 shadow-2xl flex items-center justify-center overflow-hidden">
            <img
              src={BRAND_CONFIG.logo.src}
              alt={BRAND_CONFIG.logo.alt}
              className="w-full h-full object-contain rounded-xl sm:rounded-2xl"
            />
          </div>
        </motion.div>

        {/* Headline & Sub-headline */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.25 }}
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1 sm:mb-1.5">
            Smart Access. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-200 to-emerald-300">Safer Living.</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300/80 max-w-xs sm:max-w-sm mx-auto leading-relaxed">
            Instant visitor approval alerts and live photo verification directly on your phone.
          </p>
        </motion.div>

        {/* Feature Highlights Strip (Compact & Zero Scroll) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          className="grid grid-cols-3 gap-2 w-full mt-4 sm:mt-5 mb-5 sm:mb-6"
        >
          <div className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-md rounded-2xl p-2.5 flex flex-col items-center text-center">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center mb-1.5">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-200 leading-tight">1-Tap Entry</span>
            <span className="text-[9px] text-slate-400 mt-0.5">Instant approve</span>
          </div>

          <div className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-md rounded-2xl p-2.5 flex flex-col items-center text-center">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-1.5">
              <Camera className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-200 leading-tight">Guard Photos</span>
            <span className="text-[9px] text-slate-400 mt-0.5">Real-time image</span>
          </div>

          <div className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-md rounded-2xl p-2.5 flex flex-col items-center text-center">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center mb-1.5">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-200 leading-tight">Digital Pass</span>
            <span className="text-[9px] text-slate-400 mt-0.5">Pre-invite guests</span>
          </div>
        </motion.div>

        {/* ── Action Buttons Container ─────────────────────────── */}
        <div className="w-full space-y-3">
          {/* Primary High-Impact Install CTA Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleInstallCTA}
            disabled={isInstalling}
            className="w-full relative group overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-700 text-white font-bold py-3.5 sm:py-4 px-6 rounded-2xl shadow-xl shadow-indigo-600/30 border border-indigo-400/30 flex items-center justify-center gap-2.5 transition-all text-sm sm:text-base cursor-pointer"
          >
            {/* Shimmer line effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

            {isStandalone ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                <span>Launch Resident App</span>
              </>
            ) : isInstalling ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Preparing Installation...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5 text-indigo-200 group-hover:-translate-y-0.5 transition-transform" />
                <span>Install Resident App</span>
              </>
            )}
          </motion.button>

          {/* Contextual Platform Detection Indicator */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
            {isStandalone ? (
              <span className="text-emerald-400">App installed on this device</span>
            ) : isIOS ? (
              <span>iPhone: Tap Share ➔ Add to Home Screen</span>
            ) : (
              <span>Android & Chrome: Tap Install for Instant 1-Tap Access</span>
            )}
          </div>

          {/* Secondary Action: Sign In directly in browser */}
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white py-1.5 transition-colors cursor-pointer"
          >
            <span>Already registered? Sign in with Mobile</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </main>

      {/* ── Footer Trust Note ─────────────────────────────────── */}
      <footer className="relative z-10 text-center pb-1">
        <div className="inline-flex items-center gap-1.5 text-[10px] text-slate-400/80 font-medium tracking-wide">
          <Lock className="w-3 h-3 text-emerald-400" />
          <span>256-Bit Encrypted Gate Access · Official Society Security Platform</span>
        </div>
      </footer>

      {/* Fallback Install Bottom Sheet (for iOS Safari Share sheet guide) */}
      <PwaInstallSheet
        isOpen={showInstallSheet}
        onClose={() => setShowInstallSheet(false)}
        platform={platform}
        canNativeInstall={isInstallable}
        onTryNativeInstall={install}
      />
    </div>
  );
}

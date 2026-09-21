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
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-gradient-to-b from-indigo-50/70 via-slate-50 to-purple-50/60 text-slate-900 flex flex-col justify-between p-4 sm:p-5 overflow-hidden select-none">
      {/* Subtle tasteful ambient tint - soft, elegant, non-gaming */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-40 bg-gradient-to-b from-indigo-200/30 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* ── Top Header Navigation Bar ────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between max-w-sm mx-auto w-full pt-1 flex-shrink-0">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm shadow-indigo-500/30 p-1.5 flex items-center justify-center">
            <Shield className="w-full h-full text-white" />
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-tight text-slate-900 leading-none">
              {BRAND_CONFIG.name}
            </div>
            <div className="text-[10px] font-semibold text-indigo-600 tracking-wider uppercase mt-0.5">
              Resident App
            </div>
          </div>
        </div>

        {/* Society Pill Badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 border border-indigo-100 shadow-xs text-[11px] font-medium text-slate-700 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <Building2 className="w-3 h-3 text-indigo-500" />
          <span className="max-w-[130px] truncate">callalily chs ltd</span>
        </div>
      </header>

      {/* ── Main Hero Section (Fits compactly with zero scroll) ───── */}
      <main className="relative z-10 max-w-sm mx-auto w-full my-auto py-1 flex flex-col items-center text-center flex-shrink-0">
        {/* Clean Elevated App Icon with subtle Purple-Blue aura */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="mb-3"
        >
          <div className="relative">
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white border border-indigo-100 shadow-lg shadow-indigo-500/10 p-2 flex items-center justify-center ring-4 ring-indigo-500/5">
              <img
                src={BRAND_CONFIG.logo.src}
                alt={BRAND_CONFIG.logo.alt}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
          </div>
        </motion.div>

        {/* Headline & Subtitle with Purple-Blue accents */}
        <motion.div
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05, duration: 0.2 }}
        >
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 mb-1">
            Smart Access. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Safer Living.</span>
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            Instant visitor approval alerts and real-time gate entry verification directly on your phone.
          </p>
        </motion.div>

        {/* Feature Highlights (Rich Purple & Blue Accented Cards) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.2 }}
          className="grid grid-cols-3 gap-2 w-full mt-3 mb-4"
        >
          <div className="bg-white/90 border border-indigo-100 rounded-xl p-2 flex flex-col items-center text-center shadow-xs backdrop-blur-sm">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center mb-1 shadow-xs shadow-indigo-500/30">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">1-Tap Entry</span>
            <span className="text-[9px] text-indigo-600 font-medium mt-0.5">Instant approve</span>
          </div>

          <div className="bg-white/90 border border-purple-100 rounded-xl p-2 flex flex-col items-center text-center shadow-xs backdrop-blur-sm">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center mb-1 shadow-xs shadow-violet-500/30">
              <Camera className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">Guard Photos</span>
            <span className="text-[9px] text-purple-600 font-medium mt-0.5">Real-time image</span>
          </div>

          <div className="bg-white/90 border border-blue-100 rounded-xl p-2 flex flex-col items-center text-center shadow-xs backdrop-blur-sm">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center mb-1 shadow-xs shadow-blue-500/30">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">Digital Pass</span>
            <span className="text-[9px] text-blue-600 font-medium mt-0.5">Pre-invite guests</span>
          </div>
        </motion.div>

        {/* ── Action Buttons Container ─────────────────────────── */}
        <div className="w-full space-y-2.5">
          {/* Vibrant Purple-to-Blue Premium Install CTA Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleInstallCTA}
            disabled={isInstalling}
            className="w-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3 sm:py-3.5 px-5 rounded-xl shadow-md shadow-indigo-600/25 border border-indigo-400/20 flex items-center justify-center gap-2 transition-all text-sm cursor-pointer"
          >
            {isStandalone ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Launch Resident App</span>
              </>
            ) : isInstalling ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Preparing Installation...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-indigo-100" />
                <span>Install Resident App</span>
              </>
            )}
          </motion.button>

          {/* Contextual Platform Detection Indicator */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
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
            className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 py-1 transition-colors cursor-pointer"
          >
            <span>Already registered? Sign in with Mobile</span>
            <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
          </button>
        </div>
      </main>

      {/* ── Footer Trust Note ─────────────────────────────────── */}
      <footer className="relative z-10 text-center pb-1 flex-shrink-0">
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

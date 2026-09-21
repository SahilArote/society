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

  // Society name resolver
  const societyName = "Callalily CHS Ltd";

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-5 overflow-hidden select-none">
      {/* ── Top Header Navigation Bar ────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between max-w-sm mx-auto w-full pt-1 flex-shrink-0">
        {/* Brand Identity */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/90 shadow-xs p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
            <img
              src={BRAND_CONFIG.logo.src}
              alt={BRAND_CONFIG.logo.alt}
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <span className="text-sm font-extrabold tracking-tight text-slate-900">
            {BRAND_CONFIG.name}
          </span>
        </div>

        {/* Building / Society Badge (Clear, Elegant, Prominent) */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-xs text-xs font-semibold text-slate-800">
          <Building2 className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
          <span className="truncate">{societyName}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
        </div>
      </header>

      {/* ── Main Hero Section: Executive Digital Resident Pass ────── */}
      <main className="relative z-10 max-w-sm mx-auto w-full my-auto py-1 flex flex-col items-center flex-shrink-0">
        
        {/* ── Luxury Digital Gate Access Card ──────────────────────── */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1E1B4B] via-[#2E1065] to-[#1E293B] p-4 text-white shadow-xl shadow-indigo-950/20 border border-indigo-500/20 mb-3.5"
        >
          {/* Subtle architectural card accents */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Card Top Row: Building Name & Live Gate Status */}
          <div className="relative z-10 flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5 text-indigo-300" />
              </div>
              <div>
                <div className="text-[11px] font-extrabold tracking-wider uppercase text-indigo-200">
                  {societyName}
                </div>
                <div className="text-[9px] text-slate-300 font-medium tracking-wide">
                  Official Gated Community
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-semibold text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Gate Active</span>
            </div>
          </div>

          {/* Card Center: App Identity & Resident Access */}
          <div className="relative z-10 py-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center flex-shrink-0">
              <img
                src={BRAND_CONFIG.logo.src}
                alt={BRAND_CONFIG.logo.alt}
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight">
                Resident Digital Keycard
              </div>
              <div className="text-[11px] text-indigo-200/90 mt-0.5">
                Automated barrier access & visitor clearances
              </div>
            </div>
          </div>

          {/* Card Bottom: 3 Core Security Capabilities */}
          <div className="relative z-10 pt-2.5 border-t border-white/10 grid grid-cols-3 gap-1 text-center">
            <div className="bg-white/5 rounded-lg py-1 px-1">
              <div className="flex items-center justify-center gap-1 text-indigo-300 text-[10px] font-bold">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>1-Tap Entry</span>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg py-1 px-1">
              <div className="flex items-center justify-center gap-1 text-indigo-300 text-[10px] font-bold">
                <Camera className="w-3 h-3 text-cyan-400" />
                <span>Guard Photo</span>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg py-1 px-1">
              <div className="flex items-center justify-center gap-1 text-indigo-300 text-[10px] font-bold">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>Guest Pass</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Headline & Value Proposition */}
        <div className="text-center mb-3">
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Smart Access for <span className="text-indigo-600">{societyName}</span>
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed mt-1">
            Instant visitor approval alerts and real-time security gate verification directly on your smartphone.
          </p>
        </div>

        {/* ── Action Buttons Container ─────────────────────────── */}
        <div className="w-full space-y-2">
          {/* Primary Professional CTA Button with Purple-Blue Brand Gradient */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleInstallCTA}
            disabled={isInstalling}
            className="w-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white font-bold py-3 px-5 rounded-xl shadow-md shadow-indigo-600/25 border border-indigo-400/20 flex items-center justify-center gap-2 transition-all text-sm cursor-pointer"
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
              <span className="text-emerald-600 font-semibold">App active on this device</span>
            ) : isIOS ? (
              <span>iPhone: Tap Share ➔ Add to Home Screen</span>
            ) : (
              <span>Android: Tap Install for Instant 1-Tap Access</span>
            )}
          </div>

          {/* Secondary Action: Sign In */}
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 py-0.5 transition-colors cursor-pointer"
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
          <span>Official Resident Portal · {societyName} · 256-Bit Security</span>
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

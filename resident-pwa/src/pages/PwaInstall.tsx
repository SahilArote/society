import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Share, PlusSquare, Download, CheckCircle, Smartphone, ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import { usePwaInstall, useToast } from '../hooks';
import { BRAND_CONFIG } from '../config/branding';

export default function PwaInstall() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isInstallable, isInstalled, isStandalone, isInstalling, isIOS, install } = usePwaInstall();
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>(isIOS ? 'ios' : 'android');

  useEffect(() => {
    if (isStandalone) {
      navigate('/home', { replace: true });
    }
  }, [isStandalone, navigate]);

  const handleInstallClick = async () => {
    if (isInstalled || isStandalone) {
      navigate('/home');
      return;
    }

    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        showToast('App installed successfully!', 'success');
      }
    } else if (isIOS) {
      showToast(`Follow the steps below to add ${BRAND_CONFIG.name} to your Home Screen`, 'info');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-between relative overflow-x-hidden select-none">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-indigo-600/20 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-emerald-500/15 rounded-full blur-[90px] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 px-4 h-14 flex items-center border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur-md">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 focus:outline-none transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-white text-sm ml-2">Install Resident App</span>
      </header>

      {/* Main Container */}
      <main className="relative z-10 px-5 py-6 max-w-md mx-auto w-full flex-1 flex flex-col items-center text-center my-auto">
        {/* App Icon */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative mb-4"
        >
          <div className="absolute -inset-1.5 bg-gradient-to-tr from-indigo-500 to-emerald-500 rounded-3xl blur opacity-40 animate-pulse" />
          <div className="relative w-20 h-20 rounded-3xl bg-slate-900 border border-white/20 p-2 shadow-2xl flex items-center justify-center overflow-hidden">
            <img src={BRAND_CONFIG.logo.src} alt={BRAND_CONFIG.logo.alt} className="w-full h-full object-contain rounded-2xl" />
          </div>
        </motion.div>

        <h1 className="text-2xl font-extrabold text-white mb-1">
          {BRAND_CONFIG.name}
        </h1>
        <p className="text-xs text-slate-400 max-w-xs mb-5">
          Install the resident app on your phone for instant 1-tap gate authorizations and real-time visitor photos.
        </p>

        {/* Platform Selector Tabs */}
        <div className="flex bg-white/[0.06] border border-white/10 p-1 rounded-2xl w-full max-w-xs mb-5 select-none backdrop-blur-md">
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'android'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Android / Chrome
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'ios'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            iPhone / Safari
          </button>
        </div>

        {/* Steps Card */}
        <div className="bg-white/[0.04] backdrop-blur-md rounded-2xl p-4 border border-white/10 w-full text-left mb-5 space-y-3.5">
          {activeTab === 'android' ? (
            <>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white">Tap 'Install App' Below</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">The browser will open a quick system installation confirmation prompt.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white">Instant Home Screen Launch</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Access full screen without browser URL bars, exactly like a native app.</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white flex items-center gap-1.5">
                    Tap the Share Button <Share className="w-3.5 h-3.5 text-indigo-400" />
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Located in the bottom toolbar of Safari on your iPhone.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white flex items-center gap-1.5">
                    Select 'Add to Home Screen' <PlusSquare className="w-3.5 h-3.5 text-indigo-400" />
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Scroll down in the share menu and tap 'Add to Home Screen'.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white flex items-center gap-1.5">
                    Tap 'Add' in Top Right
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">{BRAND_CONFIG.name} will be added instantly to your home screen.</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* CTA Button */}
        <div className="w-full space-y-3">
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="w-full relative group overflow-hidden bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-xl shadow-indigo-600/30 border border-indigo-400/30 flex items-center justify-center gap-2.5 transition-all text-sm cursor-pointer"
          >
            {isStandalone || isInstalled ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                <span>Open Installed App</span>
              </>
            ) : isInstalling ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Installing...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5 text-indigo-200" />
                <span>{isIOS ? 'Instructions Above' : 'Install Resident App'}</span>
              </>
            )}
          </button>

          <button
            onClick={() => navigate('/login')}
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Sign in via Browser Instead ➔
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-3 text-center border-t border-white/10 bg-[#0B0F19]/90">
        <div className="inline-flex items-center gap-1.5 text-[10px] text-slate-500">
          <Lock className="w-3 h-3 text-emerald-400" />
          <span>256-Bit Encrypted Gate Access · Official Society Security Platform</span>
        </div>
      </footer>
    </div>
  );
}

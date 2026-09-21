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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between relative overflow-x-hidden select-none">
      {/* Top Header */}
      <header className="px-4 h-14 flex items-center border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-20">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-slate-900 text-sm ml-2">Install Resident App</span>
      </header>

      {/* Main Container */}
      <main className="px-5 py-6 max-w-md mx-auto w-full flex-1 flex flex-col items-center text-center my-auto">
        {/* App Icon */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-3"
        >
          <div className="w-18 h-18 rounded-2xl bg-white border border-slate-200 shadow-md p-2 flex items-center justify-center">
            <img src={BRAND_CONFIG.logo.src} alt={BRAND_CONFIG.logo.alt} className="w-full h-full object-contain rounded-xl" />
          </div>
        </motion.div>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          {BRAND_CONFIG.name}
        </h1>
        <p className="text-xs text-slate-500 max-w-xs mb-5">
          Install the resident app on your phone for instant gate authorizations and real-time visitor photos.
        </p>

        {/* Platform Selector Tabs */}
        <div className="flex bg-slate-200/60 p-1 rounded-xl w-full max-w-xs mb-5 select-none border border-slate-200">
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'android'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Android / Chrome
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'ios'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            iPhone / Safari
          </button>
        </div>

        {/* Steps Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm w-full text-left mb-5 space-y-3.5">
          {activeTab === 'android' ? (
            <>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">Tap 'Install App' Below</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">The browser will open a quick system installation confirmation prompt.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">Instant Home Screen Launch</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">Access full screen without browser URL bars, exactly like a native app.</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    Tap the Share Button <Share className="w-3.5 h-3.5 text-indigo-600" />
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">Located in the bottom toolbar of Safari on your iPhone.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    Select 'Add to Home Screen' <PlusSquare className="w-3.5 h-3.5 text-indigo-600" />
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">Scroll down in the share menu and tap 'Add to Home Screen'.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">
                    Tap 'Add' in Top Right
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">{BRAND_CONFIG.name} will be added instantly to your home screen.</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* CTA Button */}
        <div className="w-full space-y-2.5">
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold py-3 px-5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all text-sm cursor-pointer"
          >
            {isStandalone || isInstalled ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Open Installed App</span>
              </>
            ) : isInstalling ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Installing...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-slate-300" />
                <span>{isIOS ? 'Instructions Above' : 'Install Resident App'}</span>
              </>
            )}
          </button>

          <button
            onClick={() => navigate('/login')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors py-1"
          >
            Sign in via Browser Instead ➔
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 text-center border-t border-slate-200/80 bg-white">
        <div className="inline-flex items-center gap-1.5 text-[10px] text-slate-400">
          <Lock className="w-3 h-3 text-emerald-600" />
          <span>256-Bit Encrypted Gate Access · Official Society Security Platform</span>
        </div>
      </footer>
    </div>
  );
}


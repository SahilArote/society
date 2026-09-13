import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Share, PlusSquare, Download, CheckCircle, Smartphone, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header */}
      <div className="px-4 h-14 flex items-center bg-white border-b border-slate-100">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full text-slate-600 hover:bg-slate-100 focus:outline-none"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-slate-900 text-sm ml-2">Install App</span>
      </div>

      <div className="px-5 py-6 max-w-md mx-auto w-full flex-1 flex flex-col items-center text-center">
        {/* App Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 rounded-3xl bg-white shadow-xl shadow-slate-200 p-2 flex items-center justify-center mb-4 ring-8 ring-primary-50 overflow-hidden border border-slate-200"
        >
          <img src={BRAND_CONFIG.logo.src} alt={BRAND_CONFIG.logo.alt} className="w-full h-full object-contain rounded-2xl" />
        </motion.div>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          {BRAND_CONFIG.name}
        </h1>
        <p className="text-xs text-slate-500 max-w-xs mb-6">
          Install the progressive web app for 1-tap visitor access right from your home screen.
        </p>

        {/* Platform Selector Tabs */}
        <div className="flex bg-slate-200/70 p-1 rounded-xl w-full max-w-xs mb-6 select-none">
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'android'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Android / Chrome
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'ios'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            iPhone / Safari
          </button>
        </div>

        {/* Steps Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm w-full text-left mb-6 space-y-4">
          {activeTab === 'android' ? (
            <>
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Tap Install Button</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                    Click the "Install App" button below or tap Chrome's menu (⋮).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Confirm Installation</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                    Select "Install" when the system prompt appears on screen.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Launch from Home Screen</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                    Open GreenGate anytime like a native mobile app.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Tap the Share Icon</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                    At the bottom bar in Safari, tap the Share icon.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Select "Add to Home Screen"</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                    Scroll down the sharing options and select "Add to Home Screen".
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Tap "Add"</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                    Tap Add in the top-right corner to place GreenGate on your home screen.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Primary CTA */}
        <div className="w-full space-y-3">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={isInstalling}
            onClick={handleInstallClick}
            icon={isInstalled || isStandalone ? <CheckCircle2 className="w-5 h-5" /> : <Download className="w-5 h-5" />}
          >
            {isInstalled || isStandalone
              ? 'Open Resident App'
              : isInstalling
              ? 'Installing App...'
              : isInstallable
              ? 'Install GreenGate App'
              : activeTab === 'ios'
              ? 'Follow iOS Steps Above'
              : 'Proceed to Sign In'}
          </Button>

          <button
            onClick={() => navigate('/login')}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium py-2"
          >
            Already installed? Open Login
          </button>
        </div>
      </div>

      <div className="py-4 text-center border-t border-slate-100 bg-white">
        <p className="text-[11px] text-slate-400">
          Fast · Secure · No App Store Download Required
        </p>
      </div>
    </div>
  );
}

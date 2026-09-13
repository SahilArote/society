import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Users, Car, Bell, Smartphone, QrCode, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PwaInstallSheet } from '../components/common/PwaInstallSheet';
import { mockResident } from '../data/mockResident';
import { usePwaInstall, useToast } from '../hooks';
import { BRAND_CONFIG } from '../config/branding';

import { authSession } from '../services/authSession';
import { pwaInstallManager } from '../services/pwaInstallManager';

export default function Landing() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isInstallable, isInstalled, isStandalone, isInstalling, platform, install } = usePwaInstall();
  const [showInstallSheet, setShowInstallSheet] = useState(false);

  // When launched from phone home screen in standalone mode, transition directly into the application
  useEffect(() => {
    if (isStandalone) {
      navigate(authSession.isAuthenticated() ? '/home' : '/login', { replace: true });
    }
  }, [isStandalone, navigate]);

  const features = [
    {
      icon: Shield,
      title: 'Visitor Pass & Access',
      desc: 'Instant pre-approvals and 1-tap entry authorization.',
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      icon: Users,
      title: 'Family Members',
      desc: 'Seamlessly add and manage co-residents & dependents.',
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: Car,
      title: 'Vehicle Management',
      desc: 'Authorized digital vehicle tags for gate security.',
      color: 'bg-amber-50 text-amber-600',
    },
    {
      icon: Bell,
      title: 'Real-time Security Alerts',
      desc: 'Immediate notifications for gate entries and emergencies.',
      color: 'bg-rose-50 text-rose-600',
    },
  ];

  const handleInstallCTA = async () => {
    // If running in standalone app mode:
    if (isStandalone) {
      navigate(authSession.isAuthenticated() ? '/home' : '/login');
      return;
    }

    // Trigger official native installation prompt directly
    const result = await pwaInstallManager.promptInstall();

    if (result.outcome === 'accepted') {
      showToast(`${BRAND_CONFIG.name} installed! Launch from your home screen`, 'success');
      return;
    } else if (result.outcome === 'dismissed') {
      // User tapped cancel on the official prompt
      return;
    }

    // Genuinely unavailable (e.g. iOS Safari where Apple requires manual Share -> Add)
    setShowInstallSheet(true);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      {/* Hero Branding Section */}
      <div className="relative bg-gradient-to-b from-primary-900 via-primary-800 to-primary-700 text-white px-6 pt-12 pb-16 rounded-b-[36px] shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-md mx-auto text-center">
          {/* Logo & Society Badge */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white p-2 shadow-xl shadow-primary-950/20 mb-5 ring-4 ring-white/10"
          >
            <img src={BRAND_CONFIG.logo.src} alt={BRAND_CONFIG.logo.alt} className="w-full h-full object-contain rounded-xl" />
          </motion.div>

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide uppercase text-indigo-100 mb-3 border border-white/15">
              <QrCode className="w-3.5 h-3.5" />
              Verified Society Portal
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
              {BRAND_CONFIG.name}
            </h1>
            <p className="text-sm text-indigo-100/90 font-medium">
              {mockResident.society.name}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content / Features */}
      <div className="px-5 py-6 max-w-md mx-auto w-full flex-1 flex flex-col justify-center -mt-6 z-20">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6 text-center">
          <h2 className="text-lg font-bold text-slate-900 mb-1.5">
            Your Society, Smarter & Safer
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Manage visitors, family members, vehicles and residential security right from your mobile device.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05, duration: 0.25 }}
                className="bg-slate-50 border border-slate-100/80 p-3.5 rounded-2xl flex flex-col"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${feature.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 mb-1 leading-tight">{feature.title}</h3>
                <p className="text-[11px] text-slate-500 leading-snug">{feature.desc}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Security Assurance Card */}
        <div className="flex items-center gap-3 p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100/70 mb-6">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-xs font-semibold text-indigo-950">End-to-End Encrypted Access</p>
            <p className="text-[11px] text-indigo-700">Only authorized flat owners can approve visitors.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={isInstalling}
            onClick={handleInstallCTA}
            className="shadow-md shadow-primary-500/20 text-base font-semibold"
            icon={isStandalone ? <CheckCircle2 className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
          >
            {isStandalone
              ? 'Open Resident App'
              : isInstalling
              ? 'Opening Install...'
              : 'Install Resident App'}
          </Button>

          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={() => navigate('/login')}
            className="text-slate-600 hover:text-slate-900"
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Sign in with Mobile Number
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="py-4 text-center border-t border-slate-100 bg-slate-50/80">
        <p className="text-[11px] text-slate-400">
          GreenGate Residential Security Platform · Works on iOS & Android
        </p>
      </div>

      {/* Instructional Fallback Bottom Sheet */}
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

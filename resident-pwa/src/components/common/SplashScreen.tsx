import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockResident } from '../../data/mockResident';
import { BRAND_CONFIG } from '../../config/branding';

interface SplashScreenProps {
  onComplete?: () => void;
  minDurationMs?: number;
}

export function SplashScreen({ onComplete, minDurationMs = 350 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [minDurationMs, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-primary-700 text-white p-8 overflow-hidden select-none"
        >
          {/* Subtle ambient glow */}
          <div className="absolute top-1/3 w-72 h-72 rounded-full bg-primary-500/25 blur-3xl pointer-events-none" />

          {/* Spacer */}
          <div className="pt-safe" />

          {/* Center Brand Identity */}
          <div className="flex flex-col items-center text-center my-auto">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, type: 'spring', damping: 20 }}
              className="w-20 h-20 rounded-2xl bg-white p-2 shadow-2xl flex items-center justify-center mb-5 ring-4 ring-white/20"
            >
              <img src={BRAND_CONFIG.logo.src} alt={BRAND_CONFIG.logo.alt} className="w-full h-full object-contain rounded-xl" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="text-2xl font-black tracking-tight text-white"
            >
              {BRAND_CONFIG.name}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="text-xs font-semibold text-indigo-100 uppercase tracking-widest mt-1"
            >
              Resident Application
            </motion.p>
          </div>

          {/* Bottom Society Context */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="pb-safe text-center"
          >
            <p className="text-xs font-medium text-indigo-200">
              {mockResident.society.name}
            </p>
            <p className="text-[10px] text-indigo-300/70 mt-0.5">
              Secure Residential Gate Network
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SplashScreen;

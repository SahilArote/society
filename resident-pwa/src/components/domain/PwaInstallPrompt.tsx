import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Share, PlusSquare, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { IconButton } from '../ui/IconButton';
import { BRAND_CONFIG } from '../../config/branding';

export interface PwaInstallPromptProps {
  onClose?: () => void;
  className?: string;
}

export default function PwaInstallPrompt({ onClose, className }: PwaInstallPromptProps) {
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Basic iOS detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    // Not standalone (meaning not already installed)
    const isStandalone = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    
    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
    }

    // Android/Desktop detection
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (!isVisible || (!isIOS && !deferredPrompt)) {
    return null; // Don't render if already installed or unsupported
  }

  return (
    <Card className={cn('p-4 relative overflow-hidden', className)}>
      <IconButton 
        onClick={handleClose} 
        size="sm" 
        variant="ghost" 
        className="absolute top-2 right-2 text-slate-400"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </IconButton>
      
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center flex-shrink-0">
          <img src={BRAND_CONFIG.logo.src} alt={BRAND_CONFIG.logo.alt} className="w-full h-full object-contain rounded-xl" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 mt-1">{BRAND_CONFIG.name}</h3>
          <p className="text-sm text-slate-500 mt-0.5">Quick access to approvals, passes & society updates</p>
        </div>
      </div>

      {isIOS ? (
        <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700">
          <p className="font-medium mb-2">To install on iOS:</p>
          <ol className="space-y-2">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center bg-white rounded-full text-xs font-bold">1</span>
              <span>Tap the <Share className="w-4 h-4 inline mx-1" /> Share button below</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center bg-white rounded-full text-xs font-bold">2</span>
              <span>Scroll down and tap <PlusSquare className="w-4 h-4 inline mx-1" /> "Add to Home Screen"</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center bg-white rounded-full text-xs font-bold">3</span>
              <span>Tap "Add" in the top right</span>
            </li>
          </ol>
        </div>
      ) : (
        <Button onClick={handleInstallClick} className="w-full bg-primary-600 text-white">
          Install App
        </Button>
      )}
    </Card>
  );
}

import { useState, useEffect, useCallback } from 'react';

// ========================
// Greeting Hook
// ========================
export function useGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ========================
// Online Status Hook
// ========================
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// ========================
// Media Query Hook
// ========================
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px)');
}

// ========================
// PWA Install Hook (Backed by Central pwaInstallManager)
// ========================
import { pwaInstallManager, type PwaInstallState } from '../services/pwaInstallManager';

export function usePwaInstall() {
  const [state, setState] = useState<PwaInstallState>(pwaInstallManager.getState());

  useEffect(() => {
    return pwaInstallManager.subscribe(setState);
  }, []);

  const install = useCallback(async () => {
    const res = await pwaInstallManager.promptInstall();
    return res.outcome === 'accepted';
  }, []);

  return {
    canInstall: pwaInstallManager.canPromptNativeInstall(),
    isInstallable: pwaInstallManager.canPromptNativeInstall(),
    isInstalled: pwaInstallManager.isInstalled(),
    isStandalone: pwaInstallManager.isStandalone(),
    isInstalling: state === 'installing',
    state,
    isIOS: pwaInstallManager.isIOS(),
    isAndroid: pwaInstallManager.isAndroid(),
    isMobile: pwaInstallManager.isMobile(),
    platform: pwaInstallManager.getPlatform(),
    install,
  };
}

// ========================
// Bottom Sheet Hook
// ========================
export function useBottomSheet(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return { isOpen, open, close, toggle };
}

// ========================
// Toast Hook
// ========================
export { useToastContext as useToast } from '../components/ui/Toast';
export type { ToastItem as Toast } from '../components/ui/Toast';


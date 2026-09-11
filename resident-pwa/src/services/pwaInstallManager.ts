// Central PWA Installation & Platform Manager for Society

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Augment window object for early capture in head
declare global {
  interface Window {
    __pwaDeferredPrompt?: BeforeInstallPromptEvent | null;
    __pwaPromptFired?: boolean;
    __pwaPromptFiredTime?: string | null;
    __pwaAppInstalled?: boolean;
  }
}

export type PwaInstallState = 'idle' | 'prompt-ready' | 'installing' | 'installed' | 'unsupported';

type Listener = (state: PwaInstallState) => void;

class PwaInstallManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private state: PwaInstallState = 'idle';
  private listeners: Set<Listener> = new Set();
  private isAppInstalled = false;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    // 1. Check if early head script already captured beforeinstallprompt
    if (window.__pwaDeferredPrompt) {
      this.deferredPrompt = window.__pwaDeferredPrompt;
      this.state = 'prompt-ready';
      console.log('[PWA Manager] Consumed early captured beforeinstallprompt from head.');
    }

    // 2. Standalone detection (genuine OS standalone display mode)
    if (this.checkIsStandalone()) {
      this.state = 'installed';
    }

    // 3. Listen for native beforeinstallprompt (in case not captured yet)
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      window.__pwaDeferredPrompt = this.deferredPrompt;
      window.__pwaPromptFired = true;
      this.state = 'prompt-ready';
      console.log('[PWA Manager] beforeinstallprompt received directly.');
      this.notify();
    });

    // 4. Listen for custom event from head script
    window.addEventListener('pwa-deferred-prompt-ready', () => {
      if (window.__pwaDeferredPrompt) {
        this.deferredPrompt = window.__pwaDeferredPrompt;
        this.state = 'prompt-ready';
        this.notify();
      }
    });

    // 5. Listen for appinstalled event
    window.addEventListener('appinstalled', () => {
      console.log('[PWA Manager] appinstalled event fired.');
      this.isAppInstalled = true;
      this.deferredPrompt = null;
      window.__pwaDeferredPrompt = null;
      this.state = 'installed';
      this.notify();
    });

    window.addEventListener('pwa-installed-confirmed', () => {
      this.isAppInstalled = true;
      this.deferredPrompt = null;
      window.__pwaDeferredPrompt = null;
      this.state = 'installed';
      this.notify();
    });

    // 6. Register Service Worker with clean scope
    this.registerServiceWorker();
  }

  public registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return Promise.resolve(null);
    }

    return navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((reg) => {
        console.log('[PWA Manager] Service Worker registered with scope:', reg.scope);

        // Check for updates
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA Manager] New version available.');
                window.dispatchEvent(new CustomEvent('pwa-update-available'));
              }
            };
          }
        };

        return reg;
      })
      .catch((err) => {
        console.warn('[PWA Manager] Service Worker registration failed:', err);
        return null;
      });
  }

  /**
   * Standalone check: Genuine application running mode, NOT cached in sessionStorage
   */
  public checkIsStandalone(): boolean {
    if (typeof window === 'undefined') return false;

    const isMediaStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
    const isTwa = document.referrer.includes('android-app://');
    const isUrlParam =
      window.location.search.includes('source=pwa') ||
      window.location.search.includes('mode=standalone');

    return isMediaStandalone || isIOSStandalone || isTwa || isUrlParam;
  }

  public isStandalone(): boolean {
    return this.checkIsStandalone();
  }

  public isInstalled(): boolean {
    return this.isAppInstalled || this.isStandalone();
  }

  public canPromptNativeInstall(): boolean {
    return Boolean(this.deferredPrompt || window.__pwaDeferredPrompt);
  }

  public getState(): PwaInstallState {
    if (this.isStandalone()) return 'installed';
    if (this.canPromptNativeInstall()) return 'prompt-ready';
    if (this.isAppInstalled) return 'installed';
    if (this.isIOS()) return 'idle'; // iOS can install via Share -> Add to Home
    return this.state;
  }

  public isIOS(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
  }

  public isAndroid(): boolean {
    if (typeof window === 'undefined') return false;
    return /Android/i.test(navigator.userAgent);
  }

  public isOemBrowser(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent;
    return /VivoBrowser|HeyTapBrowser|MiuiBrowser|HuaweiBrowser|UCBrowser|OppoBrowser/i.test(ua);
  }

  public isMobile(): boolean {
    return this.isIOS() || this.isAndroid();
  }

  public getPlatform(): 'ios' | 'android' | 'desktop' {
    if (this.isIOS()) return 'ios';
    if (this.isAndroid()) return 'android';
    return 'desktop';
  }

  /**
   * Wait briefly (up to maxWaitMs) for beforeinstallprompt if browser is still evaluating
   */
  public async waitForPrompt(maxWaitMs = 1500): Promise<boolean> {
    if (this.canPromptNativeInstall()) return true;

    return new Promise((resolve) => {
      const startTime = Date.now();
      const check = () => {
        if (this.canPromptNativeInstall()) {
          resolve(true);
          return;
        }
        if (Date.now() - startTime >= maxWaitMs) {
          resolve(false);
          return;
        }
        setTimeout(check, 50);
      };
      check();
    });
  }

  /**
   * Trigger the native browser install prompt with automatic warm-up wait
   */
  public async promptInstall(): Promise<{ outcome: 'accepted' | 'dismissed' | 'unavailable' }> {
    // 1. If prompt not ready yet, wait up to 1500ms for browser heuristic completion
    if (!this.deferredPrompt && window.__pwaDeferredPrompt) {
      this.deferredPrompt = window.__pwaDeferredPrompt;
    }

    if (!this.deferredPrompt) {
      console.log('[PWA Manager] Prompt not immediately ready, waiting up to 1500ms...');
      const acquired = await this.waitForPrompt(1500);
      if (acquired && window.__pwaDeferredPrompt) {
        this.deferredPrompt = window.__pwaDeferredPrompt;
      }
    }

    if (!this.deferredPrompt) {
      console.warn('[PWA Manager] Native install prompt genuinely unavailable.');
      return { outcome: 'unavailable' };
    }

    this.state = 'installing';
    this.notify();

    try {
      console.log('[PWA Manager] Invoking native prompt()...');
      await this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      console.log('[PWA Manager] User install choice outcome:', choiceResult.outcome);

      if (choiceResult.outcome === 'accepted') {
        this.isAppInstalled = true;
        this.state = 'installed';
      } else {
        this.state = 'prompt-ready';
      }

      // Consumed prompt must be cleared
      this.deferredPrompt = null;
      window.__pwaDeferredPrompt = null;
      this.notify();

      return { outcome: choiceResult.outcome };
    } catch (err) {
      console.error('[PWA Manager] Error during prompt():', err);
      this.state = 'prompt-ready';
      this.notify();
      return { outcome: 'unavailable' };
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }
}

export const pwaInstallManager = new PwaInstallManager();

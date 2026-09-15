// PWA Resident Push Notification & Chime Service for NexGate

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://society-d521.onrender.com/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks if browser supports Notifications and Service Workers
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Play a high-fidelity 2-tone doorbell chime using the Web Audio API
 * No external sound files required; works on all devices and offline
 */
export function playDoorbellChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Tone 1: 659.25 Hz (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.4, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Tone 2: 523.25 Hz (C5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(523.25, now + 0.25);

    gain2.gain.setValueAtTime(0, now + 0.25);
    gain2.gain.linearRampToValueAtTime(0.5, now + 0.27);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.25);
    osc2.stop(now + 1.2);
  } catch (err) {
    console.warn('[NotificationService] Audio chime error:', err);
  }
}

/**
 * Request notification permission from user and optionally subscribe to push
 */
export async function requestNotificationPermission(token?: string): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn('[NotificationService] Notifications not supported on this browser');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[NotificationService] Notification permission status:', permission);

    if (permission === 'granted') {
      // Play a confirmation sound
      playDoorbellChime();

      // Subscribe to backend web push if token is provided
      if (token) {
        await subscribeToPush(token);
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('[NotificationService] Failed to request notification permission:', err);
    return false;
  }
}

/**
 * Subscribe the browser to Web Push using the server's VAPID public key
 */
export async function subscribeToPush(token: string): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.pushManager) {
      console.warn('[NotificationService] PushManager not available in Service Worker');
      return false;
    }

    // 1. Fetch server's VAPID public key
    const res = await fetch(`${API_BASE_URL}/notifications/vapid-public-key`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    const publicKey = json.data?.publicKey;

    if (!publicKey) {
      console.warn('[NotificationService] Could not retrieve VAPID public key from backend');
      return false;
    }

    // 2. Subscribe browser to push service
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any,
      });
    }

    // 3. Register subscription on backend
    const subJson = subscription.toJSON();
    const saveRes = await fetch(`${API_BASE_URL}/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ subscription: subJson }),
    });

    const saveJson = await saveRes.json();
    console.log('[NotificationService] Push subscription registration response:', saveJson);
    return true;
  } catch (err) {
    console.warn('[NotificationService] Push subscription failed:', err);
    return false;
  }
}

/**
 * Trigger a native visitor entry alert (sound, vibration, and system notification)
 */
export async function triggerVisitorNotification(
  data: {
    requestId: string;
    visitorName: string;
    gateName?: string;
    flatNumber?: string;
    photoUrl?: string;
  },
  token?: string
): Promise<void> {
  // 1. Play doorbell chime
  playDoorbellChime();

  // 2. Vibrate device (Android/Mobile)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([250, 100, 250, 100, 400]);
    } catch (_) {}
  }

  // 3. Display native notification via Service Worker
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const title = `🚨 Visitor at Gate: ${data.visitorName}`;
    const body = `${data.visitorName} is waiting at ${data.gateName || 'Main Gate'}${
      data.flatNumber ? ` for Flat ${data.flatNumber}` : ''
    }. Tap to approve or decline entry.`;

    const options: any = {
      body,
      icon: '/brand/society-logo.png',
      badge: '/icons/favicon-32.png',
      image: data.photoUrl,
      tag: `visitor-${data.requestId}`,
      renotify: true,
      requireInteraction: true,
      data: {
        requestId: data.requestId,
        token: token || '',
        url: '/',
      },
      actions: [
        { action: 'approve', title: '✅ Allow Entry' },
        { action: 'reject', title: '❌ Deny Entry' },
      ],
    };

    await registration.showNotification(title, options);
  } catch (err) {
    console.warn('[NotificationService] Could not show native notification:', err);
  }
}

/**
 * Trigger a test notification to verify sounds and alerts
 */
export async function triggerTestNotification(token?: string): Promise<void> {
  playDoorbellChime();

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]);
  }

  if (isNotificationSupported() && Notification.permission === 'granted') {
    const registration = await navigator.serviceWorker.ready;
    const testOptions: any = {
      body: 'Doorbell chime and push notifications are active on this device!',
      icon: '/brand/society-logo.png',
      badge: '/icons/favicon-32.png',
      tag: `test-${Date.now()}`,
      data: { url: '/' },
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };
    await registration.showNotification('🔔 NexGate Gate Alert Test', testOptions);
  }

  if (token) {
    try {
      await fetch(`${API_BASE_URL}/notifications/test-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (_) {}
  }
}

/**
 * GreenGate Resident Push Notification Service
 * Handles:
 * - Device/Browser Web Push Notifications (Notification API & Service Worker)
 * - Mobile Haptic Vibration
 * - Audio Chime synthesized via Web Audio API
 * - Real-time Push Notification Event Bus for in-app floating push banners
 */

import { BACKEND_URL } from './api';

export interface VisitorPushPayload {
  id: string;
  name: string;
  purpose?: string;
  gate?: string;
  flatNumber?: string;
  photoUrl?: string;
  requestedAt?: string | Date;
}

type PushListener = (payload: VisitorPushPayload) => void;
const pushListeners: Set<PushListener> = new Set();

/**
 * Synthesize a two-tone pleasant gate alert chime
 */
export function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Tone 1: High crisp alert chime (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: Harmonic resolution chime (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.12);
    gain2.gain.setValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);
  } catch {
    // AudioContext autoplay restriction or unsupported
  }
}

/**
 * Trigger mobile device vibration pattern
 */
export function vibrateDevice() {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 250, 100, 300]);
    }
  } catch {
    // Vibration not supported
  }
}

/**
 * Request notification permission from browser/OS
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return Notification.permission;
  }
}

/**
 * Subscribe to in-app push notification banner events
 */
export function subscribePushNotifications(listener: PushListener): () => void {
  pushListeners.add(listener);
  return () => {
    pushListeners.delete(listener);
  };
}

/**
 * Dispatches a push notification to device OS and in-app banner
 */
export async function triggerDevicePushNotification(payload: VisitorPushPayload) {
  // 1. Play chime audio & mobile vibration
  playNotificationChime();
  vibrateDevice();

  // 2. Notify all in-app push banner listeners
  pushListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (err) {
      console.error('[PushService] Listener error:', err);
    }
  });

  // 3. Trigger OS/Device Native Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    const backendOrigin = BACKEND_URL;
    const photo = payload.photoUrl
      ? payload.photoUrl.startsWith('http')
        ? payload.photoUrl
        : `${backendOrigin}${payload.photoUrl}`
      : '/icons/icon-192.png';

    const title = `🚨 Gate Alert: ${payload.name} is at the Gate`;
    const body = `${payload.name} (${(payload.purpose || 'Guest').toUpperCase()}) arrived at ${payload.gate || 'Main Gate'} for Flat ${payload.flatNumber || 'A-402'}. Tap to Allow or Deny entry.`;
    const targetUrl = `/visitors/${payload.id}`;

    try {
      // Try Service Worker showNotification first (native mobile push behavior)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && 'showNotification' in registration) {
          await registration.showNotification(title, {
            body,
            icon: photo,
            badge: '/icons/favicon-32.png',
            tag: `visitor-${payload.id}`,
            renotify: true,
            data: { url: targetUrl },
          } as any);
          return;
        }
      }

      // Fallback to Desktop/Window Notification
      const notif = new Notification(title, {
        body,
        icon: photo,
        tag: `visitor-${payload.id}`,
      });

      notif.onclick = () => {
        window.focus();
        window.location.href = targetUrl;
        notif.close();
      };
    } catch (err) {
      console.warn('[PushService] Error dispatching OS notification:', err);
    }
  }
}

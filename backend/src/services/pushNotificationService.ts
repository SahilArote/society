import webpush from 'web-push';
import { v4 as uuidv4 } from 'uuid';
import { getMysqlPool } from '../database/mysql';

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BHf6Vh5V0gvg0zqlvik142bjPQ8RK7ebNEAYhaHDXUQE0FElv7j9gRPsMvRr4aPnN-kXXHg2UVRqMZ7W8rXmc5Q';

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'BAxuAJvIkK9jXtmsGvqOdNUf9TEU43dF5byhMSn97UE';

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@greengate.in';

// Configure Web Push with VAPID credentials
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// In-memory subscription cache for fast retrieval & offline fallback
const memorySubscriptions: Map<string, Set<any>> = new Map();

/**
 * Ensure push_subscriptions table exists in MySQL
 */
async function ensurePushTable(): Promise<void> {
  try {
    const pool = await getMysqlPool();
    if (!pool) return;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh VARCHAR(255) NOT NULL,
        auth VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_push_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (err: any) {
    console.warn('[WebPush] Notice: push_subscriptions table check:', err.message);
  }
}

// Run table creation on startup
ensurePushTable();

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Save or update a Push Subscription for a user
 */
export async function savePushSubscription(
  userId: string,
  sub: PushSubscriptionData
): Promise<void> {
  if (!sub || !sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    throw new Error('Invalid PushSubscription payload');
  }

  // 1. Cache in memory
  if (!memorySubscriptions.has(userId)) {
    memorySubscriptions.set(userId, new Set());
  }
  const userSubs = memorySubscriptions.get(userId)!;
  // Remove existing sub with same endpoint
  for (const s of userSubs) {
    if (s.endpoint === sub.endpoint) {
      userSubs.delete(s);
    }
  }
  userSubs.add(sub);

  // 2. Persist in MySQL
  try {
    const pool = await getMysqlPool();
    if (pool) {
      await ensurePushTable();
      // Remove previous matching endpoint for this user
      await pool.query('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?', [
        userId,
        sub.endpoint,
      ]);

      await pool.query(
        'INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?, ?)',
        [`sub_${uuidv4().slice(0, 12)}`, userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth]
      );
      console.log(`[WebPush] Successfully registered push subscription for user ${userId}`);
    }
  } catch (err: any) {
    console.warn(`[WebPush] Could not persist push subscription in MySQL (${err.message}). Using memory cache.`);
  }
}

/**
 * Remove a Push Subscription
 */
export async function removePushSubscription(userId: string, endpoint: string): Promise<void> {
  const userSubs = memorySubscriptions.get(userId);
  if (userSubs) {
    for (const s of userSubs) {
      if (s.endpoint === endpoint) {
        userSubs.delete(s);
      }
    }
  }

  try {
    const pool = await getMysqlPool();
    if (pool) {
      await pool.query('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?', [
        userId,
        endpoint,
      ]);
    }
  } catch (err: any) {
    console.warn('[WebPush] Error removing subscription from MySQL:', err.message);
  }
}

/**
 * Send Web Push notification to a specific user's subscribed devices
 */
export async function sendPushToUser(
  userId: string,
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    image?: string;
    tag?: string;
    data?: any;
    actions?: Array<{ action: string; title: string }>;
  }
): Promise<{ sentCount: number; failedCount: number }> {
  let subscriptions: PushSubscriptionData[] = [];

  // 1. Fetch from MySQL
  try {
    const pool = await getMysqlPool();
    if (pool) {
      const [rows]: any = await pool.query(
        'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
        [userId]
      );
      if (rows && rows.length > 0) {
        subscriptions = rows.map((r: any) => ({
          endpoint: r.endpoint,
          keys: {
            p256dh: r.p256dh,
            auth: r.auth,
          },
        }));
      }
    }
  } catch (err: any) {
    console.warn(`[WebPush] Error querying subscriptions from MySQL: ${err.message}`);
  }

  // 2. Merge with memory cache
  const cached = memorySubscriptions.get(userId);
  if (cached) {
    for (const c of cached) {
      if (!subscriptions.some((s) => s.endpoint === c.endpoint)) {
        subscriptions.push(c);
      }
    }
  }

  if (subscriptions.length === 0) {
    console.log(`[WebPush] No push subscriptions found for user ${userId}`);
    return { sentCount: 0, failedCount: 0 };
  }

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/favicon-32.png',
    image: payload.image,
    tag: payload.tag || `notif_${Date.now()}`,
    silent: false,
    renotify: true,
    requireInteraction: true,
    timestamp: Date.now(),
    vibrate: [500, 200, 500, 200, 500],
    data: payload.data || { url: '/home' },
  });

  let sentCount = 0;
  let failedCount = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub as any, notificationPayload, {
        TTL: 60, // 60 seconds TTL ensures immediate delivery
        urgency: 'high',
        topic: 'visitor-alert',
        headers: {
          Urgency: 'high',
        },
      });
      sentCount++;
      console.log(`[WebPush] Notification dispatched successfully to endpoint: ${sub.endpoint.slice(0, 40)}...`);
    } catch (err: any) {
      failedCount++;
      console.warn(`[WebPush] Push delivery failed (${err.statusCode || err.message}) for user ${userId}`);

      // 404 Not Found or 410 Gone means the subscription has expired or user revoked permission
      if (err.statusCode === 404 || err.statusCode === 410) {
        console.log(`[WebPush] Removing expired/unsubscribed endpoint: ${sub.endpoint.slice(0, 40)}...`);
        removePushSubscription(userId, sub.endpoint).catch(() => {});
      }
    }
  }

  return { sentCount, failedCount };
}

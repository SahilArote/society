"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVapidPublicKey = getVapidPublicKey;
exports.saveFcmToken = saveFcmToken;
exports.removeFcmToken = removeFcmToken;
exports.savePushSubscription = savePushSubscription;
exports.removePushSubscription = removePushSubscription;
exports.sendPushToUser = sendPushToUser;
const web_push_1 = __importDefault(require("web-push"));
const app_1 = require("firebase-admin/app");
const messaging_1 = require("firebase-admin/messaging");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const mysql_1 = require("../database/mysql");
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ||
    'BHf6Vh5V0gvg0zqlvik142bjPQ8RK7ebNEAYhaHDXUQE0FElv7j9gRPsMvRr4aPnN-kXXHg2UVRqMZ7W8rXmc5Q';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'BAxuAJvIkK9jXtmsGvqOdNUf9TEU43dF5byhMSn97UE';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@greengate.in';
// Configure Web Push with VAPID credentials (for Web Browser PWAs)
web_push_1.default.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
// In-memory subscription cache for fast retrieval & offline fallback
const memorySubscriptions = new Map();
const memoryFcmTokens = new Map();
// -------------------------------------------------------------
// Firebase Cloud Messaging (FCM) Initialization
// -------------------------------------------------------------
let firebaseInitialized = false;
function initFirebaseAdmin() {
    if (firebaseInitialized || (0, app_1.getApps)().length > 0) {
        firebaseInitialized = true;
        return;
    }
    try {
        const credPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
            path_1.default.resolve(process.cwd(), 'firebase-service-account.json');
        if (fs_1.default.existsSync(credPath)) {
            const serviceAccount = JSON.parse(fs_1.default.readFileSync(credPath, 'utf8'));
            (0, app_1.initializeApp)({
                credential: (0, app_1.cert)(serviceAccount),
            });
            firebaseInitialized = true;
            console.log(`[FCM] Firebase Admin SDK initialized successfully (Project: ${serviceAccount.project_id})`);
        }
        else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            (0, app_1.initializeApp)({
                credential: (0, app_1.cert)(serviceAccount),
            });
            firebaseInitialized = true;
            console.log('[FCM] Firebase Admin SDK initialized from env JSON.');
        }
        else {
            console.warn('[FCM] Notice: firebase-service-account.json not found. FCM push notifications disabled until provided.');
        }
    }
    catch (err) {
        console.warn('[FCM] Failed to initialize Firebase Admin SDK:', err.message);
    }
}
initFirebaseAdmin();
/**
 * Ensure notification tables exist in MySQL
 */
async function ensureTables() {
    try {
        const pool = await (0, mysql_1.getMysqlPool)();
        if (!pool)
            return;
        // WebPush Subscriptions Table
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
        // FCM Device Tokens Table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS fcm_tokens (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        token VARCHAR(512) NOT NULL UNIQUE,
        device_type VARCHAR(32) DEFAULT 'android',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_fcm_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    }
    catch (err) {
        console.warn('[Push] Notice: tables check:', err.message);
    }
}
// Run table creation on startup
ensureTables();
function getVapidPublicKey() {
    return VAPID_PUBLIC_KEY;
}
/**
 * Register or update an FCM Token for a mobile resident device
 */
async function saveFcmToken(userId, token, deviceType = 'android') {
    if (!token || !userId)
        return;
    if (!memoryFcmTokens.has(userId)) {
        memoryFcmTokens.set(userId, new Set());
    }
    memoryFcmTokens.get(userId).add(token);
    try {
        const pool = await (0, mysql_1.getMysqlPool)();
        if (pool) {
            await ensureTables();
            await pool.query(`INSERT INTO fcm_tokens (id, user_id, token, device_type)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), updated_at = CURRENT_TIMESTAMP`, [`fcm_${(0, uuid_1.v4)().slice(0, 12)}`, userId, token.trim(), deviceType]);
            console.log(`[FCM] Successfully registered mobile FCM token for user ${userId}`);
        }
    }
    catch (err) {
        console.warn(`[FCM] Error persisting FCM token in MySQL (${err.message}). Using memory cache.`);
    }
}
/**
 * Remove an FCM Token (e.g. on logout)
 */
async function removeFcmToken(userId, token) {
    const tokens = memoryFcmTokens.get(userId);
    if (tokens) {
        tokens.delete(token);
    }
    try {
        const pool = await (0, mysql_1.getMysqlPool)();
        if (pool) {
            await pool.query('DELETE FROM fcm_tokens WHERE token = ?', [token.trim()]);
            console.log(`[FCM] Removed FCM token for user ${userId}`);
        }
    }
    catch (err) {
        console.warn('[FCM] Error removing token from MySQL:', err.message);
    }
}
/**
 * Save or update a Push Subscription for a user (WebPush)
 */
async function savePushSubscription(userId, sub) {
    if (!sub || !sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
        throw new Error('Invalid PushSubscription payload');
    }
    // 1. Cache in memory
    for (const [uid, subs] of memorySubscriptions.entries()) {
        for (const s of subs) {
            if (s.endpoint === sub.endpoint) {
                subs.delete(s);
            }
        }
    }
    if (!memorySubscriptions.has(userId)) {
        memorySubscriptions.set(userId, new Set());
    }
    memorySubscriptions.get(userId).add(sub);
    // 2. Persist in MySQL
    try {
        const pool = await (0, mysql_1.getMysqlPool)();
        if (pool) {
            await ensureTables();
            await pool.query('DELETE FROM push_subscriptions WHERE endpoint = ?', [sub.endpoint]);
            await pool.query('INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?, ?)', [`sub_${(0, uuid_1.v4)().slice(0, 12)}`, userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth]);
            console.log(`[WebPush] Successfully registered push subscription for user ${userId}`);
        }
    }
    catch (err) {
        console.warn(`[WebPush] Could not persist push subscription in MySQL (${err.message}). Using memory cache.`);
    }
}
/**
 * Remove a Push Subscription (WebPush)
 */
async function removePushSubscription(userId, endpoint) {
    const userSubs = memorySubscriptions.get(userId);
    if (userSubs) {
        for (const s of userSubs) {
            if (s.endpoint === endpoint) {
                userSubs.delete(s);
            }
        }
    }
    try {
        const pool = await (0, mysql_1.getMysqlPool)();
        if (pool) {
            await pool.query('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?', [
                userId,
                endpoint,
            ]);
        }
    }
    catch (err) {
        console.warn('[WebPush] Error removing subscription from MySQL:', err.message);
    }
}
/**
 * Send Push notification to a specific user's registered devices (Both FCM Mobile & WebPush)
 */
async function sendPushToUser(userId, payload) {
    let sentCount = 0;
    let failedCount = 0;
    // -----------------------------------------------------------------
    // 1. Send via Firebase Cloud Messaging (FCM) to Android Mobile Devices
    // -----------------------------------------------------------------
    if (firebaseInitialized) {
        try {
            const pool = await (0, mysql_1.getMysqlPool)();
            let fcmTokens = [];
            if (pool) {
                const [rows] = await pool.query('SELECT token FROM fcm_tokens WHERE user_id = ?', [userId]);
                if (rows && rows.length > 0) {
                    fcmTokens = rows.map((r) => r.token);
                }
            }
            // Merge with memory cache
            const cached = memoryFcmTokens.get(userId);
            if (cached) {
                for (const t of cached) {
                    if (!fcmTokens.includes(t)) {
                        fcmTokens.push(t);
                    }
                }
            }
            if (fcmTokens.length > 0) {
                const stringData = {
                    title: payload.title,
                    body: payload.body,
                    tag: payload.tag || 'visitor_alert',
                    click_action: 'FLUTTER_NOTIFICATION_CLICK',
                };
                if (payload.data) {
                    for (const [k, v] of Object.entries(payload.data)) {
                        if (v !== undefined && v !== null) {
                            stringData[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
                        }
                    }
                }
                const response = await (0, messaging_1.getMessaging)().sendEachForMulticast({
                    tokens: fcmTokens,
                    notification: {
                        title: payload.title,
                        body: payload.body,
                    },
                    data: stringData,
                    android: {
                        priority: 'high',
                        notification: {
                            channelId: 'nexgate_visitor_alerts',
                            priority: 'max',
                            defaultSound: true,
                            defaultVibrateTimings: true,
                            visibility: 'public',
                            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                        },
                    },
                });
                console.log(`[FCM] Dispatched to ${response.successCount}/${fcmTokens.length} devices for user ${userId}`);
                sentCount += response.successCount;
                failedCount += response.failureCount;
                // Clean up uninstalled or invalid tokens
                if (response.failureCount > 0) {
                    response.responses.forEach((resp, idx) => {
                        if (!resp.success && resp.error) {
                            const code = resp.error.code;
                            if (code === 'messaging/invalid-registration-token' ||
                                code === 'messaging/registration-token-not-registered') {
                                const badToken = fcmTokens[idx];
                                pool?.query('DELETE FROM fcm_tokens WHERE token = ?', [badToken]).catch(() => { });
                            }
                        }
                    });
                }
            }
        }
        catch (fcmErr) {
            console.warn(`[FCM] Error dispatching FCM push to user ${userId}:`, fcmErr.message);
        }
    }
    // -----------------------------------------------------------------
    // 2. Send via WebPush to Desktop/Mobile Browser PWAs
    // -----------------------------------------------------------------
    let subscriptions = [];
    try {
        const pool = await (0, mysql_1.getMysqlPool)();
        if (pool) {
            const [rows] = await pool.query('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?', [userId]);
            if (rows && rows.length > 0) {
                subscriptions = rows.map((r) => ({
                    endpoint: r.endpoint,
                    keys: {
                        p256dh: r.p256dh,
                        auth: r.auth,
                    },
                }));
            }
        }
    }
    catch (err) {
        console.warn(`[WebPush] Error querying subscriptions from MySQL: ${err.message}`);
    }
    const cachedSubs = memorySubscriptions.get(userId);
    if (cachedSubs) {
        for (const c of cachedSubs) {
            if (!subscriptions.some((s) => s.endpoint === c.endpoint)) {
                subscriptions.push(c);
            }
        }
    }
    if (subscriptions.length > 0) {
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
        for (const sub of subscriptions) {
            try {
                await web_push_1.default.sendNotification(sub, notificationPayload, {
                    TTL: 60,
                    urgency: 'high',
                    topic: 'visitor-alert',
                    headers: {
                        Urgency: 'high',
                    },
                });
                sentCount++;
            }
            catch (err) {
                failedCount++;
                if (err.statusCode === 404 || err.statusCode === 410) {
                    removePushSubscription(userId, sub.endpoint).catch(() => { });
                }
            }
        }
    }
    return { sentCount, failedCount };
}

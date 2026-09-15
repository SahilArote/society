"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = require("../database/db");
const pushNotificationService_1 = require("../services/pushNotificationService");
const router = (0, express_1.Router)();
// =============================================================
// GET /api/notifications
// Fetch in-app notifications for authenticated user
// =============================================================
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await (0, db_1.findNotificationsByRecipient)(userId);
        const formatted = notifications.map((n) => ({
            id: n.id,
            recipientId: n.recipientId,
            type: n.type,
            title: n.title,
            message: n.message,
            body: n.message,
            relatedEntityId: n.relatedEntityId,
            read: n.read,
            timestamp: n.createdAt,
            createdAt: n.createdAt,
        }));
        return res.json({
            success: true,
            data: formatted,
        });
    }
    catch (err) {
        console.error('Error fetching notifications:', err);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to retrieve notifications' },
        });
    }
});
// =============================================================
// GET /api/notifications/vapid-public-key
// Returns public key for browser PushManager subscription
// =============================================================
router.get('/vapid-public-key', (_req, res) => {
    return res.json({
        success: true,
        data: {
            publicKey: (0, pushNotificationService_1.getVapidPublicKey)(),
        },
    });
});
// =============================================================
// POST /api/notifications/subscribe
// Register a browser Web Push subscription for authenticated resident
// =============================================================
router.post('/subscribe', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const subscription = req.body.subscription || req.body;
        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_SUBSCRIPTION', message: 'Valid PushSubscription object is required' },
            });
        }
        await (0, pushNotificationService_1.savePushSubscription)(userId, subscription);
        return res.json({
            success: true,
            message: 'Push notification subscription registered successfully',
        });
    }
    catch (err) {
        console.error('Error saving push subscription:', err);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message || 'Failed to save push subscription' },
        });
    }
});
// =============================================================
// POST /api/notifications/unsubscribe
// Unregister browser Web Push subscription
// =============================================================
router.post('/unsubscribe', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { endpoint } = req.body;
        if (endpoint) {
            await (0, pushNotificationService_1.removePushSubscription)(userId, endpoint);
        }
        return res.json({
            success: true,
            message: 'Push subscription removed',
        });
    }
    catch (err) {
        console.error('Error removing push subscription:', err);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to remove push subscription' },
        });
    }
});
// =============================================================
// POST /api/notifications/test-push
// Send a test push notification to verify phone alerts and chimes
// =============================================================
router.post('/test-push', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const result = await (0, pushNotificationService_1.sendPushToUser)(user.id, {
            title: '🔔 NexGate Gate Alert Test',
            body: `Doorbell test for ${user.name}. Your device is registered to receive instant visitor alerts!`,
            icon: '/icons/icon-192.png',
            badge: '/icons/favicon-32.png',
            tag: `test-push-${Date.now()}`,
            data: { url: '/home', test: true },
            actions: [
                { action: 'open', title: 'Open NexGate' },
                { action: 'dismiss', title: 'Dismiss' },
            ],
        });
        return res.json({
            success: true,
            message: result.sentCount > 0
                ? `Push notification sent to ${result.sentCount} device(s)!`
                : 'No active device push subscriptions found. Please enable notifications in your browser first.',
            data: result,
        });
    }
    catch (err) {
        console.error('Error sending test push:', err);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message || 'Failed to send test push' },
        });
    }
});
exports.default = router;

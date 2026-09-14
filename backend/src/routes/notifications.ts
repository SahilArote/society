import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { findNotificationsByRecipient } from '../database/db';
import {
  getVapidPublicKey,
  savePushSubscription,
  removePushSubscription,
  sendPushToUser,
} from '../services/pushNotificationService';

const router = Router();

// =============================================================
// GET /api/notifications
// Fetch in-app notifications for authenticated user
// =============================================================
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const notifications = await findNotificationsByRecipient(userId);

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
  } catch (err: any) {
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
router.get('/vapid-public-key', (_req, res: Response) => {
  return res.json({
    success: true,
    data: {
      publicKey: getVapidPublicKey(),
    },
  });
});

// =============================================================
// POST /api/notifications/subscribe
// Register a browser Web Push subscription for authenticated resident
// =============================================================
router.post('/subscribe', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const subscription = req.body.subscription || req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_SUBSCRIPTION', message: 'Valid PushSubscription object is required' },
      });
    }

    await savePushSubscription(userId, subscription);

    return res.json({
      success: true,
      message: 'Push notification subscription registered successfully',
    });
  } catch (err: any) {
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
router.post('/unsubscribe', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { endpoint } = req.body;

    if (endpoint) {
      await removePushSubscription(userId, endpoint);
    }

    return res.json({
      success: true,
      message: 'Push subscription removed',
    });
  } catch (err: any) {
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
router.post('/test-push', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const result = await sendPushToUser(user.id, {
      title: '🔔 GreenGate Gate Alert Test',
      body: `Doorbell test for ${user.name}. Your device is registered to receive instant visitor alerts!`,
      icon: '/brand/society-logo.png',
      badge: '/icons/favicon-32.png',
      tag: `test-push-${Date.now()}`,
      data: { url: '/', test: true },
      actions: [
        { action: 'open', title: 'Open GreenGate' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    });

    return res.json({
      success: true,
      message:
        result.sentCount > 0
          ? `Push notification sent to ${result.sentCount} device(s)!`
          : 'No active device push subscriptions found. Please enable notifications in your browser first.',
      data: result,
    });
  } catch (err: any) {
    console.error('Error sending test push:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to send test push' },
    });
  }
});

export default router;

import { Router, Response } from 'express';
import { getDb, saveDb } from '../database/db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/notifications
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const userId = req.user!.id;

  const notifications = db.notifications
    .filter((n) => n.recipientId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({
    success: true,
    data: notifications,
  });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const notif = db.notifications.find((n) => n.id === id);

  if (notif) {
    notif.read = true;
    saveDb();
  }

  return res.json({
    success: true,
    data: { id, read: true },
  });
});

export default router;

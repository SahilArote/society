import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, saveDb } from '../database/db';
import { authenticateToken, AuthenticatedRequest, authorizeRoles } from '../middleware/auth';

const router = Router();

// GET /api/announcements
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const societyId = req.user?.societyId || 'soc_greengate';

  const announcements = db.announcements
    .filter((a) => a.societyId === societyId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({
    success: true,
    data: announcements,
  });
});

// POST /api/announcements
router.post('/', authenticateToken, authorizeRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { title, body, priority, target } = req.body;

  if (!title || !body) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Title and content body are required' },
    });
  }

  const db = getDb();
  const societyId = req.user?.societyId || 'soc_greengate';
  const now = new Date().toISOString();

  const newAnnouncement = {
    id: `ann_${uuidv4().slice(0, 8)}`,
    societyId,
    title: title.trim(),
    body: body.trim(),
    priority: priority || 'normal',
    target: target || 'all',
    createdBy: req.user!.id,
    createdAt: now,
  };

  db.announcements.unshift(newAnnouncement);
  saveDb();

  return res.status(201).json({
    success: true,
    data: newAnnouncement,
  });
});

export default router;

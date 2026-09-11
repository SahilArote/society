import { Router, Response } from 'express';
import { getDb } from '../database/db';
import { authenticateToken, AuthenticatedRequest, authorizeRoles } from '../middleware/auth';

const router = Router();

// GET /api/admin/activity
// Live activity feed for admin (METADATA ONLY, NO PHOTO)
router.get('/activity', authenticateToken, authorizeRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const societyId = req.user?.societyId || 'soc_greengate';

  const requests = db.visitorRequests
    .filter((r) => r.societyId === societyId)
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
    .slice(0, 20);

  const activity = requests.map((reqItem) => {
    const visitor = db.visitors.find((v) => v.id === reqItem.visitorId);
    const flat = db.flats.find((f) => f.id === reqItem.flatId);
    const resident = db.users.find((u) => u.id === reqItem.residentId);
    const gate = db.gates.find((g) => g.id === reqItem.gateId);

    return {
      id: reqItem.id,
      visitorName: visitor?.name || 'Visitor',
      purpose: visitor?.purpose || 'Personal',
      visitorType: visitor?.visitorType || 'guest',
      flatNumber: flat?.flatNumber || 'A-402',
      residentName: resident?.name || 'Sahil Arote',
      gateName: gate?.name || 'Main Gate',
      status: reqItem.status,
      requestedAt: reqItem.requestedAt,
      respondedAt: reqItem.respondedAt,
      responseBy: reqItem.responseBy,
      rejectionReason: reqItem.rejectionReason,
      // NOTE: Photo intentionally excluded per requirements 18 & 40
    };
  });

  return res.json({
    success: true,
    data: activity,
  });
});

// GET /api/admin/stats
router.get('/stats', authenticateToken, authorizeRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const societyId = req.user?.societyId || 'soc_greengate';

  const requests = db.visitorRequests.filter((r) => r.societyId === societyId);
  const flats = db.flats.filter((f) => f.societyId === societyId);
  const residents = db.users.filter((u) => u.societyId === societyId && u.role === 'RESIDENT');

  return res.json({
    success: true,
    data: {
      totalFlats: flats.length,
      occupiedFlats: flats.length,
      vacantFlats: 0,
      totalResidents: residents.length,
      visitorsToday: requests.length,
      pendingApprovals: requests.filter((r) => r.status === 'PENDING').length,
      approvedCount: requests.filter((r) => r.status === 'APPROVED').length,
      rejectedCount: requests.filter((r) => r.status === 'REJECTED').length,
    },
  });
});

export default router;

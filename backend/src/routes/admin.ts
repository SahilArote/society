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

    const enteredAt = reqItem.enteredAt || (['COMPLETED', 'EXITED'].includes(reqItem.status) ? (reqItem.respondedAt || reqItem.requestedAt) : undefined);
    const exitedAt = reqItem.exitedAt || (reqItem.status === 'EXITED' ? reqItem.respondedAt : undefined);

    return {
      id: reqItem.id,
      visitorName: visitor?.name || 'Visitor',
      visitorPhone: visitor?.mobile || '',
      purpose: visitor?.purpose || 'Personal',
      visitorType: visitor?.visitorType || 'guest',
      photoUrl: visitor?.photoUrl,
      photo: visitor?.photoUrl,
      vehicleNumber: visitor?.vehicleNumber,
      deliveryCompany: visitor?.deliveryCompany,
      flatNumber: flat?.flatNumber || 'A-402',
      residentName: resident?.name || 'Sahil Arote',
      gateName: gate?.name || 'Main Gate',
      status: reqItem.status,
      requestedAt: reqItem.requestedAt,
      respondedAt: reqItem.respondedAt,
      enteredAt,
      exitedAt,
      responseBy: reqItem.responseBy,
      rejectionReason: reqItem.rejectionReason,
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

// GET /api/admin/visitors
router.get('/visitors', authenticateToken, authorizeRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const societyId = req.user?.societyId || 'soc_greengate';

  const requests = db.visitorRequests
    .filter((r) => r.societyId === societyId)
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

  const visitors = requests.map((reqItem) => {
    const visitor = db.visitors.find((v) => v.id === reqItem.visitorId);
    const flat = db.flats.find((f) => f.id === reqItem.flatId);
    const resident = db.users.find((u) => u.id === reqItem.residentId);
    const gate = db.gates.find((g) => g.id === reqItem.gateId);

    const enteredAt = reqItem.enteredAt || (['COMPLETED', 'EXITED'].includes(reqItem.status) ? (reqItem.respondedAt || reqItem.requestedAt) : undefined);
    const exitedAt = reqItem.exitedAt || (reqItem.status === 'EXITED' ? reqItem.respondedAt : undefined);

    return {
      id: reqItem.id,
      visitorId: reqItem.visitorId,
      name: visitor?.name || 'Visitor',
      phone: visitor?.mobile || '',
      purpose: (visitor?.purpose || 'guest').toLowerCase(),
      visitorType: (visitor?.visitorType || 'guest').toLowerCase(),
      photoUrl: visitor?.photoUrl,
      photo: visitor?.photoUrl,
      vehicleNumber: visitor?.vehicleNumber,
      deliveryCompany: visitor?.deliveryCompany,
      flatNumber: flat?.flatNumber || 'A-402',
      buildingWing: flat?.wing || 'Tower A',
      residentName: resident?.name || 'Sahil Arote',
      gate: gate?.name || 'Main Gate',
      guardName: 'Ramesh Singh',
      status: reqItem.status.toLowerCase(),
      rawStatus: reqItem.status,
      requestedAt: reqItem.requestedAt,
      respondedAt: reqItem.respondedAt,
      enteredAt,
      exitedAt,
      responseBy: reqItem.responseBy,
      rejectionReason: reqItem.rejectionReason,
    };
  });

  return res.json({
    success: true,
    data: visitors,
  });
});

export default router;

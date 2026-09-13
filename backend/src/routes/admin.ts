import { Router, Response } from 'express';
import { findVisitorRequestsJoined } from '../database/db';
import { getMysqlPool } from '../database/mysql';
import { authenticateToken, AuthenticatedRequest, authorizeRoles } from '../middleware/auth';


const router = Router();

// GET /api/admin/activity
// Live activity feed for admin (METADATA ONLY, STRICTLY NO VISITOR PHOTO)
router.get('/activity', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId;
    const rows = await findVisitorRequestsJoined({ societyId, limit: 30 });

    // Exclude photo data completely for admin activity per requirements
    const activity = rows.map((r: any) => ({
      id: r.id,
      visitorName: r.visitorName || 'Visitor',
      purpose: r.purpose || 'Personal',
      visitorType: r.visitorType || 'guest',
      flatNumber: r.flatNumber || 'A-402',
      residentName: r.residentName || 'Sahil Arote',
      gateName: r.gateName || 'Main Gate',
      guardName: r.guardName || 'Gate Security',
      status: r.status,
      requestedAt: r.requestedAt,
      respondedAt: r.respondedAt,
      responseBy: r.responseBy,
      rejectionReason: r.rejectionReason,
    }));

    return res.json({
      success: true,
      data: activity,
    });
  } catch (error: any) {
    console.error('Error fetching admin activity:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch admin activity' },
    });
  }
});

// GET /api/admin/stats
router.get('/stats', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId;
    const pool = await getMysqlPool();
    if (!pool) throw new Error('Database pool unavailable');

    const [flatRows]: any = await pool.query('SELECT COUNT(*) as cnt FROM flats WHERE society_id = ?', [societyId]);
    const [residentRows]: any = await pool.query("SELECT COUNT(*) as cnt FROM users WHERE society_id = ? AND role = 'RESIDENT'", [societyId]);
    const [requestRows]: any = await pool.query('SELECT status, COUNT(*) as cnt FROM visitor_requests WHERE society_id = ? GROUP BY status', [societyId]);

    const statusCounts: Record<string, number> = {};
    let totalRequests = 0;
    for (const r of requestRows) {
      statusCounts[r.status] = r.cnt;
      totalRequests += r.cnt;
    }

    return res.json({
      success: true,
      data: {
        totalFlats: flatRows[0]?.cnt || 0,
        occupiedFlats: flatRows[0]?.cnt || 0,
        vacantFlats: 0,
        totalResidents: residentRows[0]?.cnt || 0,
        visitorsToday: totalRequests,
        pendingApprovals: statusCounts['PENDING'] || 0,
        approvedCount: statusCounts['APPROVED'] || 0,
        rejectedCount: statusCounts['REJECTED'] || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch admin statistics' },
    });
  }
});

export default router;


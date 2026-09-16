import { Router, Response } from 'express';
import {
  findVisitorRequestsJoined,
  findResidentRegistrations,
  approveResidentRegistration,
  rejectResidentRegistration,
  findResidentRegistrationById,
  createNotification,
  findFlatsWithResidents,
  createFlatRecord,
  findAdminVisitorLogs,
  updateVisitorStatusByAdmin,
  findGatesBySociety,
  toggleGateStatus,
  findGuardsWithDetails,
  createGuardRecord,
} from '../database/db';
import { getMysqlPool } from '../database/mysql';
import { authenticateToken, AuthenticatedRequest, authorizeRoles } from '../middleware/auth';
import { emitRegistrationUpdated } from '../services/socketService';

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

    const [flatRows]: any = await pool.query(
      'SELECT COUNT(*) as total, SUM(CASE WHEN resident_id IS NOT NULL THEN 1 ELSE 0 END) as occupied FROM flats WHERE society_id = ?',
      [societyId]
    );
    const [residentRows]: any = await pool.query(
      "SELECT COUNT(*) as cnt FROM users WHERE society_id = ? AND role = 'RESIDENT'",
      [societyId]
    );
    const [requestRows]: any = await pool.query(
      'SELECT status, COUNT(*) as cnt FROM visitor_requests WHERE society_id = ? GROUP BY status',
      [societyId]
    );
    const [todayReqRows]: any = await pool.query(
      'SELECT COUNT(*) as cnt FROM visitor_requests WHERE society_id = ? AND DATE(requested_at) = CURRENT_DATE()',
      [societyId]
    );
    const [pendingRegRows]: any = await pool.query(
      "SELECT COUNT(*) as cnt FROM resident_registrations WHERE society_id = ? AND status = 'PENDING'",
      [societyId]
    );
    const [gateRows]: any = await pool.query(
      "SELECT COUNT(*) as total, SUM(CASE WHEN UPPER(status) = 'OPERATIONAL' THEN 1 ELSE 0 END) as operational FROM gates WHERE society_id = ?",
      [societyId]
    );
    const [guardRows]: any = await pool.query(
      "SELECT COUNT(*) as total, SUM(CASE WHEN UPPER(g.status) = 'ON_DUTY' THEN 1 ELSE 0 END) as active FROM guards g JOIN users u ON g.user_id = u.id WHERE u.society_id = ?",
      [societyId]
    );

    const statusCounts: Record<string, number> = {};
    for (const r of requestRows) {
      statusCounts[r.status] = Number(r.cnt || 0);
    }

    // 7-day visitor traffic trend
    let visitorTrend: any[] = [];
    try {
      const [trendRows]: any = await pool.query(`
        SELECT 
          DATE_FORMAT(vr.requested_at, '%a') as day_name,
          DATE(vr.requested_at) as req_date,
          SUM(CASE WHEN LOWER(v.visitor_type) = 'guest' OR LOWER(v.purpose) LIKE '%guest%' THEN 1 ELSE 0 END) as guests,
          SUM(CASE WHEN LOWER(v.visitor_type) = 'delivery' OR LOWER(v.purpose) LIKE '%delivery%' THEN 1 ELSE 0 END) as deliveries,
          SUM(CASE WHEN LOWER(v.visitor_type) = 'cab' OR LOWER(v.purpose) LIKE '%cab%' THEN 1 ELSE 0 END) as cabs,
          SUM(CASE WHEN LOWER(v.visitor_type) = 'maintenance' OR LOWER(v.purpose) LIKE '%maintenance%' THEN 1 ELSE 0 END) as services,
          COUNT(*) as total
        FROM visitor_requests vr
        JOIN visitors v ON vr.visitor_id = v.id
        WHERE vr.society_id = ? 
          AND vr.requested_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 DAY)
        GROUP BY DATE(vr.requested_at), DATE_FORMAT(vr.requested_at, '%a')
        ORDER BY req_date ASC
      `, [societyId]);

      if (trendRows && trendRows.length > 0) {
        visitorTrend = trendRows.map((tr: any) => ({
          day: tr.day_name,
          guests: Number(tr.guests || 0),
          deliveries: Number(tr.deliveries || 0),
          cabs: Number(tr.cabs || 0),
          services: Number(tr.services || 0),
          total: Number(tr.total || 0),
        }));
      }
    } catch (trendErr) {
      console.warn('[ADMIN_STATS] Error querying trend, fallback:', trendErr);
    }

    if (visitorTrend.length === 0) {
      visitorTrend = [
        { day: 'Mon', guests: 2, deliveries: 3, cabs: 1, services: 0, total: 6 },
        { day: 'Tue', guests: 3, deliveries: 4, cabs: 2, services: 1, total: 10 },
        { day: 'Wed', guests: 4, deliveries: 5, cabs: 2, services: 1, total: 12 },
        { day: 'Thu', guests: 3, deliveries: 4, cabs: 1, services: 0, total: 8 },
        { day: 'Fri', guests: 5, deliveries: 6, cabs: 3, services: 2, total: 16 },
        { day: 'Sat', guests: 6, deliveries: 5, cabs: 4, services: 2, total: 17 },
        { day: 'Sun', guests: 7, deliveries: 4, cabs: 3, services: 1, total: 15 },
      ];
    }

    const totalFlats = Number(flatRows[0]?.total || 0);
    const occupiedFlats = Number(flatRows[0]?.occupied || 0);
    const vacantFlats = Math.max(0, totalFlats - occupiedFlats);
    const occupancyRate = totalFlats > 0 ? Math.round((occupiedFlats / totalFlats) * 100) : 0;

    return res.json({
      success: true,
      data: {
        totalFlats,
        occupiedFlats,
        vacantFlats,
        occupancyRate,
        totalResidents: Number(residentRows[0]?.cnt || 0),
        visitorsToday: Number(todayReqRows[0]?.cnt || 0),
        pendingApprovals: (statusCounts['PENDING'] || 0) + (statusCounts['pending'] || 0),
        approvedCount: (statusCounts['APPROVED'] || 0) + (statusCounts['INSIDE'] || 0) + (statusCounts['EXITED'] || 0),
        rejectedCount: (statusCounts['REJECTED'] || 0) + (statusCounts['denied'] || 0),
        pendingRegistrations: Number(pendingRegRows[0]?.cnt || 0),
        operationalGates: Number(gateRows[0]?.operational || 0),
        totalGates: Number(gateRows[0]?.total || 0),
        activeGuards: Number(guardRows[0]?.active || 0),
        totalGuards: Number(guardRows[0]?.total || 0),
        visitorTrend,
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

// =============================================================
// RESIDENT REGISTRATION MANAGEMENT (ADMIN)
// =============================================================

// GET /api/admin/registrations
router.get('/registrations', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId;
    const status = (req.query.status as string) || 'ALL';

    const registrations = await findResidentRegistrations({
      societyId,
      status: status.toUpperCase(),
      limit: 100,
    });

    return res.json({
      success: true,
      data: registrations,
    });
  } catch (error: any) {
    console.error('Error fetching registrations:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch resident registration requests' },
    });
  }
});

// POST /api/admin/registrations/:id/approve
router.post('/registrations/:id/approve', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId;
    const adminId = req.user!.id;
    const { id } = req.params;

    const existing = await findResidentRegistrationById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Registration request not found' },
      });
    }

    if (existing.societyId !== societyId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot approve registrations for another society' },
      });
    }

    const result = await approveResidentRegistration(id, adminId);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'APPROVAL_FAILED', message: result.error || 'Failed to approve registration' },
      });
    }

    // 1. Emit Realtime Socket.IO Event to Resident & Society & Admin rooms
    emitRegistrationUpdated(societyId, id, existing.mobile, 'APPROVED');

    // 2. Notify resident if user was created
    if (result.user) {
      createNotification({
        id: `notif_${Date.now().toString(36)}`,
        recipientId: result.user.id,
        type: 'REGISTRATION_APPROVED',
        title: 'Registration Approved! 🎉',
        message: `Your resident account for flat ${existing.flatNumber} has been approved. Welcome to GreenGate!`,
      }).catch((e) => console.warn('Notification creation error:', e));
    }

    return res.json({
      success: true,
      message: `Registration for flat ${existing.flatNumber} approved successfully. Resident account activated.`,
      data: {
        id,
        status: 'APPROVED',
        user: result.user,
      },
    });
  } catch (error: any) {
    console.error('Error approving registration:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Server error while approving registration' },
    });
  }
});

// POST /api/admin/registrations/:id/reject
router.post('/registrations/:id/reject', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId;
    const adminId = req.user!.id;
    const { id } = req.params;
    const { reason } = req.body;

    const existing = await findResidentRegistrationById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Registration request not found' },
      });
    }

    if (existing.societyId !== societyId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot reject registrations for another society' },
      });
    }

    const rejectionReason = reason?.trim() || 'Application rejected by society administrator';
    const result = await rejectResidentRegistration(id, adminId, rejectionReason);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'REJECTION_FAILED', message: result.error || 'Failed to reject registration' },
      });
    }

    // Emit Realtime Socket.IO Event
    emitRegistrationUpdated(societyId, id, existing.mobile, 'REJECTED', rejectionReason);

    return res.json({
      success: true,
      message: `Registration for flat ${existing.flatNumber} rejected.`,
      data: {
        id,
        status: 'REJECTED',
        rejectionReason,
      },
    });
  } catch (error: any) {
    console.error('Error rejecting registration:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Server error while rejecting registration' },
    });
  }
});

// =============================================================
// FLATS & DIRECTORY (ADMIN)
// =============================================================

// GET /api/admin/flats
router.get('/flats', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId;
    const flats = await findFlatsWithResidents(societyId);
    return res.json({
      success: true,
      data: flats,
    });
  } catch (error: any) {
    console.error('Error fetching admin flats:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch flats directory' },
    });
  }
});

// POST /api/admin/flats
router.post('/flats', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId;
    const { number, wing, floor, ownerName, ownerPhone } = req.body;

    if (!number || !wing) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Flat number and wing are required' },
      });
    }

    const flat = await createFlatRecord({
      societyId,
      flatNumber: number,
      wing,
      floor: floor ? Number(floor) : undefined,
      ownerName,
      ownerPhone,
    });

    return res.status(201).json({
      success: true,
      message: `Flat ${flat.number} created successfully`,
      data: flat,
    });
  } catch (error: any) {
    console.error('Error creating flat:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Failed to create flat' },
    });
  }
});

// =============================================================
// VISITOR LOGS & REALTIME ACCESS (ADMIN)
// =============================================================

// GET /api/admin/visitors
router.get('/visitors', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId;
    const { tab, gate, search, limit } = req.query;

    const visitors = await findAdminVisitorLogs(societyId, {
      tab: tab as string,
      gate: gate as string,
      search: search as string,
      limit: limit ? Number(limit) : undefined,
    });

    return res.json({
      success: true,
      data: visitors,
    });
  } catch (error: any) {
    console.error('Error fetching admin visitors:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch visitor logs' },
    });
  }
});

// POST /api/admin/visitors/:id/approve
router.post('/visitors/:id/approve', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const ok = await updateVisitorStatusByAdmin(id, 'approve');
    if (!ok) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Visitor request not found' } });
    }
    return res.json({ success: true, message: 'Visitor entry granted by administrator' });
  } catch (error: any) {
    console.error('Error approving visitor:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to approve visitor entry' } });
  }
});

// POST /api/admin/visitors/:id/deny
router.post('/visitors/:id/deny', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const ok = await updateVisitorStatusByAdmin(id, 'deny', reason);
    if (!ok) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Visitor request not found' } });
    }
    return res.json({ success: true, message: 'Visitor entry denied by administrator' });
  } catch (error: any) {
    console.error('Error denying visitor:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to deny visitor entry' } });
  }
});

// POST /api/admin/visitors/:id/exit
router.post('/visitors/:id/exit', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const ok = await updateVisitorStatusByAdmin(id, 'exit');
    if (!ok) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Visitor request not found' } });
    }
    return res.json({ success: true, message: 'Visitor marked as exited from premises' });
  } catch (error: any) {
    console.error('Error marking visitor exited:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to mark visitor exited' } });
  }
});

// =============================================================
// GATES & BARRIERS (ADMIN)
// =============================================================

// GET /api/admin/gates
router.get('/gates', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId;
    const gates = await findGatesBySociety(societyId);
    return res.json({
      success: true,
      data: gates,
    });
  } catch (error: any) {
    console.error('Error fetching gates:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch gates' },
    });
  }
});

// PATCH /api/admin/gates/:id/toggle
router.patch('/gates/:id/toggle', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const nextStatus = status ? String(status) : 'MAINTENANCE';
    await toggleGateStatus(id, nextStatus);
    return res.json({
      success: true,
      message: `Gate barrier updated to ${nextStatus}`,
      data: { id, status: nextStatus.toLowerCase() },
    });
  } catch (error: any) {
    console.error('Error toggling gate status:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update gate barrier' },
    });
  }
});

// =============================================================
// GUARDS & SHIFTS (ADMIN)
// =============================================================

// GET /api/admin/guards
router.get('/guards', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId;
    const guards = await findGuardsWithDetails(societyId);
    return res.json({
      success: true,
      data: guards,
    });
  } catch (error: any) {
    console.error('Error fetching guards:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch security guards' },
    });
  }
});

// POST /api/admin/guards
router.post('/guards', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId;
    const { name, phone, assignedGate, shift } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Guard name and phone number are required' },
      });
    }

    const guard = await createGuardRecord({
      societyId,
      name,
      mobile: phone,
      gateName: assignedGate,
      shift,
    });

    return res.status(201).json({
      success: true,
      message: `Guard ${guard.name} registered successfully`,
      data: guard,
    });
  } catch (error: any) {
    console.error('Error registering guard:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Failed to register guard' },
    });
  }
});

export default router;



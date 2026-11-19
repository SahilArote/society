import { Router, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
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
  updateGuardRecord,
  deleteGuardRecord,
  findSocietyById,
  updateSociety,
  deleteVisitorLogByAdmin,
  deleteFlatByAdmin,
  deleteResidentByAdmin,
} from '../database/db';
import { getMysqlPool } from '../database/mysql';
import { authenticateToken, AuthenticatedRequest, authorizeRoles } from '../middleware/auth';
import { emitRegistrationUpdated } from '../services/socketService';
import { computeSocietySubscriptionStatus } from '../utils/subscription';

const router = Router();

// GET /api/admin/activity
// Live activity feed for admin (METADATA ONLY, STRICTLY NO VISITOR PHOTO)
router.get('/activity', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId!;
    const rows = await findVisitorRequestsJoined({ societyId, limit: 30 });

    // Exclude photo data completely for admin activity per requirements
    const activity = rows.map((r: any) => ({
      id: r.id,
      visitorName: r.visitorName || 'Visitor',
      purpose: r.purpose || 'Personal',
      visitorType: r.visitorType || 'guest',
      flatNumber: r.flatNumber || '—',
      residentName: r.residentName || 'Resident',
      gateName: r.gateName || 'Gate',
      guardName: r.guardName || 'Security',
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
    const societyId = req.user!.societyId!;
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

    // 1. Today's visitor status breakdown
    let insideToday = 0;
    let exitedToday = 0;
    try {
      const [todayStatusRows]: any = await pool.query(
        'SELECT status, COUNT(*) as cnt FROM visitor_requests WHERE society_id = ? AND DATE(requested_at) = CURRENT_DATE() GROUP BY status',
        [societyId]
      );
      for (const ts of todayStatusRows) {
        const st = String(ts.status || '').toUpperCase();
        if (st === 'INSIDE') insideToday += Number(ts.cnt || 0);
        if (st === 'EXITED') exitedToday += Number(ts.cnt || 0);
      }
    } catch (todayErr) {
      console.warn('[ADMIN_STATS] Error querying todayStatus:', todayErr);
    }

    // 2. Flagged entries today (denied/rejected or flagged with note)
    let flaggedToday = 0;
    try {
      const [flaggedRows]: any = await pool.query(
        "SELECT COUNT(*) as cnt FROM visitor_requests WHERE society_id = ? AND DATE(requested_at) = CURRENT_DATE() AND (UPPER(status) IN ('REJECTED', 'DENIED') OR rejection_reason IS NOT NULL)",
        [societyId]
      );
      flaggedToday = Number(flaggedRows[0]?.cnt || 0);
    } catch (flagErr) {
      console.warn('[ADMIN_STATS] Error querying flaggedToday:', flagErr);
    }

    // 3. Average entry turnaround time (in minutes/seconds)
    let avgEntryTime = '—';
    try {
      const [avgTimeRows]: any = await pool.query(
        "SELECT AVG(TIMESTAMPDIFF(SECOND, requested_at, COALESCE(entry_time, responded_at))) as avg_sec FROM visitor_requests WHERE society_id = ? AND (entry_time IS NOT NULL OR responded_at IS NOT NULL) AND requested_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)",
        [societyId]
      );
      const avgSec = Number(avgTimeRows[0]?.avg_sec || 0);
      if (avgSec > 0) {
        if (avgSec < 60) {
          avgEntryTime = `${Math.round(avgSec)}s`;
        } else {
          avgEntryTime = `${(avgSec / 60).toFixed(1)} min`;
        }
      }
    } catch (avgErr) {
      console.warn('[ADMIN_STATS] Error querying avgEntryTime:', avgErr);
    }

    // 4. Family members count
    let totalFamily = 0;
    try {
      const [famRows]: any = await pool.query(
        'SELECT COUNT(*) as cnt FROM family_members WHERE society_id = ?',
        [societyId]
      );
      totalFamily = Number(famRows[0]?.cnt || 0);
    } catch (famErr) {
      console.warn('[ADMIN_STATS] Error querying family members:', famErr);
    }

    // 5. 7-day visitor traffic trend (real calendar dates with real counts, no fake static values)
    const trendMap: Record<string, { day: string; guests: number; deliveries: number; cabs: number; services: number; total: number }> = {};
    const visitorTrend: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const item = { day: dayName, guests: 0, deliveries: 0, cabs: 0, services: 0, total: 0 };
      trendMap[dateKey] = item;
      visitorTrend.push(item);
    }

    try {
      const [trendRows]: any = await pool.query(`
        SELECT 
          DATE_FORMAT(vr.requested_at, '%Y-%m-%d') as req_date,
          SUM(CASE WHEN LOWER(v.visitor_type) = 'guest' OR LOWER(v.purpose) LIKE '%guest%' THEN 1 ELSE 0 END) as guests,
          SUM(CASE WHEN LOWER(v.visitor_type) = 'delivery' OR LOWER(v.purpose) LIKE '%delivery%' THEN 1 ELSE 0 END) as deliveries,
          SUM(CASE WHEN LOWER(v.visitor_type) = 'cab' OR LOWER(v.purpose) LIKE '%cab%' THEN 1 ELSE 0 END) as cabs,
          SUM(CASE WHEN LOWER(v.visitor_type) = 'maintenance' OR LOWER(v.purpose) LIKE '%maintenance%' THEN 1 ELSE 0 END) as services,
          COUNT(*) as total
        FROM visitor_requests vr
        JOIN visitors v ON vr.visitor_id = v.id
        WHERE vr.society_id = ? 
          AND vr.requested_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 DAY)
        GROUP BY DATE_FORMAT(vr.requested_at, '%Y-%m-%d')
        ORDER BY req_date ASC
      `, [societyId]);

      if (trendRows && trendRows.length > 0) {
        for (const tr of trendRows) {
          const dateStr = String(tr.req_date || '').slice(0, 10);
          if (trendMap[dateStr]) {
            trendMap[dateStr].guests = Number(tr.guests || 0);
            trendMap[dateStr].deliveries = Number(tr.deliveries || 0);
            trendMap[dateStr].cabs = Number(tr.cabs || 0);
            trendMap[dateStr].services = Number(tr.services || 0);
            trendMap[dateStr].total = Number(tr.total || 0);
          }
        }
      }
    } catch (trendErr) {
      console.warn('[ADMIN_STATS] Error querying trend:', trendErr);
    }

    // 6. Monthly trend for past 6 months (dynamically aggregated)
    const monthlyTrendMap: Record<string, { month: string; total: number; approved: number; rejected: number }> = {};
    const monthlyTrend: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mName = d.toLocaleDateString('en-US', { month: 'short' });
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = { month: mName, total: 0, approved: 0, rejected: 0 };
      monthlyTrendMap[mKey] = entry;
      monthlyTrend.push(entry);
    }

    try {
      const [monthlyRows]: any = await pool.query(`
        SELECT 
          DATE_FORMAT(requested_at, '%Y-%m') as m_key,
          COUNT(*) as total,
          SUM(CASE WHEN UPPER(status) IN ('APPROVED', 'INSIDE', 'EXITED') THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN UPPER(status) IN ('REJECTED', 'DENIED') THEN 1 ELSE 0 END) as rejected
        FROM visitor_requests
        WHERE society_id = ? AND requested_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(requested_at, '%Y-%m')
        ORDER BY m_key ASC
      `, [societyId]);

      if (monthlyRows) {
        for (const mr of monthlyRows) {
          if (monthlyTrendMap[mr.m_key]) {
            monthlyTrendMap[mr.m_key].total = Number(mr.total || 0);
            monthlyTrendMap[mr.m_key].approved = Number(mr.approved || 0);
            monthlyTrendMap[mr.m_key].rejected = Number(mr.rejected || 0);
          }
        }
      }
    } catch (mErr) {
      console.warn('[ADMIN_STATS] Error querying monthly trend:', mErr);
    }

    const totalFlats = Number(flatRows[0]?.total || 0);
    const occupiedFlats = Number(flatRows[0]?.occupied || 0);
    const vacantFlats = Math.max(0, totalFlats - occupiedFlats);
    const occupancyRate = totalFlats > 0 ? Math.round((occupiedFlats / totalFlats) * 100) : 0;

    let subscriptionInfo = null;
    const society = await findSocietyById(societyId);
    if (society) {
      subscriptionInfo = computeSocietySubscriptionStatus(society);
    }

    return res.json({
      success: true,
      data: {
        totalFlats,
        occupiedFlats,
        vacantFlats,
        occupancyRate,
        totalResidents: Number(residentRows[0]?.cnt || 0),
        totalFamily,
        visitorsToday: Number(todayReqRows[0]?.cnt || 0),
        insideToday,
        exitedToday,
        flaggedToday,
        avgEntryTime,
        pendingApprovals: (statusCounts['PENDING'] || 0) + (statusCounts['pending'] || 0),
        approvedCount: (statusCounts['APPROVED'] || 0) + (statusCounts['INSIDE'] || 0) + (statusCounts['EXITED'] || 0),
        rejectedCount: (statusCounts['REJECTED'] || 0) + (statusCounts['denied'] || 0),
        pendingRegistrations: Number(pendingRegRows[0]?.cnt || 0),
        operationalGates: Number(gateRows[0]?.operational || 0),
        totalGates: Number(gateRows[0]?.total || 0),
        activeGuards: Number(guardRows[0]?.active || 0),
        totalGuards: Number(guardRows[0]?.total || 0),
        visitorTrend,
        monthlyTrend,
        maintenanceAmount: society ? Number(society.maintenanceAmount || 0) : 0,
        maintenanceDueDay: society ? Number(society.maintenanceDueDay || 5) : 5,
        billingCycle: society?.billingCycle || 'MONTHLY',
        societyName: society?.name || 'Society',
        subscription: subscriptionInfo,
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
    const societyId = req.user!.societyId!;
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
    const societyId = req.user!.societyId!;
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
    const societyId = req.user!.societyId!;
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

// Multer memory storage for bulk CSV upload
const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// Helper: Robust RFC 4180 CSV parser
function parseCsvContent(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  const normalized = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((col) => col.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((col) => col.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Normalization Helpers for robust flat & wing matching
function normalizeWing(w: string): string {
  if (!w) return '';
  return w
    .toLowerCase()
    .replace(/\b(wing|tower|block|bldg|building|phase)\b/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase();
}

function normalizeFlatNum(num: string, wingNorm: string): string {
  if (!num) return '';
  let clean = num.trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
  if (wingNorm && clean.startsWith(wingNorm) && clean.length > wingNorm.length) {
    clean = clean.substring(wingNorm.length);
  }
  return clean;
}

// GET /api/admin/flats/csv-template
// Download sample CSV template matching society's actual naming convention
router.get('/flats/csv-template', async (req: any, res: Response) => {
  try {
    const pool = await getMysqlPool();
    let sampleRows: string[] = [];

    if (pool) {
      const societyId = req.user?.societyId || 'soc_greengate';
      const [dbFlats]: any = await pool.query(
        `SELECT flat_number, wing, floor FROM flats WHERE society_id = ? LIMIT 6`,
        [societyId]
      );
      if (dbFlats && dbFlats.length > 0) {
        sampleRows.push('FlatNumber,Wing,Floor,ResidentName,MobileNumber,FlatType,VehicleNumber');
        const sampleResidents = [
          { name: 'Aarav Sharma', phone: '9876543210', vehicle: 'MH02AB1234' },
          { name: 'Priya Mehta', phone: '9876543211', vehicle: 'MH02CD5678' },
          { name: 'Vikram Malhotra', phone: '9876543212', vehicle: 'MH02EF9012' },
          { name: '', phone: '', vehicle: '' }, // sample vacant
          { name: 'Neha Verma', phone: '9876543214', vehicle: 'MH02GH3456' },
          { name: 'Rohan Desai', phone: '9876543215', vehicle: 'MH02IJ7890' },
        ];
        dbFlats.forEach((f: any, i: number) => {
          const sample = sampleResidents[i] || { name: '', phone: '', vehicle: '' };
          sampleRows.push(
            `${f.flat_number},${f.wing},${f.floor || 1},${sample.name},${sample.phone},2BHK,${sample.vehicle}`
          );
        });
      }
    }

    if (sampleRows.length === 0) {
      sampleRows = [
        'FlatNumber,Wing,Floor,ResidentName,MobileNumber,FlatType,VehicleNumber',
        'A-101,Wing Tower A,1,Aarav Sharma,9876543210,2BHK,MH02AB1234',
        'A-102,Wing Tower A,1,Priya Mehta,9876543211,2BHK,MH02CD5678',
        'B-101,Wing Tower B,1,Vikram Malhotra,9876543212,3BHK,MH02EF9012',
        'B-102,Wing Tower B,1,,,,',
        'C-101,Wing Tower C,1,Neha Verma,9876543214,1BHK,MH02GH3456',
      ];
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="greengate_flats_template.csv"');
    return res.status(200).send(sampleRows.join('\r\n'));
  } catch (err: any) {
    const fallback = [
      'FlatNumber,Wing,Floor,ResidentName,MobileNumber,FlatType,VehicleNumber',
      'A-101,Wing Tower A,1,Aarav Sharma,9876543210,2BHK,MH02AB1234',
      'A-102,Wing Tower A,1,Priya Mehta,9876543211,2BHK,MH02CD5678',
      'B-101,Wing Tower B,1,,,,',
    ].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="greengate_flats_template.csv"');
    return res.status(200).send(fallback);
  }
});

// POST /api/admin/flats/merge-duplicates
// Intelligently merges format-mismatched duplicate flats (e.g. 102 into A-102)
router.post(
  '/flats/merge-duplicates',
  authenticateToken,
  authorizeRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user!.societyId || 'soc_greengate';
      const pool = await getMysqlPool();
      if (!pool) {
        return res.status(500).json({ success: false, error: { code: 'DATABASE_ERROR', message: 'DB unavailable' } });
      }

      const [flats]: any = await pool.query(
        `SELECT id, flat_number, wing, floor, resident_id FROM flats WHERE society_id = ?`,
        [societyId]
      );

      const groups: { [key: string]: any[] } = {};
      for (const f of (flats || [])) {
        const wNorm = normalizeWing(f.wing);
        const digits = f.flat_number.replace(/\D/g, '');
        const key = `${wNorm}_${digits}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(f);
      }

      let mergedCount = 0;
      const details: string[] = [];

      for (const key of Object.keys(groups)) {
        const list = groups[key];
        if (list.length > 1) {
          // Sort to prioritize canonical naming (e.g. "A-102" over "102", "Wing Tower A" over "Wing A")
          list.sort((a, b) => {
            const aScore = (a.flat_number.includes('-') ? 2 : 0) + (a.wing.toLowerCase().includes('tower') ? 2 : 0);
            const bScore = (b.flat_number.includes('-') ? 2 : 0) + (b.wing.toLowerCase().includes('tower') ? 2 : 0);
            return bScore - aScore;
          });

          const canonical = list[0];
          const duplicates = list.slice(1);

          for (const dup of duplicates) {
            // Transfer resident if duplicate has one and canonical is vacant
            if (dup.resident_id && !canonical.resident_id) {
              await pool.query(`UPDATE flats SET resident_id = ? WHERE id = ?`, [dup.resident_id, canonical.id]);
              canonical.resident_id = dup.resident_id;
            }

            // Repoint visitor requests
            await pool.query(`UPDATE visitor_requests SET flat_id = ? WHERE flat_id = ?`, [canonical.id, dup.id]);

            // Remove duplicate flat
            await pool.query(`DELETE FROM flats WHERE id = ?`, [dup.id]);
            mergedCount++;
            details.push(`Merged duplicate Flat ${dup.flat_number} (${dup.wing}) into ${canonical.flat_number} (${canonical.wing})`);
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: `Successfully merged ${mergedCount} duplicate flat(s).`,
        data: { mergedCount, details },
      });
    } catch (err: any) {
      console.error('Error merging duplicate flats:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message || 'Failed to merge duplicate flats' },
      });
    }
  }
);

// POST /api/admin/flats/bulk-import
// Bulk import flats and resident accounts with Smart Normalization matching
router.post(
  '/flats/bulk-import',
  authenticateToken,
  authorizeRoles('ADMIN'),
  uploadCsv.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user!.societyId || 'soc_greengate';
      const pool = await getMysqlPool();

      if (!pool) {
        return res.status(500).json({
          success: false,
          error: { code: 'DATABASE_ERROR', message: 'Database connection pool unavailable' },
        });
      }

      // Pre-load all existing flats for this society to perform smart fuzzy matching
      const [existingDbFlats]: any = await pool.query(
        `SELECT id, flat_number, wing, floor, resident_id FROM flats WHERE society_id = ?`,
        [societyId]
      );
      const societyFlats: Array<{
        id: string;
        flat_number: string;
        wing: string;
        floor: number;
        resident_id: string | null;
      }> = existingDbFlats || [];

      let recordsToProcess: Array<{
        flatNumber: string;
        wing: string;
        floor?: number | string;
        residentName?: string;
        mobileNumber?: string;
        flatType?: string;
        vehicleNumber?: string;
        sourceRow: number;
      }> = [];

      // Case 1: CSV file uploaded via multipart/form-data
      if (req.file && req.file.buffer) {
        const csvString = req.file.buffer.toString('utf-8');
        const parsedRows = parseCsvContent(csvString);

        if (parsedRows.length === 0) {
          return res.status(400).json({
            success: false,
            error: { code: 'EMPTY_FILE', message: 'The uploaded CSV file is empty' },
          });
        }

        let colFlat = 0;
        let colWing = 1;
        let colFloor = 2;
        let colResident = 3;
        let colMobile = 4;
        let colType = 5;
        let colVehicle = -1;
        let hasHeader = false;

        const firstRow = parsedRows[0];
        firstRow.forEach((col, idx) => {
          const norm = col.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (['flatnumber', 'flatno', 'flat', 'number', 'unit'].includes(norm)) {
            colFlat = idx;
            hasHeader = true;
          } else if (['wing', 'wingname', 'block', 'tower', 'building'].includes(norm)) {
            colWing = idx;
            hasHeader = true;
          } else if (['floor', 'floornumber', 'level'].includes(norm)) {
            colFloor = idx;
          } else if (['residentname', 'resident', 'ownername', 'owner', 'name'].includes(norm)) {
            colResident = idx;
          } else if (['mobilenumber', 'mobile', 'phone', 'contact', 'phonenumber'].includes(norm)) {
            colMobile = idx;
          } else if (['flattype', 'type', 'config', 'configuration'].includes(norm)) {
            colType = idx;
          } else if (['vehiclenumber', 'vehicleno', 'vehicle', 'vehicles', 'carno', 'vehiclenumbers', 'vehicleplate'].includes(norm)) {
            colVehicle = idx;
          }
        });

        const startIdx = hasHeader ? 1 : 0;
        for (let r = startIdx; r < parsedRows.length; r++) {
          const row = parsedRows[r];
          if (!row || row.length === 0 || row.every((c) => !c)) continue;
          recordsToProcess.push({
            flatNumber: row[colFlat] || '',
            wing: row[colWing] || '',
            floor: row[colFloor] || '',
            residentName: row[colResident] || '',
            mobileNumber: row[colMobile] || '',
            flatType: row[colType] || '',
            vehicleNumber: colVehicle !== -1 ? (row[colVehicle] || '') : '',
            sourceRow: r + 1,
          });
        }
      }
      // Case 2: Raw CSV text in JSON body
      else if (req.body && typeof req.body.csvText === 'string' && req.body.csvText.trim()) {
        const parsedRows = parseCsvContent(req.body.csvText);
        let colFlat = 0;
        let colWing = 1;
        let colFloor = 2;
        let colResident = 3;
        let colMobile = 4;
        let colType = 5;
        let colVehicle = -1;
        let hasHeader = false;

        if (parsedRows.length > 0) {
          parsedRows[0].forEach((col, idx) => {
            const norm = col.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (['flatnumber', 'flatno', 'flat', 'number', 'unit'].includes(norm)) {
              colFlat = idx;
              hasHeader = true;
            } else if (['wing', 'wingname', 'block', 'tower', 'building'].includes(norm)) {
              colWing = idx;
              hasHeader = true;
            } else if (['floor', 'floornumber', 'level'].includes(norm)) {
              colFloor = idx;
            } else if (['residentname', 'resident', 'ownername', 'owner', 'name'].includes(norm)) {
              colResident = idx;
            } else if (['mobilenumber', 'mobile', 'phone', 'contact', 'phonenumber'].includes(norm)) {
              colMobile = idx;
            } else if (['flattype', 'type', 'config', 'configuration'].includes(norm)) {
              colType = idx;
            } else if (['vehiclenumber', 'vehicleno', 'vehicle', 'vehicles', 'carno', 'vehiclenumbers', 'vehicleplate'].includes(norm)) {
              colVehicle = idx;
            }
          });

          const startIdx = hasHeader ? 1 : 0;
          for (let r = startIdx; r < parsedRows.length; r++) {
            const row = parsedRows[r];
            if (!row || row.length === 0 || row.every((c) => !c)) continue;
            recordsToProcess.push({
              flatNumber: row[colFlat] || '',
              wing: row[colWing] || '',
              floor: row[colFloor] || '',
              residentName: row[colResident] || '',
              mobileNumber: row[colMobile] || '',
              flatType: row[colType] || '',
              vehicleNumber: colVehicle !== -1 ? (row[colVehicle] || '') : '',
              sourceRow: r + 1,
            });
          }
        }
      }
      // Case 3: JSON array of records
      else if (req.body && Array.isArray(req.body.records)) {
        recordsToProcess = req.body.records.map((rec: any, idx: number) => ({
          flatNumber: String(rec.flatNumber || rec.number || '').trim(),
          wing: String(rec.wing || '').trim(),
          floor: rec.floor,
          residentName: String(rec.residentName || rec.ownerName || rec.name || '').trim(),
          mobileNumber: String(rec.mobileNumber || rec.mobile || rec.phone || '').trim(),
          flatType: String(rec.flatType || rec.type || '').trim(),
          vehicleNumber: String(rec.vehicleNumber || rec.vehicleNo || rec.vehicle || rec.vehicles || '').trim(),
          sourceRow: idx + 1,
        }));
      } else {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Please provide a valid CSV file (multipart/form-data) or a JSON body with records array',
          },
        });
      }

      if (recordsToProcess.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_RECORDS', message: 'No valid records found in the import data' },
        });
      }

      let createdCount = 0;
      let updatedCount = 0;
      let failedCount = 0;
      const errors: Array<{ row: number; flat?: string; reason: string }> = [];
      const importedFlats: any[] = [];

      for (const item of recordsToProcess) {
        const rowNum = item.sourceRow;
        const rawFlatNumber = item.flatNumber.trim();
        let rawWing = item.wing.trim();

        if (!rawFlatNumber) {
          errors.push({ row: rowNum, reason: 'Flat number is required' });
          failedCount++;
          continue;
        }

        // Auto-extract wing from flat number if wing is missing (e.g. "A-101" -> wing "A")
        if (!rawWing) {
          const match = rawFlatNumber.match(/^([A-Za-z]+)[-\s]?\d+/);
          if (match) {
            rawWing = match[1].toUpperCase();
          }
        }

        if (!rawWing) {
          errors.push({ row: rowNum, flat: rawFlatNumber, reason: 'Wing identifier is required' });
          failedCount++;
          continue;
        }

        const inputWingNorm = normalizeWing(rawWing);
        const matchedSocietyWing = societyFlats.find(f => normalizeWing(f.wing) === inputWingNorm)?.wing;
        const cleanWing = matchedSocietyWing || (rawWing.toLowerCase().startsWith('wing') ? rawWing : `Wing ${rawWing.toUpperCase()}`);
        const cleanFlatNumber = rawFlatNumber.toUpperCase();

        // Calculate floor
        let floor = parseInt(String(item.floor || ''), 10);
        if (isNaN(floor) || floor <= 0) {
          const digits = cleanFlatNumber.replace(/\D/g, '');
          if (digits.length >= 3) {
            floor = parseInt(digits.slice(0, -2), 10) || 1;
          } else {
            floor = 1;
          }
        }

        // Validate mobile if provided
        let cleanMobile: string | null = null;
        if (item.mobileNumber && item.mobileNumber.trim()) {
          const digits = item.mobileNumber.replace(/\D/g, '');
          const tenDigits = digits.slice(-10);
          if (tenDigits.length !== 10) {
            errors.push({
              row: rowNum,
              flat: cleanFlatNumber,
              reason: `Invalid mobile number '${item.mobileNumber}'. Must contain a valid 10-digit number.`,
            });
            failedCount++;
            continue;
          }
          cleanMobile = tenDigits;
        }

        let cleanResidentName = item.residentName?.trim() || '';
        if (cleanMobile && !cleanResidentName) {
          cleanResidentName = `Resident ${cleanFlatNumber}`;
        }

        try {
          // Smart Normalization Matching:
          // Match by exact string OR normalized wing + normalized digits
          const inputFlatNorm = normalizeFlatNum(rawFlatNumber, inputWingNorm);
          const inputDigits = rawFlatNumber.replace(/\D/g, '');

          let matchedFlat = societyFlats.find((f) => {
            // 1. Direct exact match
            if (
              f.flat_number.toUpperCase() === cleanFlatNumber &&
              (f.wing.toUpperCase() === cleanWing.toUpperCase() || f.wing.toUpperCase() === rawWing.toUpperCase())
            ) {
              return true;
            }

            const dbWingNorm = normalizeWing(f.wing);
            const dbFlatNorm = normalizeFlatNum(f.flat_number, dbWingNorm);
            const dbDigits = f.flat_number.replace(/\D/g, '');

            // 2. Both belong to the same wing tower/block
            if (dbWingNorm === inputWingNorm && inputWingNorm) {
              // Normalized numbers match (e.g. '102' vs 'A-102')
              if (dbFlatNorm === inputFlatNorm && inputFlatNorm) return true;
              // Pure digits match (e.g. '102' vs '102')
              if (inputDigits && inputDigits === dbDigits) return true;
            }

            // 3. Exact flat number matches if wing is compatible
            if (f.flat_number.toUpperCase() === cleanFlatNumber) {
              if (!inputWingNorm || !dbWingNorm || dbWingNorm.includes(inputWingNorm) || inputWingNorm.includes(dbWingNorm)) {
                return true;
              }
            }

            return false;
          });

          const existing = matchedFlat;

          // Safe Resident ID Resolution (prevent foreign key constraint failure on flats.resident_id)
          let residentId: string | null = null;
          if (cleanMobile) {
            const [existingUsers]: any = await pool.query(
              `SELECT id FROM users WHERE mobile = ? LIMIT 1`,
              [cleanMobile]
            );

            if (existingUsers && existingUsers.length > 0) {
              residentId = existingUsers[0].id;
              await pool.query(
                `UPDATE users SET name = ?, society_id = ?, status = 'ACTIVE' WHERE id = ?`,
                [cleanResidentName, societyId, residentId]
              );
            } else {
              residentId = `res_${cleanMobile}`;
              await pool.query(
                `INSERT INTO users (id, name, mobile, role, society_id, status)
                 VALUES (?, ?, ?, 'RESIDENT', ?, 'ACTIVE')
                 ON DUPLICATE KEY UPDATE name = VALUES(name), society_id = VALUES(society_id), status = 'ACTIVE'`,
                [residentId, cleanResidentName, cleanMobile, societyId]
              );
              // Fetch the actual ID in case ON DUPLICATE KEY fired on mobile
              const [recheck]: any = await pool.query(
                `SELECT id FROM users WHERE mobile = ? LIMIT 1`,
                [cleanMobile]
              );
              if (recheck && recheck.length > 0) {
                residentId = recheck[0].id;
              }
            }
          }

          let flatId: string;
          let finalWing = cleanWing;
          let finalFlatNumber = cleanFlatNumber;

          // Check foreign key validity before saving resident_id
          let finalResidentId: string | null = residentId !== null ? residentId : (existing ? existing.resident_id : null);
          if (finalResidentId) {
            const [validUser]: any = await pool.query(`SELECT id FROM users WHERE id = ? LIMIT 1`, [finalResidentId]);
            if (!validUser || validUser.length === 0) {
              finalResidentId = null;
            }
          }

          if (existing) {
            flatId = existing.id;
            finalWing = existing.wing; // Preserve society canonical wing (e.g. "Wing Tower A")
            finalFlatNumber = existing.flat_number; // Preserve society canonical number (e.g. "A-102")

            await pool.query(
              `UPDATE flats 
               SET floor = ?, resident_id = ?
               WHERE id = ?`,
              [floor, finalResidentId, flatId]
            );

            // Update in-memory cache
            existing.resident_id = finalResidentId;
            existing.floor = floor;
            updatedCount++;
          } else {
            // Check directly in database for matching flat
            const [dbDirect]: any = await pool.query(
              `SELECT id, wing, flat_number, resident_id FROM flats WHERE society_id = ? AND (flat_number = ? OR (wing = ? AND flat_number = ?)) LIMIT 1`,
              [societyId, cleanFlatNumber, cleanWing, cleanFlatNumber]
            );

            if (dbDirect && dbDirect.length > 0) {
              flatId = dbDirect[0].id;
              finalWing = dbDirect[0].wing;
              finalFlatNumber = dbDirect[0].flat_number;

              await pool.query(
                `UPDATE flats 
                 SET floor = ?, resident_id = ?
                 WHERE id = ?`,
                [floor, finalResidentId, flatId]
              );

              updatedCount++;
            } else {
              flatId = `flat_${cleanFlatNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
              await pool.query(
                `INSERT INTO flats (id, society_id, flat_number, wing, floor, resident_id)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE floor = VALUES(floor), resident_id = VALUES(resident_id)`,
                [flatId, societyId, cleanFlatNumber, cleanWing, floor, finalResidentId]
              );

              // Add to in-memory list so subsequent rows in same file also match
              societyFlats.push({
                id: flatId,
                flat_number: cleanFlatNumber,
                wing: cleanWing,
                floor,
                resident_id: finalResidentId,
              });
              createdCount++;
            }
          }

          // Import Vehicle Number(s) if provided
          if (item.vehicleNumber && item.vehicleNumber.trim()) {
            const rawVehicles = item.vehicleNumber
              .split(/[,;\/]/)
              .map((v) => v.trim().toUpperCase())
              .filter((v) => v.length > 0);

            const targetResidentId = finalResidentId || residentId;
            if (targetResidentId) {
              for (const vNo of rawVehicles) {
                const [exVeh]: any = await pool.query(
                  `SELECT id FROM vehicles WHERE society_id = ? AND vehicle_number = ? LIMIT 1`,
                  [societyId, vNo]
                );
                if (exVeh && exVeh.length > 0) {
                  await pool.query(
                    `UPDATE vehicles SET flat_id = ?, resident_id = ? WHERE id = ?`,
                    [flatId, targetResidentId, exVeh[0].id]
                  );
                } else {
                  const vehId = `veh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                  await pool.query(
                    `INSERT INTO vehicles (id, society_id, resident_id, flat_id, vehicle_number, type, brand, model, color, status)
                     VALUES (?, ?, ?, ?, ?, 'car', '', '', '#000000', 'ACTIVE')`,
                    [vehId, societyId, targetResidentId, flatId, vNo]
                  );
                }
              }
            }
          }

          importedFlats.push({
            id: flatId,
            flatNumber: finalFlatNumber,
            wing: finalWing,
            floor,
            status: finalResidentId ? 'occupied' : 'vacant',
            residentName: cleanResidentName || undefined,
            mobile: cleanMobile || undefined,
            vehicleNumber: item.vehicleNumber || undefined,
            isUpdate: Boolean(existing),
          });
        } catch (dbErr: any) {
          console.error(`Error processing bulk row ${rowNum} (${cleanFlatNumber}):`, dbErr);
          errors.push({
            row: rowNum,
            flat: cleanFlatNumber,
            reason: dbErr.message || 'Database insert error',
          });
          failedCount++;
        }
      }

      return res.status(200).json({
        success: true,
        message: `Bulk import completed: ${createdCount} created, ${updatedCount} updated${errors.length > 0 ? `, ${errors.length} skipped with errors` : ''}`,
        data: {
          totalRows: recordsToProcess.length,
          processed: createdCount + updatedCount,
          created: createdCount,
          updated: updatedCount,
          failed: failedCount,
          errors,
          importedFlats,
        },
      });
    } catch (err: any) {
      console.error('Fatal error during flats bulk import:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message || 'Failed to process bulk import' },
      });
    }
  }
);

// PUT /api/admin/flats/:id
// Update resident and flat details, excluding flat number
router.put(
  '/flats/:id',
  authenticateToken,
  authorizeRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_greengate';
      const flatId = req.params.id;
      const {
        wing,
        floor,
        residentName,
        residentMobile,
        residentEmail,
        vehicleNumbers,
        status,
      } = req.body;

      const pool = await getMysqlPool();
      if (!pool) {
        return res.status(500).json({
          success: false,
          error: { code: 'DATABASE_ERROR', message: 'Database pool unavailable' },
        });
      }

      const [flatRows]: any = await pool.query(
        `SELECT id, flat_number, wing, floor, resident_id FROM flats WHERE id = ? AND society_id = ?`,
        [flatId, societyId]
      );
      if (!flatRows || flatRows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Flat not found' },
        });
      }

      const flat = flatRows[0];

      // Update wing and floor (flat number is strictly preserved and cannot be edited)
      let updatedWing = flat.wing;
      if (wing && typeof wing === 'string' && wing.trim()) {
        const cleanW = wing.trim();
        updatedWing = cleanW.toLowerCase().startsWith('wing') ? cleanW : `Wing ${cleanW.toUpperCase()}`;
      }
      let updatedFloor = flat.floor;
      if (floor !== undefined && !isNaN(Number(floor))) {
        updatedFloor = Number(floor);
      }

      await pool.query(
        `UPDATE flats SET wing = ?, floor = ? WHERE id = ?`,
        [updatedWing, updatedFloor, flatId]
      );

      let targetResidentId = flat.resident_id;

      // Handle Occupancy Status & Resident Information
      if (status === 'vacant') {
        // Flat is marked vacant -> clear resident_id from flat
        await pool.query(`UPDATE flats SET resident_id = NULL WHERE id = ?`, [flatId]);
        targetResidentId = null;
      } else if (residentMobile && residentMobile.trim()) {
        const digits = residentMobile.replace(/\D/g, '');
        const cleanMobile = digits.slice(-10);
        const cleanName = residentName?.trim() || `Resident ${flat.flat_number}`;
        const cleanEmail = residentEmail?.trim() || null;

        // Check if user with this mobile exists
        const [existingUsers]: any = await pool.query(
          `SELECT id FROM users WHERE mobile = ? LIMIT 1`,
          [cleanMobile]
        );

        if (existingUsers && existingUsers.length > 0) {
          targetResidentId = existingUsers[0].id;
          await pool.query(
            `UPDATE users SET name = ?, email = COALESCE(?, email), society_id = ?, status = 'ACTIVE' WHERE id = ?`,
            [cleanName, cleanEmail, societyId, targetResidentId]
          );
        } else if (flat.resident_id) {
          const [chkCurr]: any = await pool.query(`SELECT id FROM users WHERE id = ? LIMIT 1`, [flat.resident_id]);
          if (chkCurr && chkCurr.length > 0) {
            targetResidentId = flat.resident_id;
            await pool.query(
              `UPDATE users SET name = ?, mobile = ?, email = ?, society_id = ?, status = 'ACTIVE' WHERE id = ?`,
              [cleanName, cleanMobile, cleanEmail, societyId, targetResidentId]
            );
          } else {
            targetResidentId = `res_${cleanMobile}`;
            await pool.query(
              `INSERT INTO users (id, name, mobile, email, role, society_id, status)
               VALUES (?, ?, ?, ?, 'RESIDENT', ?, 'ACTIVE')`,
              [targetResidentId, cleanName, cleanMobile, cleanEmail, societyId]
            );
          }
        } else {
          targetResidentId = `res_${cleanMobile}`;
          await pool.query(
            `INSERT INTO users (id, name, mobile, email, role, society_id, status)
             VALUES (?, ?, ?, ?, 'RESIDENT', ?, 'ACTIVE')`,
            [targetResidentId, cleanName, cleanMobile, cleanEmail, societyId]
          );
        }

        await pool.query(`UPDATE flats SET resident_id = ? WHERE id = ?`, [targetResidentId, flatId]);
      } else if (residentName && residentName.trim() && flat.resident_id) {
        // Name or email updated without mobile change
        await pool.query(
          `UPDATE users SET name = ?, email = COALESCE(?, email) WHERE id = ?`,
          [residentName.trim(), residentEmail?.trim() || null, flat.resident_id]
        );
      }

      // Handle Vehicle updates
      if (vehicleNumbers !== undefined) {
        let vList: string[] = [];
        if (Array.isArray(vehicleNumbers)) {
          vList = vehicleNumbers.map((v: any) => String(v).trim().toUpperCase()).filter(Boolean);
        } else if (typeof vehicleNumbers === 'string') {
          vList = vehicleNumbers.split(/[,;\/]/).map((v) => v.trim().toUpperCase()).filter(Boolean);
        }

        // Delete existing vehicles linked to this flat
        await pool.query(`DELETE FROM vehicles WHERE flat_id = ?`, [flatId]);

        // Insert new vehicles if target resident exists
        if (targetResidentId) {
          for (const vNo of vList) {
            const vId = `veh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            await pool.query(
              `INSERT INTO vehicles (id, society_id, resident_id, flat_id, vehicle_number, type, brand, model, color, status)
               VALUES (?, ?, ?, ?, ?, 'car', '', '', '#000000', 'ACTIVE')`,
              [vId, societyId, targetResidentId, flatId, vNo]
            );
          }
        }
      }

      return res.json({
        success: true,
        message: `Flat ${flat.flat_number} details updated successfully`,
        data: {
          id: flatId,
          number: flat.flat_number,
          wing: updatedWing,
          floor: updatedFloor,
          residentId: targetResidentId,
        },
      });
    } catch (error: any) {
      console.error('Error updating flat:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message || 'Failed to update flat details' },
      });
    }
  }
);

router.delete('/flats/:id', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId!;
    const flatId = req.params.id;

    const deleted = await deleteFlatByAdmin(societyId, flatId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Flat not found or already deleted' },
      });
    }

    return res.json({
      success: true,
      message: 'Flat and its records deleted successfully from database',
    });
  } catch (error: any) {
    console.error('Error deleting flat:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete flat' },
    });
  }
});

// DELETE /api/admin/residents/:id
router.delete('/residents/:id', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId!;
    const residentId = req.params.id;

    const deleted = await deleteResidentByAdmin(societyId, residentId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Resident not found or already removed' },
      });
    }

    return res.json({
      success: true,
      message: 'Resident deleted successfully from database',
    });
  } catch (error: any) {
    console.error('Error deleting resident:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete resident' },
    });
  }
});

// =============================================================
// VISITOR LOGS & REALTIME ACCESS (ADMIN)
// =============================================================

// GET /api/admin/visitors
router.get('/visitors', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId!;
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

// DELETE /api/admin/visitors/:id
router.delete('/visitors/:id', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId!;
    const requestId = req.params.id;

    const deleted = await deleteVisitorLogByAdmin(societyId, requestId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Visitor record not found or already deleted' },
      });
    }

    return res.json({
      success: true,
      message: 'Visitor record deleted successfully from database',
    });
  } catch (error: any) {
    console.error('Error deleting visitor log:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete visitor record' },
    });
  }
});

// =============================================================
// GATES & BARRIERS (ADMIN)
// =============================================================

// GET /api/admin/gates
router.get('/gates', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId!;
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
    const societyId = req.user!.societyId!;
    const society = await findSocietyById(societyId);
    const maxDevices = society?.maxDevices ?? 1;
    const planName = society?.planName ?? 'STANDARD_1_DEVICE';

    const guards = await findGuardsWithDetails(societyId);
    return res.json({
      success: true,
      data: guards,
      meta: {
        maxDevices,
        currentDevices: guards.length,
        planName,
        canAddGuard: guards.length < maxDevices,
      },
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
    const societyId = req.user!.societyId || '';
    const { name, phone, mobile, pin, assignedGate, shift } = req.body;
    const cleanPhone = phone || mobile;

    if (!name || !cleanPhone) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Device/Guard name and login mobile number are required' },
      });
    }

    // Device limit check based on society plan
    const society = await findSocietyById(societyId);
    const maxDevices = society?.maxDevices ?? 1;
    const existingGuards = await findGuardsWithDetails(societyId);
    if (existingGuards.length >= maxDevices) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'DEVICE_LIMIT_REACHED',
          message: `Your society plan (${society?.planName || 'Standard'}) allows a maximum of ${maxDevices} guard device(s). Currently active: ${existingGuards.length}. Please upgrade your plan in Super Admin to register more devices.`,
          data: {
            currentDevices: existingGuards.length,
            maxDevices,
            planName: society?.planName,
          },
        },
      });
    }

    const guard = await createGuardRecord({
      societyId,
      name,
      mobile: cleanPhone,
      gateName: assignedGate,
      shift,
      pin,
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

// PUT /api/admin/guards/:id
router.put('/guards/:id', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId || '';
    const { id } = req.params;
    const { name, phone, mobile, pin, status } = req.body;

    const updated = await updateGuardRecord(id, societyId, {
      name,
      phone: phone || mobile,
      pin,
      status,
    });

    return res.json({
      success: true,
      message: 'Guard device updated successfully',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating guard:', error);
    return res.status(400).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: error.message || 'Failed to update guard device' },
    });
  }
});

// DELETE /api/admin/guards/:id
router.delete('/guards/:id', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId || '';
    const { id } = req.params;

    const ok = await deleteGuardRecord(id, societyId);
    if (!ok) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Guard device not found' } });
    }

    return res.json({
      success: true,
      message: 'Guard device removed successfully',
    });
  } catch (error: any) {
    console.error('Error deleting guard:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Failed to delete guard' },
    });
  }
});

// =============================================================
// SOCIETY SETTINGS & SUBSCRIPTION (ADMIN)
// =============================================================

// GET /api/admin/subscription
router.get('/subscription', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId!;
    const society = await findSocietyById(societyId);
    if (!society) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Society not found' } });
    }

    const subInfo = computeSocietySubscriptionStatus(society);
    return res.json({
      success: true,
      data: {
        ...subInfo,
        societyId: society.id,
        societyName: society.name,
        subdomain: society.subdomain,
        upiId: society.upiId,
        maintenanceAmount: society.maintenanceAmount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch subscription status' } });
  }
});

// POST /api/admin/subscription/recharge-proof
// Submit UPI payment UTR and screenshot for plan renewal verification
router.post('/subscription/recharge-proof', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId!;
    const { utrNumber, screenshotUrl, planName, amount, notes } = req.body;

    if (!utrNumber || !String(utrNumber).trim()) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'UTR / Transaction Reference number is required' } });
    }

    const society = await findSocietyById(societyId);
    if (!society) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Society not found' } });
    }

    const pool = await getMysqlPool();
    if (!pool) throw new Error('Database pool unavailable');

    const rechargeId = `rech_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const targetPlan = planName || society.planName || 'STANDARD_1_DEVICE';
    const rechargeAmount = Number(amount) || society.planAmount || 1999;

    await pool.query(
      `INSERT INTO subscription_recharges (id, society_id, plan_name, amount, utr_number, screenshot_url, status, admin_notes)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
      [rechargeId, societyId, targetPlan, rechargeAmount, String(utrNumber).trim(), screenshotUrl || null, notes || null]
    );

    return res.json({
      success: true,
      message: 'Payment proof submitted successfully. Super admin will verify and renew your subscription within 2 hours.',
      data: {
        rechargeId,
        societyId,
        planName: targetPlan,
        amount: rechargeAmount,
        utrNumber: String(utrNumber).trim(),
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error submitting recharge proof:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to submit payment proof' } });
  }
});

// GET /api/admin/subscription/recharges
router.get('/subscription/recharges', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId!;
    const pool = await getMysqlPool();
    if (!pool) throw new Error('Database pool unavailable');

    const [rows]: any = await pool.query(
      'SELECT * FROM subscription_recharges WHERE society_id = ? ORDER BY created_at DESC LIMIT 10',
      [societyId]
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    console.error('Error fetching recharge history:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch recharge history' } });
  }
});

// GET /api/admin/settings
router.get('/settings', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId!;
    const society = await findSocietyById(societyId);
    if (!society) {
      return res.json({
        success: true,
        data: {
          id: societyId,
          name: 'GreenGate Residency',
          address: 'Main Gate Boulevard, Tower A-D',
          city: 'Mumbai, MH',
          totalFlats: 120,
        },
      });
    }

    const subInfo = computeSocietySubscriptionStatus(society);

    return res.json({
      success: true,
      data: {
        id: society.id,
        name: society.name,
        subdomain: society.subdomain,
        fullDomain: society.subdomain ? `${society.subdomain}.nexgate.co.in` : null,
        address: society.address,
        city: society.city || (society.address?.includes(',') ? society.address.split(',').pop()?.trim() : 'Mumbai, MH'),
        state: society.state,
        pincode: society.pincode,
        contactEmail: society.contactEmail,
        contactPhone: society.contactPhone,
        logoUrl: society.logoUrl,
        upiId: society.upiId,
        maintenanceAmount: society.maintenanceAmount,
        maintenanceDueDay: society.maintenanceDueDay,
        planName: society.planName,
        maxDevices: society.maxDevices,
        planAmount: society.planAmount,
        billingCycle: society.billingCycle,
        subscriptionStatus: society.subscriptionStatus,
        subscription: subInfo,
      },
    });
  } catch (error: any) {
    console.error('Error fetching society settings:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch society settings' },
    });
  }
});

// PATCH /api/admin/settings
router.patch('/settings', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId!;
    const {
      name,
      address,
      city,
      state,
      pincode,
      contactEmail,
      contactPhone,
      upiId,
      maintenanceAmount,
      maintenanceDueDay,
    } = req.body;

    let fullAddress = address;
    if (city && address && !address.toLowerCase().includes(city.toLowerCase())) {
      fullAddress = `${address.trim()}, ${city.trim()}`;
    } else if (city && !address) {
      fullAddress = city.trim();
    }

    const updatePayload: any = {};
    if (name !== undefined) updatePayload.name = name?.trim();
    if (fullAddress !== undefined) updatePayload.address = fullAddress?.trim();
    if (city !== undefined) updatePayload.city = city?.trim();
    if (state !== undefined) updatePayload.state = state?.trim();
    if (pincode !== undefined) updatePayload.pincode = pincode?.trim();
    if (contactEmail !== undefined) updatePayload.contactEmail = contactEmail?.trim()?.toLowerCase();
    if (contactPhone !== undefined) updatePayload.contactPhone = contactPhone?.trim();
    if (upiId !== undefined) updatePayload.upiId = upiId?.trim();
    if (maintenanceAmount !== undefined) updatePayload.maintenanceAmount = Number(maintenanceAmount || 0);
    if (maintenanceDueDay !== undefined) updatePayload.maintenanceDueDay = Number(maintenanceDueDay || 5);

    const updated = await updateSociety(societyId, updatePayload);

    return res.json({
      success: true,
      message: 'Society configuration updated successfully',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating society settings:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update society settings' },
    });
  }
});

export default router;



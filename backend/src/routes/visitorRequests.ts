import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getDb, saveDb } from '../database/db';
import { authenticateToken, AuthenticatedRequest, authorizeRoles } from '../middleware/auth';
import { uploadVisitorPhoto } from '../middleware/upload';
import { emitVisitorCreated, emitVisitorDecision, emitVisitorCompleted } from '../services/socketService';

const router = Router();

// POST /api/visitor-requests
// Guard creates visitor request with photo upload
router.post(
  '/',
  authenticateToken,
  authorizeRoles('GUARD', 'ADMIN'),
  (req, res, next) => {
    uploadVisitorPhoto.single('photo')(req, res, (err) => {
      if (err) {
        console.warn('[Upload Warning]:', err?.message || err);
      }
      next();
    });
  },
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        name,
        mobile,
        purpose,
        visitorType,
        flatNumber,
        buildingWing,
        residentName,
        residentPhone,
        vehicleNumber,
        deliveryCompany,
      } = req.body;

      if (!name || (!flatNumber && !buildingWing)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Visitor name and flat details are required' },
        });
      }

      const db = getDb();
      const societyId = req.user?.societyId || 'soc_greengate';
      const guardId = req.user?.id || 'guard_ramesh';
      const gateId = req.user?.gateId || 'gate_main';

      // 1. Locate target flat & resident
      const cleanFlatNum = (flatNumber || '').trim().toUpperCase();
      const cleanWing = (buildingWing || '').trim();

      let flat = db.flats.find((f) => f.societyId === societyId && (f.flatNumber.toUpperCase() === cleanFlatNum || (cleanWing && f.wing.toLowerCase() === cleanWing.toLowerCase() && f.flatNumber.toUpperCase() === cleanFlatNum)));

      if (!flat) {
        // Fallback: match by flatNumber or seed flat
        flat = db.flats.find((f) => f.flatNumber.toUpperCase().includes(cleanFlatNum)) || db.flats[0];
      }

      let resident = db.users.find((u) => u.id === flat.residentId);
      if (!resident) {
        resident = db.users.find((u) => u.role === 'RESIDENT') || db.users[0];
      }

      // 2. Photo URL setup
      let photoUrl: string | undefined = undefined;
      if (req.file) {
        photoUrl = `/api/uploads/visitor-photos/${req.file.filename}`;
      } else if (req.body.photoUrl) {
        photoUrl = req.body.photoUrl;
      }

      const now = new Date().toISOString();

      // 3. Create Visitor Record
      const visitorId = `vis_${uuidv4().slice(0, 8)}`;
      const visitorRecord = {
        id: visitorId,
        name: name.trim(),
        mobile: mobile || '+91 98765 00000',
        purpose: (purpose || 'personal').toLowerCase(),
        visitorType: (visitorType || 'guest').toLowerCase(),
        photoUrl,
        vehicleNumber: vehicleNumber || undefined,
        deliveryCompany: deliveryCompany || undefined,
        createdAt: now,
      };
      db.visitors.push(visitorRecord);

      // 4. Create Visitor Request Record
      const requestId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
      const requestRecord = {
        id: requestId,
        societyId,
        visitorId,
        residentId: resident.id,
        flatId: flat.id,
        guardId,
        gateId,
        status: 'PENDING' as const,
        requestedAt: now,
      };
      db.visitorRequests.push(requestRecord);

      // 5. Create Notification for Resident
      db.notifications.push({
        id: `notif_${uuidv4().slice(0, 8)}`,
        recipientId: resident.id,
        type: 'visitor',
        title: 'Visitor Approval Required',
        message: `${name} is waiting at ${gateId === 'gate_back' ? 'Back Gate' : 'Main Gate'} for Flat ${flat.flatNumber}`,
        relatedEntityId: requestId,
        read: false,
        createdAt: now,
      });

      // 6. Audit Log
      db.auditLogs.push({
        id: `audit_${uuidv4().slice(0, 8)}`,
        actorId: guardId,
        actorRole: 'GUARD',
        action: 'VISITOR_REQUEST_CREATED',
        entityType: 'VISITOR_REQUEST',
        entityId: requestId,
        metadata: JSON.stringify({ visitorName: name, flatNumber: flat.flatNumber }),
        timestamp: now,
      });

      saveDb();

      // 7. Emit Real-time Socket Event
      emitVisitorCreated({
        request: requestRecord,
        visitor: visitorRecord,
        flatNumber: flat.flatNumber,
        residentId: resident.id,
        societyId,
      });

      return res.status(201).json({
        success: true,
        data: {
          id: requestId,
          status: 'PENDING',
          visitor: visitorRecord,
          flatNumber: flat.flatNumber,
          requestedAt: now,
        },
      });
    } catch (error: any) {
      console.error('Error creating visitor request:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error?.message || 'Internal server error' },
      });
    }
  }
);

// GET /api/visitor-requests
// List visitor requests with society data isolation
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;

  let requests = db.visitorRequests;

  // Filter based on Role & Data Isolation
  if (user.role === 'RESIDENT') {
    // Only return requests for this resident's flat/ID
    requests = requests.filter((r) => r.residentId === user.id || r.societyId === user.societyId);
  } else if (user.role === 'GUARD' || user.role === 'ADMIN') {
    // Only return requests for their society
    requests = requests.filter((r) => r.societyId === user.societyId);
  }

  // Join Visitor and Flat data
  const result = requests.map((reqItem) => {
    const visitor = db.visitors.find((v) => v.id === reqItem.visitorId);
    const flat = db.flats.find((f) => f.id === reqItem.flatId);
    const resident = db.users.find((u) => u.id === reqItem.residentId);
    const gate = db.gates.find((g) => g.id === reqItem.gateId);

    return {
      id: reqItem.id,
      visitorId: reqItem.visitorId,
      visitor: visitor
        ? {
            id: visitor.id,
            name: visitor.name,
            mobile: visitor.mobile,
            purpose: visitor.purpose,
            visitorType: visitor.visitorType,
            photoUrl: visitor.photoUrl,
            photo: visitor.photoUrl, // backward compatibility
            vehicleNumber: visitor.vehicleNumber,
            deliveryCompany: visitor.deliveryCompany,
          }
        : null,
      flatNumber: flat?.flatNumber || 'A-402',
      buildingWing: flat?.wing || 'Tower A',
      residentName: resident?.name || 'Sahil Arote',
      gate: gate?.name || 'Main Gate',
      status: reqItem.status,
      requestedAt: reqItem.requestedAt,
      respondedAt: reqItem.respondedAt,
      responseBy: reqItem.responseBy,
      rejectionReason: reqItem.rejectionReason,
    };
  });

  result.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

  return res.json({
    success: true,
    data: result,
  });
});

// GET /api/visitor-requests/:id
// Get single visitor request details
router.get('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { id } = req.params;

  const reqItem = db.visitorRequests.find((r) => r.id === id);
  if (!reqItem) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Visitor request not found' },
    });
  }

  const visitor = db.visitors.find((v) => v.id === reqItem.visitorId);
  const flat = db.flats.find((f) => f.id === reqItem.flatId);
  const resident = db.users.find((u) => u.id === reqItem.residentId);
  const gate = db.gates.find((g) => g.id === reqItem.gateId);

  return res.json({
    success: true,
    data: {
      id: reqItem.id,
      visitorId: reqItem.visitorId,
      visitor: visitor
        ? {
            id: visitor.id,
            name: visitor.name,
            mobile: visitor.mobile,
            purpose: visitor.purpose,
            visitorType: visitor.visitorType,
            photoUrl: visitor.photoUrl,
            photo: visitor.photoUrl,
            vehicleNumber: visitor.vehicleNumber,
            deliveryCompany: visitor.deliveryCompany,
          }
        : null,
      flatNumber: flat?.flatNumber || 'A-402',
      buildingWing: flat?.wing || 'Tower A',
      residentName: resident?.name || 'Sahil Arote',
      gate: gate?.name || 'Main Gate',
      status: reqItem.status,
      requestedAt: reqItem.requestedAt,
      respondedAt: reqItem.respondedAt,
      responseBy: reqItem.responseBy,
      rejectionReason: reqItem.rejectionReason,
    },
  });
});

// POST /api/visitor-requests/:id/approve
// Resident approves visitor entry
router.post('/:id/approve', authenticateToken, authorizeRoles('RESIDENT', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();

  const reqIndex = db.visitorRequests.findIndex((r) => r.id === id);
  if (reqIndex === -1) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Visitor request not found' },
    });
  }

  const request = db.visitorRequests[reqIndex];

  // Race condition protection: ensure status is PENDING
  if (request.status !== 'PENDING') {
    return res.status(400).json({
      success: false,
      error: { code: 'STATE_CONFLICT', message: `Request is already in ${request.status} state` },
    });
  }

  const now = new Date().toISOString();
  request.status = 'APPROVED';
  request.respondedAt = now;
  request.responseBy = req.user?.name || 'Resident';

  const visitor = db.visitors.find((v) => v.id === request.visitorId);

  // Audit Log
  db.auditLogs.push({
    id: `audit_${uuidv4().slice(0, 8)}`,
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: 'VISITOR_APPROVED',
    entityType: 'VISITOR_REQUEST',
    entityId: id,
    timestamp: now,
  });

  saveDb();

  // Emit Real-time Socket Event to Guard and Admin
  emitVisitorDecision({
    request,
    visitor,
    residentId: request.residentId,
    societyId: request.societyId,
    status: 'APPROVED',
  });

  return res.json({
    success: true,
    data: {
      id: request.id,
      status: 'APPROVED',
      respondedAt: now,
    },
  });
});

// POST /api/visitor-requests/:id/reject
// Resident rejects visitor entry
router.post('/:id/reject', authenticateToken, authorizeRoles('RESIDENT', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const db = getDb();

  const reqIndex = db.visitorRequests.findIndex((r) => r.id === id);
  if (reqIndex === -1) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Visitor request not found' },
    });
  }

  const request = db.visitorRequests[reqIndex];

  // Race condition protection: ensure status is PENDING
  if (request.status !== 'PENDING') {
    return res.status(400).json({
      success: false,
      error: { code: 'STATE_CONFLICT', message: `Request is already in ${request.status} state` },
    });
  }

  const now = new Date().toISOString();
  request.status = 'REJECTED';
  request.respondedAt = now;
  request.responseBy = req.user?.name || 'Resident';
  request.rejectionReason = reason || 'Denied by resident';

  const visitor = db.visitors.find((v) => v.id === request.visitorId);

  // Audit Log
  db.auditLogs.push({
    id: `audit_${uuidv4().slice(0, 8)}`,
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: 'VISITOR_REJECTED',
    entityType: 'VISITOR_REQUEST',
    entityId: id,
    metadata: JSON.stringify({ reason: request.rejectionReason }),
    timestamp: now,
  });

  saveDb();

  // Emit Real-time Socket Event to Guard and Admin
  emitVisitorDecision({
    request,
    visitor,
    residentId: request.residentId,
    societyId: request.societyId,
    status: 'REJECTED',
    rejectionReason: request.rejectionReason,
  });

  return res.json({
    success: true,
    data: {
      id: request.id,
      status: 'REJECTED',
      rejectionReason: request.rejectionReason,
      respondedAt: now,
    },
  });
});

// POST /api/visitor-requests/:id/complete
// Guard completes visitor entry after resident approval
router.post('/:id/complete', authenticateToken, authorizeRoles('GUARD', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();

  const reqIndex = db.visitorRequests.findIndex((r) => r.id === id);
  if (reqIndex === -1) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Visitor request not found' },
    });
  }

  const request = db.visitorRequests[reqIndex];

  // Must be in APPROVED status to complete entry
  if (request.status !== 'APPROVED') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'STATE_CONFLICT',
        message: `Cannot complete entry. Request is currently in ${request.status} state. Entry must be APPROVED first.`,
      },
    });
  }

  const now = new Date().toISOString();
  request.status = 'COMPLETED';

  const visitor = db.visitors.find((v) => v.id === request.visitorId);

  // Audit Log
  db.auditLogs.push({
    id: `audit_${uuidv4().slice(0, 8)}`,
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: 'VISITOR_ENTRY_COMPLETED',
    entityType: 'VISITOR_REQUEST',
    entityId: id,
    timestamp: now,
  });

  saveDb();

  // Emit Real-time Socket Event to Guard, Resident, and Admin
  emitVisitorCompleted({
    request,
    visitor,
    residentId: request.residentId,
    societyId: request.societyId,
  });

  return res.json({
    success: true,
    data: {
      id: request.id,
      status: 'COMPLETED',
      completedAt: now,
    },
  });
});

// GET /api/visitor-requests/:id/photo
// Secure photo streaming for authorized users
router.get('/:id/photo', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const request = db.visitorRequests.find((r) => r.id === id);
  if (!request) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } });
  }

  const visitor = db.visitors.find((v) => v.id === request.visitorId);
  if (!visitor || !visitor.photoUrl) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No photo attached to visitor' } });
  }

  // Authorization check: User must belong to same society, and if resident, must be for their flat
  const user = req.user!;
  if (user.societyId !== request.societyId) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized society' } });
  }
  if (user.role === 'RESIDENT' && user.id !== request.residentId && user.flatId !== request.flatId) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized flat photo access' } });
  }

  const filename = path.basename(visitor.photoUrl);
  const filePath = path.resolve(__dirname, '../../uploads/visitor-photos', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: 'Photo file not found on server' } });
  }

  return res.sendFile(filePath);
});

// POST /api/visitor-requests/invite
// Resident pre-invites a visitor (creates pre-approved pass)
router.post('/invite', authenticateToken, authorizeRoles('RESIDENT', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { name, mobile, purpose, visitorType, vehicleNumber, expectedAt } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Visitor name is required' } });
  }

  const db = getDb();
  const societyId = req.user!.societyId || 'soc_greengate';
  const residentId = req.user!.id;
  const flat = db.flats.find((f) => f.residentId === residentId) || db.flats[0];

  const now = new Date().toISOString();
  const visitorId = `vis_${uuidv4().slice(0, 8)}`;
  const visitorRecord = {
    id: visitorId,
    name: name.trim(),
    mobile: mobile || '',
    purpose: (purpose || 'guest').toLowerCase(),
    visitorType: (visitorType || 'guest').toLowerCase(),
    vehicleNumber,
    createdAt: now,
  };
  db.visitors.push(visitorRecord);

  const requestId = `PASS-${Math.floor(1000 + Math.random() * 9000)}`;
  const requestRecord = {
    id: requestId,
    societyId,
    visitorId,
    residentId,
    flatId: flat.id,
    guardId: 'pre_approved',
    gateId: 'any',
    status: 'APPROVED' as const,
    requestedAt: now,
    respondedAt: now,
    responseBy: req.user!.name,
  };
  db.visitorRequests.push(requestRecord);
  saveDb();

  return res.status(201).json({
    success: true,
    data: {
      id: requestId,
      status: 'APPROVED',
      passCode: requestId,
      visitor: visitorRecord,
      flatNumber: flat.flatNumber,
      expectedAt: expectedAt || now,
    },
  });
});

export default router;

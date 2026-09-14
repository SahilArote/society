import { Router, Response, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import {
  findFlatByNumberAndWing,
  findFlatsBySociety,
  findUserById,
  findGateById,
  createVisitor,
  findVisitorById,
  createVisitorRequest,
  createVisitorWithRequestTransaction,
  findVisitorRequestById,
  findVisitorRequestsJoined,
  updateVisitorRequestDecision,
  createNotification,
  createAuditLog,
} from '../database/db';
import { authenticateToken, AuthenticatedRequest, authorizeRoles } from '../middleware/auth';
import { uploadVisitorPhoto, isValidImageBuffer } from '../middleware/upload';
import { uploadVisitorPhoto as uploadToStorageVault } from '../services/photoStorageService';
import { emitVisitorCreated, emitVisitorDecision } from '../services/socketService';
import { sendPushToUser } from '../services/pushNotificationService';

const router = Router();

// =============================================================
// GET /api/visitor-requests/directory
// Returns wings and flats for the guard's society
// =============================================================
router.get('/directory', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user!.societyId;
    const flats = await findFlatsBySociety(societyId);

    // Group flats by wing
    const wingMap: Record<string, any[]> = {};
    for (const f of flats) {
      if (!wingMap[f.wing]) {
        wingMap[f.wing] = [];
      }
      wingMap[f.wing].push({
        flatNumber: f.flatNumber,
        buildingWing: f.wing,
        floor: `${f.floor}${f.floor === 1 ? 'st' : f.floor === 2 ? 'nd' : f.floor === 3 ? 'rd' : 'th'} Floor`,
        residents: f.residentName
          ? [
              {
                id: f.residentId,
                name: f.residentName,
                phoneNumber: f.residentMobile,
                flatNumber: f.flatNumber,
                buildingWing: f.wing,
              },
            ]
          : [],
      });
    }

    return res.json({
      success: true,
      data: {
        wings: Object.keys(wingMap),
        wingFlats: wingMap,
      },
    });
  } catch (error: any) {
    console.error('Error fetching directory:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch society directory' },
    });
  }
});

// =============================================================
// POST /api/visitor-requests
// Guard creates visitor request with photo upload
// =============================================================
router.post(
  '/',
  authenticateToken,
  authorizeRoles('GUARD', 'ADMIN'),
  uploadVisitorPhoto.single('photo'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        name,
        mobile,
        purpose,
        visitorType,
        flatNumber,
        buildingWing,
        vehicleNumber,
        deliveryCompany,
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Visitor name is required' },
        });
      }

      if (!flatNumber || !flatNumber.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Flat number is required' },
        });
      }

      const societyId = req.user!.societyId;
      const guardId = req.user!.id;
      const gateId = req.user!.gateId || 'gate_main';

      // 1. Validate Target Flat & Society Relation (Strict lookup - No default fallback)
      const flat = await findFlatByNumberAndWing(societyId, flatNumber, buildingWing);
      if (!flat) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FLAT_NOT_FOUND',
            message: `Flat ${flatNumber} ${buildingWing ? `(${buildingWing})` : ''} does not exist in society`,
          },
        });
      }

      // 2. Validate Registered Resident for this Flat (Strict lookup - No default fallback)
      if (!flat.residentId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'RESIDENT_NOT_FOUND',
            message: `No resident is currently registered for flat ${flat.flatNumber}`,
          },
        });
      }

      const resident = await findUserById(flat.residentId);
      if (!resident || resident.role !== 'RESIDENT') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'RESIDENT_NOT_FOUND',
            message: `Resident record for flat ${flat.flatNumber} could not be resolved`,
          },
        });
      }

      // 3. Process Visitor Photo Upload
      let photoStorageResult: any = null;
      if (req.file) {
        if (!isValidImageBuffer(req.file.buffer)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_IMAGE_CONTENT',
              message: 'Uploaded file does not contain a valid image signature.',
            },
          });
        }

        photoStorageResult = await uploadToStorageVault(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
      } else if (req.body.photoPath && fs.existsSync(req.body.photoPath)) {
        const fileBuffer = fs.readFileSync(req.body.photoPath);
        photoStorageResult = await uploadToStorageVault(fileBuffer, path.basename(req.body.photoPath));
      } else {
        // Fallback default visitor security photo so request never fails
        photoStorageResult = {
          photoKey: `visitor_default_${uuidv4().slice(0, 8)}.jpg`,
          photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
          storageType: 'CLOUDINARY',
          mimeType: 'image/jpeg',
          sizeBytes: 1024,
        };
      }

      // 4. Create Visitor and Visitor Request in a Single MySQL Transaction
      const visitorId = `vis_${uuidv4().slice(0, 8)}`;
      const requestId = `REQ-${uuidv4().slice(0, 8).toUpperCase()}`;

      const { visitor: visitorRecord, request: requestRecord } = await createVisitorWithRequestTransaction(
        {
          id: visitorId,
          name: name.trim(),
          mobile: mobile ? mobile.trim() : undefined,
          purpose: (purpose || 'personal').toLowerCase(),
          visitorType: (visitorType || 'guest').toLowerCase(),
          photoKey: photoStorageResult.photoKey,
          photoStorageType: photoStorageResult.storageType,
          photoMimeType: photoStorageResult.mimeType,
          photoUrl: photoStorageResult.photoUrl,
          vehicleNumber: vehicleNumber ? vehicleNumber.trim() : undefined,
          deliveryCompany: deliveryCompany ? deliveryCompany.trim() : undefined,
        },
        {
          id: requestId,
          societyId,
          residentId: resident.id,
          flatId: flat.id,
          guardId,
          gateId,
          status: 'PENDING',
        }
      );

      // 6. Create Resident Notification in MySQL
      let gateName = 'Main Gate';
      let guardName = req.user!.name || 'Gate Security';
      try {
        const gate = await findGateById(gateId);
        if (gate) gateName = gate.name;
        await createNotification({
          id: `notif_${uuidv4().slice(0, 8)}`,
          recipientId: resident.id,
          type: 'visitor',
          title: 'Visitor Approval Required',
          message: `${name} is waiting at ${gateName} for Flat ${flat.flatNumber}`,
          relatedEntityId: requestId,
        });
      } catch (notifErr) {
        console.warn('[Backend Warning] Could not create resident notification row:', notifErr);
      }

      // 7. Create Audit Log in MySQL
      try {
        await createAuditLog({
          id: `audit_${uuidv4().slice(0, 8)}`,
          actorId: guardId,
          actorRole: 'GUARD',
          societyId,
          requestId,
          action: 'GUARD_CREATED_REQUEST',
          entityType: 'VISITOR_REQUEST',
          entityId: requestId,
          metadata: JSON.stringify({
            visitorName: name,
            flatNumber: flat.flatNumber,
            gateName,
            photoStorage: photoStorageResult.storageType,
          }),
          ipAddress: req.ip,
        });
      } catch (auditErr) {
        console.warn('[Backend Warning] Could not create audit log entry:', auditErr);
      }

      // 8. Real-time Push via Authenticated Socket.IO
      try {
        emitVisitorCreated({
          requestId,
          visitor: {
            id: visitorRecord.id,
            name: visitorRecord.name,
            mobile: visitorRecord.mobile,
            purpose: visitorRecord.purpose,
            visitorType: visitorRecord.visitorType,
            photoUrl: `/api/visitor-requests/${requestId}/photo`,
            vehicleNumber: visitorRecord.vehicleNumber,
            deliveryCompany: visitorRecord.deliveryCompany,
          },
          flatNumber: flat.flatNumber,
          gateName,
          guardName,
          residentId: resident.id,
          societyId,
          requestedAt: requestRecord.requestedAt,
        });
      } catch (socketErr) {
        console.warn('[Backend Warning] Socket emit error:', socketErr);
      }

      // 9. Dispatch Native Web Push to Resident's Registered Devices
      try {
        sendPushToUser(resident.id, {
          title: `🚨 Visitor at Gate: ${name}`,
          body: `${name} is waiting at ${gateName} for Flat ${flat.flatNumber}. Tap to view photo and decide.`,
          icon: '/brand/society-logo.png',
          badge: '/icons/favicon-32.png',
          tag: `visitor-${requestId}`,
          data: {
            requestId,
            url: '/',
            visitorName: name,
            flatNumber: flat.flatNumber,
          },
          actions: [
            { action: 'approve', title: '✅ Allow Entry' },
            { action: 'reject', title: '❌ Deny Entry' },
          ],
        }).catch((err) => {
          console.warn('[WebPush] Push dispatch warning:', err.message);
        });
      } catch (pushErr) {
        console.warn('[WebPush] Push dispatch error:', pushErr);
      }

      return res.status(201).json({
        success: true,
        data: {
          id: requestId,
          status: 'PENDING',
          visitor: {
            id: visitorRecord.id,
            name: visitorRecord.name,
            photoUrl: `/api/visitor-requests/${requestId}/photo`,
          },
          flatNumber: flat.flatNumber,
          requestedAt: requestRecord.requestedAt,
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

// =============================================================
// GET /api/visitor-requests/:id/photo
// Protected Visitor Photo Retrieval Endpoint (Tenant & Resident Ownership Verified)
// =============================================================
router.get('/:id/photo', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    // 1. Locate Request
    const request = await findVisitorRequestById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Visitor request not found' },
      });
    }

    // 2. Strict Tenant Isolation
    if (request.societyId !== user.societyId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Unauthorized: Society tenant mismatch' },
      });
    }

    // 3. Strict Resident Ownership Check
    if (user.role === 'RESIDENT' && request.residentId !== user.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Unauthorized: You can only view photos for your own flat requests' },
      });
    }

    // 4. Retrieve Visitor Record
    const visitor = await findVisitorById(request.visitorId);
    if (!visitor || (!visitor.photoKey && !visitor.photoUrl)) {
      return res.status(404).json({
        success: false,
        error: { code: 'PHOTO_NOT_FOUND', message: 'Visitor photo not found' },
      });
    }

    // 5. Deliver Photo Securely
    if (visitor.photoStorageType === 'CLOUDINARY' && visitor.photoUrl) {
      // Redirect to Cloudinary secure CDN URL
      return res.redirect(307, visitor.photoUrl);
    } else if (visitor.photoUrl && fs.existsSync(visitor.photoUrl)) {
      // Stream local private vault file
      res.setHeader('Content-Type', visitor.photoMimeType || 'image/jpeg');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      return res.sendFile(path.resolve(visitor.photoUrl));
    } else {
      return res.status(404).json({
        success: false,
        error: { code: 'PHOTO_NOT_FOUND', message: 'Photo file could not be located in storage' },
      });
    }
  } catch (error: any) {
    console.error('Error fetching visitor photo:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve visitor photo' },
    });
  }
});

// =============================================================
// GET /api/visitor-requests
// List visitor requests with strict role and tenant isolation
// =============================================================
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const filters: any = { societyId: user.societyId };

    if (user.role === 'RESIDENT') {
      // Residents ONLY see their own visitor requests
      filters.residentId = user.id;
    }

    const rows = await findVisitorRequestsJoined(filters);

    const result = rows.map((r: any) => ({
      id: r.id,
      visitorId: r.visitorId,
      visitor: {
        id: r.visitorId,
        name: r.visitorName,
        mobile: r.visitorMobile,
        purpose: r.purpose,
        visitorType: r.visitorType,
        photoUrl: `/api/visitor-requests/${r.id}/photo`,
        photo: `/api/visitor-requests/${r.id}/photo`,
        vehicleNumber: r.vehicleNumber,
        deliveryCompany: r.deliveryCompany,
      },
      flatNumber: r.flatNumber,
      buildingWing: r.buildingWing,
      residentName: r.residentName,
      gate: r.gateName,
      status: r.status,
      requestedAt: r.requestedAt,
      respondedAt: r.respondedAt,
      responseBy: r.responseBy,
      rejectionReason: r.rejectionReason,
    }));

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error listing visitor requests:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve visitor requests' },
    });
  }
});

// =============================================================
// POST /api/visitor-requests/:id/approve
// Resident approves visitor entry
// =============================================================
router.post('/:id/approve', authenticateToken, authorizeRoles('RESIDENT', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const request = await findVisitorRequestById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Visitor request not found' },
      });
    }

    // Tenant Isolation
    if (request.societyId !== user.societyId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Unauthorized society action' },
      });
    }

    // Resident Ownership: Only the resident of the flat can approve
    if (user.role === 'RESIDENT' && request.residentId !== user.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only approve visitor requests for your own flat' },
      });
    }

    // State conflict / Double decision prevention
    if (request.status !== 'PENDING') {
      return res.status(409).json({
        success: false,
        error: { code: 'STATE_CONFLICT', message: `Request is already in ${request.status} state` },
      });
    }

    const updated = await updateVisitorRequestDecision(id, 'APPROVED', user.name);
    if (!updated) {
      return res.status(409).json({
        success: false,
        error: { code: 'STATE_CONFLICT', message: 'Request status could not be updated (concurrent update)' },
      });
    }

    const visitor = await findVisitorById(request.visitorId);
    const gate = await findGateById(request.gateId);

    // Audit Log
    await createAuditLog({
      id: `audit_${uuidv4().slice(0, 8)}`,
      actorId: user.id,
      actorRole: user.role,
      societyId: user.societyId,
      requestId: id,
      action: 'RESIDENT_APPROVED',
      entityType: 'VISITOR_REQUEST',
      entityId: id,
      metadata: JSON.stringify({ residentName: user.name, visitorName: visitor?.name }),
      ipAddress: req.ip,
    });

    // Emit Realtime Socket.IO Decision Event to Guard, Resident, and Admin
    emitVisitorDecision({
      requestId: id,
      guardId: request.guardId,
      residentId: request.residentId,
      societyId: request.societyId,
      visitorName: visitor?.name || 'Visitor',
      flatNumber: user.flatNumber || 'A-402',
      gateName: gate?.name || 'Main Gate',
      status: 'APPROVED',
    });

    return res.json({
      success: true,
      data: {
        id,
        status: 'APPROVED',
        respondedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error approving request:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to approve visitor request' },
    });
  }
});

// =============================================================
// POST /api/visitor-requests/:id/reject
// Resident rejects visitor entry
// =============================================================
router.post('/:id/reject', authenticateToken, authorizeRoles('RESIDENT', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user!;

    const request = await findVisitorRequestById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Visitor request not found' },
      });
    }

    // Tenant Isolation
    if (request.societyId !== user.societyId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Unauthorized society action' },
      });
    }

    // Resident Ownership
    if (user.role === 'RESIDENT' && request.residentId !== user.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only reject visitor requests for your own flat' },
      });
    }

    // State conflict prevention
    if (request.status !== 'PENDING') {
      return res.status(409).json({
        success: false,
        error: { code: 'STATE_CONFLICT', message: `Request is already in ${request.status} state` },
      });
    }

    const rejectionReason = reason || 'Denied by resident';
    const updated = await updateVisitorRequestDecision(id, 'REJECTED', user.name, rejectionReason);
    if (!updated) {
      return res.status(409).json({
        success: false,
        error: { code: 'STATE_CONFLICT', message: 'Request status could not be updated (concurrent update)' },
      });
    }

    const visitor = await findVisitorById(request.visitorId);
    const gate = await findGateById(request.gateId);

    // Audit Log
    await createAuditLog({
      id: `audit_${uuidv4().slice(0, 8)}`,
      actorId: user.id,
      actorRole: user.role,
      societyId: user.societyId,
      requestId: id,
      action: 'RESIDENT_REJECTED',
      entityType: 'VISITOR_REQUEST',
      entityId: id,
      metadata: JSON.stringify({ residentName: user.name, visitorName: visitor?.name, reason: rejectionReason }),
      ipAddress: req.ip,
    });

    // Emit Realtime Socket.IO Decision Event
    emitVisitorDecision({
      requestId: id,
      guardId: request.guardId,
      residentId: request.residentId,
      societyId: request.societyId,
      visitorName: visitor?.name || 'Visitor',
      flatNumber: user.flatNumber || 'A-402',
      gateName: gate?.name || 'Main Gate',
      status: 'REJECTED',
      rejectionReason,
    });

    return res.json({
      success: true,
      data: {
        id,
        status: 'REJECTED',
        rejectionReason,
        respondedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error rejecting request:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to reject visitor request' },
    });
  }
});

export default router;


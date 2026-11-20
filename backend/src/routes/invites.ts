import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  AuthenticatedRequest,
  authenticateToken,
  authorizeRoles,
} from '../middleware/auth';
import {
  findFlatByResidentId,
  findGateById,
  createVisitorInvite,
  findInvitesByResident,
  findInviteByCode,
  markInviteAsUsed,
  cancelVisitorInvite,
  createVisitorWithRequestTransaction,
  createNotification,
} from '../database/db';
import { emitVisitorCreated, emitVisitorDecision } from '../services/socketService';
import { sendPushToUser } from '../services/pushNotificationService';
import { uploadVisitorPhoto } from '../middleware/upload';
import { uploadVisitorPhoto as uploadToStorageVault } from '../services/photoStorageService';

const router = Router();

// =============================================================
// RESIDENT INVITE PASS ENDPOINTS
// =============================================================

// POST /api/invites/resident
// Resident generates a pre-approved visitor entry pass
router.post(
  '/resident',
  authenticateToken,
  authorizeRoles('RESIDENT'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { visitorName, visitorPhone, purpose, validDate, validTime, notes } = req.body;

      if (!visitorName || !visitorName.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Visitor name is required' },
        });
      }

      const residentId = req.user!.id;
      const societyId = req.user!.societyId || 'soc_greengate';

      // Resolve resident's flat
      const flat = await findFlatByResidentId(residentId);
      if (!flat) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FLAT_NOT_FOUND',
            message: 'No registered flat found for your account',
          },
        });
      }

      // Determine validFrom and validUntil
      let validFrom = new Date();
      let validUntil = new Date();

      if (validDate) {
        const dateParts = String(validDate).split('-');
        if (dateParts.length === 3) {
          const year = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10) - 1;
          const day = parseInt(dateParts[2], 10);

          validFrom = new Date(year, month, day, 0, 0, 0);
          validUntil = new Date(year, month, day, 23, 59, 59);
        } else {
          const parsed = new Date(validDate);
          if (!isNaN(parsed.getTime())) {
            validFrom = new Date(parsed.setHours(0, 0, 0, 0));
            validUntil = new Date(parsed.setHours(23, 59, 59, 999));
          }
        }
      } else {
        validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }

      const invite = await createVisitorInvite({
        societyId,
        flatId: flat.id,
        residentId,
        visitorName: visitorName.trim(),
        visitorPhone: visitorPhone ? String(visitorPhone).trim() : undefined,
        purpose: purpose ? String(purpose).toLowerCase() : 'guest',
        validFrom,
        validUntil,
        notes: notes ? String(notes).trim() : undefined,
      });

      console.log(`[INVITES] Pass #${invite.passCode} created for "${invite.visitorName}" (Flat ${flat.flatNumber})`);

      return res.status(201).json({
        success: true,
        message: 'Pre-approved visitor pass generated successfully',
        data: invite,
      });
    } catch (error: any) {
      console.error('[INVITES] Error generating pass:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message || 'Failed to generate visitor pass' },
      });
    }
  }
);

// GET /api/invites/resident
// Resident lists their active and past pre-approved passes
router.get(
  '/resident',
  authenticateToken,
  authorizeRoles('RESIDENT'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const residentId = req.user!.id;
      const societyId = req.user!.societyId || 'soc_greengate';

      const list = await findInvitesByResident(residentId, societyId);

      return res.json({
        success: true,
        data: list,
      });
    } catch (error: any) {
      console.error('[INVITES] Error listing passes:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to fetch visitor passes' },
      });
    }
  }
);

// DELETE /api/invites/resident/:id
// Resident cancels/revokes an unused active pass
router.delete(
  '/resident/:id',
  authenticateToken,
  authorizeRoles('RESIDENT'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const residentId = req.user!.id;
      const inviteId = req.params.id;

      const cancelled = await cancelVisitorInvite(inviteId, residentId);
      if (!cancelled) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Active pass not found or cannot be cancelled',
          },
        });
      }

      console.log(`[INVITES] Pass ${inviteId} cancelled by resident ${residentId}`);
      return res.json({
        success: true,
        message: 'Visitor pass cancelled successfully',
      });
    } catch (error: any) {
      console.error('[INVITES] Error cancelling pass:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to cancel visitor pass' },
      });
    }
  }
);

// =============================================================
// GUARD PASS VERIFICATION ENDPOINTS
// =============================================================

// POST /api/invites/guard/lookup
// Guard inputs pass code or scans QR to inspect pass details BEFORE admitting visitor
router.post(
  '/guard/lookup',
  authenticateToken,
  authorizeRoles('GUARD', 'ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rawCode = req.body.passCode || req.body.code || req.body.pass_code;
      if (!rawCode || !String(rawCode).trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Pass code is required' },
        });
      }

      const cleanCode = String(rawCode).trim().replace(/\D/g, '');
      const societyId = req.user!.societyId || 'soc_greengate';

      const invite = await findInviteByCode(societyId, cleanCode);
      if (!invite) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PASS_NOT_FOUND',
            message: 'Invalid pass code. No active pass found for this code in this society.',
          },
        });
      }

      if (invite.status === 'USED') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PASS_ALREADY_USED',
            message: `This pass was already used for entry at ${invite.usedAt || 'earlier'}.`,
          },
        });
      }

      if (invite.status === 'EXPIRED') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PASS_EXPIRED',
            message: `This pass has expired (valid until ${invite.validUntil}).`,
          },
        });
      }

      if (invite.status === 'CANCELLED') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PASS_CANCELLED',
            message: 'This pass was cancelled by the resident.',
          },
        });
      }

      return res.json({
        success: true,
        message: 'Pass verified successfully',
        data: {
          invite: {
            id: invite.id,
            passCode: invite.passCode,
            visitorName: invite.visitorName,
            visitorPhone: invite.visitorPhone,
            purpose: invite.purpose,
            status: invite.status,
            flatNumber: invite.flatNumber,
            wing: invite.wing,
            residentName: invite.residentName,
            residentPhone: invite.residentPhone,
            validFrom: invite.validFrom,
            validUntil: invite.validUntil,
            notes: invite.notes,
          },
        },
      });
    } catch (error: any) {
      console.error('[INVITES] Error looking up pass:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message || 'Failed to inspect visitor pass' },
      });
    }
  }
);

// POST /api/invites/guard/verify
// Guard confirms entry with captured visitor photo & vehicle number at the security gate
router.post(
  '/guard/verify',
  authenticateToken,
  authorizeRoles('GUARD', 'ADMIN'),
  uploadVisitorPhoto.single('photo'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rawCode = req.body.passCode || req.body.code || req.body.pass_code;
      const { gateId: reqGateId, vehicleNumber, visitorPhone } = req.body;

      if (!rawCode || !String(rawCode).trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: '6-digit pass code is required' },
        });
      }

      const cleanCode = String(rawCode).trim().replace(/\D/g, '');
      const societyId = req.user!.societyId || 'soc_greengate';
      const guardId = req.user!.id;
      const gateId = reqGateId || req.user!.gateId || 'gate_main';

      console.log(`[INVITES] Guard ${guardId} verifying & checking in pass code: "${cleanCode}" at gate: "${gateId}"`);

      // 1. Find invite in this society
      const invite = await findInviteByCode(societyId, cleanCode);
      if (!invite) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PASS_NOT_FOUND',
            message: 'Invalid pass code. No active pass found for this code in this society.',
          },
        });
      }

      // 2. Check Pass Status
      if (invite.status === 'USED') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PASS_ALREADY_USED',
            message: `This pass was already used for entry at ${invite.usedAt || 'earlier'}.`,
          },
        });
      }

      if (invite.status === 'EXPIRED') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PASS_EXPIRED',
            message: `This pass has expired (valid until ${invite.validUntil}).`,
          },
        });
      }

      if (invite.status === 'CANCELLED') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PASS_CANCELLED',
            message: 'This pass was cancelled by the resident.',
          },
        });
      }

      // 3. Atomically Mark as USED (Concurrency Safe)
      const marked = await markInviteAsUsed(invite.id);
      if (!marked) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PASS_ALREADY_USED',
            message: 'Pass was just verified at another gate.',
          },
        });
      }

      // 4. Handle Visitor Photo Upload (Gate Checkpoint Snapshot)
      const visitorId = `vis_${uuidv4().slice(0, 8)}`;
      const requestId = `REQ-${uuidv4().slice(0, 8).toUpperCase()}`;

      let photoUrl: string | undefined = undefined;
      let thumbUrl: string | undefined = undefined;
      let photoKey = 'preapproved_pass';
      let photoStorageType = 'VAULT';
      let photoMimeType = 'image/jpeg';

      if (req.file) {
        try {
          const uploadRes = await uploadToStorageVault(
            req.file.path || req.file.buffer,
            req.file.originalname || `gate_pass_${visitorId}.jpg`,
            req.file.mimetype || 'image/jpeg'
          );
          photoUrl = uploadRes.photoUrl;
          photoKey = uploadRes.photoKey;
          photoStorageType = uploadRes.storageType;
          photoMimeType = uploadRes.mimeType;

          if (photoUrl && photoUrl.includes('/image/upload/')) {
            thumbUrl = photoUrl.replace('/image/upload/', '/image/upload/c_fill,h_200,w_200,q_70/');
          } else {
            thumbUrl = photoUrl;
          }
        } catch (uploadErr) {
          console.error('[INVITES] Error uploading gate captured photo:', uploadErr);
        }
      }

      let gateName = 'Main Gate';
      try {
        const gate = await findGateById(gateId);
        if (gate) gateName = gate.name;
      } catch (_) {}

      const cleanVehicle = (vehicleNumber && String(vehicleNumber).trim().length > 0)
        ? String(vehicleNumber).trim().toUpperCase()
        : undefined;

      const finalPhone = (visitorPhone && String(visitorPhone).trim().length > 0)
        ? String(visitorPhone).trim()
        : (invite.visitorPhone || undefined);

      const { visitor: visitorRecord, request: requestRecord } = await createVisitorWithRequestTransaction(
        {
          id: visitorId,
          name: invite.visitorName,
          mobile: finalPhone,
          purpose: invite.purpose || 'guest',
          visitorType: 'guest',
          photoKey,
          photoStorageType,
          photoMimeType,
          photoUrl,
          thumbUrl,
          vehicleNumber: cleanVehicle,
        },
        {
          id: requestId,
          societyId,
          residentId: invite.residentId,
          flatId: invite.flatId,
          guardId,
          gateId,
          status: 'APPROVED',
        }
      );

      // 5. Notify Resident (Push Notification & Socket)
      const notifId = `notif_${uuidv4().slice(0, 8)}`;
      const notifTitle = '🎉 Pre-Approved Guest Arrived';
      const notifBody = `${invite.visitorName} has entered through ${gateName} using Pass #${invite.passCode}.`;

      await createNotification({
        id: notifId,
        recipientId: invite.residentId,
        type: 'VISITOR_REQUEST',
        title: notifTitle,
        message: notifBody,
        relatedEntityId: requestId,
      });

      // Send FCM push notification
      sendPushToUser(invite.residentId, {
        title: notifTitle,
        body: notifBody,
        data: {
          requestId,
          type: 'VISITOR_PASS_VERIFIED',
          passCode: invite.passCode,
          visitorName: invite.visitorName,
          flatNumber: invite.flatNumber || '',
          gateName,
          photoUrl: photoUrl || '',
        },
      }).catch((err: any) => console.error('[FCM] Error notifying resident of pass check-in:', err));

      // Emit real-time socket events
      emitVisitorCreated({
        requestId,
        societyId,
        gateName,
        guardName: req.user!.name || 'Gate Security',
        visitor: {
          id: visitorId,
          name: invite.visitorName,
          mobile: finalPhone,
          purpose: invite.purpose || 'guest',
          visitorType: 'guest',
          photoUrl,
          thumbUrl,
          vehicleNumber: cleanVehicle,
        },
        flatNumber: invite.flatNumber || '',
        residentId: invite.residentId,
        requestedAt: new Date().toISOString(),
      });

      emitVisitorDecision({
        requestId,
        guardId,
        residentId: invite.residentId,
        societyId,
        visitorName: invite.visitorName,
        flatNumber: invite.flatNumber || '',
        gateName,
        status: 'APPROVED',
      });

      console.log(`[INVITES] Pass #${invite.passCode} verified & checked in successfully! Entry granted for ${invite.visitorName} to Flat ${invite.flatNumber}`);

      return res.json({
        success: true,
        message: 'Pass verified successfully. Gate entry granted.',
        data: {
          invite: {
            id: invite.id,
            passCode: invite.passCode,
            visitorName: invite.visitorName,
            visitorPhone: finalPhone,
            purpose: invite.purpose,
            status: 'USED',
            flatNumber: invite.flatNumber,
            wing: invite.wing,
            residentName: invite.residentName,
            notes: invite.notes,
            photoUrl,
            thumbUrl,
            vehicleNumber: cleanVehicle,
          },
          request: requestRecord,
        },
      });
    } catch (error: any) {
      console.error('[INVITES] Error verifying pass:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message || 'Failed to verify visitor pass' },
      });
    }
  }
);

export default router;

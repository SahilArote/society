"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const db_1 = require("../database/db");
const socketService_1 = require("../services/socketService");
const pushNotificationService_1 = require("../services/pushNotificationService");
const router = (0, express_1.Router)();
// =============================================================
// RESIDENT INVITE PASS ENDPOINTS
// =============================================================
// POST /api/invites/resident
// Resident generates a pre-approved visitor entry pass
router.post('/resident', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('RESIDENT'), async (req, res) => {
    try {
        const { visitorName, visitorPhone, purpose, validDate, validTime, notes } = req.body;
        if (!visitorName || !visitorName.trim()) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'Visitor name is required' },
            });
        }
        const residentId = req.user.id;
        const societyId = req.user.societyId || 'soc_greengate';
        // Resolve resident's flat
        const flat = await (0, db_1.findFlatByResidentId)(residentId);
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
            }
            else {
                const parsed = new Date(validDate);
                if (!isNaN(parsed.getTime())) {
                    validFrom = new Date(parsed.setHours(0, 0, 0, 0));
                    validUntil = new Date(parsed.setHours(23, 59, 59, 999));
                }
            }
        }
        else {
            validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
        }
        const invite = await (0, db_1.createVisitorInvite)({
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
    }
    catch (error) {
        console.error('[INVITES] Error generating pass:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message || 'Failed to generate visitor pass' },
        });
    }
});
// GET /api/invites/resident
// Resident lists their active and past pre-approved passes
router.get('/resident', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('RESIDENT'), async (req, res) => {
    try {
        const residentId = req.user.id;
        const societyId = req.user.societyId || 'soc_greengate';
        const list = await (0, db_1.findInvitesByResident)(residentId, societyId);
        return res.json({
            success: true,
            data: list,
        });
    }
    catch (error) {
        console.error('[INVITES] Error listing passes:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to fetch visitor passes' },
        });
    }
});
// DELETE /api/invites/resident/:id
// Resident cancels/revokes an unused active pass
router.delete('/resident/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('RESIDENT'), async (req, res) => {
    try {
        const residentId = req.user.id;
        const inviteId = req.params.id;
        const cancelled = await (0, db_1.cancelVisitorInvite)(inviteId, residentId);
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
    }
    catch (error) {
        console.error('[INVITES] Error cancelling pass:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to cancel visitor pass' },
        });
    }
});
// =============================================================
// GUARD PASS VERIFICATION ENDPOINT
// =============================================================
// POST /api/invites/guard/verify
// Guard inputs 6-digit pass code or scans QR at the security gate
router.post('/guard/verify', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('GUARD', 'ADMIN'), async (req, res) => {
    try {
        const { passCode, gateId: reqGateId } = req.body;
        if (!passCode || !String(passCode).trim()) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: '6-digit pass code is required' },
            });
        }
        const cleanCode = String(passCode).trim().replace(/\D/g, '');
        const societyId = req.user.societyId || 'soc_greengate';
        const guardId = req.user.id;
        const gateId = reqGateId || req.user.gateId || 'gate_main';
        console.log(`[INVITES] Guard ${guardId} verifying pass code: "${cleanCode}" at gate: "${gateId}"`);
        // 1. Find invite in this society
        const invite = await (0, db_1.findInviteByCode)(societyId, cleanCode);
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
        const marked = await (0, db_1.markInviteAsUsed)(invite.id);
        if (!marked) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'PASS_ALREADY_USED',
                    message: 'Pass was just verified at another gate.',
                },
            });
        }
        // 4. Create Approved Visitor & Visitor Request in Database
        const visitorId = `vis_${(0, uuid_1.v4)().slice(0, 8)}`;
        const requestId = `REQ-${(0, uuid_1.v4)().slice(0, 8).toUpperCase()}`;
        let gateName = 'Main Gate';
        try {
            const gate = await (0, db_1.findGateById)(gateId);
            if (gate)
                gateName = gate.name;
        }
        catch (_) { }
        const { visitor: visitorRecord, request: requestRecord } = await (0, db_1.createVisitorWithRequestTransaction)({
            id: visitorId,
            name: invite.visitorName,
            mobile: invite.visitorPhone || undefined,
            purpose: invite.purpose || 'guest',
            visitorType: 'guest',
            photoKey: 'preapproved_pass',
            photoStorageType: 'VAULT',
            photoMimeType: 'image/jpeg',
            photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
        }, {
            id: requestId,
            societyId,
            residentId: invite.residentId,
            flatId: invite.flatId,
            guardId,
            gateId,
            status: 'APPROVED',
        });
        // 5. Notify Resident (Push Notification & Socket)
        const notifId = `notif_${(0, uuid_1.v4)().slice(0, 8)}`;
        const notifTitle = '🎉 Pre-Approved Guest Arrived';
        const notifBody = `${invite.visitorName} has entered through ${gateName} using Pass #${invite.passCode}.`;
        await (0, db_1.createNotification)({
            id: notifId,
            recipientId: invite.residentId,
            type: 'VISITOR_REQUEST',
            title: notifTitle,
            message: notifBody,
            relatedEntityId: requestId,
        });
        // Send FCM push notification
        (0, pushNotificationService_1.sendPushToUser)(invite.residentId, {
            title: notifTitle,
            body: notifBody,
            data: {
                requestId,
                type: 'VISITOR_PASS_VERIFIED',
                passCode: invite.passCode,
                visitorName: invite.visitorName,
                flatNumber: invite.flatNumber || '',
                gateName,
            },
        }).catch((err) => console.error('[FCM] Error notifying resident of pass check-in:', err));
        // Emit real-time socket events
        (0, socketService_1.emitVisitorCreated)({
            requestId,
            societyId,
            gateName,
            guardName: req.user.name || 'Gate Security',
            visitor: {
                id: visitorId,
                name: invite.visitorName,
                mobile: invite.visitorPhone || undefined,
                purpose: invite.purpose || 'guest',
                visitorType: 'guest',
                photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
            },
            flatNumber: invite.flatNumber || '',
            residentId: invite.residentId,
            requestedAt: new Date().toISOString(),
        });
        (0, socketService_1.emitVisitorDecision)({
            requestId,
            guardId,
            residentId: invite.residentId,
            societyId,
            visitorName: invite.visitorName,
            flatNumber: invite.flatNumber || '',
            gateName,
            status: 'APPROVED',
        });
        console.log(`[INVITES] Pass #${invite.passCode} verified successfully! Entry granted for ${invite.visitorName} to Flat ${invite.flatNumber}`);
        return res.json({
            success: true,
            message: 'Pass verified successfully. Gate entry granted.',
            data: {
                invite: {
                    id: invite.id,
                    passCode: invite.passCode,
                    visitorName: invite.visitorName,
                    visitorPhone: invite.visitorPhone,
                    purpose: invite.purpose,
                    status: 'USED',
                    flatNumber: invite.flatNumber,
                    wing: invite.wing,
                    residentName: invite.residentName,
                    notes: invite.notes,
                },
                request: requestRecord,
            },
        });
    }
    catch (error) {
        console.error('[INVITES] Error verifying pass:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message || 'Failed to verify visitor pass' },
        });
    }
});
exports.default = router;

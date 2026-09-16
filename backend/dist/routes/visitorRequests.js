"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../database/db");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const photoStorageService_1 = require("../services/photoStorageService");
const socketService_1 = require("../services/socketService");
const pushNotificationService_1 = require("../services/pushNotificationService");
const router = (0, express_1.Router)();
// =============================================================
// GET /api/visitor-requests/directory
// Returns wings and flats for the guard's society
// =============================================================
router.get('/directory', auth_1.authenticateToken, async (req, res) => {
    try {
        const societyId = req.user.societyId;
        const flats = await (0, db_1.findFlatsBySociety)(societyId);
        // Group flats by wing
        const wingMap = {};
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
    }
    catch (error) {
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
router.post('/', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('GUARD', 'ADMIN'), upload_1.uploadVisitorPhoto.single('photo'), async (req, res) => {
    try {
        const { name, mobile, purpose, visitorType, flatNumber, buildingWing, vehicleNumber, deliveryCompany, } = req.body;
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
        const societyId = req.user.societyId;
        const guardId = req.user.id;
        const gateId = req.user.gateId || 'gate_main';
        // 1. Validate Target Flat & Society Relation (Strict lookup - No default fallback)
        const flat = await (0, db_1.findFlatByNumberAndWing)(societyId, flatNumber, buildingWing);
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
        const resident = await (0, db_1.findUserById)(flat.residentId);
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
        let photoStorageResult = null;
        if (req.file) {
            if (!(0, upload_1.isValidImageBuffer)(req.file.buffer)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_IMAGE_CONTENT',
                        message: 'Uploaded file does not contain a valid image signature.',
                    },
                });
            }
            photoStorageResult = await (0, photoStorageService_1.uploadVisitorPhoto)(req.file.buffer, req.file.originalname, req.file.mimetype);
        }
        else if (req.body.photoPath && fs_1.default.existsSync(req.body.photoPath)) {
            const fileBuffer = fs_1.default.readFileSync(req.body.photoPath);
            photoStorageResult = await (0, photoStorageService_1.uploadVisitorPhoto)(fileBuffer, path_1.default.basename(req.body.photoPath));
        }
        else {
            // Fallback default visitor security photo so request never fails
            photoStorageResult = {
                photoKey: `visitor_default_${(0, uuid_1.v4)().slice(0, 8)}.jpg`,
                photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
                storageType: 'CLOUDINARY',
                mimeType: 'image/jpeg',
                sizeBytes: 1024,
            };
        }
        // 4. Create Visitor and Visitor Request in a Single MySQL Transaction
        const visitorId = `vis_${(0, uuid_1.v4)().slice(0, 8)}`;
        const requestId = `REQ-${(0, uuid_1.v4)().slice(0, 8).toUpperCase()}`;
        const { visitor: visitorRecord, request: requestRecord } = await (0, db_1.createVisitorWithRequestTransaction)({
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
        }, {
            id: requestId,
            societyId,
            residentId: resident.id,
            flatId: flat.id,
            guardId,
            gateId,
            status: 'PENDING',
        });
        // 6. Create Resident Notification in MySQL
        let gateName = 'Main Gate';
        let guardName = req.user.name || 'Gate Security';
        try {
            const gate = await (0, db_1.findGateById)(gateId);
            if (gate)
                gateName = gate.name;
            await (0, db_1.createNotification)({
                id: `notif_${(0, uuid_1.v4)().slice(0, 8)}`,
                recipientId: resident.id,
                type: 'visitor',
                title: 'Visitor Approval Required',
                message: `${name} is waiting at ${gateName} for Flat ${flat.flatNumber}`,
                relatedEntityId: requestId,
            });
        }
        catch (notifErr) {
            console.warn('[Backend Warning] Could not create resident notification row:', notifErr);
        }
        // 7. Create Audit Log in MySQL
        try {
            await (0, db_1.createAuditLog)({
                id: `audit_${(0, uuid_1.v4)().slice(0, 8)}`,
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
        }
        catch (auditErr) {
            console.warn('[Backend Warning] Could not create audit log entry:', auditErr);
        }
        // 8. Real-time Push via Authenticated Socket.IO
        try {
            (0, socketService_1.emitVisitorCreated)({
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
        }
        catch (socketErr) {
            console.warn('[Backend Warning] Socket emit error:', socketErr);
        }
        // 9. Dispatch Native Web Push to Resident's Registered Devices
        try {
            (0, pushNotificationService_1.sendPushToUser)(resident.id, {
                title: `🚨 Visitor at Gate: ${name}`,
                body: `${name} is waiting at ${gateName} for Flat ${flat.flatNumber}. Tap to view photo and decide.`,
                icon: '/icons/icon-192.png',
                badge: '/icons/favicon-32.png',
                image: `/api/visitor-requests/${requestId}/photo`,
                tag: `visitor-${requestId}`,
                data: {
                    requestId,
                    url: '/home',
                    visitorName: name,
                    flatNumber: flat.flatNumber,
                },
            }).catch((err) => {
                console.warn('[WebPush] Push dispatch warning:', err.message);
            });
        }
        catch (pushErr) {
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
    }
    catch (error) {
        console.error('Error creating visitor request:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error?.message || 'Internal server error' },
        });
    }
});
// =============================================================
// GET /api/visitor-requests/:id/photo
// Protected Visitor Photo Retrieval Endpoint (Tenant & Resident Ownership Verified)
// =============================================================
router.get('/:id/photo', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        // 1. Locate Request
        const request = await (0, db_1.findVisitorRequestById)(id);
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
        const visitor = await (0, db_1.findVisitorById)(request.visitorId);
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
        }
        else if (visitor.photoUrl && fs_1.default.existsSync(visitor.photoUrl)) {
            // Stream local private vault file
            res.setHeader('Content-Type', visitor.photoMimeType || 'image/jpeg');
            res.setHeader('Cache-Control', 'private, max-age=3600');
            return res.sendFile(path_1.default.resolve(visitor.photoUrl));
        }
        else {
            return res.status(404).json({
                success: false,
                error: { code: 'PHOTO_NOT_FOUND', message: 'Photo file could not be located in storage' },
            });
        }
    }
    catch (error) {
        console.error('Error fetching visitor photo:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to retrieve visitor photo' },
        });
    }
});
// =============================================================
// GET /api/visitor-requests/:id
// Retrieve details of a specific visitor request
// =============================================================
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const r = await (0, db_1.findVisitorRequestJoinedById)(id);
        if (!r) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Visitor request not found' },
            });
        }
        // Role check: Resident can only view their own flat's requests
        if (user.role === 'RESIDENT' && r.residentId && r.residentId !== user.id) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You are not authorized to view this visitor record' },
            });
        }
        return res.json({
            success: true,
            data: {
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
                gateName: r.gateName,
                guardName: r.guardName,
                status: r.status,
                requestedAt: r.requestedAt,
                respondedAt: r.respondedAt,
                responseBy: r.responseBy,
                rejectionReason: r.rejectionReason,
            },
        });
    }
    catch (err) {
        console.error('Error fetching visitor request by id:', err);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to retrieve visitor record' },
        });
    }
});
// =============================================================
// GET /api/visitor-requests
// List visitor requests with strict role and tenant isolation
// =============================================================
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const filters = { societyId: user.societyId };
        if (user.role === 'RESIDENT') {
            // Residents ONLY see their own visitor requests
            filters.residentId = user.id;
        }
        const rows = await (0, db_1.findVisitorRequestsJoined)(filters);
        const result = rows.map((r) => ({
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
    }
    catch (error) {
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
router.post('/:id/approve', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('RESIDENT', 'ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const request = await (0, db_1.findVisitorRequestById)(id);
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
        const updated = await (0, db_1.updateVisitorRequestDecision)(id, 'APPROVED', user.name);
        if (!updated) {
            return res.status(409).json({
                success: false,
                error: { code: 'STATE_CONFLICT', message: 'Request status could not be updated (concurrent update)' },
            });
        }
        const visitor = await (0, db_1.findVisitorById)(request.visitorId);
        const gate = await (0, db_1.findGateById)(request.gateId);
        // Audit Log
        await (0, db_1.createAuditLog)({
            id: `audit_${(0, uuid_1.v4)().slice(0, 8)}`,
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
        (0, socketService_1.emitVisitorDecision)({
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
    }
    catch (error) {
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
router.post('/:id/reject', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('RESIDENT', 'ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const user = req.user;
        const request = await (0, db_1.findVisitorRequestById)(id);
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
        const updated = await (0, db_1.updateVisitorRequestDecision)(id, 'REJECTED', user.name, rejectionReason);
        if (!updated) {
            return res.status(409).json({
                success: false,
                error: { code: 'STATE_CONFLICT', message: 'Request status could not be updated (concurrent update)' },
            });
        }
        const visitor = await (0, db_1.findVisitorById)(request.visitorId);
        const gate = await (0, db_1.findGateById)(request.gateId);
        // Audit Log
        await (0, db_1.createAuditLog)({
            id: `audit_${(0, uuid_1.v4)().slice(0, 8)}`,
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
        (0, socketService_1.emitVisitorDecision)({
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
    }
    catch (error) {
        console.error('Error rejecting request:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to reject visitor request' },
        });
    }
});
exports.default = router;

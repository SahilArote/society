"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../database/db");
const mysql_1 = require("../database/mysql");
const auth_1 = require("../middleware/auth");
const socketService_1 = require("../services/socketService");
const router = (0, express_1.Router)();
// GET /api/admin/activity
// Live activity feed for admin (METADATA ONLY, STRICTLY NO VISITOR PHOTO)
router.get('/activity', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user.societyId;
        const rows = await (0, db_1.findVisitorRequestsJoined)({ societyId, limit: 30 });
        // Exclude photo data completely for admin activity per requirements
        const activity = rows.map((r) => ({
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
    }
    catch (error) {
        console.error('Error fetching admin activity:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to fetch admin activity' },
        });
    }
});
// GET /api/admin/stats
router.get('/stats', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user.societyId;
        const pool = await (0, mysql_1.getMysqlPool)();
        if (!pool)
            throw new Error('Database pool unavailable');
        const [flatRows] = await pool.query('SELECT COUNT(*) as cnt FROM flats WHERE society_id = ?', [societyId]);
        const [residentRows] = await pool.query("SELECT COUNT(*) as cnt FROM users WHERE society_id = ? AND role = 'RESIDENT'", [societyId]);
        const [requestRows] = await pool.query('SELECT status, COUNT(*) as cnt FROM visitor_requests WHERE society_id = ? GROUP BY status', [societyId]);
        const [pendingRegRows] = await pool.query("SELECT COUNT(*) as cnt FROM resident_registrations WHERE society_id = ? AND status = 'PENDING'", [societyId]);
        const statusCounts = {};
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
                pendingRegistrations: pendingRegRows[0]?.cnt || 0,
            },
        });
    }
    catch (error) {
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
router.get('/registrations', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user.societyId;
        const status = req.query.status || 'ALL';
        const registrations = await (0, db_1.findResidentRegistrations)({
            societyId,
            status: status.toUpperCase(),
            limit: 100,
        });
        return res.json({
            success: true,
            data: registrations,
        });
    }
    catch (error) {
        console.error('Error fetching registrations:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to fetch resident registration requests' },
        });
    }
});
// POST /api/admin/registrations/:id/approve
router.post('/registrations/:id/approve', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user.societyId;
        const adminId = req.user.id;
        const { id } = req.params;
        const existing = await (0, db_1.findResidentRegistrationById)(id);
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
        const result = await (0, db_1.approveResidentRegistration)(id, adminId);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'APPROVAL_FAILED', message: result.error || 'Failed to approve registration' },
            });
        }
        // 1. Emit Realtime Socket.IO Event to Resident & Society & Admin rooms
        (0, socketService_1.emitRegistrationUpdated)(societyId, id, existing.mobile, 'APPROVED');
        // 2. Notify resident if user was created
        if (result.user) {
            (0, db_1.createNotification)({
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
    }
    catch (error) {
        console.error('Error approving registration:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Server error while approving registration' },
        });
    }
});
// POST /api/admin/registrations/:id/reject
router.post('/registrations/:id/reject', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user.societyId;
        const adminId = req.user.id;
        const { id } = req.params;
        const { reason } = req.body;
        const existing = await (0, db_1.findResidentRegistrationById)(id);
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
        const result = await (0, db_1.rejectResidentRegistration)(id, adminId, rejectionReason);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: { code: 'REJECTION_FAILED', message: result.error || 'Failed to reject registration' },
            });
        }
        // Emit Realtime Socket.IO Event
        (0, socketService_1.emitRegistrationUpdated)(societyId, id, existing.mobile, 'REJECTED', rejectionReason);
        return res.json({
            success: true,
            message: `Registration for flat ${existing.flatNumber} rejected.`,
            data: {
                id,
                status: 'REJECTED',
                rejectionReason,
            },
        });
    }
    catch (error) {
        console.error('Error rejecting registration:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Server error while rejecting registration' },
        });
    }
});
exports.default = router;

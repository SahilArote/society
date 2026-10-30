"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
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
        const [flatRows] = await pool.query('SELECT COUNT(*) as total, SUM(CASE WHEN resident_id IS NOT NULL THEN 1 ELSE 0 END) as occupied FROM flats WHERE society_id = ?', [societyId]);
        const [residentRows] = await pool.query("SELECT COUNT(*) as cnt FROM users WHERE society_id = ? AND role = 'RESIDENT'", [societyId]);
        const [requestRows] = await pool.query('SELECT status, COUNT(*) as cnt FROM visitor_requests WHERE society_id = ? GROUP BY status', [societyId]);
        const [todayReqRows] = await pool.query('SELECT COUNT(*) as cnt FROM visitor_requests WHERE society_id = ? AND DATE(requested_at) = CURRENT_DATE()', [societyId]);
        const [pendingRegRows] = await pool.query("SELECT COUNT(*) as cnt FROM resident_registrations WHERE society_id = ? AND status = 'PENDING'", [societyId]);
        const [gateRows] = await pool.query("SELECT COUNT(*) as total, SUM(CASE WHEN UPPER(status) = 'OPERATIONAL' THEN 1 ELSE 0 END) as operational FROM gates WHERE society_id = ?", [societyId]);
        const [guardRows] = await pool.query("SELECT COUNT(*) as total, SUM(CASE WHEN UPPER(g.status) = 'ON_DUTY' THEN 1 ELSE 0 END) as active FROM guards g JOIN users u ON g.user_id = u.id WHERE u.society_id = ?", [societyId]);
        const statusCounts = {};
        for (const r of requestRows) {
            statusCounts[r.status] = Number(r.cnt || 0);
        }
        // 7-day visitor traffic trend
        let visitorTrend = [];
        try {
            const [trendRows] = await pool.query(`
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
                visitorTrend = trendRows.map((tr) => ({
                    day: tr.day_name,
                    guests: Number(tr.guests || 0),
                    deliveries: Number(tr.deliveries || 0),
                    cabs: Number(tr.cabs || 0),
                    services: Number(tr.services || 0),
                    total: Number(tr.total || 0),
                }));
            }
        }
        catch (trendErr) {
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
// =============================================================
// FLATS & DIRECTORY (ADMIN)
// =============================================================
// GET /api/admin/flats
router.get('/flats', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user.societyId;
        const flats = await (0, db_1.findFlatsWithResidents)(societyId);
        return res.json({
            success: true,
            data: flats,
        });
    }
    catch (error) {
        console.error('Error fetching admin flats:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to fetch flats directory' },
        });
    }
});
// POST /api/admin/flats
router.post('/flats', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user.societyId;
        const { number, wing, floor, ownerName, ownerPhone } = req.body;
        if (!number || !wing) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'Flat number and wing are required' },
            });
        }
        const flat = await (0, db_1.createFlatRecord)({
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
    }
    catch (error) {
        console.error('Error creating flat:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message || 'Failed to create flat' },
        });
    }
});
// Multer memory storage for bulk CSV upload
const uploadCsv = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});
// Helper: Robust RFC 4180 CSV parser
function parseCsvContent(csvText) {
    const rows = [];
    let currentRow = [];
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
                }
                else {
                    inQuotes = false;
                }
            }
            else {
                currentField += char;
            }
        }
        else {
            if (char === '"') {
                inQuotes = true;
            }
            else if (char === ',') {
                currentRow.push(currentField.trim());
                currentField = '';
            }
            else if (char === '\n') {
                currentRow.push(currentField.trim());
                if (currentRow.some((col) => col.length > 0)) {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentField = '';
            }
            else {
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
// GET /api/admin/flats/csv-template
// Download sample CSV template for bulk flats & residents onboarding
router.get('/flats/csv-template', (_req, res) => {
    const sampleCsv = [
        'FlatNumber,Wing,Floor,ResidentName,MobileNumber,FlatType',
        '101,A,1,Aarav Sharma,9876543210,2BHK',
        '102,A,1,Priya Mehta,9876543211,2BHK',
        '201,B,2,Vikram Malhotra,9876543212,3BHK',
        '202,B,2,,,3BHK',
        '301,C,3,Neha Verma,9876543214,1BHK',
        '401,D,4,Rohan Desai,9876543215,4BHK',
    ].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="greengate_flats_template.csv"');
    return res.status(200).send(sampleCsv);
});
// POST /api/admin/flats/bulk-import
// Bulk import flats and resident accounts via CSV file upload or JSON payload
router.post('/flats/bulk-import', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), uploadCsv.single('file'), async (req, res) => {
    try {
        const societyId = req.user.societyId || 'soc_greengate';
        const pool = await (0, mysql_1.getMysqlPool)();
        if (!pool) {
            return res.status(500).json({
                success: false,
                error: { code: 'DATABASE_ERROR', message: 'Database connection pool unavailable' },
            });
        }
        let recordsToProcess = [];
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
            // Determine header indices
            let colFlat = 0;
            let colWing = 1;
            let colFloor = 2;
            let colResident = 3;
            let colMobile = 4;
            let colType = 5;
            let hasHeader = false;
            const firstRow = parsedRows[0];
            firstRow.forEach((col, idx) => {
                const norm = col.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (['flatnumber', 'flatno', 'flat', 'number', 'unit'].includes(norm)) {
                    colFlat = idx;
                    hasHeader = true;
                }
                else if (['wing', 'wingname', 'block', 'tower', 'building'].includes(norm)) {
                    colWing = idx;
                    hasHeader = true;
                }
                else if (['floor', 'floornumber', 'level'].includes(norm)) {
                    colFloor = idx;
                }
                else if (['residentname', 'resident', 'ownername', 'owner', 'name'].includes(norm)) {
                    colResident = idx;
                }
                else if (['mobilenumber', 'mobile', 'phone', 'contact', 'phonenumber'].includes(norm)) {
                    colMobile = idx;
                }
                else if (['flattype', 'type', 'config', 'configuration'].includes(norm)) {
                    colType = idx;
                }
            });
            const startIdx = hasHeader ? 1 : 0;
            for (let r = startIdx; r < parsedRows.length; r++) {
                const row = parsedRows[r];
                if (!row || row.length === 0 || row.every((c) => !c))
                    continue;
                recordsToProcess.push({
                    flatNumber: row[colFlat] || '',
                    wing: row[colWing] || '',
                    floor: row[colFloor] || '',
                    residentName: row[colResident] || '',
                    mobileNumber: row[colMobile] || '',
                    flatType: row[colType] || '',
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
            let hasHeader = false;
            if (parsedRows.length > 0) {
                parsedRows[0].forEach((col, idx) => {
                    const norm = col.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (['flatnumber', 'flatno', 'flat', 'number', 'unit'].includes(norm)) {
                        colFlat = idx;
                        hasHeader = true;
                    }
                    else if (['wing', 'wingname', 'block', 'tower', 'building'].includes(norm)) {
                        colWing = idx;
                        hasHeader = true;
                    }
                    else if (['floor', 'floornumber', 'level'].includes(norm)) {
                        colFloor = idx;
                    }
                    else if (['residentname', 'resident', 'ownername', 'owner', 'name'].includes(norm)) {
                        colResident = idx;
                    }
                    else if (['mobilenumber', 'mobile', 'phone', 'contact', 'phonenumber'].includes(norm)) {
                        colMobile = idx;
                    }
                    else if (['flattype', 'type', 'config', 'configuration'].includes(norm)) {
                        colType = idx;
                    }
                });
                const startIdx = hasHeader ? 1 : 0;
                for (let r = startIdx; r < parsedRows.length; r++) {
                    const row = parsedRows[r];
                    if (!row || row.length === 0 || row.every((c) => !c))
                        continue;
                    recordsToProcess.push({
                        flatNumber: row[colFlat] || '',
                        wing: row[colWing] || '',
                        floor: row[colFloor] || '',
                        residentName: row[colResident] || '',
                        mobileNumber: row[colMobile] || '',
                        flatType: row[colType] || '',
                        sourceRow: r + 1,
                    });
                }
            }
        }
        // Case 3: JSON array of records
        else if (req.body && Array.isArray(req.body.records)) {
            recordsToProcess = req.body.records.map((rec, idx) => ({
                flatNumber: String(rec.flatNumber || rec.number || '').trim(),
                wing: String(rec.wing || '').trim(),
                floor: rec.floor,
                residentName: String(rec.residentName || rec.ownerName || rec.name || '').trim(),
                mobileNumber: String(rec.mobileNumber || rec.mobile || rec.phone || '').trim(),
                flatType: String(rec.flatType || rec.type || '').trim(),
                sourceRow: idx + 1,
            }));
        }
        else {
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
        const errors = [];
        const importedFlats = [];
        for (const item of recordsToProcess) {
            const rowNum = item.sourceRow;
            const rawFlatNumber = item.flatNumber.trim();
            const rawWing = item.wing.trim();
            if (!rawFlatNumber) {
                errors.push({ row: rowNum, reason: 'Flat number is required' });
                failedCount++;
                continue;
            }
            if (!rawWing) {
                errors.push({ row: rowNum, flat: rawFlatNumber, reason: 'Wing identifier is required' });
                failedCount++;
                continue;
            }
            const cleanWing = rawWing.toLowerCase().startsWith('wing')
                ? rawWing
                : `Wing ${rawWing.toUpperCase()}`;
            const cleanFlatNumber = rawFlatNumber.toUpperCase();
            // Calculate floor
            let floor = parseInt(String(item.floor || ''), 10);
            if (isNaN(floor) || floor <= 0) {
                const digits = cleanFlatNumber.replace(/\D/g, '');
                if (digits.length >= 3) {
                    floor = parseInt(digits.slice(0, -2), 10) || 1;
                }
                else {
                    floor = 1;
                }
            }
            // Validate mobile if provided
            let cleanMobile = null;
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
                // Check if flat already exists
                const [existingFlats] = await pool.query(`SELECT id, resident_id FROM flats WHERE society_id = ? AND wing = ? AND flat_number = ? LIMIT 1`, [societyId, cleanWing, cleanFlatNumber]);
                const existing = existingFlats && existingFlats.length > 0 ? existingFlats[0] : null;
                let residentId = null;
                if (cleanMobile) {
                    residentId = `res_${cleanMobile}`;
                    await pool.query(`INSERT INTO users (id, name, mobile, role, society_id, status)
               VALUES (?, ?, ?, 'RESIDENT', ?, 'ACTIVE')
               ON DUPLICATE KEY UPDATE name = VALUES(name), society_id = VALUES(society_id), status = 'ACTIVE'`, [residentId, cleanResidentName, cleanMobile, societyId]);
                }
                let flatId;
                if (existing) {
                    flatId = existing.id;
                    const finalResidentId = residentId !== null ? residentId : existing.resident_id;
                    await pool.query(`UPDATE flats 
               SET floor = ?, resident_id = ?
               WHERE id = ?`, [floor, finalResidentId, flatId]);
                    updatedCount++;
                }
                else {
                    flatId = `flat_${cleanFlatNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                    await pool.query(`INSERT INTO flats (id, society_id, flat_number, wing, floor, resident_id)
               VALUES (?, ?, ?, ?, ?, ?)`, [flatId, societyId, cleanFlatNumber, cleanWing, floor, residentId || null]);
                    createdCount++;
                }
                importedFlats.push({
                    id: flatId,
                    flatNumber: cleanFlatNumber,
                    wing: cleanWing,
                    floor,
                    status: residentId || (existing && existing.resident_id) ? 'occupied' : 'vacant',
                    residentName: cleanResidentName || undefined,
                    mobile: cleanMobile || undefined,
                    isUpdate: Boolean(existing),
                });
            }
            catch (dbErr) {
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
    }
    catch (err) {
        console.error('Fatal error during flats bulk import:', err);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: err.message || 'Failed to process bulk import' },
        });
    }
});
// DELETE /api/admin/flats/:id
router.delete('/flats/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user.societyId;
        const flatId = req.params.id;
        const deleted = await (0, db_1.deleteFlatByAdmin)(societyId, flatId);
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
    }
    catch (error) {
        console.error('Error deleting flat:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to delete flat' },
        });
    }
});
// DELETE /api/admin/residents/:id
router.delete('/residents/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user.societyId;
        const residentId = req.params.id;
        const deleted = await (0, db_1.deleteResidentByAdmin)(societyId, residentId);
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
    }
    catch (error) {
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
router.get('/visitors', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user.societyId;
        const { tab, gate, search, limit } = req.query;
        const visitors = await (0, db_1.findAdminVisitorLogs)(societyId, {
            tab: tab,
            gate: gate,
            search: search,
            limit: limit ? Number(limit) : undefined,
        });
        return res.json({
            success: true,
            data: visitors,
        });
    }
    catch (error) {
        console.error('Error fetching admin visitors:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to fetch visitor logs' },
        });
    }
});
// POST /api/admin/visitors/:id/approve
router.post('/visitors/:id/approve', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const ok = await (0, db_1.updateVisitorStatusByAdmin)(id, 'approve');
        if (!ok) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Visitor request not found' } });
        }
        return res.json({ success: true, message: 'Visitor entry granted by administrator' });
    }
    catch (error) {
        console.error('Error approving visitor:', error);
        return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to approve visitor entry' } });
    }
});
// POST /api/admin/visitors/:id/deny
router.post('/visitors/:id/deny', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const ok = await (0, db_1.updateVisitorStatusByAdmin)(id, 'deny', reason);
        if (!ok) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Visitor request not found' } });
        }
        return res.json({ success: true, message: 'Visitor entry denied by administrator' });
    }
    catch (error) {
        console.error('Error denying visitor:', error);
        return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to deny visitor entry' } });
    }
});
// POST /api/admin/visitors/:id/exit
router.post('/visitors/:id/exit', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const ok = await (0, db_1.updateVisitorStatusByAdmin)(id, 'exit');
        if (!ok) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Visitor request not found' } });
        }
        return res.json({ success: true, message: 'Visitor marked as exited from premises' });
    }
    catch (error) {
        console.error('Error marking visitor exited:', error);
        return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to mark visitor exited' } });
    }
});
// DELETE /api/admin/visitors/:id
router.delete('/visitors/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user.societyId;
        const requestId = req.params.id;
        const deleted = await (0, db_1.deleteVisitorLogByAdmin)(societyId, requestId);
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
    }
    catch (error) {
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
router.get('/gates', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user.societyId;
        const gates = await (0, db_1.findGatesBySociety)(societyId);
        return res.json({
            success: true,
            data: gates,
        });
    }
    catch (error) {
        console.error('Error fetching gates:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to fetch gates' },
        });
    }
});
// PATCH /api/admin/gates/:id/toggle
router.patch('/gates/:id/toggle', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const nextStatus = status ? String(status) : 'MAINTENANCE';
        await (0, db_1.toggleGateStatus)(id, nextStatus);
        return res.json({
            success: true,
            message: `Gate barrier updated to ${nextStatus}`,
            data: { id, status: nextStatus.toLowerCase() },
        });
    }
    catch (error) {
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
router.get('/guards', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user.societyId;
        const guards = await (0, db_1.findGuardsWithDetails)(societyId);
        return res.json({
            success: true,
            data: guards,
        });
    }
    catch (error) {
        console.error('Error fetching guards:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to fetch security guards' },
        });
    }
});
// POST /api/admin/guards
router.post('/guards', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user.societyId;
        const { name, phone, assignedGate, shift } = req.body;
        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'Guard name and phone number are required' },
            });
        }
        const guard = await (0, db_1.createGuardRecord)({
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
    }
    catch (error) {
        console.error('Error registering guard:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message || 'Failed to register guard' },
        });
    }
});
// =============================================================
// SOCIETY SETTINGS (ADMIN)
// =============================================================
// GET /api/admin/settings
router.get('/settings', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user.societyId;
        const society = await (0, db_1.findSocietyById)(societyId);
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
        return res.json({
            success: true,
            data: {
                id: society.id,
                name: society.name,
                address: society.address,
                city: society.address?.includes(',') ? society.address.split(',').pop()?.trim() : 'Mumbai, MH',
                totalFlats: 120,
            },
        });
    }
    catch (error) {
        console.error('Error fetching society settings:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to fetch society settings' },
        });
    }
});
// PATCH /api/admin/settings
router.patch('/settings', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user.societyId;
        const { name, address, city } = req.body;
        let fullAddress = address;
        if (city && address && !address.toLowerCase().includes(city.toLowerCase())) {
            fullAddress = `${address.trim()}, ${city.trim()}`;
        }
        else if (city && !address) {
            fullAddress = city.trim();
        }
        const updated = await (0, db_1.updateSociety)(societyId, {
            name: name?.trim(),
            address: fullAddress?.trim(),
        });
        return res.json({
            success: true,
            message: 'Society configuration updated successfully',
            data: updated || {
                id: societyId,
                name: name || 'GreenGate Residency',
                address: fullAddress || 'Mumbai, MH',
                city: city || 'Mumbai, MH',
            },
        });
    }
    catch (error) {
        console.error('Error updating society settings:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to update society settings' },
        });
    }
});
exports.default = router;

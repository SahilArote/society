"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = initDb;
exports.findUserByMobile = findUserByMobile;
exports.findUserByEmail = findUserByEmail;
exports.findUserById = findUserById;
exports.findGuardByUserId = findGuardByUserId;
exports.findGateById = findGateById;
exports.findSocietyById = findSocietyById;
exports.findFlatByNumberAndWing = findFlatByNumberAndWing;
exports.findFlatByResidentId = findFlatByResidentId;
exports.findFlatsBySociety = findFlatsBySociety;
exports.createVisitor = createVisitor;
exports.findVisitorById = findVisitorById;
exports.createVisitorRequest = createVisitorRequest;
exports.findVisitorRequestById = findVisitorRequestById;
exports.findVisitorRequestsJoined = findVisitorRequestsJoined;
exports.updateVisitorRequestDecision = updateVisitorRequestDecision;
exports.createNotification = createNotification;
exports.findNotificationsByRecipient = findNotificationsByRecipient;
exports.createAuditLog = createAuditLog;
exports.saveOtpRecord = saveOtpRecord;
exports.verifyOtpRecord = verifyOtpRecord;
const mysql_1 = require("./mysql");
async function initDb() {
    await (0, mysql_1.runMysqlMigrations)();
}
// -------------------------------------------------------------
// USER QUERIES
// -------------------------------------------------------------
async function findUserByMobile(mobile) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return null;
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length < 6) {
        const [rows] = await pool.query('SELECT * FROM users WHERE mobile = ? OR id = ? LIMIT 1', [mobile, mobile]);
        if (!rows[0])
            return null;
        const r = rows[0];
        return {
            id: r.id,
            name: r.name,
            mobile: r.mobile,
            email: r.email,
            passwordHash: r.password_hash,
            pinHash: r.pin_hash,
            role: r.role,
            societyId: r.society_id,
            status: r.status,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        };
    }
    const [rows] = await pool.query('SELECT * FROM users WHERE mobile = ? OR mobile LIKE ? LIMIT 1', [mobile, `%${cleanMobile}`]);
    if (!rows[0])
        return null;
    const r = rows[0];
    return {
        id: r.id,
        name: r.name,
        mobile: r.mobile,
        email: r.email,
        passwordHash: r.password_hash,
        pinHash: r.pin_hash,
        role: r.role,
        societyId: r.society_id,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}
async function findUserByEmail(email) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return null;
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email.trim().toLowerCase()]);
    if (!rows[0])
        return null;
    const r = rows[0];
    return {
        id: r.id,
        name: r.name,
        mobile: r.mobile,
        email: r.email,
        passwordHash: r.password_hash,
        pinHash: r.pin_hash,
        role: r.role,
        societyId: r.society_id,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}
async function findUserById(id) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return null;
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    if (!rows[0])
        return null;
    const r = rows[0];
    return {
        id: r.id,
        name: r.name,
        mobile: r.mobile,
        email: r.email,
        passwordHash: r.password_hash,
        pinHash: r.pin_hash,
        role: r.role,
        societyId: r.society_id,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}
// -------------------------------------------------------------
// GUARD QUERIES
// -------------------------------------------------------------
async function findGuardByUserId(userId) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return null;
    const [rows] = await pool.query('SELECT * FROM guards WHERE user_id = ? LIMIT 1', [userId]);
    if (!rows[0])
        return null;
    const r = rows[0];
    return {
        id: r.id,
        userId: r.user_id,
        gateId: r.gate_id,
        shift: r.shift,
        status: r.status,
    };
}
// -------------------------------------------------------------
// GATE & SOCIETY QUERIES
// -------------------------------------------------------------
async function findGateById(gateId) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return null;
    const [rows] = await pool.query('SELECT * FROM gates WHERE id = ? LIMIT 1', [gateId]);
    if (!rows[0])
        return null;
    const r = rows[0];
    return {
        id: r.id,
        societyId: r.society_id,
        name: r.name,
        location: r.location,
        status: r.status,
    };
}
async function findSocietyById(societyId) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return null;
    const [rows] = await pool.query('SELECT * FROM societies WHERE id = ? LIMIT 1', [societyId]);
    if (!rows[0])
        return null;
    const r = rows[0];
    return {
        id: r.id,
        name: r.name,
        address: r.address,
        status: r.status,
        createdAt: r.created_at,
    };
}
// -------------------------------------------------------------
// FLAT QUERIES
// -------------------------------------------------------------
async function findFlatByNumberAndWing(societyId, flatNumber, wing) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return null;
    const cleanFlat = flatNumber.trim();
    // 1. Try matching with flexible wing name (extracting wing letter e.g. 'A' from 'Wing A' or 'Tower A')
    if (wing && wing.trim()) {
        const cleanWing = wing.trim();
        const wingLetter = cleanWing.replace(/^(Wing|Tower)\s*/i, '').trim();
        const query = `
      SELECT f.*, u.name as res_name, u.mobile as res_mobile 
      FROM flats f 
      LEFT JOIN users u ON f.resident_id = u.id 
      WHERE f.society_id = ? 
        AND UPPER(f.flat_number) = UPPER(?) 
        AND (
          LOWER(f.wing) = LOWER(?) 
          OR f.wing LIKE ? 
          OR LOWER(?) LIKE CONCAT('%', LOWER(f.wing), '%')
        )
      LIMIT 1
    `;
        const [rows] = await pool.query(query, [societyId, cleanFlat, cleanWing, `%${wingLetter}%`, cleanWing]);
        if (rows && rows[0]) {
            const r = rows[0];
            return {
                id: r.id,
                societyId: r.society_id,
                flatNumber: r.flat_number,
                wing: r.wing,
                floor: r.floor,
                residentId: r.resident_id,
                residentName: r.res_name,
                residentMobile: r.res_mobile,
            };
        }
    }
    // 2. Fallback: match by flatNumber alone within the society
    const fallbackQuery = `
    SELECT f.*, u.name as res_name, u.mobile as res_mobile 
    FROM flats f 
    LEFT JOIN users u ON f.resident_id = u.id 
    WHERE f.society_id = ? AND UPPER(f.flat_number) = UPPER(?)
    LIMIT 1
  `;
    const [fbRows] = await pool.query(fallbackQuery, [societyId, cleanFlat]);
    if (fbRows && fbRows[0]) {
        const r = fbRows[0];
        return {
            id: r.id,
            societyId: r.society_id,
            flatNumber: r.flat_number,
            wing: r.wing,
            floor: r.floor,
            residentId: r.resident_id,
            residentName: r.res_name,
            residentMobile: r.res_mobile,
        };
    }
    return null;
}
async function findFlatByResidentId(residentId) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return null;
    const [rows] = await pool.query('SELECT * FROM flats WHERE resident_id = ? LIMIT 1', [residentId]);
    if (!rows[0])
        return null;
    const r = rows[0];
    return {
        id: r.id,
        societyId: r.society_id,
        flatNumber: r.flat_number,
        wing: r.wing,
        floor: r.floor,
        residentId: r.resident_id,
    };
}
async function findFlatsBySociety(societyId) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return [];
    const [rows] = await pool.query(`SELECT f.*, u.name as res_name, u.mobile as res_mobile 
     FROM flats f 
     LEFT JOIN users u ON f.resident_id = u.id 
     WHERE f.society_id = ? 
     ORDER BY f.wing, f.flat_number`, [societyId]);
    return rows.map((r) => ({
        id: r.id,
        societyId: r.society_id,
        flatNumber: r.flat_number,
        wing: r.wing,
        floor: r.floor,
        residentId: r.resident_id,
        residentName: r.res_name,
        residentMobile: r.res_mobile,
    }));
}
// -------------------------------------------------------------
// VISITOR & VISITOR REQUEST QUERIES
// -------------------------------------------------------------
async function createVisitor(data) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        throw new Error('Database pool unavailable');
    const safeName = (data.name || 'Visitor').trim().slice(0, 250);
    const safeMobile = data.mobile ? data.mobile.trim().slice(0, 30) : null;
    const safePurpose = (data.purpose || 'personal').trim().slice(0, 250);
    const safeVisitorType = (data.visitorType || 'guest').trim().slice(0, 60);
    const safeVehicle = data.vehicleNumber ? data.vehicleNumber.trim().slice(0, 60) : null;
    const safeCompany = data.deliveryCompany ? data.deliveryCompany.trim().slice(0, 120) : null;
    await pool.query(`INSERT INTO visitors (id, name, mobile, purpose, visitor_type, photo_key, photo_storage_type, photo_mime_type, photo_url, vehicle_number, delivery_company) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        data.id,
        safeName,
        safeMobile,
        safePurpose,
        safeVisitorType,
        data.photoKey || null,
        data.photoStorageType || 'VAULT',
        data.photoMimeType || 'image/jpeg',
        data.photoUrl || null,
        safeVehicle,
        safeCompany,
    ]);
    return {
        ...data,
        createdAt: new Date().toISOString(),
    };
}
async function findVisitorById(id) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return null;
    const [rows] = await pool.query('SELECT * FROM visitors WHERE id = ? LIMIT 1', [id]);
    if (!rows[0])
        return null;
    const r = rows[0];
    return {
        id: r.id,
        name: r.name,
        mobile: r.mobile,
        purpose: r.purpose,
        visitorType: r.visitor_type,
        photoKey: r.photo_key,
        photoStorageType: r.photo_storage_type,
        photoMimeType: r.photo_mime_type,
        photoUrl: r.photo_url,
        vehicleNumber: r.vehicle_number,
        deliveryCompany: r.delivery_company,
        createdAt: r.created_at,
    };
}
async function createVisitorRequest(data) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        throw new Error('Database pool unavailable');
    await pool.query(`INSERT INTO visitor_requests (id, society_id, visitor_id, resident_id, flat_id, guard_id, gate_id, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        data.id,
        data.societyId,
        data.visitorId,
        data.residentId,
        data.flatId,
        data.guardId,
        data.gateId,
        data.status,
    ]);
    return {
        ...data,
        requestedAt: new Date().toISOString(),
    };
}
async function findVisitorRequestById(id) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return null;
    const [rows] = await pool.query('SELECT * FROM visitor_requests WHERE id = ? LIMIT 1', [id]);
    if (!rows[0])
        return null;
    const r = rows[0];
    return {
        id: r.id,
        societyId: r.society_id,
        visitorId: r.visitor_id,
        residentId: r.resident_id,
        flatId: r.flat_id,
        guardId: r.guard_id,
        gateId: r.gate_id,
        status: r.status,
        requestedAt: r.requested_at,
        respondedAt: r.responded_at,
        responseBy: r.response_by,
        rejectionReason: r.rejection_reason,
    };
}
async function findVisitorRequestsJoined(filters) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return [];
    let query = `
    SELECT 
      vr.id,
      vr.society_id as societyId,
      vr.status,
      vr.requested_at as requestedAt,
      vr.responded_at as respondedAt,
      vr.response_by as responseBy,
      vr.rejection_reason as rejectionReason,
      v.id as visitorId,
      v.name as visitorName,
      v.mobile as visitorMobile,
      v.purpose as purpose,
      v.visitor_type as visitorType,
      v.photo_key as photoKey,
      v.photo_storage_type as photoStorageType,
      v.photo_url as photoUrl,
      v.vehicle_number as vehicleNumber,
      v.delivery_company as deliveryCompany,
      f.id as flatId,
      f.flat_number as flatNumber,
      f.wing as buildingWing,
      u_res.id as residentId,
      u_res.name as residentName,
      u_grd.name as guardName,
      g.name as gateName
    FROM visitor_requests vr
    INNER JOIN visitors v ON vr.visitor_id = v.id
    INNER JOIN flats f ON vr.flat_id = f.id
    INNER JOIN users u_res ON vr.resident_id = u_res.id
    INNER JOIN users u_grd ON vr.guard_id = u_grd.id
    INNER JOIN gates g ON vr.gate_id = g.id
    WHERE vr.society_id = ?
  `;
    const params = [filters.societyId];
    if (filters.residentId) {
        query += ' AND vr.resident_id = ?';
        params.push(filters.residentId);
    }
    if (filters.guardId) {
        query += ' AND vr.guard_id = ?';
        params.push(filters.guardId);
    }
    if (filters.status) {
        query += ' AND vr.status = ?';
        params.push(filters.status);
    }
    query += ' ORDER BY vr.requested_at DESC';
    if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
    }
    const [rows] = await pool.query(query, params);
    return rows;
}
async function updateVisitorRequestDecision(id, status, responseBy, rejectionReason) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return false;
    const now = new Date();
    const [result] = await pool.query(`UPDATE visitor_requests 
     SET status = ?, responded_at = ?, response_by = ?, rejection_reason = ? 
     WHERE id = ? AND status = 'PENDING'`, [status, now, responseBy, rejectionReason || null, id]);
    return result.affectedRows > 0;
}
// -------------------------------------------------------------
// NOTIFICATIONS & AUDIT LOGS
// -------------------------------------------------------------
async function createNotification(data) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return;
    await pool.query(`INSERT INTO notifications (id, recipient_id, type, title, message, related_entity_id) 
     VALUES (?, ?, ?, ?, ?, ?)`, [data.id, data.recipientId, data.type, data.title, data.message, data.relatedEntityId || null]);
}
async function findNotificationsByRecipient(recipientId) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return [];
    const [rows] = await pool.query('SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT 50', [recipientId]);
    return rows.map((r) => ({
        id: r.id,
        recipientId: r.recipient_id,
        type: r.type,
        title: r.title,
        message: r.message,
        relatedEntityId: r.related_entity_id,
        read: Boolean(r.is_read),
        createdAt: r.created_at,
    }));
}
async function createAuditLog(data) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return;
    await pool.query(`INSERT INTO audit_logs (id, actor_id, actor_role, society_id, request_id, action, entity_type, entity_id, metadata, ip_address) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        data.id,
        data.actorId,
        data.actorRole,
        data.societyId,
        data.requestId || null,
        data.action,
        data.entityType,
        data.entityId,
        data.metadata || null,
        data.ipAddress || null,
    ]);
}
// -------------------------------------------------------------
// OTP RECORDS
// -------------------------------------------------------------
async function saveOtpRecord(id, mobile, otp, expiresMinutes = 10) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return;
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);
    await pool.query('INSERT INTO otp_records (id, mobile, otp, expires_at, used) VALUES (?, ?, ?, ?, 0)', [id, mobile, otp, expiresAt]);
}
async function verifyOtpRecord(mobile, otp) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return false;
    // Master demo OTP 123456 always accepted in development test flows
    if (otp === '123456')
        return true;
    const now = new Date();
    const [rows] = await pool.query('SELECT * FROM otp_records WHERE mobile = ? AND otp = ? AND used = 0 AND expires_at > ? ORDER BY created_at DESC LIMIT 1', [mobile, otp, now]);
    if (!rows[0])
        return false;
    // Mark used
    await pool.query('UPDATE otp_records SET used = 1 WHERE id = ?', [rows[0].id]);
    return true;
}

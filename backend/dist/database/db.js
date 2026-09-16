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
exports.findFlatById = findFlatById;
exports.findFlatsBySociety = findFlatsBySociety;
exports.createVisitor = createVisitor;
exports.findVisitorById = findVisitorById;
exports.createVisitorRequest = createVisitorRequest;
exports.createVisitorWithRequestTransaction = createVisitorWithRequestTransaction;
exports.findVisitorRequestById = findVisitorRequestById;
exports.findVisitorRequestsJoined = findVisitorRequestsJoined;
exports.updateVisitorRequestDecision = updateVisitorRequestDecision;
exports.createNotification = createNotification;
exports.findNotificationsByRecipient = findNotificationsByRecipient;
exports.createAuditLog = createAuditLog;
exports.saveOtpRecord = saveOtpRecord;
exports.verifyOtpRecord = verifyOtpRecord;
exports.getFlatsHierarchy = getFlatsHierarchy;
exports.createResidentRegistration = createResidentRegistration;
exports.findResidentRegistrationById = findResidentRegistrationById;
exports.findLatestRegistrationByMobile = findLatestRegistrationByMobile;
exports.findResidentRegistrations = findResidentRegistrations;
exports.approveResidentRegistration = approveResidentRegistration;
exports.rejectResidentRegistration = rejectResidentRegistration;
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
async function findFlatById(flatId) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return null;
    const [rows] = await pool.query('SELECT * FROM flats WHERE id = ? LIMIT 1', [flatId]);
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
async function createVisitorWithRequestTransaction(visitorData, requestData) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        throw new Error('Database pool unavailable');
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query(`INSERT INTO visitors (id, name, mobile, purpose, visitor_type, photo_key, photo_storage_type, photo_mime_type, photo_url, vehicle_number, delivery_company) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            visitorData.id,
            visitorData.name,
            visitorData.mobile || null,
            visitorData.purpose,
            visitorData.visitorType,
            visitorData.photoKey || null,
            visitorData.photoStorageType || 'VAULT',
            visitorData.photoMimeType || 'image/jpeg',
            visitorData.photoUrl || null,
            visitorData.vehicleNumber || null,
            visitorData.deliveryCompany || null,
        ]);
        const now = new Date();
        await connection.query(`INSERT INTO visitor_requests (id, society_id, visitor_id, resident_id, flat_id, guard_id, gate_id, status, requested_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            requestData.id,
            requestData.societyId,
            visitorData.id,
            requestData.residentId,
            requestData.flatId,
            requestData.guardId,
            requestData.gateId,
            requestData.status,
            now,
        ]);
        await connection.commit();
        const isoNow = now.toISOString();
        return {
            visitor: { ...visitorData, createdAt: isoNow },
            request: { ...requestData, visitorId: visitorData.id, requestedAt: isoNow },
        };
    }
    catch (err) {
        await connection.rollback();
        throw err;
    }
    finally {
        connection.release();
    }
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
        requestedAt: r.requested_at instanceof Date ? r.requested_at.toISOString() : (r.requested_at ? new Date(r.requested_at).toISOString() : r.requested_at),
        respondedAt: r.responded_at instanceof Date ? r.responded_at.toISOString() : (r.responded_at ? new Date(r.responded_at).toISOString() : r.responded_at),
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
    return rows.map((r) => ({
        ...r,
        requestedAt: r.requestedAt instanceof Date ? r.requestedAt.toISOString() : (r.requestedAt ? new Date(r.requestedAt).toISOString() : r.requestedAt),
        respondedAt: r.respondedAt instanceof Date ? r.respondedAt.toISOString() : (r.respondedAt ? new Date(r.respondedAt).toISOString() : r.respondedAt),
    }));
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
// -------------------------------------------------------------
// FLATS HIERARCHY FOR REGISTRATION
// -------------------------------------------------------------
async function getFlatsHierarchy(societyId) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return { wings: [], floors: {}, flats: [] };
    const [rows] = await pool.query('SELECT id, flat_number, wing, floor, resident_id FROM flats WHERE society_id = ? ORDER BY wing, floor, flat_number', [societyId]);
    const wingsSet = new Set();
    const floorsMap = {};
    const flatsList = [];
    for (const r of rows) {
        const w = r.wing;
        wingsSet.add(w);
        if (!floorsMap[w])
            floorsMap[w] = [];
        if (!floorsMap[w].includes(r.floor))
            floorsMap[w].push(r.floor);
        flatsList.push({
            id: r.id,
            flatNumber: r.flat_number,
            wing: r.wing,
            floor: r.floor,
            isOccupied: Boolean(r.resident_id),
        });
    }
    for (const w of Object.keys(floorsMap)) {
        floorsMap[w].sort((a, b) => a - b);
    }
    return {
        wings: Array.from(wingsSet).sort(),
        floors: floorsMap,
        flats: flatsList,
    };
}
// -------------------------------------------------------------
// RESIDENT REGISTRATION QUERIES
// -------------------------------------------------------------
async function createResidentRegistration(data) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return null;
    const now = new Date();
    await pool.query(`INSERT INTO resident_registrations 
     (id, society_id, mobile, name, wing, floor, flat_id, flat_number, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`, [
        data.id,
        data.societyId,
        data.mobile,
        data.name || 'Resident',
        data.wing,
        data.floor,
        data.flatId,
        data.flatNumber,
        now,
    ]);
    return findResidentRegistrationById(data.id);
}
async function findResidentRegistrationById(id) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return null;
    const [rows] = await pool.query('SELECT * FROM resident_registrations WHERE id = ? LIMIT 1', [id]);
    if (!rows[0])
        return null;
    const r = rows[0];
    return {
        id: r.id,
        societyId: r.society_id,
        mobile: r.mobile,
        name: r.name,
        wing: r.wing,
        floor: r.floor,
        flatId: r.flat_id,
        flatNumber: r.flat_number,
        status: r.status,
        rejectionReason: r.rejection_reason,
        reviewedBy: r.reviewed_by,
        reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
    };
}
async function findLatestRegistrationByMobile(mobile) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return null;
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    const [rows] = await pool.query('SELECT * FROM resident_registrations WHERE mobile = ? OR mobile LIKE ? ORDER BY created_at DESC LIMIT 1', [mobile, `%${cleanMobile}`]);
    if (!rows[0])
        return null;
    const r = rows[0];
    return {
        id: r.id,
        societyId: r.society_id,
        mobile: r.mobile,
        name: r.name,
        wing: r.wing,
        floor: r.floor,
        flatId: r.flat_id,
        flatNumber: r.flat_number,
        status: r.status,
        rejectionReason: r.rejection_reason,
        reviewedBy: r.reviewed_by,
        reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
    };
}
async function findResidentRegistrations(filters) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return [];
    let query = 'SELECT * FROM resident_registrations WHERE society_id = ?';
    const params = [filters.societyId];
    if (filters.status && filters.status !== 'ALL') {
        query += ' AND status = ?';
        params.push(filters.status);
    }
    query += ' ORDER BY created_at DESC';
    if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
    }
    const [rows] = await pool.query(query, params);
    return rows.map((r) => ({
        id: r.id,
        societyId: r.society_id,
        mobile: r.mobile,
        name: r.name,
        wing: r.wing,
        floor: r.floor,
        flatId: r.flat_id,
        flatNumber: r.flat_number,
        status: r.status,
        rejectionReason: r.rejection_reason,
        reviewedBy: r.reviewed_by,
        reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
    }));
}
async function approveResidentRegistration(id, adminId) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return { success: false, error: 'Database unavailable' };
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // 1. Fetch registration request and lock
        const [regRows] = await connection.query('SELECT * FROM resident_registrations WHERE id = ? FOR UPDATE', [id]);
        if (!regRows[0]) {
            await connection.rollback();
            return { success: false, error: 'Registration request not found' };
        }
        const reg = regRows[0];
        if (reg.status !== 'PENDING') {
            await connection.rollback();
            return { success: false, error: `Request already ${reg.status.toLowerCase()}` };
        }
        // 2. Verify flat exists
        const [flatRows] = await connection.query('SELECT * FROM flats WHERE id = ? FOR UPDATE', [reg.flat_id]);
        if (!flatRows[0]) {
            await connection.rollback();
            return { success: false, error: 'Associated flat not found in society' };
        }
        // 3. Check or create user
        const cleanMobile = reg.mobile.replace(/\D/g, '').slice(-10);
        const [existingUsers] = await connection.query('SELECT * FROM users WHERE mobile = ? OR mobile LIKE ? LIMIT 1', [reg.mobile, `%${cleanMobile}`]);
        let userId;
        const now = new Date();
        if (existingUsers[0]) {
            userId = existingUsers[0].id;
            await connection.query('UPDATE users SET status = "ACTIVE", society_id = ?, updated_at = ? WHERE id = ?', [reg.society_id, now, userId]);
        }
        else {
            userId = `res_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
            await connection.query(`INSERT INTO users (id, name, mobile, role, society_id, status, created_at)
         VALUES (?, ?, ?, 'RESIDENT', ?, 'ACTIVE', ?)`, [userId, reg.name || 'Resident', reg.mobile, reg.society_id, now]);
        }
        // 4. Assign flat resident_id
        await connection.query('UPDATE flats SET resident_id = ? WHERE id = ?', [userId, reg.flat_id]);
        // 5. Update registration request status
        await connection.query(`UPDATE resident_registrations 
       SET status = 'APPROVED', reviewed_by = ?, reviewed_at = ?, updated_at = ?
       WHERE id = ?`, [adminId, now, now, id]);
        // 6. Create Audit Log
        const auditId = `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        await connection.query(`INSERT INTO audit_logs (id, actor_id, actor_role, society_id, request_id, action, entity_type, entity_id, metadata)
       VALUES (?, ?, 'ADMIN', ?, ?, 'RESIDENT_REGISTRATION_APPROVED', 'RESIDENT_REGISTRATION', ?, ?)`, [
            auditId,
            adminId,
            reg.society_id,
            id,
            id,
            JSON.stringify({ mobile: reg.mobile, flatNumber: reg.flat_number, userId }),
        ]);
        await connection.commit();
        // Fetch newly created/updated user
        const [finalUserRows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        const finalUser = finalUserRows[0];
        return {
            success: true,
            user: {
                id: finalUser.id,
                name: finalUser.name,
                mobile: finalUser.mobile,
                email: finalUser.email,
                role: finalUser.role,
                societyId: finalUser.society_id,
                status: finalUser.status,
                createdAt: finalUser.created_at,
                updatedAt: finalUser.updated_at,
            },
        };
    }
    catch (err) {
        await connection.rollback();
        console.error('[DB] Approval transaction failed:', err);
        return { success: false, error: err.message || 'Transaction failed' };
    }
    finally {
        connection.release();
    }
}
async function rejectResidentRegistration(id, adminId, reason) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return { success: false, error: 'Database unavailable' };
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [regRows] = await connection.query('SELECT * FROM resident_registrations WHERE id = ? FOR UPDATE', [id]);
        if (!regRows[0]) {
            await connection.rollback();
            return { success: false, error: 'Registration request not found' };
        }
        const reg = regRows[0];
        if (reg.status !== 'PENDING') {
            await connection.rollback();
            return { success: false, error: `Request already ${reg.status.toLowerCase()}` };
        }
        const now = new Date();
        await connection.query(`UPDATE resident_registrations 
       SET status = 'REJECTED', rejection_reason = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
       WHERE id = ?`, [reason || 'Application rejected by society administrator', adminId, now, now, id]);
        // Audit Log
        const auditId = `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        await connection.query(`INSERT INTO audit_logs (id, actor_id, actor_role, society_id, request_id, action, entity_type, entity_id, metadata)
       VALUES (?, ?, 'ADMIN', ?, ?, 'RESIDENT_REGISTRATION_REJECTED', 'RESIDENT_REGISTRATION', ?, ?)`, [
            auditId,
            adminId,
            reg.society_id,
            id,
            id,
            JSON.stringify({ mobile: reg.mobile, flatNumber: reg.flat_number, reason }),
        ]);
        await connection.commit();
        return { success: true };
    }
    catch (err) {
        await connection.rollback();
        console.error('[DB] Rejection transaction failed:', err);
        return { success: false, error: err.message || 'Transaction failed' };
    }
    finally {
        connection.release();
    }
}

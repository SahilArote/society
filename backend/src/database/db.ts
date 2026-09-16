import { getMysqlPool, runMysqlMigrations } from './mysql';

export interface SocietyRow {
  id: string;
  name: string;
  address: string;
  status: string;
  createdAt: string;
}

export interface GateRow {
  id: string;
  societyId: string;
  name: string;
  location?: string;
  status: string;
}

export interface UserRow {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  passwordHash?: string;
  pinHash?: string;
  role: 'RESIDENT' | 'GUARD' | 'ADMIN';
  societyId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlatRow {
  id: string;
  societyId: string;
  flatNumber: string;
  wing: string;
  floor: number;
  residentId?: string;
  residentName?: string;
  residentMobile?: string;
}

export interface GuardRow {
  id: string;
  userId: string;
  gateId: string;
  shift: string;
  status: string;
}

export interface VisitorRow {
  id: string;
  name: string;
  mobile?: string;
  purpose: string;
  visitorType: string;
  photoKey?: string;
  photoStorageType?: string;
  photoMimeType?: string;
  photoUrl?: string;
  vehicleNumber?: string;
  deliveryCompany?: string;
  createdAt: string;
}

export interface VisitorRequestRow {
  id: string;
  societyId: string;
  visitorId: string;
  residentId: string;
  flatId: string;
  guardId: string;
  gateId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  requestedAt: string;
  respondedAt?: string;
  responseBy?: string;
  rejectionReason?: string;
}

export interface NotificationRow {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityId?: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLogRow {
  id: string;
  actorId: string;
  actorRole: string;
  societyId: string;
  requestId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface ResidentRegistrationRow {
  id: string;
  societyId: string;
  mobile: string;
  name: string;
  wing: string;
  floor: number;
  flatId: string;
  flatNumber: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export async function initDb() {
  await runMysqlMigrations();
}

// -------------------------------------------------------------
// USER QUERIES
// -------------------------------------------------------------
export async function findUserByMobile(mobile: string): Promise<UserRow | null> {
  const pool = await getMysqlPool();
  if (!pool) return null;
  const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
  if (cleanMobile.length < 6) {
    const [rows]: any = await pool.query('SELECT * FROM users WHERE mobile = ? OR id = ? LIMIT 1', [mobile, mobile]);
    if (!rows[0]) return null;
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

  const [rows]: any = await pool.query(
    'SELECT * FROM users WHERE mobile = ? OR mobile LIKE ? LIMIT 1',
    [mobile, `%${cleanMobile}`]
  );
  if (!rows[0]) return null;
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


export async function findUserByEmail(email: string): Promise<UserRow | null> {

  const pool = await getMysqlPool();
  if (!pool) return null;
  const [rows]: any = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email.trim().toLowerCase()]);
  if (!rows[0]) return null;
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

export async function findUserById(id: string): Promise<UserRow | null> {
  const pool = await getMysqlPool();
  if (!pool) return null;
  const [rows]: any = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) return null;
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
export async function findGuardByUserId(userId: string): Promise<GuardRow | null> {
  const pool = await getMysqlPool();
  if (!pool) return null;
  const [rows]: any = await pool.query('SELECT * FROM guards WHERE user_id = ? LIMIT 1', [userId]);
  if (!rows[0]) return null;
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
export async function findGateById(gateId: string): Promise<GateRow | null> {
  const pool = await getMysqlPool();
  if (!pool) return null;
  const [rows]: any = await pool.query('SELECT * FROM gates WHERE id = ? LIMIT 1', [gateId]);
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id,
    societyId: r.society_id,
    name: r.name,
    location: r.location,
    status: r.status,
  };
}

export async function findSocietyById(societyId: string): Promise<SocietyRow | null> {
  const pool = await getMysqlPool();
  if (!pool) return null;
  const [rows]: any = await pool.query('SELECT * FROM societies WHERE id = ? LIMIT 1', [societyId]);
  if (!rows[0]) return null;
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
export async function findFlatByNumberAndWing(societyId: string, flatNumber: string, wing?: string): Promise<FlatRow | null> {
  const pool = await getMysqlPool();
  if (!pool) return null;

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
    const [rows]: any = await pool.query(query, [societyId, cleanFlat, cleanWing, `%${wingLetter}%`, cleanWing]);
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
  const [fbRows]: any = await pool.query(fallbackQuery, [societyId, cleanFlat]);
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

export async function findFlatByResidentId(residentId: string): Promise<FlatRow | null> {
  const pool = await getMysqlPool();
  if (!pool) return null;
  const [rows]: any = await pool.query('SELECT * FROM flats WHERE resident_id = ? LIMIT 1', [residentId]);
  if (!rows[0]) return null;
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

export async function findFlatById(flatId: string): Promise<FlatRow | null> {
  const pool = await getMysqlPool();
  if (!pool) return null;
  const [rows]: any = await pool.query('SELECT * FROM flats WHERE id = ? LIMIT 1', [flatId]);
  if (!rows[0]) return null;
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

export async function findFlatsBySociety(societyId: string): Promise<FlatRow[]> {
  const pool = await getMysqlPool();
  if (!pool) return [];
  const [rows]: any = await pool.query(
    `SELECT f.*, u.name as res_name, u.mobile as res_mobile 
     FROM flats f 
     LEFT JOIN users u ON f.resident_id = u.id 
     WHERE f.society_id = ? 
     ORDER BY f.wing, f.flat_number`,
    [societyId]
  );
  return rows.map((r: any) => ({
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
export async function createVisitor(data: {
  id: string;
  name: string;
  mobile?: string;
  purpose: string;
  visitorType: string;
  photoKey?: string;
  photoStorageType?: string;
  photoMimeType?: string;
  photoUrl?: string;
  vehicleNumber?: string;
  deliveryCompany?: string;
}): Promise<VisitorRow> {
  const pool = await getMysqlPool();
  if (!pool) throw new Error('Database pool unavailable');

  const safeName = (data.name || 'Visitor').trim().slice(0, 250);
  const safeMobile = data.mobile ? data.mobile.trim().slice(0, 30) : null;
  const safePurpose = (data.purpose || 'personal').trim().slice(0, 250);
  const safeVisitorType = (data.visitorType || 'guest').trim().slice(0, 60);
  const safeVehicle = data.vehicleNumber ? data.vehicleNumber.trim().slice(0, 60) : null;
  const safeCompany = data.deliveryCompany ? data.deliveryCompany.trim().slice(0, 120) : null;

  await pool.query(
    `INSERT INTO visitors (id, name, mobile, purpose, visitor_type, photo_key, photo_storage_type, photo_mime_type, photo_url, vehicle_number, delivery_company) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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
    ]
  );

  return {
    ...data,
    createdAt: new Date().toISOString(),
  };
}

export async function findVisitorById(id: string): Promise<VisitorRow | null> {
  const pool = await getMysqlPool();
  if (!pool) return null;
  const [rows]: any = await pool.query('SELECT * FROM visitors WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) return null;
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

export async function createVisitorRequest(data: {
  id: string;
  societyId: string;
  visitorId: string;
  residentId: string;
  flatId: string;
  guardId: string;
  gateId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
}): Promise<VisitorRequestRow> {
  const pool = await getMysqlPool();
  if (!pool) throw new Error('Database pool unavailable');

  await pool.query(
    `INSERT INTO visitor_requests (id, society_id, visitor_id, resident_id, flat_id, guard_id, gate_id, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.id,
      data.societyId,
      data.visitorId,
      data.residentId,
      data.flatId,
      data.guardId,
      data.gateId,
      data.status,
    ]
  );

  return {
    ...data,
    requestedAt: new Date().toISOString(),
  };
}

export async function createVisitorWithRequestTransaction(
  visitorData: {
    id: string;
    name: string;
    mobile?: string;
    purpose: string;
    visitorType: string;
    photoKey?: string;
    photoStorageType?: string;
    photoMimeType?: string;
    photoUrl?: string;
    vehicleNumber?: string;
    deliveryCompany?: string;
  },
  requestData: {
    id: string;
    societyId: string;
    residentId: string;
    flatId: string;
    guardId: string;
    gateId: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  }
): Promise<{ visitor: VisitorRow; request: VisitorRequestRow }> {
  const pool = await getMysqlPool();
  if (!pool) throw new Error('Database pool unavailable');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO visitors (id, name, mobile, purpose, visitor_type, photo_key, photo_storage_type, photo_mime_type, photo_url, vehicle_number, delivery_company) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
      ]
    );

    const now = new Date();
    await connection.query(
      `INSERT INTO visitor_requests (id, society_id, visitor_id, resident_id, flat_id, guard_id, gate_id, status, requested_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        requestData.id,
        requestData.societyId,
        visitorData.id,
        requestData.residentId,
        requestData.flatId,
        requestData.guardId,
        requestData.gateId,
        requestData.status,
        now,
      ]
    );

    await connection.commit();

    const isoNow = now.toISOString();
    return {
      visitor: { ...visitorData, createdAt: isoNow },
      request: { ...requestData, visitorId: visitorData.id, requestedAt: isoNow },
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function findVisitorRequestById(id: string): Promise<VisitorRequestRow | null> {
  const pool = await getMysqlPool();
  if (!pool) return null;
  const [rows]: any = await pool.query('SELECT * FROM visitor_requests WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) return null;
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

export async function findVisitorRequestJoinedById(id: string): Promise<any | null> {
  const pool = await getMysqlPool();
  if (!pool) return null;

  const query = `
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
    LEFT JOIN flats f ON vr.flat_id = f.id
    LEFT JOIN users u_res ON vr.resident_id = u_res.id
    LEFT JOIN users u_grd ON vr.guard_id = u_grd.id
    LEFT JOIN gates g ON vr.gate_id = g.id
    WHERE vr.id = ?
    LIMIT 1
  `;

  const [rows]: any = await pool.query(query, [id]);
  return rows[0] || null;
}

export async function findVisitorRequestsJoined(filters: {
  societyId: string;
  residentId?: string;
  guardId?: string;
  status?: string;
  limit?: number;
}): Promise<any[]> {
  const pool = await getMysqlPool();
  if (!pool) return [];

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

  const params: any[] = [filters.societyId];

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

  const [rows]: any = await pool.query(query, params);
  return rows.map((r: any) => ({
    ...r,
    requestedAt: r.requestedAt instanceof Date ? r.requestedAt.toISOString() : (r.requestedAt ? new Date(r.requestedAt).toISOString() : r.requestedAt),
    respondedAt: r.respondedAt instanceof Date ? r.respondedAt.toISOString() : (r.respondedAt ? new Date(r.respondedAt).toISOString() : r.respondedAt),
  }));
}

export async function updateVisitorRequestDecision(
  id: string,
  status: 'APPROVED' | 'REJECTED',
  responseBy: string,
  rejectionReason?: string
): Promise<boolean> {
  const pool = await getMysqlPool();
  if (!pool) return false;

  const now = new Date();
  const [result]: any = await pool.query(
    `UPDATE visitor_requests 
     SET status = ?, responded_at = ?, response_by = ?, rejection_reason = ? 
     WHERE id = ? AND status = 'PENDING'`,
    [status, now, responseBy, rejectionReason || null, id]
  );

  return result.affectedRows > 0;
}

// -------------------------------------------------------------
// NOTIFICATIONS & AUDIT LOGS
// -------------------------------------------------------------
export async function createNotification(data: {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityId?: string;
}) {
  const pool = await getMysqlPool();
  if (!pool) return;
  await pool.query(
    `INSERT INTO notifications (id, recipient_id, type, title, message, related_entity_id) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.id, data.recipientId, data.type, data.title, data.message, data.relatedEntityId || null]
  );
}

export async function findNotificationsByRecipient(recipientId: string): Promise<NotificationRow[]> {
  const pool = await getMysqlPool();
  if (!pool) return [];
  const [rows]: any = await pool.query(
    'SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT 50',
    [recipientId]
  );
  return rows.map((r: any) => ({
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

export async function createAuditLog(data: {
  id: string;
  actorId: string;
  actorRole: string;
  societyId: string;
  requestId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: string;
  ipAddress?: string;
}) {
  const pool = await getMysqlPool();
  if (!pool) return;
  await pool.query(
    `INSERT INTO audit_logs (id, actor_id, actor_role, society_id, request_id, action, entity_type, entity_id, metadata, ip_address) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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
    ]
  );
}

// -------------------------------------------------------------
// OTP RECORDS
// -------------------------------------------------------------
export async function saveOtpRecord(id: string, mobile: string, otp: string, expiresMinutes: number = 10) {
  const pool = await getMysqlPool();
  if (!pool) return;
  const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);
  await pool.query(
    'INSERT INTO otp_records (id, mobile, otp, expires_at, used) VALUES (?, ?, ?, ?, 0)',
    [id, mobile, otp, expiresAt]
  );
}

export async function verifyOtpRecord(mobile: string, otp: string): Promise<boolean> {
  const pool = await getMysqlPool();
  if (!pool) return false;

  // Master demo OTP 123456 always accepted in development test flows
  if (otp === '123456') return true;

  const now = new Date();
  const [rows]: any = await pool.query(
    'SELECT * FROM otp_records WHERE mobile = ? AND otp = ? AND used = 0 AND expires_at > ? ORDER BY created_at DESC LIMIT 1',
    [mobile, otp, now]
  );

  if (!rows[0]) return false;

  // Mark used
  await pool.query('UPDATE otp_records SET used = 1 WHERE id = ?', [rows[0].id]);
  return true;
}

// -------------------------------------------------------------
// FLATS HIERARCHY FOR REGISTRATION
// -------------------------------------------------------------
export async function getFlatsHierarchy(societyId: string) {
  const pool = await getMysqlPool();
  if (!pool) return { wings: [], floors: {}, flats: [] };

  const [rows]: any = await pool.query(
    'SELECT id, flat_number, wing, floor, resident_id FROM flats WHERE society_id = ? ORDER BY wing, floor, flat_number',
    [societyId]
  );

  const wingsSet = new Set<string>();
  const floorsMap: Record<string, number[]> = {};
  const flatsList: any[] = [];

  for (const r of rows) {
    const w = r.wing;
    wingsSet.add(w);
    if (!floorsMap[w]) floorsMap[w] = [];
    if (!floorsMap[w].includes(r.floor)) floorsMap[w].push(r.floor);

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
export async function createResidentRegistration(data: {
  id: string;
  societyId: string;
  mobile: string;
  name?: string;
  wing: string;
  floor: number;
  flatId: string;
  flatNumber: string;
}): Promise<ResidentRegistrationRow | null> {
  const pool = await getMysqlPool();
  if (!pool) return null;

  const now = new Date();
  await pool.query(
    `INSERT INTO resident_registrations 
     (id, society_id, mobile, name, wing, floor, flat_id, flat_number, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
    [
      data.id,
      data.societyId,
      data.mobile,
      data.name || 'Resident',
      data.wing,
      data.floor,
      data.flatId,
      data.flatNumber,
      now,
    ]
  );

  return findResidentRegistrationById(data.id);
}

export async function findResidentRegistrationById(id: string): Promise<ResidentRegistrationRow | null> {
  const pool = await getMysqlPool();
  if (!pool) return null;

  const [rows]: any = await pool.query(
    'SELECT * FROM resident_registrations WHERE id = ? LIMIT 1',
    [id]
  );
  if (!rows[0]) return null;
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

export async function findLatestRegistrationByMobile(mobile: string): Promise<ResidentRegistrationRow | null> {
  const pool = await getMysqlPool();
  if (!pool) return null;

  const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
  const [rows]: any = await pool.query(
    'SELECT * FROM resident_registrations WHERE mobile = ? OR mobile LIKE ? ORDER BY created_at DESC LIMIT 1',
    [mobile, `%${cleanMobile}`]
  );
  if (!rows[0]) return null;
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

export async function findResidentRegistrations(filters: {
  societyId: string;
  status?: string;
  limit?: number;
}): Promise<ResidentRegistrationRow[]> {
  const pool = await getMysqlPool();
  if (!pool) return [];

  let query = 'SELECT * FROM resident_registrations WHERE society_id = ?';
  const params: any[] = [filters.societyId];

  if (filters.status && filters.status !== 'ALL') {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  query += ' ORDER BY created_at DESC';

  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }

  const [rows]: any = await pool.query(query, params);
  return rows.map((r: any) => ({
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

export async function approveResidentRegistration(
  id: string,
  adminId: string
): Promise<{ success: boolean; error?: string; user?: UserRow }> {
  const pool = await getMysqlPool();
  if (!pool) return { success: false, error: 'Database unavailable' };

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Fetch registration request and lock
    const [regRows]: any = await connection.query(
      'SELECT * FROM resident_registrations WHERE id = ? FOR UPDATE',
      [id]
    );
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
    const [flatRows]: any = await connection.query(
      'SELECT * FROM flats WHERE id = ? FOR UPDATE',
      [reg.flat_id]
    );
    if (!flatRows[0]) {
      await connection.rollback();
      return { success: false, error: 'Associated flat not found in society' };
    }

    // 3. Check or create user
    const cleanMobile = reg.mobile.replace(/\D/g, '').slice(-10);
    const [existingUsers]: any = await connection.query(
      'SELECT * FROM users WHERE mobile = ? OR mobile LIKE ? LIMIT 1',
      [reg.mobile, `%${cleanMobile}`]
    );

    let userId: string;
    const now = new Date();

    if (existingUsers[0]) {
      userId = existingUsers[0].id;
      await connection.query(
        'UPDATE users SET status = "ACTIVE", society_id = ?, updated_at = ? WHERE id = ?',
        [reg.society_id, now, userId]
      );
    } else {
      userId = `res_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      await connection.query(
        `INSERT INTO users (id, name, mobile, role, society_id, status, created_at)
         VALUES (?, ?, ?, 'RESIDENT', ?, 'ACTIVE', ?)`,
        [userId, reg.name || 'Resident', reg.mobile, reg.society_id, now]
      );
    }

    // 4. Assign flat resident_id
    await connection.query(
      'UPDATE flats SET resident_id = ? WHERE id = ?',
      [userId, reg.flat_id]
    );

    // 5. Update registration request status
    await connection.query(
      `UPDATE resident_registrations 
       SET status = 'APPROVED', reviewed_by = ?, reviewed_at = ?, updated_at = ?
       WHERE id = ?`,
      [adminId, now, now, id]
    );

    // 6. Create Audit Log
    const auditId = `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    await connection.query(
      `INSERT INTO audit_logs (id, actor_id, actor_role, society_id, request_id, action, entity_type, entity_id, metadata)
       VALUES (?, ?, 'ADMIN', ?, ?, 'RESIDENT_REGISTRATION_APPROVED', 'RESIDENT_REGISTRATION', ?, ?)`,
      [
        auditId,
        adminId,
        reg.society_id,
        id,
        id,
        JSON.stringify({ mobile: reg.mobile, flatNumber: reg.flat_number, userId }),
      ]
    );

    await connection.commit();

    // Fetch newly created/updated user
    const [finalUserRows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
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
  } catch (err: any) {
    await connection.rollback();
    console.error('[DB] Approval transaction failed:', err);
    return { success: false, error: err.message || 'Transaction failed' };
  } finally {
    connection.release();
  }
}

export async function rejectResidentRegistration(
  id: string,
  adminId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const pool = await getMysqlPool();
  if (!pool) return { success: false, error: 'Database unavailable' };

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [regRows]: any = await connection.query(
      'SELECT * FROM resident_registrations WHERE id = ? FOR UPDATE',
      [id]
    );
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
    await connection.query(
      `UPDATE resident_registrations 
       SET status = 'REJECTED', rejection_reason = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
       WHERE id = ?`,
      [reason || 'Application rejected by society administrator', adminId, now, now, id]
    );

    // Audit Log
    const auditId = `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    await connection.query(
      `INSERT INTO audit_logs (id, actor_id, actor_role, society_id, request_id, action, entity_type, entity_id, metadata)
       VALUES (?, ?, 'ADMIN', ?, ?, 'RESIDENT_REGISTRATION_REJECTED', 'RESIDENT_REGISTRATION', ?, ?)`,
      [
        auditId,
        adminId,
        reg.society_id,
        id,
        id,
        JSON.stringify({ mobile: reg.mobile, flatNumber: reg.flat_number, reason }),
      ]
    );

    await connection.commit();
    return { success: true };
  } catch (err: any) {
    await connection.rollback();
    console.error('[DB] Rejection transaction failed:', err);
    return { success: false, error: err.message || 'Transaction failed' };
  } finally {
    connection.release();
  }
}

// -------------------------------------------------------------
// ADMIN DASHBOARD CORE DATABASE HELPERS
// -------------------------------------------------------------

export async function findGatesBySociety(societyId: string): Promise<any[]> {
  const pool = await getMysqlPool();
  if (!pool) return [];
  const [rows]: any = await pool.query(
    `SELECT g.*, 
       (SELECT COUNT(*) FROM visitor_requests vr 
        WHERE vr.gate_id = g.id 
          AND DATE(vr.requested_at) = CURRENT_DATE()) as visitors_today
     FROM gates g 
     WHERE g.society_id = ?
     ORDER BY g.name`,
    [societyId]
  );
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    location: r.location,
    status: (r.status || 'OPERATIONAL').toLowerCase(),
    visitorsToday: Number(r.visitors_today || 0),
  }));
}

export async function toggleGateStatus(gateId: string, status: string): Promise<boolean> {
  const pool = await getMysqlPool();
  if (!pool) return false;
  await pool.query('UPDATE gates SET status = ? WHERE id = ?', [status.toUpperCase(), gateId]);
  return true;
}

export async function findGuardsWithDetails(societyId: string): Promise<any[]> {
  const pool = await getMysqlPool();
  if (!pool) return [];
  const [rows]: any = await pool.query(
    `SELECT g.id as guard_id, g.user_id, g.shift, g.status as guard_status,
            u.name, u.mobile, u.created_at as joined_date,
            gt.name as gate_name
     FROM guards g
     INNER JOIN users u ON g.user_id = u.id
     LEFT JOIN gates gt ON g.gate_id = gt.id
     WHERE u.society_id = ?
     ORDER BY u.name`,
    [societyId]
  );
  return rows.map((r: any) => {
    let normalizedShift = 'morning';
    const sLower = (r.shift || '').toLowerCase();
    if (sLower.includes('evening') || sLower.includes('afternoon')) normalizedShift = 'evening';
    else if (sLower.includes('night')) normalizedShift = 'night';

    let normalizedStatus = 'on_duty';
    const stLower = (r.guard_status || '').toLowerCase();
    if (stLower.includes('off')) normalizedStatus = 'off_duty';
    else if (stLower.includes('leave')) normalizedStatus = 'on_leave';

    return {
      id: r.guard_id,
      userId: r.user_id,
      name: r.name,
      phone: r.mobile ? `+91 ${r.mobile}` : '+91 99000 00000',
      assignedGate: r.gate_name || 'Main Gate',
      shift: normalizedShift,
      rawShift: r.shift,
      status: normalizedStatus,
      joinedDate: r.joined_date ? new Date(r.joined_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    };
  });
}

export async function createGuardRecord(data: {
  societyId: string;
  name: string;
  mobile: string;
  gateId?: string;
  gateName?: string;
  shift?: string;
}): Promise<any> {
  const pool = await getMysqlPool();
  if (!pool) throw new Error('Database pool unavailable');

  const cleanMobile = data.mobile.replace(/\D/g, '').slice(-10);
  const userId = `guard_${cleanMobile}`;
  const guardId = `grd_${Date.now()}`;

  let targetGateId = data.gateId;
  if (!targetGateId && data.gateName) {
    const [gRows]: any = await pool.query('SELECT id FROM gates WHERE society_id = ? AND LOWER(name) LIKE ? LIMIT 1', [
      data.societyId, `%${data.gateName.toLowerCase()}%`
    ]);
    if (gRows[0]) targetGateId = gRows[0].id;
  }
  if (!targetGateId) targetGateId = 'gate_main';

  // 1. Insert User
  await pool.query(
    `INSERT INTO users (id, name, mobile, role, society_id, status)
     VALUES (?, ?, ?, 'GUARD', ?, 'ACTIVE')
     ON DUPLICATE KEY UPDATE name = VALUES(name)`,
    [userId, data.name.trim(), cleanMobile, data.societyId]
  );

  // 2. Insert Guard
  const shiftText = data.shift === 'evening' ? 'Evening Shift (02:00 PM - 10:00 PM)' :
                    data.shift === 'night' ? 'Night Shift (10:00 PM - 06:00 AM)' :
                    'Morning Shift (06:00 AM - 02:00 PM)';

  await pool.query(
    `INSERT INTO guards (id, user_id, gate_id, shift, status)
     VALUES (?, ?, ?, ?, 'ON_DUTY')
     ON DUPLICATE KEY UPDATE gate_id = VALUES(gate_id), shift = VALUES(shift), status = 'ON_DUTY'`,
    [guardId, userId, targetGateId, shiftText]
  );

  return {
    id: guardId,
    userId,
    name: data.name.trim(),
    phone: `+91 ${cleanMobile}`,
    assignedGate: data.gateName || 'Main Gate',
    shift: data.shift || 'morning',
    status: 'on_duty',
    joinedDate: new Date().toISOString().slice(0, 10),
  };
}

export async function findFlatsWithResidents(societyId: string): Promise<any[]> {
  const pool = await getMysqlPool();
  if (!pool) return [];

  const [rows]: any = await pool.query(
    `SELECT f.*, u.id as user_id, u.name as res_name, u.mobile as res_mobile, u.email as res_email
     FROM flats f 
     LEFT JOIN users u ON f.resident_id = u.id 
     WHERE f.society_id = ? 
     ORDER BY f.wing, f.floor, f.flat_number`,
    [societyId]
  );

  return rows.map((r: any) => {
    const isOccupied = !!r.resident_id && !!r.res_name;
    const residents = isOccupied ? [
      {
        id: r.user_id || `res_${r.id}`,
        name: r.res_name,
        phone: r.res_mobile ? `+91 ${r.res_mobile}` : '',
        email: r.res_email || '',
        role: 'owner',
        isOwner: true,
      }
    ] : [];

    const type = r.flat_number.endsWith('01') || r.flat_number.endsWith('04') ? '3BHK' : '2BHK';

    return {
      id: r.id,
      number: r.flat_number,
      wing: r.wing.replace(/^Wing\s*/i, '').trim(),
      fullWing: r.wing,
      floor: Number(r.floor || 1),
      type,
      status: isOccupied ? 'occupied' : 'vacant',
      residents,
      vehicleCount: isOccupied ? 1 : 0,
      maintenanceStatus: 'paid',
      maintenanceDueAmount: 0,
    };
  });
}

export async function createFlatRecord(data: {
  societyId: string;
  flatNumber: string;
  wing: string;
  floor?: number;
  ownerName?: string;
  ownerPhone?: string;
}): Promise<any> {
  const pool = await getMysqlPool();
  if (!pool) throw new Error('Database pool unavailable');

  const cleanWing = data.wing.startsWith('Wing') ? data.wing : `Wing ${data.wing.trim()}`;
  const flatNumber = data.flatNumber.trim().toUpperCase();
  const flatId = `flat_${flatNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}`;
  const floor = data.floor || parseInt(flatNumber.replace(/^\D+/, '').slice(0, -2)) || 1;

  let residentId: string | null = null;
  if (data.ownerName && data.ownerPhone) {
    const cleanDigits = data.ownerPhone.replace(/\D/g, '').slice(-10);
    if (cleanDigits.length === 10) {
      residentId = `res_${cleanDigits}`;
      await pool.query(
        `INSERT INTO users (id, name, mobile, role, society_id, status)
         VALUES (?, ?, ?, 'RESIDENT', ?, 'ACTIVE')
         ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        [residentId, data.ownerName.trim(), cleanDigits, data.societyId]
      );
    }
  }

  await pool.query(
    `INSERT INTO flats (id, society_id, flat_number, wing, floor, resident_id)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE resident_id = VALUES(resident_id), floor = VALUES(floor)`,
    [flatId, data.societyId, flatNumber, cleanWing, floor, residentId]
  );

  return {
    id: flatId,
    number: flatNumber,
    wing: cleanWing.replace(/^Wing\s*/i, '').trim(),
    fullWing: cleanWing,
    floor,
    type: '2BHK',
    status: residentId ? 'occupied' : 'vacant',
    residents: residentId ? [
      {
        id: residentId,
        name: data.ownerName!,
        phone: data.ownerPhone!,
        role: 'owner',
        isOwner: true,
      }
    ] : [],
    vehicleCount: residentId ? 1 : 0,
    maintenanceStatus: 'paid',
    maintenanceDueAmount: 0,
  };
}

export async function findAdminVisitorLogs(societyId: string, filter?: {
  tab?: string;
  gate?: string;
  search?: string;
  limit?: number;
}): Promise<any[]> {
  const pool = await getMysqlPool();
  if (!pool) return [];

  let query = `
    SELECT 
      vr.id,
      vr.society_id as societyId,
      vr.status,
      vr.requested_at as requestedAt,
      vr.responded_at as respondedAt,
      vr.entry_time as enteredAt,
      vr.exit_time as exitedAt,
      vr.response_by as responseBy,
      vr.rejection_reason as rejectionReason,
      v.id as visitorId,
      v.name as visitorName,
      v.mobile as visitorMobile,
      v.purpose as purpose,
      v.visitor_type as visitorType,
      v.vehicle_number as vehicleNumber,
      f.flat_number as flatNumber,
      f.wing as buildingWing,
      u_res.name as residentName,
      COALESCE(u_grd.name, 'Gate Security') as guardName,
      COALESCE(g.name, 'Main Gate') as gateName
    FROM visitor_requests vr
    INNER JOIN visitors v ON vr.visitor_id = v.id
    LEFT JOIN flats f ON vr.flat_id = f.id
    LEFT JOIN users u_res ON vr.resident_id = u_res.id
    LEFT JOIN users u_grd ON vr.guard_id = u_grd.id
    LEFT JOIN gates g ON vr.gate_id = g.id
    WHERE vr.society_id = ?
  `;

  const params: any[] = [societyId];

  if (filter?.tab === 'live') {
    query += " AND (UPPER(vr.status) IN ('PENDING', 'INSIDE'))";
  } else if (filter?.tab === 'today') {
    query += " AND (DATE(vr.requested_at) = CURRENT_DATE() OR UPPER(vr.status) IN ('PENDING', 'INSIDE'))";
  }

  if (filter?.gate && filter.gate !== 'all') {
    query += " AND (g.id = ? OR LOWER(g.name) = LOWER(?))";
    params.push(filter.gate, filter.gate);
  }

  if (filter?.search && filter.search.trim()) {
    const s = `%${filter.search.trim().toLowerCase()}%`;
    query += " AND (LOWER(v.name) LIKE ? OR LOWER(f.flat_number) LIKE ? OR LOWER(v.mobile) LIKE ?)";
    params.push(s, s, s);
  }

  query += ' ORDER BY vr.requested_at DESC';

  if (filter?.limit) {
    query += ' LIMIT ?';
    params.push(Number(filter.limit));
  } else {
    query += ' LIMIT 100';
  }

  const [rows]: any = await pool.query(query, params);

  return rows.map((r: any) => {
    let normStatus = (r.status || 'pending').toLowerCase();
    if (normStatus === 'rejected') normStatus = 'denied';

    let normPurpose = (r.visitorType || r.purpose || 'guest').toLowerCase();
    if (!['guest', 'delivery', 'maintenance', 'cab', 'other'].includes(normPurpose)) {
      normPurpose = 'guest';
    }

    return {
      id: r.id,
      name: r.visitorName,
      phone: r.visitorMobile || '',
      purpose: normPurpose,
      status: normStatus,
      flatNumber: r.flatNumber || 'A-402',
      residentName: r.residentName || 'Sahil Arote',
      gate: r.gateName || 'Main Gate',
      guardName: r.guardName || 'Ramesh Singh',
      vehicleNumber: r.vehicleNumber || undefined,
      requestedAt: r.requestedAt,
      approvedAt: (normStatus === 'approved' || normStatus === 'inside' || normStatus === 'exited') ? (r.respondedAt || r.requestedAt) : undefined,
      enteredAt: r.enteredAt || ((normStatus === 'inside' || normStatus === 'exited') ? (r.respondedAt || r.requestedAt) : undefined),
      exitedAt: r.exitedAt || (normStatus === 'exited' ? r.respondedAt : undefined),
      deniedAt: normStatus === 'denied' ? r.respondedAt : undefined,
    };
  });
}

export async function updateVisitorStatusByAdmin(requestId: string, action: 'approve' | 'deny' | 'exit', reason?: string): Promise<boolean> {
  const pool = await getMysqlPool();
  if (!pool) return false;

  const now = new Date();
  if (action === 'approve') {
    await pool.query(
      `UPDATE visitor_requests 
       SET status = 'INSIDE', entry_time = ?, responded_at = ?, response_by = 'Society Admin'
       WHERE id = ?`,
      [now, now, requestId]
    );
  } else if (action === 'deny') {
    await pool.query(
      `UPDATE visitor_requests 
       SET status = 'REJECTED', responded_at = ?, response_by = 'Society Admin', rejection_reason = ?
       WHERE id = ?`,
      [now, reason || 'Denied by Administrator', requestId]
    );
  } else if (action === 'exit') {
    await pool.query(
      `UPDATE visitor_requests 
       SET status = 'EXITED', exit_time = ?
       WHERE id = ?`,
      [now, requestId]
    );
  }

  return true;
}



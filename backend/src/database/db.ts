import { v4 as uuidv4 } from 'uuid';
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


export interface SocietyServiceRow {
  id: string;
  societyId: string;
  name: string;
  category: string;
  serviceType: 'VENDOR' | 'UTILITY' | 'STAFF';
  providerName?: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  description?: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  timing?: string;
  createdAt: string;
}

export interface LostFoundItemRow {
  id: string;
  societyId: string;
  authorId: string;
  authorName: string;
  authorFlat: string;
  authorPhone?: string;
  type: 'LOST' | 'FOUND';
  title: string;
  description: string;
  category: string;
  location: string;
  incidentDate: string;
  imageUrl?: string;
  status: 'ACTIVE' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  updatedAt?: string;
}

export interface SocietyEventRow {
  id: string;
  societyId: string;
  createdBy: string;
  title: string;
  description: string;
  category: string;
  eventDate: string;
  endDate?: string;
  timeStr: string;
  venue: string;
  organizer: string;
  coverImage?: string;
  capacity: number;
  registrationCount: number;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  isRegistered?: boolean;
  guestCount?: number;
}

export interface EventRegistrationRow {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userFlat: string;
  userPhone?: string;
  guestCount: number;
  status: 'REGISTERED' | 'CANCELLED';
  registeredAt: string;
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

export async function getDefaultSociety(): Promise<SocietyRow | null> {
  const pool = await getMysqlPool();
  if (!pool) return null;
  const [rows]: any = await pool.query('SELECT * FROM societies ORDER BY created_at ASC LIMIT 1');
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

export async function updateSociety(societyId: string, data: { name?: string; address?: string }): Promise<SocietyRow | null> {
  const pool = await getMysqlPool();
  if (!pool) return null;

  const updates: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name.trim());
  }
  if (data.address !== undefined) {
    updates.push('address = ?');
    params.push(data.address.trim());
  }

  if (updates.length > 0) {
    params.push(societyId);
    await pool.query(`UPDATE societies SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  return findSocietyById(societyId);
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

  try {
    const [rows]: any = await pool.query('SELECT * FROM flats WHERE resident_id = ? LIMIT 1', [residentId]);
    if (rows && rows.length > 0) {
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
  } catch (err: any) {
    console.warn('[DB] Notice resolving flat:', err.message);
  }

  return null;
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
      u_res.mobile as residentMobile,
      u_res.mobile as residentPhone,
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
  flatId?: string;
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

  if (filters.flatId) {
    query += ' AND vr.flat_id = ?';
    params.push(filters.flatId);
  } else if (filters.residentId) {
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
  if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_FIXED_OTP === 'true' && otp === '123456') return true;

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

  // Only return flats that are UNREGISTERED / UNOCCUPIED and have NO pending registration
  const [rows]: any = await pool.query(
    `SELECT f.id, f.flat_number, f.wing, f.floor, f.resident_id 
     FROM flats f 
     WHERE f.society_id = ? 
       AND (f.resident_id IS NULL OR f.resident_id = '')
       AND f.id NOT IN (
         SELECT flat_id FROM resident_registrations 
         WHERE society_id = ? AND status = 'PENDING'
       )
     ORDER BY f.wing, f.floor, f.flat_number`,
    [societyId, societyId]
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

  // Fetch family members & vehicles for society
  let familyMap: Record<string, any[]> = {};
  let vehicleMap: Record<string, number> = {};
  try {
    const [famRows]: any = await pool.query(
      `SELECT resident_id, flat_id, id, name, relationship, phone FROM family_members WHERE society_id = ?`,
      [societyId]
    );
    for (const fam of (famRows || [])) {
      const key = fam.flat_id || fam.resident_id;
      if (!familyMap[key]) familyMap[key] = [];
      familyMap[key].push({
        id: fam.id,
        name: fam.name,
        phone: fam.phone ? `+91 ${fam.phone}` : '',
        role: fam.relationship,
        isOwner: false,
      });
    }

    const [vehRows]: any = await pool.query(
      `SELECT resident_id, flat_id, COUNT(*) as cnt FROM vehicles WHERE society_id = ? GROUP BY resident_id, flat_id`,
      [societyId]
    );
    for (const v of (vehRows || [])) {
      const key = v.flat_id || v.resident_id;
      vehicleMap[key] = (vehicleMap[key] || 0) + Number(v.cnt || 0);
    }
  } catch (err) {
    // Tables might be empty
  }

  return rows.map((r: any) => {
    const isOccupied = !!r.resident_id && !!r.res_name;
    const owner = isOccupied ? [
      {
        id: r.user_id || `res_${r.id}`,
        name: r.res_name,
        phone: r.res_mobile ? `+91 ${r.res_mobile}` : '',
        email: r.res_email || '',
        role: 'owner',
        isOwner: true,
      }
    ] : [];

    const famList = isOccupied ? (familyMap[r.id] || familyMap[r.user_id] || []) : [];
    const residents = [...owner, ...famList];
    const vehicleCount = isOccupied ? (vehicleMap[r.id] || vehicleMap[r.user_id] || 1) : 0;
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
      vehicleCount,
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
      v.photo_url as photoUrl,
      v.photo_key as photoKey,
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

    const resolvedPhoto = r.photoKey 
      ? `/api/visitor-requests/${r.id}/photo` 
      : (r.photoUrl || undefined);

    return {
      id: r.id,
      name: r.visitorName,
      phone: r.visitorMobile || '',
      photo: resolvedPhoto,
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

// =============================================================
// FAMILY MEMBERS & VEHICLES (RESIDENT)
// =============================================================

export interface FamilyMemberRow {
  id: string;
  societyId: string;
  residentId: string;
  flatId?: string;
  name: string;
  relationship: string;
  phone?: string;
  status: string;
  createdAt: string;
}

export interface VehicleRow {
  id: string;
  societyId: string;
  residentId: string;
  flatId?: string;
  vehicleNumber: string;
  type: string;
  brand?: string;
  model?: string;
  color?: string;
  status: string;
  createdAt: string;
}

export async function findFamilyMembersByResident(residentId: string, societyId: string): Promise<FamilyMemberRow[]> {
  try {
    const pool = await getMysqlPool();
    if (!pool) return [];

    const flat = await findFlatByResidentId(residentId);
    const flatId = flat?.id || null;

    const [rows]: any = await pool.query(
      `SELECT id, society_id as societyId, resident_id as residentId, flat_id as flatId,
              name, relationship, phone, status, created_at as createdAt
       FROM family_members
       WHERE society_id = ?
         AND status = 'ACTIVE'
         AND (resident_id = ? OR (? IS NOT NULL AND flat_id = ?))
       ORDER BY created_at DESC`,
      [societyId, residentId, flatId, flatId]
    );

    return rows || [];
  } catch (err: any) {
    console.error('[DB] Error finding family members:', err.message);
    return [];
  }
}

export async function createFamilyMember(data: {
  societyId: string;
  residentId: string;
  flatId?: string;
  name: string;
  relationship: string;
  phone?: string;
}): Promise<FamilyMemberRow> {
  const pool = await getMysqlPool();
  if (!pool) throw new Error('Database not available');

  const id = `fam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await pool.query(
    `INSERT INTO family_members (id, society_id, resident_id, flat_id, name, relationship, phone, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [id, data.societyId, data.residentId, data.flatId || null, data.name, data.relationship, data.phone || null]
  );

  return {
    id,
    societyId: data.societyId,
    residentId: data.residentId,
    flatId: data.flatId,
    name: data.name,
    relationship: data.relationship,
    phone: data.phone,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };
}

export async function deleteFamilyMember(id: string, residentId: string): Promise<boolean> {
  const pool = await getMysqlPool();
  if (!pool) return false;

  // Allow deletion if residentId is the primary owner OR if caller belongs to the same flat
  const flat = await findFlatByResidentId(residentId);
  const flatId = flat?.id || null;

  const [res]: any = await pool.query(
    `DELETE FROM family_members 
     WHERE id = ? 
       AND (resident_id = ? OR (? IS NOT NULL AND flat_id = ?))`,
    [id, residentId, flatId, flatId]
  );
  return res.affectedRows > 0;
}

export async function findVehiclesByResident(residentId: string, societyId: string): Promise<VehicleRow[]> {
  const pool = await getMysqlPool();
  if (!pool) return [];

  const [rows]: any = await pool.query(
    `SELECT id, society_id as societyId, resident_id as residentId, flat_id as flatId,
            vehicle_number as vehicleNumber, type, brand, model, color, status, created_at as createdAt
     FROM vehicles
     WHERE resident_id = ? AND society_id = ?
     ORDER BY created_at DESC`,
    [residentId, societyId]
  );
  return rows || [];
}

export async function createVehicle(data: {
  societyId: string;
  residentId: string;
  flatId?: string;
  vehicleNumber: string;
  type: string;
  brand?: string;
  model?: string;
  color?: string;
}): Promise<VehicleRow> {
  const pool = await getMysqlPool();
  if (!pool) throw new Error('Database not available');

  const id = `veh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await pool.query(
    `INSERT INTO vehicles (id, society_id, resident_id, flat_id, vehicle_number, type, brand, model, color, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [id, data.societyId, data.residentId, data.flatId || null, data.vehicleNumber.toUpperCase(), data.type || 'car', data.brand || '', data.model || '', data.color || '#000000']
  );

  return {
    id,
    societyId: data.societyId,
    residentId: data.residentId,
    flatId: data.flatId,
    vehicleNumber: data.vehicleNumber.toUpperCase(),
    type: data.type || 'car',
    brand: data.brand || '',
    model: data.model || '',
    color: data.color || '#000000',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };
}

export async function deleteVehicle(id: string, residentId: string): Promise<boolean> {
  const pool = await getMysqlPool();
  if (!pool) return false;

  const [res]: any = await pool.query(
    `DELETE FROM vehicles WHERE id = ? AND resident_id = ?`,
    [id, residentId]
  );
  return res.affectedRows > 0;
}

export async function deleteVisitorLogByAdmin(societyId: string, requestId: string): Promise<boolean> {
  const pool = await getMysqlPool();
  if (!pool) return false;

  // 1. Fetch visitor_id associated with request
  const [rows]: any = await pool.query(
    'SELECT visitor_id FROM visitor_requests WHERE id = ? AND society_id = ?',
    [requestId, societyId]
  );
  if (!rows || rows.length === 0) return false;

  const visitorId = rows[0].visitor_id;

  // 2. Delete visitor_request
  await pool.query('DELETE FROM visitor_requests WHERE id = ? AND society_id = ?', [requestId, societyId]);

  // 3. Clean up orphan visitor record if no other requests exist
  if (visitorId) {
    try {
      const [otherReqs]: any = await pool.query(
        'SELECT COUNT(*) as cnt FROM visitor_requests WHERE visitor_id = ?',
        [visitorId]
      );
      if (otherReqs[0]?.cnt === 0) {
        await pool.query('DELETE FROM visitors WHERE id = ?', [visitorId]);
      }
    } catch (_) {}
  }

  return true;
}

export async function deleteFlatByAdmin(societyId: string, flatId: string): Promise<boolean> {
  const pool = await getMysqlPool();
  if (!pool) return false;

  const [flats]: any = await pool.query(
    'SELECT id, resident_id FROM flats WHERE id = ? AND society_id = ?',
    [flatId, societyId]
  );
  if (!flats || flats.length === 0) return false;

  const residentId = flats[0].resident_id;

  // Delete related visitor requests, vehicles, family members
  try {
    await pool.query('DELETE FROM visitor_requests WHERE flat_id = ? AND society_id = ?', [flatId, societyId]);
    await pool.query('DELETE FROM family_members WHERE flat_id = ?', [flatId]);
    await pool.query('DELETE FROM vehicles WHERE flat_id = ?', [flatId]);
  } catch (_) {}

  // Delete the flat
  const [res]: any = await pool.query('DELETE FROM flats WHERE id = ? AND society_id = ?', [flatId, societyId]);

  // If there was an assigned resident who has no other flats, optionally clean up or unassign
  if (residentId) {
    try {
      const [otherFlats]: any = await pool.query('SELECT COUNT(*) as cnt FROM flats WHERE resident_id = ?', [residentId]);
      if (otherFlats[0]?.cnt === 0) {
        await pool.query("UPDATE users SET flat_number = NULL WHERE id = ? AND role = 'RESIDENT'", [residentId]);
      }
    } catch (_) {}
  }

  return res.affectedRows > 0;
}

export async function deleteResidentByAdmin(societyId: string, residentId: string): Promise<boolean> {
  const pool = await getMysqlPool();
  if (!pool) return false;

  // Check users table
  const [users]: any = await pool.query(
    "SELECT id FROM users WHERE id = ? AND society_id = ? AND role = 'RESIDENT'",
    [residentId, societyId]
  );

  if (users && users.length > 0) {
    const uId = users[0].id;
    // 1. Unlink flats
    await pool.query('UPDATE flats SET resident_id = NULL WHERE resident_id = ? AND society_id = ?', [uId, societyId]);
    // 2. Delete visitor requests
    await pool.query('DELETE FROM visitor_requests WHERE resident_id = ?', [uId]);
    // 3. Delete notifications
    await pool.query('DELETE FROM notifications WHERE recipient_id = ?', [uId]);
    // 4. Delete family members & vehicles
    try {
      await pool.query('DELETE FROM family_members WHERE resident_id = ?', [uId]);
      await pool.query('DELETE FROM vehicles WHERE resident_id = ?', [uId]);
      await pool.query('DELETE FROM push_subscriptions WHERE user_id = ?', [uId]);
    } catch (_) {}
    // 5. Delete user
    const [res]: any = await pool.query('DELETE FROM users WHERE id = ? AND society_id = ?', [uId, societyId]);
    return res.affectedRows > 0;
  }

  // Check family_members table
  try {
    const [fam]: any = await pool.query(
      'SELECT id FROM family_members WHERE id = ? AND society_id = ?',
      [residentId, societyId]
    );
    if (fam && fam.length > 0) {
      const [res]: any = await pool.query('DELETE FROM family_members WHERE id = ? AND society_id = ?', [residentId, societyId]);
      return res.affectedRows > 0;
    }
  } catch (_) {}

  return false;
}





// =============================================================
// FAMILY MEMBER AUTH & PROVISIONING HELPERS
// =============================================================

export async function findActiveFamilyMemberByPhone(cleanPhone: string): Promise<{
  member: FamilyMemberRow;
  flat: FlatRow | null;
  primaryOwner: UserRow | null;
} | null> {
  const pool = await getMysqlPool();
  if (!pool) return null;

  const digitsOnly = cleanPhone.replace(/\D/g, '');
  const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

  try {
    const [rows]: any = await pool.query(
      `SELECT fm.id, fm.society_id as societyId, fm.resident_id as residentId, fm.flat_id as flatId,
              fm.name, fm.relationship, fm.phone, fm.status, fm.created_at as createdAt,
              f.id as f_id, f.society_id as f_society_id, f.flat_number as f_flat_number, f.wing as f_wing, f.floor as f_floor,
              u.id as u_id, u.name as u_name, u.mobile as u_mobile, u.society_id as u_society_id
       FROM family_members fm
       LEFT JOIN flats f ON (fm.flat_id = f.id OR f.resident_id = fm.resident_id)
       LEFT JOIN users u ON fm.resident_id = u.id
       WHERE (REPLACE(REPLACE(fm.phone, '+', ''), ' ', '') LIKE ? OR fm.phone = ?)
         AND fm.status = 'ACTIVE'
       ORDER BY fm.created_at DESC
       LIMIT 1`,
      [`%${last10}`, cleanPhone]
    );

    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      member: {
        id: r.id,
        societyId: r.societyId,
        residentId: r.residentId,
        flatId: r.flatId || r.f_id,
        name: r.name,
        relationship: r.relationship,
        phone: r.phone,
        status: r.status,
        createdAt: r.createdAt,
      },
      flat: r.f_id ? {
        id: r.f_id,
        societyId: r.f_society_id,
        flatNumber: r.f_flat_number,
        wing: r.f_wing,
        floor: r.f_floor,
        residentId: r.residentId,
      } : null,
      primaryOwner: r.u_id ? {
        id: r.u_id,
        name: r.u_name,
        mobile: r.u_mobile,
        role: 'RESIDENT',
        societyId: r.u_society_id,
        status: 'ACTIVE',
        createdAt: '',
        updatedAt: '',
      } : null,
    };
  } catch (err: any) {
    console.error('[DB] Error finding family member by phone:', err.message);
    return null;
  }
}

export async function getOrCreateUserForFamilyMember(
  member: FamilyMemberRow,
  cleanMobile: string,
  societyId: string
): Promise<UserRow> {
  const pool = await getMysqlPool();
  if (!pool) throw new Error('Database unavailable');

  // Check if user already exists with this mobile
  const [existing]: any = await pool.query('SELECT * FROM users WHERE mobile = ? LIMIT 1', [cleanMobile]);
  if (existing && existing.length > 0) {
    const u = existing[0];
    return {
      id: u.id,
      name: u.name,
      mobile: u.mobile,
      role: u.role,
      societyId: u.society_id,
      status: u.status,
      createdAt: u.created_at,
      updatedAt: u.updated_at || '',
    };
  }

  // Provision new user row for the family member so auth & FCM work seamlessly
  const newUserId = `usr_fam_${member.id}`;
  await pool.query(
    `INSERT INTO users (id, name, mobile, role, society_id, status)
     VALUES (?, ?, ?, 'RESIDENT', ?, 'ACTIVE')
     ON DUPLICATE KEY UPDATE name = VALUES(name), status = 'ACTIVE'`,
    [newUserId, member.name, cleanMobile, societyId]
  );

  return {
    id: newUserId,
    name: member.name,
    mobile: cleanMobile,
    role: 'RESIDENT',
    societyId,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// =============================================================
// PRE-APPROVED VISITOR INVITATIONS (PASSES)
// =============================================================

export interface VisitorInviteRow {
  id: string;
  societyId: string;
  flatId: string;
  residentId: string;
  visitorName: string;
  visitorPhone?: string | null;
  purpose: string;
  passCode: string;
  validFrom: string;
  validUntil: string;
  notes?: string | null;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';
  usedAt?: string | null;
  createdAt: string;
  flatNumber?: string;
  wing?: string;
  residentName?: string;
  residentPhone?: string;
}

export async function ensureVisitorInvitesTable(): Promise<void> {
  const pool = await getMysqlPool();
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`visitor_invites\` (
        \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
        \`society_id\` VARCHAR(64) NOT NULL,
        \`flat_id\` VARCHAR(64) NOT NULL,
        \`resident_id\` VARCHAR(64) NOT NULL,
        \`visitor_name\` VARCHAR(128) NOT NULL,
        \`visitor_phone\` VARCHAR(32) DEFAULT NULL,
        \`purpose\` VARCHAR(64) NOT NULL DEFAULT 'guest',
        \`pass_code\` VARCHAR(16) NOT NULL,
        \`valid_from\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`valid_until\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`notes\` TEXT DEFAULT NULL,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        \`used_at\` TIMESTAMP NULL DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`society_id\`) REFERENCES \`societies\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`resident_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`flat_id\`) REFERENCES \`flats\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (err: any) {
    // Table may already exist
  }
}

export async function generateUniquePassCode(societyId: string): Promise<string> {
  const pool = await getMysqlPool();
  if (!pool) throw new Error('Database unavailable');
  await ensureVisitorInvitesTable();

  for (let attempt = 0; attempt < 10; attempt++) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const [rows]: any = await pool.query(
      `SELECT id FROM visitor_invites WHERE society_id = ? AND pass_code = ? AND status = 'ACTIVE' LIMIT 1`,
      [societyId, code]
    );
    if (!rows || rows.length === 0) {
      return code;
    }
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createVisitorInvite(data: {
  societyId: string;
  flatId: string;
  residentId: string;
  visitorName: string;
  visitorPhone?: string;
  purpose?: string;
  validFrom: Date;
  validUntil: Date;
  notes?: string;
}): Promise<VisitorInviteRow> {
  const pool = await getMysqlPool();
  if (!pool) throw new Error('Database unavailable');
  await ensureVisitorInvitesTable();

  const id = `inv_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  const passCode = await generateUniquePassCode(data.societyId);
  const purpose = data.purpose || 'guest';
  const cleanPhone = data.visitorPhone ? data.visitorPhone.replace(/\D/g, '') : null;

  await pool.query(
    `INSERT INTO visitor_invites 
     (id, society_id, flat_id, resident_id, visitor_name, visitor_phone, purpose, pass_code, valid_from, valid_until, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [
      id,
      data.societyId,
      data.flatId,
      data.residentId,
      data.visitorName.trim(),
      cleanPhone,
      purpose,
      passCode,
      data.validFrom,
      data.validUntil,
      data.notes ? data.notes.trim() : null,
    ]
  );

  const [created]: any = await pool.query(
    `SELECT vi.*, f.flat_number as flatNumber, f.wing, u.name as residentName, u.mobile as residentPhone
     FROM visitor_invites vi
     LEFT JOIN flats f ON vi.flat_id = f.id
     LEFT JOIN users u ON vi.resident_id = u.id
     WHERE vi.id = ?`,
    [id]
  );

  const row = created[0];
  return {
    id: row.id,
    societyId: row.society_id,
    flatId: row.flat_id,
    residentId: row.resident_id,
    visitorName: row.visitor_name,
    visitorPhone: row.visitor_phone,
    purpose: row.purpose,
    passCode: row.pass_code,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    notes: row.notes,
    status: row.status,
    usedAt: row.used_at,
    createdAt: row.created_at,
    flatNumber: row.flatNumber || '',
    wing: row.wing || '',
    residentName: row.residentName || '',
    residentPhone: row.residentPhone || '',
  };
}

export async function findInvitesByResident(residentId: string, societyId: string): Promise<VisitorInviteRow[]> {
  const pool = await getMysqlPool();
  if (!pool) return [];
  await ensureVisitorInvitesTable();

  // Auto-expire past active invites
  try {
    await pool.query(
      `UPDATE visitor_invites 
       SET status = 'EXPIRED' 
       WHERE society_id = ? AND status = 'ACTIVE' AND valid_until < NOW()`,
      [societyId]
    );
  } catch (_) {}

  const [rows]: any = await pool.query(
    `SELECT vi.*, f.flat_number as flatNumber, f.wing, u.name as residentName, u.mobile as residentPhone
     FROM visitor_invites vi
     LEFT JOIN flats f ON vi.flat_id = f.id
     LEFT JOIN users u ON vi.resident_id = u.id
     WHERE vi.resident_id = ? AND vi.society_id = ?
     ORDER BY vi.created_at DESC`,
    [residentId, societyId]
  );

  return rows.map((r: any) => ({
    id: r.id,
    societyId: r.society_id,
    flatId: r.flat_id,
    residentId: r.resident_id,
    visitorName: r.visitor_name,
    visitorPhone: r.visitor_phone,
    purpose: r.purpose,
    passCode: r.pass_code,
    validFrom: r.valid_from,
    validUntil: r.valid_until,
    notes: r.notes,
    status: r.status,
    usedAt: r.used_at,
    createdAt: r.created_at,
    flatNumber: r.flatNumber || '',
    wing: r.wing || '',
    residentName: r.residentName || '',
    residentPhone: r.residentPhone || '',
  }));
}

export async function findInviteByCode(societyId: string, passCode: string): Promise<VisitorInviteRow | null> {
  const pool = await getMysqlPool();
  if (!pool) return null;
  await ensureVisitorInvitesTable();

  // Auto-expire past active invites
  try {
    await pool.query(
      `UPDATE visitor_invites 
       SET status = 'EXPIRED' 
       WHERE society_id = ? AND status = 'ACTIVE' AND valid_until < NOW()`,
      [societyId]
    );
  } catch (_) {}

  const cleanCode = String(passCode).trim();
  const [rows]: any = await pool.query(
    `SELECT vi.*, f.flat_number as flatNumber, f.wing, u.name as residentName, u.mobile as residentPhone
     FROM visitor_invites vi
     LEFT JOIN flats f ON vi.flat_id = f.id
     LEFT JOIN users u ON vi.resident_id = u.id
     WHERE vi.society_id = ? AND vi.pass_code = ?
     ORDER BY vi.created_at DESC
     LIMIT 1`,
    [societyId, cleanCode]
  );

  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    societyId: r.society_id,
    flatId: r.flat_id,
    residentId: r.resident_id,
    visitorName: r.visitor_name,
    visitorPhone: r.visitor_phone,
    purpose: r.purpose,
    passCode: r.pass_code,
    validFrom: r.valid_from,
    validUntil: r.valid_until,
    notes: r.notes,
    status: r.status,
    usedAt: r.used_at,
    createdAt: r.created_at,
    flatNumber: r.flatNumber || '',
    wing: r.wing || '',
    residentName: r.residentName || '',
    residentPhone: r.residentPhone || '',
  };
}

export async function markInviteAsUsed(inviteId: string): Promise<boolean> {
  const pool = await getMysqlPool();
  if (!pool) return false;
  await ensureVisitorInvitesTable();

  const [result]: any = await pool.query(
    `UPDATE visitor_invites 
     SET status = 'USED', used_at = CURRENT_TIMESTAMP 
     WHERE id = ? AND status = 'ACTIVE'`,
    [inviteId]
  );
  return result.affectedRows > 0;
}

export async function cancelVisitorInvite(inviteId: string, residentId: string): Promise<boolean> {
  const pool = await getMysqlPool();
  if (!pool) return false;
  await ensureVisitorInvitesTable();

  const [result]: any = await pool.query(
    `UPDATE visitor_invites 
     SET status = 'CANCELLED' 
     WHERE id = ? AND resident_id = ? AND status = 'ACTIVE'`,
    [inviteId, residentId]
  );
  return result.affectedRows > 0;
}



// =============================================================
// SERVICES & COMMUNITY DATA LAYER
// =============================================================

// In-Memory Seed Data for Fallback / Sandbox Execution
const defaultServicesSeed: SocietyServiceRow[] = [
  {
    id: 'srv_1',
    societyId: 'soc_01',
    name: 'Shri Ganesh Electricals',
    category: 'Electrician',
    serviceType: 'VENDOR',
    providerName: 'Ganesh Shinde',
    phone: '+91 98201 12345',
    alternatePhone: '+91 22 2847 1100',
    address: 'Shop 12, Chandivali Farm Road',
    description: 'Expert residential wiring, inverter repairs, MCB trippings & appliance installations.',
    rating: 4.7,
    reviewCount: 34,
    isVerified: true,
    timing: '8:00 AM – 9:00 PM',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv_2',
    societyId: 'soc_01',
    name: 'Rahul Plumbing Works',
    category: 'Plumber',
    serviceType: 'VENDOR',
    providerName: 'Rahul Patil',
    phone: '+91 98334 56789',
    address: 'Opp. Andheri Sports Complex',
    description: 'Pipe leakages, bathroom fittings, flush tanks, water pressure pumps & water heaters.',
    rating: 4.5,
    reviewCount: 28,
    isVerified: true,
    timing: '9:00 AM – 8:00 PM',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv_3',
    societyId: 'soc_01',
    name: 'Kone Lift Services',
    category: 'Lift AMC',
    serviceType: 'VENDOR',
    providerName: 'Kone Service Center',
    phone: '+91 22 6677 8899',
    address: 'Andheri East Service Centre',
    description: 'Official society elevator AMC, emergency breakdown assistance and bi-weekly inspections.',
    rating: 4.8,
    reviewCount: 12,
    isVerified: true,
    timing: '24/7 Emergency Support',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv_4',
    societyId: 'soc_01',
    name: 'Mumbai AC Experts',
    category: 'AC Repair',
    serviceType: 'VENDOR',
    providerName: 'Mohammed Ansari',
    phone: '+91 98190 23456',
    address: 'Marol Naka, Andheri East',
    description: 'Split & window AC servicing, jet wash cleaning, copper pipe laying, gas refilling.',
    rating: 4.3,
    reviewCount: 45,
    isVerified: true,
    timing: '9:00 AM – 8:00 PM',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv_5',
    societyId: 'soc_01',
    name: 'Cleanify Home Services',
    category: 'Deep Cleaning',
    serviceType: 'VENDOR',
    providerName: 'Sanjay Rawat',
    phone: '+91 98205 67890',
    address: 'Powai Plaza, Hiranandani',
    description: 'Full house deep cleaning, sofa shampooing, kitchen chimney cleaning & balcony pressure wash.',
    rating: 4.6,
    reviewCount: 22,
    isVerified: true,
    timing: '9:00 AM – 7:00 PM',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv_6',
    societyId: 'soc_01',
    name: 'Bisleri & Kinley 20L Water Can',
    category: 'Water Can',
    serviceType: 'UTILITY',
    providerName: 'Shree Krishna Water Supplies',
    phone: '+91 98212 34567',
    address: 'Gate 2 Delivery Counter',
    description: 'Daily morning delivery of 20L sealed drinking water jars to doorstep before 8 AM.',
    rating: 4.9,
    reviewCount: 88,
    isVerified: true,
    timing: '6:00 AM – 10:00 AM',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv_7',
    societyId: 'soc_01',
    name: 'Country Delight Milk Delivery',
    category: 'Milk Delivery',
    serviceType: 'UTILITY',
    providerName: 'Customer Desk',
    phone: '+91 96540 12345',
    address: 'Society Main Gate Drop Box',
    description: 'Fresh cow & buffalo milk, breads, curd, and organic eggs delivered daily by 7 AM.',
    rating: 4.8,
    reviewCount: 64,
    isVerified: true,
    timing: '5:30 AM – 7:30 AM',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv_8',
    societyId: 'soc_01',
    name: 'Daily Society Housekeeping Staff',
    category: 'Maid & Housekeeping',
    serviceType: 'STAFF',
    providerName: 'Society Admin Helpdesk',
    phone: '+91 22 2847 0001',
    address: 'Estate Manager Office, Tower A',
    description: 'Police verified, RFID badged daily domestic helpers, cooks, and babysitters available for hire.',
    rating: 4.7,
    reviewCount: 40,
    isVerified: true,
    timing: '8:00 AM – 6:00 PM',
    createdAt: new Date().toISOString(),
  }
];

const defaultLostFoundSeed: LostFoundItemRow[] = [
  {
    id: 'lf_1',
    societyId: 'soc_01',
    authorId: 'usr_resident_1',
    authorName: 'Rohit Patil',
    authorFlat: 'Flat A-402',
    authorPhone: '+91 98200 11111',
    type: 'LOST',
    title: 'Brown leather wallet',
    description: 'Lost near the swimming pool area on Aug 3 evening. Contains Aadhaar card and driving license inside. Reward on return.',
    category: 'Wallet & Cards',
    location: 'Near Clubhouse / Pool area',
    incidentDate: '2026-08-03T18:30:00.000Z',
    imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&auto=format&fit=crop&q=60',
    status: 'ACTIVE',
    createdAt: '2026-08-03T19:00:00.000Z',
  },
  {
    id: 'lf_2',
    societyId: 'soc_01',
    authorId: 'usr_guard_1',
    authorName: 'Ganesh Kale (Security)',
    authorFlat: 'Main Security Gate',
    authorPhone: '+91 98200 22222',
    type: 'FOUND',
    title: 'Car keys (Honda logo)',
    description: 'Found near Wing X basement parking entrance on Aug 2 morning. Has red keychain. Contact security cabin to claim with proof.',
    category: 'Keys',
    location: 'Wing X Basement Parking',
    incidentDate: '2026-08-02T08:15:00.000Z',
    imageUrl: 'https://images.unsplash.com/photo-1589148938909-4d241c91ee52?w=500&auto=format&fit=crop&q=60',
    status: 'ACTIVE',
    createdAt: '2026-08-02T09:00:00.000Z',
  },
  {
    id: 'lf_3',
    societyId: 'soc_01',
    authorId: 'usr_resident_2',
    authorName: 'Deepa Nair',
    authorFlat: 'Flat Y-301',
    authorPhone: '+91 98200 33333',
    type: 'LOST',
    title: 'Airpods Pro (white case)',
    description: 'Lost somewhere between Wing Y lobby and passenger lift 2 on Aug 1. Case has a blue silicone protective ring.',
    category: 'Electronics',
    location: 'Wing Y Lobby / Lift',
    incidentDate: '2026-08-01T17:45:00.000Z',
    imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500&auto=format&fit=crop&q=60',
    status: 'ACTIVE',
    createdAt: '2026-08-01T18:20:00.000Z',
  },
  {
    id: 'lf_4',
    societyId: 'soc_01',
    authorId: 'usr_staff_1',
    authorName: 'Surekha Mane (Housekeeping)',
    authorFlat: 'Estate Management',
    authorPhone: '+91 98200 44444',
    type: 'FOUND',
    title: "Child's school bag (blue Chhota Bheem)",
    description: 'Found in Wing Z terrace recreation area. Kept at society management office for collection.',
    category: 'Bags & Luggage',
    location: 'Wing Z Terrace Garden',
    incidentDate: '2026-07-31T16:00:00.000Z',
    status: 'RESOLVED',
    createdAt: '2026-07-31T17:00:00.000Z',
    updatedAt: '2026-08-01T11:00:00.000Z',
  }
];

const defaultEventsSeed: SocietyEventRow[] = [
  {
    id: 'evt_1',
    societyId: 'soc_01',
    createdBy: 'usr_admin_1',
    title: 'Annual Independence Day & Flag Hoisting',
    description: 'Join us for the 80th Independence Day celebration. Flag hoisting at 8:30 AM sharp followed by national anthem, patriotic cultural performances by children and sweet distribution.',
    category: 'Celebration',
    eventDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 5 * 86400000 + 3 * 3600000).toISOString(),
    timeStr: '8:30 AM – 11:30 AM',
    venue: 'Central Amphitheater & Flagpole Lawn',
    organizer: 'NexGate Managing Committee',
    coverImage: 'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=800&auto=format&fit=crop&q=80',
    capacity: 250,
    registrationCount: 68,
    status: 'UPCOMING',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'evt_2',
    societyId: 'soc_01',
    createdBy: 'usr_admin_1',
    title: 'Monsoon Tree Plantation & Green Campus Drive',
    description: 'Annual environmental plantation drive across boundary walls. Free plant saplings provided for all children and flats. Bring gardening gloves if available.',
    category: 'Community Work',
    eventDate: new Date(Date.now() + 12 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 12 * 86400000 + 3 * 3600000).toISOString(),
    timeStr: '9:00 AM – 12:00 PM',
    venue: 'Society East Boundary Garden',
    organizer: 'Eco Residency Green Committee',
    coverImage: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80',
    capacity: 100,
    registrationCount: 42,
    status: 'UPCOMING',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'evt_3',
    societyId: 'soc_01',
    createdBy: 'usr_admin_1',
    title: 'Society Annual General Body Meeting (AGM)',
    description: 'Review of audited annual accounts, lift modernization proposal, CCTV security upgrades, and election of new committee members.',
    category: 'Meeting',
    eventDate: new Date(Date.now() + 25 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 25 * 86400000 + 3 * 3600000).toISOString(),
    timeStr: '5:00 PM – 8:00 PM',
    venue: 'Main Clubhouse Conference Hall',
    organizer: 'Society Secretary & Treasurer',
    coverImage: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80',
    capacity: 150,
    registrationCount: 94,
    status: 'UPCOMING',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'evt_4',
    societyId: 'soc_01',
    createdBy: 'usr_admin_1',
    title: 'Summer Badminton & Table Tennis Tournament',
    description: 'Inter-tower sports championship across juniors, open and seniors categories. Trophies and certificates for all finalists.',
    category: 'Sports',
    eventDate: '2026-06-14T10:00:00.000Z',
    endDate: '2026-06-14T19:00:00.000Z',
    timeStr: '10:00 AM – 7:00 PM',
    venue: 'Indoor Sports Arena',
    organizer: 'Youth & Sports Club',
    coverImage: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop&q=80',
    capacity: 80,
    registrationCount: 76,
    status: 'COMPLETED',
    createdAt: '2026-06-01T10:00:00.000Z',
  }
];

let inMemoryServices = [...defaultServicesSeed];
let inMemoryLostFound = [...defaultLostFoundSeed];
let inMemoryEvents = [...defaultEventsSeed];
let inMemoryEventRegistrations: EventRegistrationRow[] = [];

export async function ensureServicesAndCommunityTables(): Promise<void> {
  const pool = await getMysqlPool();
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`society_services\` (
        \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
        \`society_id\` VARCHAR(64) NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`category\` VARCHAR(64) NOT NULL,
        \`service_type\` VARCHAR(32) NOT NULL DEFAULT 'VENDOR',
        \`provider_name\` VARCHAR(255) DEFAULT NULL,
        \`phone\` VARCHAR(32) NOT NULL,
        \`alternate_phone\` VARCHAR(32) DEFAULT NULL,
        \`address\` TEXT DEFAULT NULL,
        \`description\` TEXT DEFAULT NULL,
        \`rating\` DECIMAL(3,1) NOT NULL DEFAULT 4.5,
        \`review_count\` INT NOT NULL DEFAULT 0,
        \`is_verified\` TINYINT(1) NOT NULL DEFAULT 1,
        \`timing\` VARCHAR(128) DEFAULT '9:00 AM – 8:00 PM',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`lost_found_items\` (
        \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
        \`society_id\` VARCHAR(64) NOT NULL,
        \`author_id\` VARCHAR(64) NOT NULL,
        \`author_name\` VARCHAR(255) NOT NULL,
        \`author_flat\` VARCHAR(64) NOT NULL,
        \`author_phone\` VARCHAR(32) DEFAULT NULL,
        \`type\` ENUM('LOST', 'FOUND') NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`description\` TEXT NOT NULL,
        \`category\` VARCHAR(64) NOT NULL,
        \`location\` VARCHAR(255) NOT NULL,
        \`incident_date\` DATETIME NOT NULL,
        \`image_url\` TEXT DEFAULT NULL,
        \`status\` ENUM('ACTIVE', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NULL DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`society_events\` (
        \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
        \`society_id\` VARCHAR(64) NOT NULL,
        \`created_by\` VARCHAR(64) NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`description\` TEXT NOT NULL,
        \`category\` VARCHAR(64) NOT NULL DEFAULT 'Celebration',
        \`event_date\` DATETIME NOT NULL,
        \`end_date\` DATETIME NULL DEFAULT NULL,
        \`time_str\` VARCHAR(64) NOT NULL,
        \`venue\` VARCHAR(255) NOT NULL,
        \`organizer\` VARCHAR(255) NOT NULL DEFAULT 'Society Committee',
        \`cover_image\` TEXT DEFAULT NULL,
        \`capacity\` INT NOT NULL DEFAULT 0,
        \`registration_count\` INT NOT NULL DEFAULT 0,
        \`status\` ENUM('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'UPCOMING',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`event_registrations\` (
        \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
        \`event_id\` VARCHAR(64) NOT NULL,
        \`user_id\` VARCHAR(64) NOT NULL,
        \`user_name\` VARCHAR(255) NOT NULL,
        \`user_flat\` VARCHAR(64) NOT NULL,
        \`user_phone\` VARCHAR(32) DEFAULT NULL,
        \`guest_count\` INT NOT NULL DEFAULT 1,
        \`status\` ENUM('REGISTERED', 'CANCELLED') NOT NULL DEFAULT 'REGISTERED',
        \`registered_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`uk_event_user\` (\`event_id\`, \`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Check if society_services has initial rows; if empty, seed defaults
    const [existingServices]: any = await pool.query('SELECT COUNT(*) as count FROM society_services');
    if (existingServices && existingServices[0]?.count === 0) {
      console.log('[DB] Seeding initial verified society services...');
      for (const s of defaultServicesSeed) {
        await pool.query(
          `INSERT INTO society_services 
           (id, society_id, name, category, service_type, provider_name, phone, alternate_phone, address, description, rating, review_count, is_verified, timing)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.id, s.societyId, s.name, s.category, s.serviceType, s.providerName || null, s.phone, s.alternatePhone || null, s.address || null, s.description || null, s.rating, s.reviewCount, s.isVerified ? 1 : 0, s.timing || null]
        );
      }
    }

    // Check if lost_found_items has initial rows; if empty, seed defaults
    const [existingLF]: any = await pool.query('SELECT COUNT(*) as count FROM lost_found_items');
    if (existingLF && existingLF[0]?.count === 0) {
      console.log('[DB] Seeding initial lost & found items...');
      for (const lf of defaultLostFoundSeed) {
        await pool.query(
          `INSERT INTO lost_found_items 
           (id, society_id, author_id, author_name, author_flat, author_phone, type, title, description, category, location, incident_date, image_url, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [lf.id, lf.societyId, lf.authorId, lf.authorName, lf.authorFlat, lf.authorPhone || null, lf.type, lf.title, lf.description, lf.category, lf.location, new Date(lf.incidentDate), lf.imageUrl || null, lf.status]
        );
      }
    }

    // Check if society_events has initial rows; if empty, seed defaults
    const [existingEvents]: any = await pool.query('SELECT COUNT(*) as count FROM society_events');
    if (existingEvents && existingEvents[0]?.count === 0) {
      console.log('[DB] Seeding initial society events...');
      for (const e of defaultEventsSeed) {
        await pool.query(
          `INSERT INTO society_events 
           (id, society_id, created_by, title, description, category, event_date, end_date, time_str, venue, organizer, cover_image, capacity, registration_count, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [e.id, e.societyId, e.createdBy, e.title, e.description, e.category, new Date(e.eventDate), e.endDate ? new Date(e.endDate) : null, e.timeStr, e.venue, e.organizer, e.coverImage || null, e.capacity, e.registrationCount, e.status]
        );
      }
    }
  } catch (err: any) {
    console.error('[DB] Error ensuring services & community tables:', err.message);
  }
}

// -------------------------------------------------------------
// 1. SERVICES CRUD
// -------------------------------------------------------------

export async function getSocietyServices(
  societyId: string,
  params: { type?: string; category?: string; search?: string } = {}
): Promise<SocietyServiceRow[]> {
  const pool = await getMysqlPool();
  if (!pool) {
    let list = inMemoryServices.filter(s => s.societyId === societyId || s.societyId === 'soc_01');
    if (params.type && params.type.toUpperCase() !== 'ALL') {
      const targetType = params.type.toUpperCase();
      list = list.filter(s => s.serviceType === targetType || (targetType === 'VENDORS' && s.serviceType === 'VENDOR') || (targetType === 'UTILITIES' && s.serviceType === 'UTILITY') || (targetType === 'STAFF' && s.serviceType === 'STAFF'));
    }
    if (params.category && params.category !== 'All') {
      list = list.filter(s => s.category.toLowerCase() === params.category!.toLowerCase());
    }
    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q)));
    }
    return list;
  }

  await ensureServicesAndCommunityTables();
  let sql = 'SELECT * FROM society_services WHERE (society_id = ? OR society_id = ?) ';
  const values: any[] = [societyId, 'soc_01'];

  if (params.type && params.type.toUpperCase() !== 'ALL') {
    let t = params.type.toUpperCase();
    if (t === 'VENDORS') t = 'VENDOR';
    if (t === 'UTILITIES') t = 'UTILITY';
    sql += 'AND service_type = ? ';
    values.push(t);
  }

  if (params.category && params.category !== 'All') {
    sql += 'AND category = ? ';
    values.push(params.category);
  }

  if (params.search && params.search.trim()) {
    sql += 'AND (name LIKE ? OR category LIKE ? OR description LIKE ?) ';
    const wildcard = `%${params.search.trim()}%`;
    values.push(wildcard, wildcard, wildcard);
  }

  sql += 'ORDER BY is_verified DESC, rating DESC';

  const [rows]: any = await pool.query(sql, values);
  return (rows || []).map((r: any) => ({
    id: r.id,
    societyId: r.society_id,
    name: r.name,
    category: r.category,
    serviceType: r.service_type,
    providerName: r.provider_name,
    phone: r.phone,
    alternatePhone: r.alternate_phone,
    address: r.address,
    description: r.description,
    rating: parseFloat(r.rating) || 4.5,
    reviewCount: r.review_count || 0,
    isVerified: Boolean(r.is_verified),
    timing: r.timing,
    createdAt: r.created_at,
  }));
}

export async function getSocietyServiceById(id: string, societyId: string): Promise<SocietyServiceRow | null> {
  const pool = await getMysqlPool();
  if (!pool) {
    return inMemoryServices.find(s => s.id === id) || null;
  }
  await ensureServicesAndCommunityTables();
  const [rows]: any = await pool.query('SELECT * FROM society_services WHERE id = ? LIMIT 1', [id]);
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    societyId: r.society_id,
    name: r.name,
    category: r.category,
    serviceType: r.service_type,
    providerName: r.provider_name,
    phone: r.phone,
    alternatePhone: r.alternate_phone,
    address: r.address,
    description: r.description,
    rating: parseFloat(r.rating) || 4.5,
    reviewCount: r.review_count || 0,
    isVerified: Boolean(r.is_verified),
    timing: r.timing,
    createdAt: r.created_at,
  };
}

export async function createSocietyService(data: {
  societyId: string;
  name: string;
  category: string;
  serviceType: 'VENDOR' | 'UTILITY' | 'STAFF';
  providerName?: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  description?: string;
  timing?: string;
  rating?: number;
  isVerified?: boolean;
}): Promise<SocietyServiceRow> {
  const id = `srv_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  const row: SocietyServiceRow = {
    id,
    societyId: data.societyId,
    name: data.name.trim(),
    category: data.category.trim(),
    serviceType: data.serviceType || 'VENDOR',
    providerName: data.providerName?.trim(),
    phone: data.phone.trim(),
    alternatePhone: data.alternatePhone?.trim(),
    address: data.address?.trim(),
    description: data.description?.trim(),
    rating: data.rating ?? 4.5,
    reviewCount: 0,
    isVerified: data.isVerified ?? true,
    timing: data.timing?.trim() || '9:00 AM – 8:00 PM',
    createdAt: new Date().toISOString(),
  };

  const pool = await getMysqlPool();
  if (!pool) {
    inMemoryServices.unshift(row);
    return row;
  }

  await ensureServicesAndCommunityTables();
  await pool.query(
    `INSERT INTO society_services 
     (id, society_id, name, category, service_type, provider_name, phone, alternate_phone, address, description, rating, review_count, is_verified, timing)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [row.id, row.societyId, row.name, row.category, row.serviceType, row.providerName || null, row.phone, row.alternatePhone || null, row.address || null, row.description || null, row.rating, row.reviewCount, row.isVerified ? 1 : 0, row.timing || null]
  );
  return row;
}

export async function deleteSocietyService(id: string, societyId: string): Promise<boolean> {
  const pool = await getMysqlPool();
  if (!pool) {
    const idx = inMemoryServices.findIndex(s => s.id === id);
    if (idx === -1) return false;
    inMemoryServices.splice(idx, 1);
    return true;
  }

  await ensureServicesAndCommunityTables();
  const [res]: any = await pool.query('DELETE FROM society_services WHERE id = ? AND society_id = ?', [id, societyId]);
  return res.affectedRows > 0;
}

// -------------------------------------------------------------
// 2. LOST & FOUND CRUD
// -------------------------------------------------------------

export async function getLostFoundItems(
  societyId: string,
  params: { type?: string; status?: string; search?: string } = {}
): Promise<LostFoundItemRow[]> {
  const pool = await getMysqlPool();
  if (!pool) {
    let list = inMemoryLostFound.filter(i => i.societyId === societyId || i.societyId === 'soc_01');
    if (params.type && params.type !== 'ALL') {
      list = list.filter(i => i.type.toUpperCase() === params.type!.toUpperCase());
    }
    if (params.status && params.status !== 'ALL') {
      list = list.filter(i => i.status.toUpperCase() === params.status!.toUpperCase());
    }
    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase();
      list = list.filter(i => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.location.toLowerCase().includes(q));
    }
    return list;
  }

  await ensureServicesAndCommunityTables();
  let sql = 'SELECT * FROM lost_found_items WHERE (society_id = ? OR society_id = ?) ';
  const values: any[] = [societyId, 'soc_01'];

  if (params.type && params.type !== 'ALL') {
    sql += 'AND type = ? ';
    values.push(params.type.toUpperCase());
  }

  if (params.status && params.status !== 'ALL') {
    sql += 'AND status = ? ';
    values.push(params.status.toUpperCase());
  }

  if (params.search && params.search.trim()) {
    sql += 'AND (title LIKE ? OR description LIKE ? OR location LIKE ?) ';
    const wildcard = `%${params.search.trim()}%`;
    values.push(wildcard, wildcard, wildcard);
  }

  sql += 'ORDER BY incident_date DESC, created_at DESC';

  const [rows]: any = await pool.query(sql, values);
  return (rows || []).map((r: any) => ({
    id: r.id,
    societyId: r.society_id,
    authorId: r.author_id,
    authorName: r.author_name,
    authorFlat: r.author_flat,
    authorPhone: r.author_phone,
    type: r.type,
    title: r.title,
    description: r.description,
    category: r.category,
    location: r.location,
    incidentDate: r.incident_date,
    imageUrl: r.image_url,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getLostFoundItemById(id: string, societyId: string): Promise<LostFoundItemRow | null> {
  const pool = await getMysqlPool();
  if (!pool) {
    return inMemoryLostFound.find(i => i.id === id) || null;
  }
  await ensureServicesAndCommunityTables();
  const [rows]: any = await pool.query('SELECT * FROM lost_found_items WHERE id = ? LIMIT 1', [id]);
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    societyId: r.society_id,
    authorId: r.author_id,
    authorName: r.author_name,
    authorFlat: r.author_flat,
    authorPhone: r.author_phone,
    type: r.type,
    title: r.title,
    description: r.description,
    category: r.category,
    location: r.location,
    incidentDate: r.incident_date,
    imageUrl: r.image_url,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function createLostFoundItem(data: {
  societyId: string;
  authorId: string;
  authorName: string;
  authorFlat: string;
  authorPhone?: string;
  type: 'LOST' | 'FOUND';
  title: string;
  description: string;
  category: string;
  location: string;
  incidentDate?: string;
  imageUrl?: string;
}): Promise<LostFoundItemRow> {
  const id = `lf_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  const incidentDate = data.incidentDate ? new Date(data.incidentDate).toISOString() : new Date().toISOString();
  const row: LostFoundItemRow = {
    id,
    societyId: data.societyId,
    authorId: data.authorId,
    authorName: data.authorName,
    authorFlat: data.authorFlat,
    authorPhone: data.authorPhone,
    type: data.type,
    title: data.title.trim(),
    description: data.description.trim(),
    category: data.category.trim(),
    location: data.location.trim(),
    incidentDate,
    imageUrl: data.imageUrl,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };

  const pool = await getMysqlPool();
  if (!pool) {
    inMemoryLostFound.unshift(row);
    return row;
  }

  await ensureServicesAndCommunityTables();
  await pool.query(
    `INSERT INTO lost_found_items 
     (id, society_id, author_id, author_name, author_flat, author_phone, type, title, description, category, location, incident_date, image_url, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [row.id, row.societyId, row.authorId, row.authorName, row.authorFlat, row.authorPhone || null, row.type, row.title, row.description, row.category, row.location, new Date(row.incidentDate), row.imageUrl || null]
  );
  return row;
}

export async function updateLostFoundStatus(
  id: string,
  societyId: string,
  authorId: string,
  status: 'ACTIVE' | 'RESOLVED' | 'CLOSED',
  isAdmin: boolean = false
): Promise<boolean> {
  const pool = await getMysqlPool();
  if (!pool) {
    const item = inMemoryLostFound.find(i => i.id === id);
    if (!item) return false;
    if (!isAdmin && item.authorId !== authorId) return false;
    item.status = status;
    item.updatedAt = new Date().toISOString();
    return true;
  }

  await ensureServicesAndCommunityTables();
  const sql = isAdmin
    ? `UPDATE lost_found_items SET status = ?, updated_at = NOW() WHERE id = ?`
    : `UPDATE lost_found_items SET status = ?, updated_at = NOW() WHERE id = ? AND author_id = ?`;
  const params = isAdmin ? [status, id] : [status, id, authorId];

  const [result]: any = await pool.query(sql, params);
  return result.affectedRows > 0;
}

export async function deleteLostFoundItem(
  id: string,
  societyId: string,
  authorId: string,
  isAdmin: boolean = false
): Promise<boolean> {
  const pool = await getMysqlPool();
  if (!pool) {
    const idx = inMemoryLostFound.findIndex(i => i.id === id);
    if (idx === -1) return false;
    if (!isAdmin && inMemoryLostFound[idx].authorId !== authorId) return false;
    inMemoryLostFound.splice(idx, 1);
    return true;
  }

  await ensureServicesAndCommunityTables();
  const sql = isAdmin
    ? `DELETE FROM lost_found_items WHERE id = ?`
    : `DELETE FROM lost_found_items WHERE id = ? AND author_id = ?`;
  const params = isAdmin ? [id] : [id, authorId];

  const [result]: any = await pool.query(sql, params);
  return result.affectedRows > 0;
}

// -------------------------------------------------------------
// 3. SOCIETY EVENTS & REGISTRATIONS CRUD
// -------------------------------------------------------------

export async function getSocietyEvents(
  societyId: string,
  filter: 'upcoming' | 'past' | 'all' = 'upcoming',
  userId?: string
): Promise<SocietyEventRow[]> {
  const pool = await getMysqlPool();
  if (!pool) {
    const now = new Date();
    let list = inMemoryEvents.filter(e => e.societyId === societyId || e.societyId === 'soc_01');
    if (filter === 'upcoming') {
      list = list.filter(e => new Date(e.eventDate) >= now && e.status !== 'CANCELLED');
    } else if (filter === 'past') {
      list = list.filter(e => new Date(e.eventDate) < now || e.status === 'COMPLETED');
    }

    if (userId) {
      list = list.map(e => {
        const reg = inMemoryEventRegistrations.find(r => r.eventId === e.id && r.userId === userId && r.status === 'REGISTERED');
        return {
          ...e,
          isRegistered: Boolean(reg),
          guestCount: reg?.guestCount,
        };
      });
    }
    return list;
  }

  await ensureServicesAndCommunityTables();
  let sql = `
    SELECT e.*, 
           (CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END) as is_user_registered,
           r.guest_count as user_guest_count
    FROM society_events e
    LEFT JOIN event_registrations r ON e.id = r.event_id AND r.user_id = ? AND r.status = 'REGISTERED'
    WHERE (e.society_id = ? OR e.society_id = ?)
  `;
  const params: any[] = [userId || 'none', societyId, 'soc_01'];

  if (filter === 'upcoming') {
    sql += " AND e.event_date >= NOW() AND e.status != 'CANCELLED' ORDER BY e.event_date ASC";
  } else if (filter === 'past') {
    sql += " AND (e.event_date < NOW() OR e.status = 'COMPLETED') ORDER BY e.event_date DESC";
  } else {
    sql += " ORDER BY e.event_date DESC";
  }

  const [rows]: any = await pool.query(sql, params);
  return (rows || []).map((r: any) => ({
    id: r.id,
    societyId: r.society_id,
    createdBy: r.created_by,
    title: r.title,
    description: r.description,
    category: r.category,
    eventDate: r.event_date,
    endDate: r.end_date,
    timeStr: r.time_str,
    venue: r.venue,
    organizer: r.organizer,
    coverImage: r.cover_image,
    capacity: r.capacity || 0,
    registrationCount: r.registration_count || 0,
    status: r.status,
    createdAt: r.created_at,
    isRegistered: Boolean(r.is_user_registered),
    guestCount: r.user_guest_count,
  }));
}

export async function getSocietyEventById(id: string, societyId: string, userId?: string): Promise<SocietyEventRow | null> {
  const pool = await getMysqlPool();
  if (!pool) {
    const e = inMemoryEvents.find(ev => ev.id === id);
    if (!e) return null;
    const reg = userId ? inMemoryEventRegistrations.find(r => r.eventId === id && r.userId === userId && r.status === 'REGISTERED') : undefined;
    return {
      ...e,
      isRegistered: Boolean(reg),
      guestCount: reg?.guestCount,
    };
  }

  await ensureServicesAndCommunityTables();
  const [rows]: any = await pool.query(`
    SELECT e.*, 
           (CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END) as is_user_registered,
           r.guest_count as user_guest_count
    FROM society_events e
    LEFT JOIN event_registrations r ON e.id = r.event_id AND r.user_id = ? AND r.status = 'REGISTERED'
    WHERE e.id = ? LIMIT 1
  `, [userId || 'none', id]);

  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    societyId: r.society_id,
    createdBy: r.created_by,
    title: r.title,
    description: r.description,
    category: r.category,
    eventDate: r.event_date,
    endDate: r.end_date,
    timeStr: r.time_str,
    venue: r.venue,
    organizer: r.organizer,
    coverImage: r.cover_image,
    capacity: r.capacity || 0,
    registrationCount: r.registration_count || 0,
    status: r.status,
    createdAt: r.created_at,
    isRegistered: Boolean(r.is_user_registered),
    guestCount: r.user_guest_count,
  };
}

export async function registerForEvent(
  eventId: string,
  user: { id: string; name: string; flat: string; phone?: string; societyId: string },
  guestCount: number = 1
): Promise<{ success: boolean; error?: string; registration?: EventRegistrationRow }> {
  const pool = await getMysqlPool();
  if (!pool) {
    const event = inMemoryEvents.find(e => e.id === eventId);
    if (!event) return { success: false, error: 'Event not found' };
    if (event.status === 'CANCELLED' || event.status === 'COMPLETED') {
      return { success: false, error: 'Event is no longer accepting registrations' };
    }
    const existing = inMemoryEventRegistrations.find(r => r.eventId === eventId && r.userId === user.id && r.status === 'REGISTERED');
    if (existing) {
      return { success: false, error: 'You are already registered for this event' };
    }
    if (event.capacity > 0 && event.registrationCount + guestCount > event.capacity) {
      return { success: false, error: 'Event has reached maximum capacity' };
    }

    const regId = `reg_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const newReg: EventRegistrationRow = {
      id: regId,
      eventId,
      userId: user.id,
      userName: user.name,
      userFlat: user.flat,
      userPhone: user.phone,
      guestCount,
      status: 'REGISTERED',
      registeredAt: new Date().toISOString(),
    };
    inMemoryEventRegistrations.push(newReg);
    event.registrationCount += guestCount;
    return { success: true, registration: newReg };
  }

  await ensureServicesAndCommunityTables();
  // Check event exists & capacity
  const [eventRows]: any = await pool.query('SELECT * FROM society_events WHERE id = ? LIMIT 1', [eventId]);
  if (!eventRows || eventRows.length === 0) {
    return { success: false, error: 'Event not found' };
  }
  const event = eventRows[0];
  if (event.status === 'CANCELLED' || event.status === 'COMPLETED') {
    return { success: false, error: 'Event is no longer accepting registrations' };
  }
  if (event.capacity > 0 && event.registration_count + guestCount > event.capacity) {
    return { success: false, error: 'Event has reached maximum capacity' };
  }

  // Check duplicate registration
  const [existing]: any = await pool.query(
    'SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ? AND status = "REGISTERED" LIMIT 1',
    [eventId, user.id]
  );
  if (existing && existing.length > 0) {
    return { success: false, error: 'You are already registered for this event' };
  }

  const regId = `reg_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  await pool.query(
    `INSERT INTO event_registrations (id, event_id, user_id, user_name, user_flat, user_phone, guest_count, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'REGISTERED')
     ON DUPLICATE KEY UPDATE status = 'REGISTERED', guest_count = VALUES(guest_count), registered_at = CURRENT_TIMESTAMP`,
    [regId, eventId, user.id, user.name, user.flat, user.phone || null, guestCount]
  );

  // Increment count
  await pool.query('UPDATE society_events SET registration_count = registration_count + ? WHERE id = ?', [guestCount, eventId]);

  return {
    success: true,
    registration: {
      id: regId,
      eventId,
      userId: user.id,
      userName: user.name,
      userFlat: user.flat,
      userPhone: user.phone,
      guestCount,
      status: 'REGISTERED',
      registeredAt: new Date().toISOString(),
    }
  };
}

export async function cancelEventRegistration(eventId: string, userId: string): Promise<boolean> {
  const pool = await getMysqlPool();
  if (!pool) {
    const reg = inMemoryEventRegistrations.find(r => r.eventId === eventId && r.userId === userId && r.status === 'REGISTERED');
    if (!reg) return false;
    reg.status = 'CANCELLED';
    const event = inMemoryEvents.find(e => e.id === eventId);
    if (event) {
      event.registrationCount = Math.max(0, event.registrationCount - reg.guestCount);
    }
    return true;
  }

  await ensureServicesAndCommunityTables();
  const [regRows]: any = await pool.query(
    'SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ? AND status = "REGISTERED" LIMIT 1',
    [eventId, userId]
  );
  if (!regRows || regRows.length === 0) return false;
  const guestCount = regRows[0].guest_count || 1;

  const [res]: any = await pool.query(
    'UPDATE event_registrations SET status = "CANCELLED" WHERE event_id = ? AND user_id = ?',
    [eventId, userId]
  );
  if (res.affectedRows > 0) {
    await pool.query(
      'UPDATE society_events SET registration_count = GREATEST(0, registration_count - ?) WHERE id = ?',
      [guestCount, eventId]
    );
    return true;
  }
  return false;
}

export async function createSocietyEvent(data: {
  societyId: string;
  createdBy: string;
  title: string;
  description: string;
  category: string;
  eventDate: string;
  endDate?: string;
  timeStr: string;
  venue: string;
  organizer: string;
  coverImage?: string;
  capacity?: number;
}): Promise<SocietyEventRow> {
  const id = `evt_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  const row: SocietyEventRow = {
    id,
    societyId: data.societyId,
    createdBy: data.createdBy,
    title: data.title.trim(),
    description: data.description.trim(),
    category: data.category.trim(),
    eventDate: new Date(data.eventDate).toISOString(),
    endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
    timeStr: data.timeStr.trim(),
    venue: data.venue.trim(),
    organizer: data.organizer.trim(),
    coverImage: data.coverImage,
    capacity: data.capacity || 0,
    registrationCount: 0,
    status: 'UPCOMING',
    createdAt: new Date().toISOString(),
  };

  const pool = await getMysqlPool();
  if (!pool) {
    inMemoryEvents.unshift(row);
    return row;
  }

  await ensureServicesAndCommunityTables();
  await pool.query(
    `INSERT INTO society_events 
     (id, society_id, created_by, title, description, category, event_date, end_date, time_str, venue, organizer, cover_image, capacity, registration_count, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'UPCOMING')`,
    [row.id, row.societyId, row.createdBy, row.title, row.description, row.category, new Date(row.eventDate), row.endDate ? new Date(row.endDate) : null, row.timeStr, row.venue, row.organizer, row.coverImage || null, row.capacity]
  );
  return row;
}

export async function updateSocietyEvent(
  id: string,
  societyId: string,
  data: Partial<SocietyEventRow>
): Promise<boolean> {
  const pool = await getMysqlPool();
  if (!pool) {
    const idx = inMemoryEvents.findIndex(e => e.id === id);
    if (idx === -1) return false;
    inMemoryEvents[idx] = { ...inMemoryEvents[idx], ...data };
    return true;
  }

  await ensureServicesAndCommunityTables();
  const updates: string[] = [];
  const values: any[] = [];

  if (data.title) { updates.push('title = ?'); values.push(data.title.trim()); }
  if (data.description) { updates.push('description = ?'); values.push(data.description.trim()); }
  if (data.category) { updates.push('category = ?'); values.push(data.category.trim()); }
  if (data.timeStr) { updates.push('time_str = ?'); values.push(data.timeStr.trim()); }
  if (data.venue) { updates.push('venue = ?'); values.push(data.venue.trim()); }
  if (data.organizer) { updates.push('organizer = ?'); values.push(data.organizer.trim()); }
  if (data.coverImage !== undefined) { updates.push('cover_image = ?'); values.push(data.coverImage); }
  if (data.capacity !== undefined) { updates.push('capacity = ?'); values.push(data.capacity); }
  if (data.status) { updates.push('status = ?'); values.push(data.status); }

  if (updates.length === 0) return true;

  values.push(id, societyId);
  const [res]: any = await pool.query(
    `UPDATE society_events SET ${updates.join(', ')} WHERE id = ? AND society_id = ?`,
    values
  );
  return res.affectedRows > 0;
}

export async function deleteSocietyEvent(id: string, societyId: string): Promise<boolean> {
  const pool = await getMysqlPool();
  if (!pool) {
    const idx = inMemoryEvents.findIndex(e => e.id === id);
    if (idx === -1) return false;
    inMemoryEvents.splice(idx, 1);
    return true;
  }

  await ensureServicesAndCommunityTables();
  const [res]: any = await pool.query('DELETE FROM society_events WHERE id = ? AND society_id = ?', [id, societyId]);
  return res.affectedRows > 0;
}

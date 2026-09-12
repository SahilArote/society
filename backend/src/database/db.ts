import fs from 'fs';
import path from 'path';

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
  location: string;
  status: string;
}

export interface UserRow {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  role: 'RESIDENT' | 'GUARD' | 'ADMIN';
  societyId: string;
  status: string;
  pin?: string;
  password?: string;
  otp?: string;
  otpExpiresAt?: string;
  guardBadgeNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlatRow {
  id: string;
  societyId: string;
  flatNumber: string;
  wing: string;
  floor: number;
  residentId: string;
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
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED' | 'EXITED';
  requestedAt: string;
  respondedAt?: string;
  responseBy?: string;
  rejectionReason?: string;
  enteredAt?: string;
  exitedAt?: string;
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
  action: string;
  entityType: string;
  entityId: string;
  metadata?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface AnnouncementRow {
  id: string;
  societyId: string;
  title: string;
  body: string;
  priority: string;
  target: string;
  createdBy: string;
  createdAt: string;
}

export interface DatabaseSchema {
  societies: SocietyRow[];
  gates: GateRow[];
  users: UserRow[];
  flats: FlatRow[];
  guards: GuardRow[];
  visitors: VisitorRow[];
  visitorRequests: VisitorRequestRow[];
  notifications: NotificationRow[];
  auditLogs: AuditLogRow[];
  announcements: AnnouncementRow[];
}

const dataDir = path.resolve(__dirname, '../../data');
const dbFilePath = path.join(dataDir, 'db.json');

let dbData: DatabaseSchema = {
  societies: [],
  gates: [],
  users: [],
  flats: [],
  guards: [],
  visitors: [],
  visitorRequests: [],
  notifications: [],
  auditLogs: [],
  announcements: [],
};

export function loadDb(): DatabaseSchema {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(dbFilePath)) {
    try {
      const raw = fs.readFileSync(dbFilePath, 'utf-8');
      dbData = JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse db.json, re-initializing database...');
    }
  }

  return dbData;
}

export function saveDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(dbFilePath, JSON.stringify(dbData, null, 2), 'utf-8');
}

export function getDb(): DatabaseSchema {
  return dbData;
}

import { runMysqlMigrations } from './mysql';

export function initDb() {
  loadDb();
  runMysqlMigrations().catch(() => {});

  const now = new Date().toISOString();

  if (dbData.societies.length === 0) {
    console.log('Seeding initial database records...');

    dbData.societies.push({
      id: 'soc_greengate',
      name: 'GreenGate Heights',
      address: 'Plot 42, Security Enclave, Cyber City',
      status: 'ACTIVE',
      createdAt: now,
    });

    dbData.gates.push(
      { id: 'gate_main', societyId: 'soc_greengate', name: 'Main Gate', location: 'North Entrance', status: 'OPERATIONAL' },
      { id: 'gate_back', societyId: 'soc_greengate', name: 'Back Gate', location: 'South Entrance', status: 'OPERATIONAL' }
    );

    dbData.users.push(
      { id: 'res_sahil', name: 'Sahil Arote', mobile: '9876543210', email: 'sahil@greengate.com', role: 'RESIDENT', societyId: 'soc_greengate', status: 'ACTIVE', createdAt: now, updatedAt: now },
      { id: 'res_amit', name: 'Dr. Amit Sharma', mobile: '9820044821', email: 'amit@greengate.com', role: 'RESIDENT', societyId: 'soc_greengate', status: 'ACTIVE', createdAt: now, updatedAt: now },
      { id: 'res_priya', name: 'Priya Sharma', mobile: '9810122334', email: 'priya@greengate.com', role: 'RESIDENT', societyId: 'soc_greengate', status: 'ACTIVE', createdAt: now, updatedAt: now },
      { id: 'res_rajesh', name: 'Rajesh Rao', mobile: '9822144556', email: 'rajesh@greengate.com', role: 'RESIDENT', societyId: 'soc_greengate', status: 'ACTIVE', createdAt: now, updatedAt: now },
      { id: 'guard_ramesh', name: 'Ramesh Singh', mobile: '9800011122', email: 'ramesh@greengate.com', role: 'GUARD', societyId: 'soc_greengate', status: 'ACTIVE', pin: '1234', guardBadgeNumber: 'GG-SEC-8821', createdAt: now, updatedAt: now },
      { id: 'admin_user', name: 'Admin Secretary', mobile: '9999988888', email: 'admin@greengate.in', password: 'admin123', role: 'ADMIN', societyId: 'soc_greengate', status: 'ACTIVE', createdAt: now, updatedAt: now }
    );

    dbData.flats.push(
      { id: 'flat_a402', societyId: 'soc_greengate', flatNumber: 'A-402', wing: 'Tower A', floor: 4, residentId: 'res_sahil' },
      { id: 'flat_b402', societyId: 'soc_greengate', flatNumber: 'B-402', wing: 'Tower B', floor: 4, residentId: 'res_amit' },
      { id: 'flat_a101', societyId: 'soc_greengate', flatNumber: 'A-101', wing: 'Tower A', floor: 1, residentId: 'res_priya' },
      { id: 'flat_a104', societyId: 'soc_greengate', flatNumber: 'A-104', wing: 'Tower A', floor: 1, residentId: 'res_rajesh' }
    );

    dbData.guards.push({
      id: 'g_record_1',
      userId: 'guard_ramesh',
      gateId: 'gate_main',
      shift: 'morning',
      status: 'ON_DUTY',
    });

    saveDb();
    console.log('Database initialized and saved.');
  }

  // Ensure credentials and seed updates exist even on existing db.json
  let needsSave = false;
  const admin = dbData.users.find((u) => u.role === 'ADMIN');
  if (admin && (!admin.password || admin.email !== 'admin@greengate.in')) {
    admin.password = 'admin123';
    admin.email = 'admin@greengate.in';
    needsSave = true;
  }

  const guard = dbData.users.find((u) => u.role === 'GUARD');
  if (guard && (!guard.pin || !guard.guardBadgeNumber)) {
    guard.pin = '1234';
    guard.guardBadgeNumber = 'GG-SEC-8821';
    needsSave = true;
  }

  if (dbData.announcements.length === 0) {
    dbData.announcements.push(
      {
        id: 'ann_1',
        societyId: 'soc_greengate',
        title: 'Clubhouse Maintenance Notice',
        body: 'The swimming pool and gym will be closed for quarterly cleaning this Saturday from 8 AM to 2 PM.',
        priority: 'normal',
        target: 'all',
        createdBy: 'admin_user',
        createdAt: now,
      },
      {
        id: 'ann_2',
        societyId: 'soc_greengate',
        title: 'Visitor Pass Security Protocol',
        body: 'All residents are advised to generate digital visitor passes in advance for faster gate clearance.',
        priority: 'high',
        target: 'all',
        createdBy: 'admin_user',
        createdAt: now,
      }
    );
    needsSave = true;
  }

  if (needsSave) {
    saveDb();
  }
}

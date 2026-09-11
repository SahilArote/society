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

  if (dbData.societies.length === 0) {
    console.log('Seeding initial database records...');
    const now = new Date().toISOString();

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
      { id: 'guard_ramesh', name: 'Ramesh Singh', mobile: '9800011122', email: 'ramesh@greengate.com', role: 'GUARD', societyId: 'soc_greengate', status: 'ACTIVE', createdAt: now, updatedAt: now },
      { id: 'admin_user', name: 'Admin Secretary', mobile: '9999988888', email: 'admin@greengate.com', role: 'ADMIN', societyId: 'soc_greengate', status: 'ACTIVE', createdAt: now, updatedAt: now }
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
}

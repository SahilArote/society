// ========================
// Admin Core Types
// ========================

export type AdminRole = 'secretary' | 'security_supervisor' | 'committee_member';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatar?: string;
  phone: string;
  lastLogin?: Date;
}

// ========================
// Society Types
// ========================

export interface Society {
  id: string;
  name: string;
  address: string;
  city: string;
  logo?: string;
  totalFlats: number;
  totalWings: string[];
  maintenanceAmount: number;
  maintenanceDueDay: number; // day of month
}

export type GateStatus = 'operational' | 'maintenance' | 'offline';

export interface Gate {
  id: string;
  name: string;
  status: GateStatus;
  currentGuardId?: string;
  visitorsToday: number;
}

// ========================
// Resident & Flat Types
// ========================

export type FlatStatus = 'occupied' | 'vacant' | 'locked';
export type MaintenanceStatus = 'paid' | 'due' | 'overdue';

export interface FlatResident {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'owner' | 'tenant' | 'family';
  isOwner: boolean;
}

export interface Flat {
  id: string;
  number: string;
  wing: string;
  floor: number;
  type: '1BHK' | '2BHK' | '3BHK' | '4BHK';
  status: FlatStatus;
  residents: FlatResident[];
  vehicleCount: number;
  maintenanceStatus: MaintenanceStatus;
  maintenanceDueAmount?: number;
}

// ========================
// Visitor Types (Admin POV)
// ========================

export type VisitorPurpose = 'guest' | 'delivery' | 'maintenance' | 'cab' | 'other';
export type VisitorStatus = 'pending' | 'approved' | 'denied' | 'inside' | 'exited' | 'expired' | 'completed';

export interface AdminVisitor {
  id: string;
  name: string;
  phone?: string;
  photo?: string;
  photoUrl?: string;
  purpose: VisitorPurpose;
  status: VisitorStatus;
  flatNumber: string;
  residentName: string;
  gate: string;
  guardName: string;
  vehicleNumber?: string;
  requestedAt: Date;
  approvedAt?: Date;
  enteredAt?: Date;
  exitedAt?: Date;
  deniedAt?: Date;
  isFlagged?: boolean;
}

// ========================
// Guard Types
// ========================

export type GuardShift = 'morning' | 'evening' | 'night';
export type GuardStatus = 'on_duty' | 'off_duty' | 'on_leave';

export interface Guard {
  id: string;
  name: string;
  phone: string;
  assignedGate: string;
  shift: GuardShift;
  status: GuardStatus;
  avatar?: string;
  joinedDate: string;
}

// ========================
// Announcement Types
// ========================

export type AnnouncementPriority = 'normal' | 'important' | 'urgent';
export type AnnouncementTarget = 'all' | 'wing_a' | 'wing_b' | 'wing_c' | 'wing_d';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  target: AnnouncementTarget;
  createdBy: string;
  createdAt: Date;
  scheduledAt?: Date;
  isPublished: boolean;
  readCount: number;
}

// ========================
// Notification Types
// ========================

export type NotificationType = 'society' | 'security' | 'billing' | 'emergency';

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  target: AnnouncementTarget;
  sentAt: Date;
  deliveredCount: number;
  openedCount: number;
  sentBy: string;
}

// ========================
// Dashboard Stats
// ========================

export interface DashboardStats {
  totalFlats: number;
  occupiedFlats: number;
  vacantFlats: number;
  totalResidents: number;
  visitorsToday: number;
  visitorsInside: number;
  pendingApprovals: number;
  maintenanceCollectionPct: number;
  activeGates?: number;
  guardsOnDuty?: number;
}

export interface VisitorTrendData {
  day: string;
  guest: number;
  delivery: number;
  maintenance: number;
  cab: number;
}

// ========================
// Report Types
// ========================

export interface MonthlyReport {
  month: string;
  totalVisitors: number;
  approvedEntries: number;
  deniedEntries: number;
  maintenanceCollected: number;
  maintenancePending: number;
  incidents: number;
}

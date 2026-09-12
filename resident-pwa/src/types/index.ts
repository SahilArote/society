// ========================
// Core Domain Types
// ========================

export interface Society {
  id: string;
  name: string;
  address: string;
  logo?: string;
  gates: Gate[];
}

export interface Gate {
  id: string;
  name: string;
  status: 'operational' | 'maintenance' | 'offline';
}

export interface Building {
  id: string;
  name: string;
  floors: number;
}

export interface Flat {
  id: string;
  number: string;
  building: string;
  floor: number;
  societyId: string;
}

export interface Resident {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  flat: Flat;
  society: Society;
  status: 'active' | 'inactive';
}

// ========================
// Visitor Types
// ========================

export type VisitorStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'entered'
  | 'inside'
  | 'exited'
  | 'expired'
  | 'cancelled';

export type VisitorPurpose =
  | 'personal'
  | 'delivery'
  | 'maintenance'
  | 'cab'
  | 'guest'
  | 'other';

export interface Visitor {
  id: string;
  name: string;
  phone?: string;
  photo?: string;
  photoUrl?: string;
  purpose: VisitorPurpose;
  status: VisitorStatus;
  gate?: string;
  flatNumber: string;
  requestedAt: Date;
  approvedAt?: Date;
  enteredAt?: Date;
  exitedAt?: Date;
  rejectedAt?: Date;
  expiredAt?: Date;
  expectedDate?: string;
  expectedTime?: string;
  notes?: string;
  isPreApproved?: boolean;
}

// ========================
// Family Types
// ========================

export type Relationship =
  | 'spouse'
  | 'parent'
  | 'child'
  | 'sibling'
  | 'other';

export interface FamilyMember {
  id: string;
  name: string;
  relationship: Relationship;
  phone: string;
  avatar?: string;
  status: 'active' | 'inactive';
}

// ========================
// Vehicle Types
// ========================

export type VehicleType = 'car' | 'bike' | 'scooter' | 'other';

export interface Vehicle {
  id: string;
  number: string;
  type: VehicleType;
  brand: string;
  model: string;
  color: string;
  status: 'active' | 'inactive';
}

// ========================
// Notification Types
// ========================

export type NotificationType = 'visitor' | 'security' | 'society' | 'important';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  visitorId?: string;
}

// ========================
// Announcement Types
// ========================

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: 'normal' | 'important' | 'urgent';
  timestamp: Date;
}

// ========================
// Navigation Types
// ========================

export type NavTab = 'home' | 'visitors' | 'notifications' | 'profile';

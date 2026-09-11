export type UserRole = 'RESIDENT' | 'GUARD' | 'ADMIN';

export type VisitorStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export type VisitorPurpose = 'personal' | 'delivery' | 'maintenance' | 'cab' | 'guest' | 'other';

export interface AuthUser {
  id: string;
  name: string;
  mobile: string;
  role: UserRole;
  societyId: string;
  flatId?: string;
  gateId?: string;
}

export interface VisitorPayload {
  name: string;
  mobile?: string;
  purpose: VisitorPurpose;
  flatNumber: string;
  buildingWing: string;
  residentName?: string;
  residentPhone?: string;
  gateId?: string;
  vehicleNumber?: string;
  deliveryCompany?: string;
}

import type {
  Society, Gate, Flat, AdminVisitor, Guard,
  Announcement, AdminNotification, DashboardStats,
  VisitorTrendData, MonthlyReport, AdminUser
} from '../types';

const now = new Date();
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60000);
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000);
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

// ─── Admin User ───────────────────────────────────────────
export const mockAdminUser: AdminUser = {
  id: 'admin-1',
  name: 'Rajesh Sharma',
  email: 'secretary@greengate.in',
  role: 'secretary',
  phone: '+91 98765 00001',
  lastLogin: hoursAgo(2),
};

// ─── Society ──────────────────────────────────────────────
export const mockSociety: Society = {
  id: 'soc-1',
  name: 'Green Valley Residency',
  address: 'Baner Road, Pune, Maharashtra 411045',
  city: 'Pune',
  totalFlats: 120,
  totalWings: ['A', 'B', 'C', 'D'],
  maintenanceAmount: 3500,
  maintenanceDueDay: 10,
};

// ─── Gates ────────────────────────────────────────────────
export const mockGates: Gate[] = [
  { id: 'gate-1', name: 'Main Gate',    status: 'operational', currentGuardId: 'guard-1', visitorsToday: 28 },
  { id: 'gate-2', name: 'East Gate',   status: 'operational', currentGuardId: 'guard-2', visitorsToday: 12 },
  { id: 'gate-3', name: 'Service Gate', status: 'maintenance', visitorsToday: 7 },
];

// ─── Guards ───────────────────────────────────────────────
export const mockGuards: Guard[] = [
  { id: 'guard-1', name: 'Ramesh Patil',   phone: '+91 99001 11001', assignedGate: 'Main Gate',     shift: 'morning', status: 'on_duty',  joinedDate: '2023-03-15' },
  { id: 'guard-2', name: 'Suresh Yadav',   phone: '+91 99001 11002', assignedGate: 'East Gate',     shift: 'morning', status: 'on_duty',  joinedDate: '2023-07-01' },
  { id: 'guard-3', name: 'Mahesh Kumar',   phone: '+91 99001 11003', assignedGate: 'Main Gate',     shift: 'evening', status: 'off_duty', joinedDate: '2022-11-20' },
  { id: 'guard-4', name: 'Dinesh Verma',   phone: '+91 99001 11004', assignedGate: 'Service Gate',  shift: 'evening', status: 'off_duty', joinedDate: '2024-01-10' },
  { id: 'guard-5', name: 'Ganesh More',    phone: '+91 99001 11005', assignedGate: 'East Gate',     shift: 'night',   status: 'off_duty', joinedDate: '2023-05-22' },
  { id: 'guard-6', name: 'Rakesh Singh',   phone: '+91 99001 11006', assignedGate: 'Main Gate',     shift: 'night',   status: 'on_leave', joinedDate: '2022-08-14' },
];

// ─── Flats ────────────────────────────────────────────────
export const mockFlats: Flat[] = [
  {
    id: 'flat-a101', number: 'A-101', wing: 'A', floor: 1, type: '2BHK', status: 'occupied',
    residents: [
      { id: 'r-1', name: 'Sahil Arote',   phone: '+91 98765 43210', email: 'sahil@email.com', role: 'owner',  isOwner: true },
      { id: 'r-2', name: 'Sneha Arote',   phone: '+91 98765 43211', role: 'family', isOwner: false },
    ],
    vehicleCount: 2, maintenanceStatus: 'paid',
  },
  {
    id: 'flat-a402', number: 'A-402', wing: 'A', floor: 4, type: '3BHK', status: 'occupied',
    residents: [
      { id: 'r-3', name: 'Priya Deshmukh', phone: '+91 99887 55441', email: 'priya@email.com', role: 'owner', isOwner: true },
      { id: 'r-4', name: 'Ramesh Deshmukh', phone: '+91 99887 55442', role: 'family', isOwner: false },
      { id: 'r-5', name: 'Kavita Deshmukh', phone: '+91 99887 55443', role: 'family', isOwner: false },
    ],
    vehicleCount: 1, maintenanceStatus: 'paid',
  },
  {
    id: 'flat-b203', number: 'B-203', wing: 'B', floor: 2, type: '2BHK', status: 'occupied',
    residents: [
      { id: 'r-6', name: 'Amit Joshi', phone: '+91 77665 44332', email: 'amit@email.com', role: 'owner', isOwner: true },
    ],
    vehicleCount: 1, maintenanceStatus: 'due', maintenanceDueAmount: 3500,
  },
  {
    id: 'flat-b305', number: 'B-305', wing: 'B', floor: 3, type: '1BHK', status: 'occupied',
    residents: [
      { id: 'r-7', name: 'Neha Kulkarni', phone: '+91 88776 33221', email: 'neha@email.com', role: 'tenant', isOwner: false },
    ],
    vehicleCount: 0, maintenanceStatus: 'overdue', maintenanceDueAmount: 7000,
  },
  {
    id: 'flat-c101', number: 'C-101', wing: 'C', floor: 1, type: '3BHK', status: 'occupied',
    residents: [
      { id: 'r-8', name: 'Vikram Mehta', phone: '+91 91234 56789', email: 'vikram@email.com', role: 'owner', isOwner: true },
      { id: 'r-9', name: 'Anita Mehta', phone: '+91 91234 56790', role: 'family', isOwner: false },
    ],
    vehicleCount: 3, maintenanceStatus: 'paid',
  },
  {
    id: 'flat-c204', number: 'C-204', wing: 'C', floor: 2, type: '2BHK', status: 'vacant',
    residents: [], vehicleCount: 0, maintenanceStatus: 'paid',
  },
  {
    id: 'flat-d101', number: 'D-101', wing: 'D', floor: 1, type: '4BHK', status: 'occupied',
    residents: [
      { id: 'r-10', name: 'Suresh Nair', phone: '+91 98001 23456', email: 'suresh@email.com', role: 'owner', isOwner: true },
      { id: 'r-11', name: 'Lata Nair', phone: '+91 98001 23457', role: 'family', isOwner: false },
      { id: 'r-12', name: 'Arjun Nair', phone: '+91 98001 23458', role: 'family', isOwner: false },
    ],
    vehicleCount: 2, maintenanceStatus: 'paid',
  },
  {
    id: 'flat-d302', number: 'D-302', wing: 'D', floor: 3, type: '2BHK', status: 'occupied',
    residents: [
      { id: 'r-13', name: 'Ganesh Pawar', phone: '+91 70011 22334', role: 'owner', isOwner: true },
    ],
    vehicleCount: 1, maintenanceStatus: 'due', maintenanceDueAmount: 3500,
  },
  {
    id: 'flat-a201', number: 'A-201', wing: 'A', floor: 2, type: '2BHK', status: 'vacant',
    residents: [], vehicleCount: 0, maintenanceStatus: 'paid',
  },
  {
    id: 'flat-b401', number: 'B-401', wing: 'B', floor: 4, type: '3BHK', status: 'occupied',
    residents: [
      { id: 'r-14', name: 'Deepak Rane', phone: '+91 91122 33445', email: 'deepak@email.com', role: 'owner', isOwner: true },
      { id: 'r-15', name: 'Sunita Rane', phone: '+91 91122 33446', role: 'family', isOwner: false },
    ],
    vehicleCount: 1, maintenanceStatus: 'overdue', maintenanceDueAmount: 10500,
  },
];

// ─── Visitors (Society-wide) ──────────────────────────────
export const mockVisitors: AdminVisitor[] = [
  {
    id: 'vis-001', name: 'Raj Sharma', phone: '+91 87654 32100',
    purpose: 'guest', status: 'pending', flatNumber: 'A-402',
    residentName: 'Priya Deshmukh', gate: 'Main Gate', guardName: 'Ramesh Patil',
    requestedAt: minutesAgo(3),
  },
  {
    id: 'vis-002', name: 'Swiggy Delivery', purpose: 'delivery', status: 'inside',
    flatNumber: 'A-101', residentName: 'Sahil Arote', gate: 'Main Gate',
    guardName: 'Ramesh Patil', requestedAt: minutesAgo(15),
    approvedAt: minutesAgo(14), enteredAt: minutesAgo(12),
  },
  {
    id: 'vis-003', name: 'Plumber Raju', phone: '+91 88990 01122',
    purpose: 'maintenance', status: 'inside', flatNumber: 'B-203',
    residentName: 'Amit Joshi', gate: 'Service Gate', guardName: 'Dinesh Verma',
    requestedAt: hoursAgo(1), approvedAt: hoursAgo(1), enteredAt: minutesAgo(55),
  },
  {
    id: 'vis-004', name: 'Priya Kapoor', phone: '+91 98765 11223',
    purpose: 'guest', status: 'exited', flatNumber: 'C-101',
    residentName: 'Vikram Mehta', gate: 'East Gate', guardName: 'Suresh Yadav',
    requestedAt: hoursAgo(3), approvedAt: hoursAgo(3), enteredAt: hoursAgo(2.9), exitedAt: hoursAgo(1),
  },
  {
    id: 'vis-005', name: 'Amazon Delivery', purpose: 'delivery', status: 'exited',
    flatNumber: 'D-101', residentName: 'Suresh Nair', gate: 'Main Gate',
    guardName: 'Ramesh Patil', requestedAt: hoursAgo(4),
    approvedAt: hoursAgo(4), enteredAt: hoursAgo(3.9), exitedAt: hoursAgo(3.7),
  },
  {
    id: 'vis-006', name: 'Unknown Person', phone: '+91 77000 12345',
    purpose: 'other', status: 'denied', flatNumber: 'B-305',
    residentName: 'Neha Kulkarni', gate: 'Main Gate', guardName: 'Ramesh Patil',
    requestedAt: hoursAgo(5), deniedAt: hoursAgo(5), isFlagged: true,
  },
  {
    id: 'vis-007', name: 'Electrician Suresh', phone: '+91 66778 89900',
    purpose: 'maintenance', status: 'exited', flatNumber: 'A-402',
    residentName: 'Priya Deshmukh', gate: 'Service Gate', guardName: 'Dinesh Verma',
    requestedAt: hoursAgo(6), approvedAt: hoursAgo(6), enteredAt: hoursAgo(5.9), exitedAt: hoursAgo(4),
  },
  {
    id: 'vis-008', name: 'Ola Cab Driver', purpose: 'cab', status: 'exited',
    flatNumber: 'D-302', residentName: 'Ganesh Pawar', gate: 'Main Gate',
    guardName: 'Ramesh Patil', vehicleNumber: 'MH12 AB 1234',
    requestedAt: hoursAgo(7), approvedAt: hoursAgo(7), enteredAt: hoursAgo(6.9), exitedAt: hoursAgo(6.8),
  },
  {
    id: 'vis-009', name: 'Dr. Anil Mehta', phone: '+91 77889 90011',
    purpose: 'guest', status: 'exited', flatNumber: 'B-401',
    residentName: 'Deepak Rane', gate: 'East Gate', guardName: 'Suresh Yadav',
    requestedAt: daysAgo(1), approvedAt: daysAgo(1), enteredAt: daysAgo(1), exitedAt: daysAgo(1),
  },
  {
    id: 'vis-010', name: 'Courier - DTDC', purpose: 'delivery', status: 'exited',
    flatNumber: 'C-101', residentName: 'Vikram Mehta', gate: 'Main Gate',
    guardName: 'Mahesh Kumar', requestedAt: daysAgo(1),
    approvedAt: daysAgo(1), enteredAt: daysAgo(1), exitedAt: daysAgo(1),
  },
];

// ─── Announcements ───────────────────────────────────────
export const mockAnnouncements: Announcement[] = [
  {
    id: 'ann-1', title: 'Water supply maintenance tomorrow',
    body: 'Water supply will be interrupted from 10 AM to 2 PM for scheduled pipeline maintenance. Please store water accordingly.',
    priority: 'important', target: 'all', createdBy: 'Rajesh Sharma',
    createdAt: hoursAgo(5), isPublished: true, readCount: 78,
  },
  {
    id: 'ann-2', title: 'Annual general meeting on Sunday',
    body: 'All residents are requested to attend the AGM at the society clubhouse at 10 AM this Sunday.',
    priority: 'normal', target: 'all', createdBy: 'Rajesh Sharma',
    createdAt: hoursAgo(8), isPublished: true, readCount: 54,
  },
  {
    id: 'ann-3', title: 'Tower A lift maintenance',
    body: 'Tower A lift will be under maintenance on Monday 9 AM - 12 PM. Please use Tower B lift.',
    priority: 'important', target: 'wing_a', createdBy: 'Rajesh Sharma',
    createdAt: daysAgo(1), isPublished: true, readCount: 32,
  },
  {
    id: 'ann-4', title: 'Diwali celebration event',
    body: 'Society Diwali celebration on 20th October at the garden area, 7 PM onwards. All families welcome!',
    priority: 'normal', target: 'all', createdBy: 'Rajesh Sharma',
    createdAt: daysAgo(3), isPublished: true, readCount: 91,
  },
  {
    id: 'ann-5', title: 'URGENT: Gas pipe inspection',
    body: 'Mandatory gas pipe safety inspection for all flats on 15th Sept. Please ensure someone is home.',
    priority: 'urgent', target: 'all', createdBy: 'Rajesh Sharma',
    createdAt: daysAgo(2), isPublished: true, readCount: 105,
  },
];

// ─── Notifications ────────────────────────────────────────
export const mockNotifications: AdminNotification[] = [
  {
    id: 'notif-1', type: 'security', title: 'Security Alert: Suspicious Activity',
    body: 'Unidentified person spotted near East Gate. Guards alerted.',
    target: 'all', sentAt: hoursAgo(2), deliveredCount: 98, openedCount: 67, sentBy: 'System',
  },
  {
    id: 'notif-2', type: 'billing', title: 'Maintenance Due Reminder',
    body: 'This is a reminder that maintenance amount of ₹3,500 is due by 10th September.',
    target: 'all', sentAt: daysAgo(2), deliveredCount: 120, openedCount: 88, sentBy: 'Rajesh Sharma',
  },
  {
    id: 'notif-3', type: 'society', title: 'AGM Reminder',
    body: 'Annual General Meeting this Sunday at 10 AM, Clubhouse.',
    target: 'all', sentAt: daysAgo(3), deliveredCount: 115, openedCount: 72, sentBy: 'Rajesh Sharma',
  },
];

// ─── Dashboard Stats ──────────────────────────────────────
export const mockDashboardStats: DashboardStats = {
  totalFlats: 120,
  occupiedFlats: 98,
  vacantFlats: 22,
  totalResidents: 312,
  visitorsToday: 47,
  visitorsInside: 2,
  pendingApprovals: 1,
  maintenanceCollectionPct: 81,
};

// ─── Visitor Trend (Last 7 Days) ──────────────────────────
export const mockVisitorTrend: VisitorTrendData[] = [
  { day: 'Mon', guest: 8,  delivery: 12, maintenance: 3, cab: 5 },
  { day: 'Tue', guest: 5,  delivery: 18, maintenance: 2, cab: 7 },
  { day: 'Wed', guest: 11, delivery: 9,  maintenance: 5, cab: 4 },
  { day: 'Thu', guest: 7,  delivery: 14, maintenance: 1, cab: 6 },
  { day: 'Fri', guest: 14, delivery: 22, maintenance: 4, cab: 9 },
  { day: 'Sat', guest: 19, delivery: 8,  maintenance: 2, cab: 3 },
  { day: 'Sun', guest: 22, delivery: 6,  maintenance: 1, cab: 2 },
];

// ─── Monthly Reports ──────────────────────────────────────
export const mockMonthlyReports: MonthlyReport[] = [
  { month: 'Mar', totalVisitors: 420, approvedEntries: 388, deniedEntries: 32, maintenanceCollected: 315000, maintenancePending: 105000, incidents: 2 },
  { month: 'Apr', totalVisitors: 390, approvedEntries: 368, deniedEntries: 22, maintenanceCollected: 336000, maintenancePending: 84000, incidents: 1 },
  { month: 'May', totalVisitors: 450, approvedEntries: 422, deniedEntries: 28, maintenanceCollected: 308000, maintenancePending: 112000, incidents: 3 },
  { month: 'Jun', totalVisitors: 410, approvedEntries: 395, deniedEntries: 15, maintenanceCollected: 343000, maintenancePending: 77000, incidents: 0 },
  { month: 'Jul', totalVisitors: 480, approvedEntries: 455, deniedEntries: 25, maintenanceCollected: 322000, maintenancePending: 98000, incidents: 2 },
  { month: 'Aug', totalVisitors: 435, approvedEntries: 410, deniedEntries: 25, maintenanceCollected: 350000, maintenancePending: 70000, incidents: 1 },
  { month: 'Sep', totalVisitors: 47,  approvedEntries: 45,  deniedEntries: 2,  maintenanceCollected: 283500, maintenancePending: 136500, incidents: 0 },
];

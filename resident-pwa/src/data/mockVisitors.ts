import type { Visitor } from '../types';

const now = new Date();
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60000);
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000);
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

export const mockPendingVisitor: Visitor = {
  id: 'vis-pending',
  name: 'Raj Sharma',
  phone: '+91 87654 32100',
  purpose: 'personal',
  status: 'pending',
  gate: 'Main Gate',
  flatNumber: 'A-402',
  requestedAt: minutesAgo(2),
};

export const mockVisitors: Visitor[] = [
  {
    id: 'vis-pending',
    name: 'Raj Sharma',
    phone: '+91 87654 32100',
    purpose: 'personal',
    status: 'pending',
    gate: 'Main Gate',
    flatNumber: 'A-402',
    requestedAt: minutesAgo(2),
  },
  {
    id: 'vis-1',
    name: 'Amit Patel',
    phone: '+91 99887 66554',
    purpose: 'delivery',
    status: 'exited',
    gate: 'Main Gate',
    flatNumber: 'A-402',
    requestedAt: hoursAgo(3),
    approvedAt: hoursAgo(3),
    enteredAt: hoursAgo(2.9),
    exitedAt: hoursAgo(2.5),
  },
  {
    id: 'vis-2',
    name: 'Priya Deshmukh',
    phone: '+91 98765 11223',
    purpose: 'guest',
    status: 'entered',
    gate: 'East Gate',
    flatNumber: 'A-402',
    requestedAt: hoursAgo(1),
    approvedAt: hoursAgo(1),
    enteredAt: minutesAgo(55),
  },
  {
    id: 'vis-3',
    name: 'Swiggy Delivery',
    purpose: 'delivery',
    status: 'exited',
    gate: 'Main Gate',
    flatNumber: 'A-402',
    requestedAt: hoursAgo(5),
    approvedAt: hoursAgo(5),
    enteredAt: hoursAgo(4.9),
    exitedAt: hoursAgo(4.8),
  },
  {
    id: 'vis-4',
    name: 'Manoj Kumar',
    phone: '+91 77665 54433',
    purpose: 'maintenance',
    status: 'approved',
    gate: 'Service Gate',
    flatNumber: 'A-402',
    requestedAt: hoursAgo(0.5),
    approvedAt: minutesAgo(25),
    expectedDate: new Date().toISOString().split('T')[0],
    expectedTime: '14:00',
  },
  {
    id: 'vis-5',
    name: 'Neha Kulkarni',
    phone: '+91 88776 65544',
    purpose: 'personal',
    status: 'rejected',
    gate: 'Main Gate',
    flatNumber: 'A-402',
    requestedAt: daysAgo(1),
    rejectedAt: daysAgo(1),
  },
  {
    id: 'vis-6',
    name: 'Amazon Delivery',
    purpose: 'delivery',
    status: 'exited',
    gate: 'Main Gate',
    flatNumber: 'A-402',
    requestedAt: daysAgo(1),
    approvedAt: daysAgo(1),
    enteredAt: daysAgo(1),
    exitedAt: daysAgo(1),
  },
  {
    id: 'vis-7',
    name: 'Vikram Singh',
    phone: '+91 99001 12233',
    purpose: 'guest',
    status: 'expired',
    gate: 'Main Gate',
    flatNumber: 'A-402',
    requestedAt: daysAgo(2),
    expiredAt: daysAgo(2),
  },
  {
    id: 'vis-8',
    name: 'Plumber - Raju',
    phone: '+91 88990 01122',
    purpose: 'maintenance',
    status: 'exited',
    gate: 'Service Gate',
    flatNumber: 'A-402',
    requestedAt: daysAgo(3),
    approvedAt: daysAgo(3),
    enteredAt: daysAgo(3),
    exitedAt: daysAgo(3),
  },
  {
    id: 'vis-upcoming-1',
    name: 'Dr. Anil Mehta',
    phone: '+91 77889 90011',
    purpose: 'personal',
    status: 'approved',
    flatNumber: 'A-402',
    requestedAt: now,
    approvedAt: now,
    expectedDate: new Date(now.getTime() + 86400000).toISOString().split('T')[0],
    expectedTime: '10:00',
    isPreApproved: true,
    notes: 'Regular health checkup',
  },
  {
    id: 'vis-upcoming-2',
    name: 'Electrician - Suresh',
    phone: '+91 66778 89900',
    purpose: 'maintenance',
    status: 'approved',
    flatNumber: 'A-402',
    requestedAt: now,
    approvedAt: now,
    expectedDate: new Date(now.getTime() + 2 * 86400000).toISOString().split('T')[0],
    expectedTime: '11:00',
    isPreApproved: true,
    notes: 'Fan repair in bedroom',
  },
];

export const getVisitorsByStatus = (status: Visitor['status']) =>
  mockVisitors.filter(v => v.status === status);

export const getUpcomingVisitors = () =>
  mockVisitors.filter(v => v.isPreApproved && (v.status === 'approved'));

export const getRecentVisitors = () =>
  mockVisitors
    .filter(v => v.status !== 'pending' && !v.isPreApproved)
    .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())
    .slice(0, 4);

export const getPendingVisitors = () =>
  mockVisitors.filter(v => v.status === 'pending');

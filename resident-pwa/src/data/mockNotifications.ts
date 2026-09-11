import type { Notification } from '../types';

const now = new Date();
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60000);
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000);
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'visitor',
    title: 'Visitor at Gate',
    body: 'Raj Sharma is waiting at Main Gate for your approval.',
    timestamp: minutesAgo(2),
    read: false,
    visitorId: 'vis-pending',
    actionUrl: '/visitors/vis-pending',
  },
  {
    id: 'notif-2',
    type: 'visitor',
    title: 'Visitor Approved',
    body: 'You approved Priya Deshmukh. She entered via East Gate.',
    timestamp: hoursAgo(1),
    read: false,
    visitorId: 'vis-2',
  },
  {
    id: 'notif-3',
    type: 'security',
    title: 'Security Alert',
    body: 'Unusual activity detected near East Gate. Security has been notified.',
    timestamp: hoursAgo(2),
    read: false,
  },
  {
    id: 'notif-4',
    type: 'visitor',
    title: 'Delivery Completed',
    body: 'Amit Patel (Delivery) has exited the premises.',
    timestamp: hoursAgo(3),
    read: true,
    visitorId: 'vis-1',
  },
  {
    id: 'notif-5',
    type: 'society',
    title: 'Water Supply Maintenance',
    body: 'Water supply will be interrupted tomorrow from 10 AM to 2 PM for maintenance work.',
    timestamp: hoursAgo(5),
    read: true,
  },
  {
    id: 'notif-6',
    type: 'society',
    title: 'Society Meeting',
    body: 'Annual general meeting scheduled for Sunday, 10 AM at the clubhouse.',
    timestamp: hoursAgo(8),
    read: true,
  },
  {
    id: 'notif-7',
    type: 'visitor',
    title: 'Visitor Rejected',
    body: 'You rejected Neha Kulkarni\'s visit request.',
    timestamp: daysAgo(1),
    read: true,
    visitorId: 'vis-5',
  },
  {
    id: 'notif-8',
    type: 'important',
    title: 'Profile Updated',
    body: 'Your profile information has been updated successfully.',
    timestamp: daysAgo(1),
    read: true,
  },
  {
    id: 'notif-9',
    type: 'security',
    title: 'Gate Status Update',
    body: 'Service Gate maintenance completed. All gates are now operational.',
    timestamp: daysAgo(2),
    read: true,
  },
  {
    id: 'notif-10',
    type: 'visitor',
    title: 'Visitor Pass Created',
    body: 'You created a visitor pass for Dr. Anil Mehta for tomorrow.',
    timestamp: daysAgo(0),
    read: true,
    visitorId: 'vis-upcoming-1',
  },
  {
    id: 'notif-11',
    type: 'society',
    title: 'Parking Notice',
    body: 'Please ensure vehicles are parked only in designated spots. Violators will be fined.',
    timestamp: daysAgo(3),
    read: true,
  },
  {
    id: 'notif-12',
    type: 'important',
    title: 'App Update Available',
    body: 'A new version of the resident app is available. Please refresh to update.',
    timestamp: daysAgo(4),
    read: true,
  },
  {
    id: 'notif-13',
    type: 'visitor',
    title: 'Visitor Expired',
    body: 'Vikram Singh\'s visit request has expired.',
    timestamp: daysAgo(2),
    read: true,
    visitorId: 'vis-7',
  },
  {
    id: 'notif-14',
    type: 'security',
    title: 'Night Patrol Update',
    body: 'Night security patrol completed. No incidents reported.',
    timestamp: daysAgo(1),
    read: true,
  },
  {
    id: 'notif-15',
    type: 'society',
    title: 'Festive Decoration',
    body: 'Society Diwali decoration starts next week. Volunteers welcome!',
    timestamp: daysAgo(5),
    read: true,
  },
];

export const getUnreadCount = () => mockNotifications.filter(n => !n.read).length;

export const getNotificationsByType = (type?: Notification['type']) => {
  if (!type) return mockNotifications;
  return mockNotifications.filter(n => n.type === type);
};

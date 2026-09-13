import type { Announcement } from '../types';

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000);
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

export const mockAnnouncements: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Water supply maintenance tomorrow',
    body: 'Water supply will be interrupted from 10 AM to 2 PM for scheduled pipeline maintenance. Please store water accordingly.',
    priority: 'important',
    timestamp: hoursAgo(5),
  },
  {
    id: 'ann-2',
    title: 'Annual general meeting on Sunday',
    body: 'All residents are requested to attend the AGM at the society clubhouse at 10 AM this Sunday. Important decisions regarding society budget will be discussed.',
    priority: 'normal',
    timestamp: hoursAgo(8),
  },
  {
    id: 'ann-3',
    title: 'Parking spot reassignment notice',
    body: 'Parking spots will be reassigned next month. Please check the notice board for your new allocation.',
    priority: 'normal',
    timestamp: daysAgo(2),
  },
  {
    id: 'ann-4',
    title: 'Lift maintenance scheduled',
    body: 'Tower A lift will be under maintenance on Monday 9 AM - 12 PM. Please use Tower B lift during this time.',
    priority: 'important',
    timestamp: daysAgo(1),
  },
  {
    id: 'ann-5',
    title: 'Diwali celebration event',
    body: 'Society Diwali celebration on 20th October at the garden area, 7 PM onwards. All families are welcome!',
    priority: 'normal',
    timestamp: daysAgo(3),
  },
];

import type { Vehicle } from '../types';

export const mockVehicles: Vehicle[] = [
  {
    id: 'veh-1',
    number: 'MH 12 AB 1234',
    type: 'car',
    brand: 'Hyundai',
    model: 'Creta',
    color: '#1E3A5F',
    status: 'active',
  },
  {
    id: 'veh-2',
    number: 'MH 12 CD 5678',
    type: 'bike',
    brand: 'Royal Enfield',
    model: 'Classic 350',
    color: '#2D2D2D',
    status: 'active',
  },
  {
    id: 'veh-3',
    number: 'MH 12 EF 9012',
    type: 'scooter',
    brand: 'Honda',
    model: 'Activa 6G',
    color: '#E8E8E8',
    status: 'active',
  },
];

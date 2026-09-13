import type { Resident, Society, Flat, Gate } from '../types';

export const mockGates: Gate[] = [
  { id: 'gate-1', name: 'Main Gate', status: 'operational' },
  { id: 'gate-2', name: 'East Gate', status: 'operational' },
  { id: 'gate-3', name: 'Service Gate', status: 'operational' },
];

export const mockSociety: Society = {
  id: 'soc-1',
  name: 'Green Valley Residency',
  address: 'Baner Road, Pune, Maharashtra 411045',
  gates: mockGates,
};

export const mockFlat: Flat = {
  id: 'flat-1',
  number: 'A-402',
  building: 'Tower A',
  floor: 4,
  societyId: 'soc-1',
};

export const mockResident: Resident = {
  id: 'res-1',
  name: 'Sahil Arote',
  phone: '+91 98765 43210',
  email: 'sahil.arote@email.com',
  flat: mockFlat,
  society: mockSociety,
  status: 'active',
};

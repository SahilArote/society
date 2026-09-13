import React from 'react';
import { Vehicle } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Car, Bike } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface VehicleCardProps {
  vehicle: Vehicle;
  className?: string;
}

export default function VehicleCard({ vehicle, className }: VehicleCardProps) {
  const isCar = vehicle.type.toLowerCase() === 'car';
  const Icon = isCar ? Car : Bike;

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-medium text-slate-900">{vehicle.brand} {vehicle.model}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <div 
                className="w-3 h-3 rounded-full border border-slate-200"
                style={{ backgroundColor: vehicle.color.toLowerCase() }}
              />
              <span className="text-xs text-slate-500 capitalize">{vehicle.color}</span>
            </div>
          </div>
        </div>
        <Badge variant={vehicle.status === 'active' ? 'success' : 'default'} className="text-[10px] uppercase">
          {vehicle.status}
        </Badge>
      </div>
      
      <div className="bg-amber-100/50 border border-amber-200 rounded-md py-2 px-4 inline-block number-plate font-mono text-sm font-bold text-slate-900 tracking-wider">
        {vehicle.number}
      </div>
    </Card>
  );
}

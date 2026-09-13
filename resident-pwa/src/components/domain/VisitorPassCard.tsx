import React from 'react';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';
import { User, Calendar, Clock } from 'lucide-react';

export interface VisitorPassCardProps {
  visitor: {
    name: string;
    date: string;
    time: string;
    id: string;
  };
  className?: string;
}

export default function VisitorPassCard({ visitor, className }: VisitorPassCardProps) {
  return (
    <Card className={cn('overflow-hidden border-2 border-dashed border-primary-200', className)}>
      <div className="bg-primary-600 p-4 text-center text-white">
        <h3 className="font-semibold text-lg">Visitor Pass</h3>
        <p className="text-primary-100 text-xs mt-1">Green Valley Residency</p>
      </div>
      
      <div className="p-6">
        {/* Fake QR Code */}
        <div className="w-40 h-40 mx-auto bg-slate-100 border border-slate-200 rounded-lg p-2 mb-6">
          <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8cGF0aCBkPSJNMCAwaDEwdjEwSDB6bTEwIDEwaDEwdjEwSDEweiIgZmlsbD0icmdiYSgwLDAsMCwwLjA1KSI+PC9wYXRoPgo8L3N2Zz4=')] rounded opacity-50" />
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-slate-700">
            <User className="w-5 h-5 text-primary-500" />
            <div className="flex-1">
              <p className="text-xs text-slate-500">Visitor Name</p>
              <p className="font-medium text-slate-900">{visitor.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-slate-700">
            <Calendar className="w-5 h-5 text-primary-500" />
            <div className="flex-1">
              <p className="text-xs text-slate-500">Date</p>
              <p className="font-medium text-slate-900">{visitor.date}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-slate-700">
            <Clock className="w-5 h-5 text-primary-500" />
            <div className="flex-1">
              <p className="text-xs text-slate-500">Time</p>
              <p className="font-medium text-slate-900">{visitor.time}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Pass ID</p>
          <p className="font-mono font-bold text-slate-700 tracking-widest">{visitor.id}</p>
          <p className="text-xs text-success-600 font-medium mt-3 bg-success-50 inline-block px-3 py-1 rounded-full">
            Valid for one entry
          </p>
        </div>
      </div>
    </Card>
  );
}

import React from 'react';
import { Visitor } from '../../types';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

export interface VisitorTimelineProps {
  visitor: Visitor;
  className?: string;
}

export default function VisitorTimeline({ visitor, className }: VisitorTimelineProps) {
  const steps = [
    { id: 'requested', label: 'Requested', timestamp: '10:00 AM' }, // Mocking timestamps for UI
    { id: 'approval', label: visitor.status === 'rejected' ? 'Rejected' : 'Approved', timestamp: '10:02 AM' },
    { id: 'entered', label: 'Entered Gate', timestamp: '10:05 AM' },
    { id: 'exited', label: 'Exited Gate', timestamp: null },
  ];

  const currentStepIndex = visitor.status === 'pending' ? 0 
    : visitor.status === 'rejected' ? 1 
    : visitor.status === 'approved' ? 1 
    : visitor.status === 'entered' ? 2 
    : 3;

  return (
    <div className={cn('py-4', className)}>
      <div className="relative pl-6 space-y-6">
        {/* Vertical line connecting steps */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200"></div>

        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isRejected = step.id === 'approval' && visitor.status === 'rejected';

          return (
            <div key={step.id} className="relative z-10 flex items-start gap-4">
              <div className="relative flex-shrink-0 flex items-center justify-center w-6 h-6 -ml-6 bg-white">
                {isCurrent && (
                  <motion.div
                    className={cn(
                      'absolute w-6 h-6 rounded-full opacity-30',
                      isRejected ? 'bg-danger-600' : 'bg-primary-600'
                    )}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
                <div className={cn(
                  'w-3 h-3 rounded-full z-10 ring-4 ring-white',
                  isCompleted ? 'bg-primary-600' : isCurrent ? (isRejected ? 'bg-danger-600' : 'bg-primary-600') : 'bg-slate-300'
                )} />
              </div>
              
              <div className="flex-1 pt-1 -mt-2">
                <h5 className={cn(
                  'font-medium text-sm',
                  isCompleted || isCurrent ? 'text-slate-900' : 'text-slate-500'
                )}>
                  {step.label}
                </h5>
                {step.timestamp && (
                  <p className="text-xs text-slate-500 mt-0.5">{step.timestamp}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { Clock, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import type { Visitor } from '../../types';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { formatRelativeTime, cn } from '../../lib/utils';
import { resolvePhotoUrl } from '../../services/api';

export interface VisitorApprovalCardProps {
  visitor: Visitor;
  onAllow: () => void;
  onReject: () => void;
  onOpenDetails?: () => void;
  className?: string;
}

export function VisitorApprovalCard({
  visitor,
  onAllow,
  onReject,
  onOpenDetails,
  className,
}: VisitorApprovalCardProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3.5 shadow-sm transition-all select-none',
        className
      )}
    >
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
            Someone is waiting at {visitor.gate || 'Gate 1'}
          </span>
        </div>
        <div className="flex items-center text-[11px] font-medium text-slate-400">
          <Clock className="w-3 h-3 mr-1 text-slate-400" />
          {formatRelativeTime(
            visitor.requestedAt instanceof Date ? visitor.requestedAt : new Date(visitor.requestedAt)
          )}
        </div>
      </div>

      {/* Visitor Identity Info */}
      {(() => {
        const photoSrc = resolvePhotoUrl((visitor as any).photoUrl || visitor.photo);

        return (
          <div
            onClick={onOpenDetails}
            className={cn(
              'flex items-center gap-3 mb-3 bg-white/80 p-2.5 rounded-xl border border-amber-100/80',
              onOpenDetails && 'cursor-pointer hover:bg-white transition-colors'
            )}
          >
            <Avatar
              src={photoSrc}
              name={visitor.name}
              size="md"
              className="ring-2 ring-amber-200/80 shadow-xs object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <h3 className="text-sm font-extrabold text-slate-900 truncate leading-tight">
                  {visitor.name}
                </h3>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 flex-shrink-0">
                  {visitor.purpose}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-amber-600 flex-shrink-0" />
                <span>Awaiting your flat permission</span>
              </p>
            </div>
          </div>
        );
      })()}

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={onReject}
          variant="danger"
          size="sm"
          className="h-10 font-bold text-xs tracking-wider rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200/80"
          icon={<XCircle className="w-3.5 h-3.5" />}
        >
          REJECT
        </Button>
        <Button
          onClick={onAllow}
          variant="primary"
          size="sm"
          className="h-10 font-bold text-xs tracking-wider rounded-xl shadow-sm shadow-indigo-600/20"
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
        >
          ALLOW
        </Button>
      </div>
    </Card>
  );
}

export default VisitorApprovalCard;

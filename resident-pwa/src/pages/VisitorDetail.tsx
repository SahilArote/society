import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Phone, Calendar, Clock, MapPin, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { VisitorTimeline } from '../components/domain';
import { mockVisitors } from '../data/mockVisitors';
import { formatDate, formatTime } from '../lib/utils';
import { useToast } from '../hooks';

export default function VisitorDetail() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const visitor = mockVisitors.find((v) => v.id === id) || mockVisitors[0];

  const [status, setStatus] = useState(visitor.status);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const handleAllow = () => {
    setStatus('approved');
    showToast('Visitor pass approved', 'success');
  };

  const handleRejectConfirm = () => {
    setStatus('rejected');
    setShowRejectModal(false);
    showToast('Visitor access denied', 'error');
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-0 select-none pb-24">
      <AppHeader title="Visitor Details" showBack />

      <PageContainer className="py-3 space-y-3">
        {/* Top Profile Card */}
        <Card className="flex flex-col items-center text-center p-5 bg-white border border-slate-200/60 shadow-2xs">
          <Avatar name={visitor.name} size="xl" className="mb-2 ring-4 ring-indigo-50/80 shadow-2xs font-extrabold" />
          <h2 className="text-base font-extrabold text-slate-900 leading-tight">{visitor.name}</h2>
          <div className="mt-1.5">
            <Badge status={status}>{status}</Badge>
          </div>

          {visitor.phone && (
            <a
              href={`tel:${visitor.phone}`}
              className="inline-flex items-center gap-2 mt-3 px-3.5 py-1.5 rounded-xl bg-indigo-50/80 border border-indigo-100 text-xs font-bold text-indigo-700 hover:bg-indigo-100 active:scale-95 transition-all tap-target focus:outline-none"
            >
              <Phone className="w-3.5 h-3.5 text-indigo-600" />
              <span>{visitor.phone}</span>
            </a>
          )}
        </Card>

        {/* Action Buttons if Pending */}
        {status === 'pending' && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="danger"
              size="md"
              fullWidth
              onClick={() => setShowRejectModal(true)}
              className="h-11 font-bold text-xs tracking-wider rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200/80"
              icon={<XCircle className="w-4 h-4" />}
            >
              REJECT
            </Button>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={handleAllow}
              className="h-11 font-bold text-xs tracking-wider rounded-xl shadow-sm shadow-indigo-600/20"
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              ALLOW ENTRY
            </Button>
          </div>
        )}

        {/* Visit Details Grid */}
        <Card className="p-0 overflow-hidden bg-white border border-slate-200/60 shadow-2xs divide-y divide-slate-100">
          <div className="flex items-center justify-between p-3.5 text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Visit Purpose
            </span>
            <span className="font-extrabold text-slate-800 capitalize">{visitor.purpose}</span>
          </div>

          <div className="flex items-center justify-between p-3.5 text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Date Requested
            </span>
            <span className="font-extrabold text-slate-800">
              {formatDate(visitor.requestedAt instanceof Date ? visitor.requestedAt : new Date(visitor.requestedAt))}
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Time
            </span>
            <span className="font-extrabold text-slate-800">
              {formatTime(visitor.requestedAt instanceof Date ? visitor.requestedAt : new Date(visitor.requestedAt))}
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              Gate Assigned
            </span>
            <span className="font-extrabold text-slate-800">{visitor.gate || 'Main Gate'}</span>
          </div>

          {visitor.notes && (
            <div className="p-3.5 text-xs">
              <span className="text-slate-500 font-bold block mb-1">Instructions for Guard</span>
              <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 font-medium">
                {visitor.notes}
              </p>
            </div>
          )}
        </Card>

        {/* Visitor Lifecycle Timeline */}
        <Card className="p-4 bg-white border border-slate-200/60 shadow-2xs">
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Activity Timeline
          </h3>
          <VisitorTimeline visitor={{ ...visitor, status }} />
        </Card>
      </PageContainer>

      {/* Rejection Confirmation Modal */}
      <ConfirmationDialog
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject this visitor?"
        message={`Are you sure you want to deny entry to ${visitor.name}? Security will be instructed not to let them in.`}
        confirmLabel="Confirm Rejection"
        confirmVariant="danger"
        onConfirm={handleRejectConfirm}
      />
    </div>
  );
}

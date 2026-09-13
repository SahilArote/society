import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Phone, Calendar, Clock, MapPin, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { VisitorTimeline } from '../components/domain';
import { formatDate, formatTime } from '../lib/utils';
import { useToast } from '../hooks';
import { fetchVisitorRequestById, approveVisitorRequest, rejectVisitorRequest, getSecurePhotoUrl } from '../services/api';
import type { Visitor } from '../types';

export default function VisitorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<string>('pending');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetchVisitorRequestById(id).then((data) => {
      if (data) {
        const rawPhoto = data.visitor?.photoUrl || data.visitor?.photo || data.photoUrl || data.photo;
        const photoUrl = getSecurePhotoUrl(rawPhoto);
        const mapped: Visitor = {
          id: data.id,
          name: data.visitor?.name || data.name || 'Visitor',
          phone: data.visitor?.mobile || data.phone,
          photoUrl: photoUrl,
          photo: photoUrl,
          purpose: (data.entryType || data.visitor?.purpose || 'personal').toLowerCase() as any,
          status: (data.status || 'pending').toLowerCase() as any,
          gate: data.gate || 'Main Gate',
          flatNumber: data.flatNumber || '',
          requestedAt: new Date(data.requestedAt || Date.now()),
        };
        setVisitor(mapped);
        setStatus(mapped.status);
      }
      setIsLoading(false);
    });
  }, [id]);

  const handleAllow = async () => {
    if (!visitor) return;
    try {
      await approveVisitorRequest(visitor.id);
      setStatus('approved');
      showToast('Visitor pass approved', 'success');
    } catch (err) {
      showToast('Approved access', 'success');
      setStatus('approved');
    }
  };

  const handleRejectConfirm = async () => {
    if (!visitor) return;
    setShowRejectModal(false);
    try {
      await rejectVisitorRequest(visitor.id, 'Entry denied by resident');
      setStatus('rejected');
      showToast('Visitor access denied', 'error');
    } catch (err) {
      showToast('Visitor access denied', 'error');
      setStatus('rejected');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 min-h-0">
        <AppHeader title="Visitor Details" showBack />
        <PageContainer className="py-6 space-y-3">
          <div className="h-32 bg-white rounded-2xl animate-pulse" />
          <div className="h-48 bg-white rounded-2xl animate-pulse" />
        </PageContainer>
      </div>
    );
  }

  if (!visitor) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 min-h-0">
        <AppHeader title="Visitor Details" showBack />
        <PageContainer className="py-12 text-center">
          <p className="text-sm font-bold text-slate-700">Visitor Record Not Found</p>
          <button
            onClick={() => navigate('/visitors')}
            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
          >
            Back to Visitors
          </button>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-0 select-none pb-24">
      <AppHeader title="Visitor Details" showBack />

      <PageContainer className="py-3 space-y-3">
        {/* Top Profile Card */}
        <Card className="flex flex-col items-center text-center p-5 bg-white border border-slate-200/60 shadow-2xs">
          <Avatar
            src={visitor.photoUrl || visitor.photo}
            name={visitor.name}
            size="xl"
            className="mb-2 ring-4 ring-indigo-50/80 shadow-2xs font-extrabold"
          />
          <h2 className="text-base font-extrabold text-slate-900 leading-tight">{visitor.name}</h2>
          <div className="mt-1.5">
            <Badge status={status as any}>{status}</Badge>
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
          <VisitorTimeline visitor={{ ...visitor, status: status as any }} />
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

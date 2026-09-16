import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Clock,
  Home,
  User,
  Car,
  ShieldCheck,
  FileText,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { formatTime } from '../lib/utils';
import { useToast } from '../hooks';
import {
  fetchVisitorRequestById,
  approveVisitorRequest,
  rejectVisitorRequest,
  getSecurePhotoUrl,
} from '../services/api';
import type { Visitor } from '../types';

export default function VisitorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<string>('pending');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showFullPhoto, setShowFullPhoto] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetchVisitorRequestById(id).then((data) => {
      if (data) {
        const rawPhoto =
          data.visitor?.photoUrl || data.visitor?.photo || data.photoUrl || data.photo;
        const photoUrl = getSecurePhotoUrl(rawPhoto);
        const mapped: Visitor = {
          id: data.id,
          name: data.visitor?.name || data.name || 'Visitor',
          phone: data.visitor?.mobile || data.phone,
          photoUrl: photoUrl,
          photo: photoUrl,
          purpose: (data.entryType || data.visitor?.purpose || 'personal').toLowerCase() as any,
          status: (data.status || 'pending').toLowerCase() as any,
          gate: data.gateName || data.gate || 'Main Gate',
          flatNumber: data.flatNumber || '',
          requestedAt: new Date(data.requestedAt || Date.now()),
          vehicleNumber: data.visitor?.vehicleNumber || data.vehicleNumber,
          deliveryCompany: data.visitor?.deliveryCompany || data.deliveryCompany,
          notes: data.notes || data.visitor?.notes,
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
      <div className="flex-1 flex flex-col bg-[#f4f6fb] min-h-screen">
        {/* Header Skeleton */}
        <div className="bg-white border-b border-slate-200/80 px-4 pt-4 pb-4 shadow-2xs">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse" />
            <div className="space-y-1.5 text-center">
              <div className="w-28 h-4 bg-slate-200 rounded mx-auto animate-pulse" />
              <div className="w-40 h-3 bg-slate-100 rounded mx-auto animate-pulse" />
            </div>
            <div className="w-9 h-9" />
          </div>
        </div>
        <div className="p-4 space-y-3.5 max-w-lg mx-auto w-full">
          <div className="h-32 bg-white rounded-[24px] animate-pulse shadow-sm" />
          <div className="h-24 bg-white rounded-[22px] animate-pulse shadow-sm" />
          <div className="h-44 bg-white rounded-[22px] animate-pulse shadow-sm" />
        </div>
      </div>
    );
  }

  if (!visitor) {
    return (
      <div className="flex-1 flex flex-col bg-[#f4f6fb] min-h-screen">
        <div className="bg-white border-b border-slate-200/80 px-4 pt-4 pb-4 shadow-2xs flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-slate-900 text-base">Visitor Details</span>
        </div>
        <div className="p-10 text-center space-y-3">
          <p className="text-sm font-bold text-slate-700">Visitor Record Not Found</p>
          <button
            onClick={() => navigate('/visitors')}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm"
          >
            Back to Visitors
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#f4f6fb] min-h-screen select-none pb-24 overflow-y-auto">
      {/* Top Banner Header - Clean White & Black */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 pt-4 pb-4 text-slate-900 shadow-2xs sticky top-0 z-30">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-800 transition-all cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Visitor Details</h1>
            <p className="text-[11px] text-slate-500 font-normal mt-0.5">
              Complete information about the visitor
            </p>
          </div>
          <div className="w-9 h-9" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-3.5 max-w-lg mx-auto w-full">
        {/* Card 1: Top Profile Card */}
        <div className="bg-white rounded-[28px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 relative overflow-hidden">
          {/* Subtle curved background decoration */}

          <div className="flex items-center gap-4">
            {/* Avatar  - compact square with rounded corners (Clickable for full view) */}
            <div
              onClick={() => {
                if (visitor.photoUrl || visitor.photo) {
                  setShowFullPhoto(true);
                }
              }}
              className={`relative flex-shrink-0 ${
                visitor.photoUrl || visitor.photo
                  ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-all group'
                  : ''
              }`}
              title={visitor.photoUrl || visitor.photo ? 'Click to view full photo' : undefined}
            >
              <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden border-2 border-white shadow-sm ring-2 ring-slate-100 bg-slate-100 flex items-center justify-center relative">
                {visitor.photoUrl || visitor.photo ? (
                  <>
                    <img
                      src={visitor.photoUrl || visitor.photo}
                      alt={visitor.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] text-white font-bold bg-black/50 px-1.5 py-0.5 rounded-md">View</span>
                    </div>
                  </>
                ) : (
                  <span className="text-xl font-extrabold text-indigo-600">
                    {visitor.name?.[0]?.toUpperCase() || 'V'}
                  </span>
                )}
              </div>
            </div>

            {/* Visitor Identity & Actions */}
            <div className="flex-1 min-w-0">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight truncate">
                  {visitor.name}
                </h2>
              </div>

              {/* Status Badge */}
              <div className="mt-1 flex items-center">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${status === 'approved'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : status === 'rejected'
                      ? 'bg-rose-50 text-rose-600 border border-rose-100'
                      : 'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}
                >
                  {status === 'approved' ? (
                    <CheckCircle2 className="w-3 h-3 fill-emerald-600 text-white" />
                  ) : status === 'rejected' ? (
                    <XCircle className="w-3 h-3 fill-rose-600 text-white" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                  <span className="capitalize">{status}</span>
                </span>
              </div>

              {/* Role Subtitle */}
              <p className="text-xs text-slate-400 font-medium capitalize mt-1">Visitor</p>

              {/* Contact row: Phone Pill + Message Button */}
              <div className="mt-2.5 flex items-center justify-between gap-2">
                {visitor.phone ? (
                  <a
                    href={`tel:${visitor.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50/70 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 active:scale-95 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{visitor.phone}</span>
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 font-medium">Not Provided</span>
                )}

                <a
                  href={visitor.phone ? `sms:${visitor.phone}` : '#'}
                  className="w-8 h-8 rounded-xl bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-100 flex items-center justify-center text-indigo-600 active:scale-95 transition-all"
                  title="Send Message"
                >
                  <MessageSquare className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: 3-Column Info (Flat Number, Gate, Arrival Time) */}
        <div className="bg-white rounded-[24px] p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 grid grid-cols-3 divide-x divide-slate-100 text-center">
          {/* Column 1: Flat Number */}
          <div className="flex flex-col items-center justify-center px-1">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
              <Home className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-[11px] font-medium text-slate-400">Flat Number</span>
            <span className="text-sm font-extrabold text-slate-800 mt-0.5">
              {visitor.flatNumber || 'A-202'}
            </span>
          </div>

          {/* Column 2: Gate */}
          <div className="flex flex-col items-center justify-center px-1">
            <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-1.5">
              <svg
                className="w-5 h-5 text-purple-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="8" height="18" rx="1" />
                <rect x="13" y="3" width="8" height="18" rx="1" />
                <circle cx="8.5" cy="12" r="0.8" fill="currentColor" />
                <circle cx="15.5" cy="12" r="0.8" fill="currentColor" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-slate-400">Gate</span>
            <span className="text-sm font-extrabold text-slate-800 mt-0.5 truncate max-w-full px-1">
              {visitor.gate || 'Main Gate'}
            </span>
          </div>

          {/* Column 3: Arrival Time */}
          <div className="flex flex-col items-center justify-center px-1">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5">
              <Clock className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-[11px] font-medium text-slate-400">Arrival Time</span>
            <span className="text-sm font-extrabold text-slate-800 mt-0.5">
              {formatTime(
                visitor.requestedAt instanceof Date
                  ? visitor.requestedAt
                  : new Date(visitor.requestedAt)
              )}
            </span>
          </div>
        </div>

        {/* Card 3: Visitor Details List */}
        <div className="bg-white rounded-[24px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100">
          <div className="flex items-center gap-2 mb-3.5">
            <User className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-800">Visitor Details</h3>
          </div>

          <div className="space-y-3.5 divide-y divide-slate-100">
            {/* Phone row */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <span className="text-xs text-slate-400 font-medium">Phone Number</span>
              </div>
              <span className="text-xs font-bold text-slate-800">
                {visitor.phone
                  ? visitor.phone.startsWith('+')
                    ? visitor.phone
                    : `+91 ${visitor.phone}`
                  : '+91 8850757343'}
              </span>
            </div>

            {/* Vehicle row */}
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Car className="w-4 h-4" />
                </div>
                <span className="text-xs text-slate-400 font-medium">Vehicle Number</span>
              </div>
              <span className="text-xs font-bold text-slate-800">
                {visitor.vehicleNumber || 'Not Provided'}
              </span>
            </div>


          </div>
        </div>

        {/* Card 4: Notes */}
        <div className="bg-white rounded-[20px] p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Notes</h4>
            <p className="text-[11px] text-slate-400 font-medium">
              {visitor.notes || 'No additional notes'}
            </p>
          </div>
        </div>

        {/* Action Buttons if Pending */}
        {status === 'pending' && (
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowRejectModal(true)}
              className="h-12 py-3 px-4 rounded-2xl border-2 border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-600 font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <XCircle className="w-4 h-4" />
              <span>REJECT</span>
            </button>
            <button
              type="button"
              onClick={handleAllow}
              className="h-12 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-emerald-600/25"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ALLOW ENTRY</span>
            </button>
          </div>
        )}


      </div>

      {/* Rejection Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject this visitor?"
        message={`Are you sure you want to deny entry to ${visitor.name}? Security will be instructed not to let them in.`}
        confirmLabel="Confirm Rejection"
        confirmVariant="danger"
        onConfirm={handleRejectConfirm}
      />

      {/* Full Photo Modal Lightbox */}
      {showFullPhoto && (visitor.photoUrl || visitor.photo) && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowFullPhoto(false)}
        >
          {/* Top Bar with visitor name & close button */}
          <div
            className="w-full max-w-md flex items-center justify-between py-2 text-white mb-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide">{visitor.name}</span>
              <span className="text-xs text-white/60">• Full Photo</span>
            </div>
            <button
              type="button"
              onClick={() => setShowFullPhoto(false)}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Full-size Image Container */}
          <div
            className="relative max-w-md w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={visitor.photoUrl || visitor.photo}
              alt={visitor.name}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/20 bg-black"
            />
          </div>

          <p className="text-white/60 text-xs mt-3">Tap anywhere to close</p>
        </div>
      )}
    </div>
  );
}


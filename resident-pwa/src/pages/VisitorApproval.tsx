import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, CheckCircle2, XCircle, MapPin, Building, Clock, ArrowLeft, Camera, Eye } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { PhotoViewerModal } from '../components/ui/PhotoViewerModal';
import { mockVisitors } from '../data/mockVisitors';
import { mockResident } from '../data/mockResident';
import { formatTime } from '../lib/utils';
import { useToast } from '../hooks';
import { fetchVisitorRequests, approveVisitorRequest, rejectVisitorRequest, BACKEND_URL, resolvePhotoUrl } from '../services/api';
import { authSession } from '../services/authSession';

export default function VisitorApproval() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentUser = authSession.getUser();

  const [visitor, setVisitor] = useState<any>(
    mockVisitors.find((v) => v.id === id) || {
      id: id || 'REQ-UNKNOWN',
      name: 'Visitor',
      purpose: 'personal',
      gate: 'Main Gate',
      requestedAt: new Date(),
    }
  );

  useEffect(() => {
    if (!id) return;
    fetchVisitorRequests().then((apiData) => {
      if (apiData && Array.isArray(apiData)) {
        const found = apiData.find((r: any) => r.id === id);
        if (found) {
          setVisitor({
            id: found.id,
            name: found.visitor?.name || 'Visitor',
            phone: found.visitor?.mobile,
            photoUrl: found.visitor?.photoUrl,
            photo: found.visitor?.photoUrl || found.visitor?.photo,
            purpose: found.visitor?.purpose || 'personal',
            status: found.status?.toLowerCase() || 'pending',
            gate: found.gate || 'Main Gate',
            flatNumber: found.flatNumber || currentUser?.flat || 'A-402',
            requestedAt: new Date(found.requestedAt),
          });
        }
      }
    });
  }, [id, currentUser]);

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [outcome, setOutcome] = useState<'allowed' | 'rejected' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAllow = async () => {
    setIsProcessing(true);
    try {
      await approveVisitorRequest(visitor.id);
      setOutcome('allowed');
      showToast(`Access granted for ${visitor.name}`, 'success');
      setTimeout(() => {
        navigate('/home');
      }, 1200);
    } catch (err: any) {
      showToast(err?.message || 'Failed to approve visitor entry', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectConfirm = async () => {
    setShowRejectDialog(false);
    setIsProcessing(true);
    try {
      await rejectVisitorRequest(visitor.id, 'Denied by resident');
      setOutcome('rejected');
      showToast(`Denied entry to ${visitor.name}`, 'error');
      setTimeout(() => {
        navigate('/home');
      }, 1200);
    } catch (err: any) {
      showToast(err?.message || 'Failed to reject visitor', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/home')}
          className="p-2 -ml-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Security Gate Alert</span>
        </div>
      </div>

      {/* Main Approval Modal / Card */}
      <div className="max-w-sm w-full mx-auto my-auto py-6">
        <AnimatePresence mode="wait">
          {outcome === 'allowed' ? (
            <motion.div
              key="allowed"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-10"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-500/10">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-white">Entry Permitted</h2>
              <p className="text-xs text-slate-400 mt-1">
                Security guard at {visitor.gate || 'Main Gate'} has been notified.
              </p>
            </motion.div>
          ) : outcome === 'rejected' ? (
            <motion.div
              key="rejected"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-10"
            >
              <div className="w-20 h-20 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4 ring-8 ring-rose-500/10">
                <XCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-white">Entry Denied</h2>
              <p className="text-xs text-slate-400 mt-1">
                The gate has been instructed to turn away this visitor.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="pending"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-center"
            >
              <div className="mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Visitor Waiting at Gate
                </span>
                <h1 className="text-xl font-bold text-white mt-1">
                  Someone is requesting access
                </h1>
              </div>

              {/* Visitor Avatar */}
              {(() => {
                const photoSrc = resolvePhotoUrl(visitor.photoUrl || visitor.photo);

                return (
                  <>
                    <div className="relative inline-block my-3">
                      <div
                        onClick={() => setShowPhotoModal(true)}
                        className="relative cursor-pointer group"
                        title="Tap to enlarge photo"
                      >
                        <Avatar
                          name={visitor.name}
                          src={photoSrc}
                          size="xl"
                          className="w-24 h-24 text-2xl mx-auto ring-4 ring-indigo-500/30 group-hover:ring-indigo-400/60 shadow-lg object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-indigo-600 group-hover:bg-indigo-500 text-white flex items-center justify-center ring-2 ring-slate-800 shadow-md">
                          <Camera className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 ring-2 ring-slate-800 animate-ping pointer-events-none" />
                    </div>

                    <h2 className="text-2xl font-extrabold text-white mb-1 tracking-tight">
                      {visitor.name}
                    </h2>
                    <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                      <p className="text-xs text-indigo-300 font-medium capitalize bg-indigo-950/60 py-1 px-3 rounded-full border border-indigo-800/50">
                        Purpose: {visitor.purpose}
                      </p>
                      {photoSrc && (
                        <button
                          type="button"
                          onClick={() => setShowPhotoModal(true)}
                          className="text-xs text-emerald-300 font-bold bg-emerald-950/60 hover:bg-emerald-900/80 py-1 px-3 rounded-full border border-emerald-800/50 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> View Photo
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}

              {/* Information Row */}
              <div className="grid grid-cols-3 gap-2 bg-slate-900/60 rounded-2xl p-3 mb-8 border border-slate-700/50 text-left">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <Building className="w-3 h-3 text-slate-400" />
                    <span>Flat</span>
                  </div>
                  <p className="text-xs font-bold text-white">{visitor.flatNumber || currentUser?.flat || 'A-402'}</p>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>Gate</span>
                  </div>
                  <p className="text-xs font-bold text-white truncate">{visitor.gate || 'Main Gate'}</p>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Time</span>
                  </div>
                  <p className="text-xs font-bold text-white">
                    {formatTime(visitor.requestedAt instanceof Date ? visitor.requestedAt : new Date(visitor.requestedAt))}
                  </p>
                </div>
              </div>

              {/* Large Urgent Action Buttons */}
              <div className="space-y-3">
                <Button
                  variant="success"
                  size="lg"
                  fullWidth
                  onClick={handleAllow}
                  className="h-14 text-base font-bold tracking-wide shadow-lg shadow-emerald-600/30"
                  icon={<CheckCircle2 className="w-6 h-6" />}
                >
                  ALLOW ENTRY
                </Button>

                <Button
                  variant="danger"
                  size="lg"
                  fullWidth
                  onClick={() => setShowRejectDialog(true)}
                  className="h-14 text-base font-bold tracking-wide"
                  icon={<XCircle className="w-6 h-6" />}
                >
                  REJECT
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Security Context footer */}
      <div className="text-center text-[11px] text-slate-500">
        GreenGate Gate Security Terminal · ID: {visitor.id}
      </div>

      {/* Confirmation Modal before Rejecting */}
      <ConfirmationDialog
        isOpen={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        title="Reject this visitor?"
        message={`Are you sure you want to reject ${visitor.name}? The security guard will not allow entry.`}
        confirmLabel="Reject Visitor"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={handleRejectConfirm}
      />

      {/* Full-Screen Gate Photo Modal */}
      <PhotoViewerModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        imageUrl={resolvePhotoUrl(visitor.photoUrl || visitor.photo)}
        name={visitor.name}
        subtitle={`${visitor.purpose?.toUpperCase()} • Flat ${visitor.flatNumber || currentUser?.flat || 'A-402'} • ${visitor.gate || 'Main Gate'}`}
        tag="Security Live Gate Cam"
      />
    </div>
  );
}

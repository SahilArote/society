import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, CheckCircle2, XCircle, MapPin, Building, Clock, ArrowLeft } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { mockVisitors } from '../data/mockVisitors';
import { mockResident } from '../data/mockResident';
import { formatTime } from '../lib/utils';
import { useToast } from '../hooks';

export default function VisitorApproval() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const visitor = mockVisitors.find((v) => v.id === id) || mockVisitors[0];

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [outcome, setOutcome] = useState<'allowed' | 'rejected' | null>(null);

  const handleAllow = () => {
    setOutcome('allowed');
    showToast(`Access granted for ${visitor.name}`, 'success');
    setTimeout(() => {
      navigate('/home');
    }, 1200);
  };

  const handleRejectConfirm = () => {
    setShowRejectDialog(false);
    setOutcome('rejected');
    showToast(`Denied entry to ${visitor.name}`, 'error');
    setTimeout(() => {
      navigate('/home');
    }, 1200);
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
              <div className="relative inline-block my-4">
                <Avatar
                  name={visitor.name}
                  size="xl"
                  className="w-24 h-24 text-2xl mx-auto ring-4 ring-primary-500/30 shadow-lg"
                />
                <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-amber-500 ring-2 ring-slate-800 animate-ping" />
              </div>

              <h2 className="text-2xl font-extrabold text-white mb-1 tracking-tight">
                {visitor.name}
              </h2>
              <p className="text-xs text-indigo-300 font-medium capitalize mb-6 bg-indigo-950/60 py-1 px-3 rounded-full inline-block border border-indigo-800/50">
                Purpose: {visitor.purpose}
              </p>

              {/* Information Row */}
              <div className="grid grid-cols-3 gap-2 bg-slate-900/60 rounded-2xl p-3 mb-8 border border-slate-700/50 text-left">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <Building className="w-3 h-3 text-slate-400" />
                    <span>Flat</span>
                  </div>
                  <p className="text-xs font-bold text-white">{mockResident.flat.number}</p>
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
    </div>
  );
}

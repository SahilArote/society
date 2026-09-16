import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, Building, Clock, Home, Phone, Car, Bike, User, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatTime } from '../../lib/utils';
import { getSecurePhotoUrl } from '../../services/api';
import { getStoredUser } from '../../services/authSession';
import type { Visitor } from '../../types';

interface VisitorApprovalSheetProps {
  isOpen: boolean;
  visitor: Visitor | null;
  onClose: () => void;
  onAllow: (id: string) => void;
  onReject: (id: string) => void;
}

export function VisitorApprovalSheet({
  isOpen,
  visitor,
  onClose,
  onAllow,
  onReject,
}: VisitorApprovalSheetProps) {
  const [confirmReject, setConfirmReject] = useState(false);

  if (!isOpen || !visitor) return null;

  const handleAllowClick = () => {
    onAllow(visitor.id);
    onClose();
  };

  const handleRejectClick = () => {
    setConfirmReject(true);
  };

  const handleConfirmReject = () => {
    setConfirmReject(false);
    onReject(visitor.id);
    onClose();
  };

  const photoSrc = getSecurePhotoUrl((visitor as any).photoUrl || visitor.photo);
  const resident = getStoredUser();
  const displayFlatNumber = visitor.flatNumber || resident?.flatNumber || 'Flat';

  const formattedTime = formatTime(
    visitor.requestedAt instanceof Date ? visitor.requestedAt : new Date(visitor.requestedAt)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          if (!confirmReject) onClose();
        }}
      />

      {/* Bottom Sheet Container */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-lg bg-white rounded-t-[32px] p-5 pb-safe shadow-2xl z-10 max-h-[92vh] overflow-y-auto mobile-scroll-container"
      >
        {/* Top Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3" />

        <AnimatePresence mode="wait">
          {!confirmReject ? (
            <motion.div
              key="details"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Top Header Row */}
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/60 shrink-0">
                    <Shield className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 leading-tight">
                      Gate Access Request
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Someone is requesting entry to your society
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Large Visitor Photo (Uncropped, Large Display) */}
              <div className="w-full h-56 sm:h-64 rounded-3xl overflow-hidden bg-slate-950 border border-slate-200/80 relative flex items-center justify-center mb-3.5 shadow-xs">
                {photoSrc ? (
                  <img
                    src={photoSrc}
                    alt={visitor.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-200 flex items-center justify-center text-2xl font-bold mb-2">
                      {visitor.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-slate-400 font-medium">No photo available</span>
                  </div>
                )}
              </div>

              {/* Visitor Identity Row */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/60">
                    {visitor.purpose === 'delivery' ? (
                      <Bike className="w-6 h-6 text-indigo-600" />
                    ) : visitor.purpose === 'cab' ? (
                      <Car className="w-6 h-6 text-indigo-600" />
                    ) : (
                      <User className="w-6 h-6 text-indigo-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight capitalize truncate leading-tight">
                      {visitor.name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 capitalize mt-0.5 truncate">
                      {visitor.deliveryCompany || (visitor.purpose === 'delivery' ? 'Food Delivery' : `${visitor.purpose} Visit`)}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-600" />
                  <span className="capitalize">{visitor.purpose === 'delivery' ? 'Food Delivery' : visitor.purpose}</span>
                </div>
              </div>

              {/* Details Card */}
              <div className="bg-slate-50/90 border border-slate-100 rounded-3xl p-4 mb-3 space-y-3.5">
                {/* 3 Columns: Flat Number, Gate, Arrival Time */}
                <div className="grid grid-cols-3 divide-x divide-slate-200/70 text-left">
                  <div className="pr-2 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                      <Home className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Flat Number</span>
                    </div>
                    <p className="text-lg font-black text-slate-900">{displayFlatNumber}</p>
                  </div>

                  <div className="px-3 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                      <Building className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Gate</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 truncate">{visitor.gate || 'East Gate'}</p>
                  </div>

                  <div className="pl-3 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Arrival Time</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800">{formattedTime}</p>
                  </div>
                </div>

                {/* Visitor Details List */}
                <div className="pt-3 border-t border-slate-200/70 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Visitor Details</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Phone</span>
                    </div>
                    <span className="font-bold text-slate-800">{visitor.phone || 'Not Provided'}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Car className="w-3.5 h-3.5 text-slate-400" />
                      <span>Vehicle No.</span>
                    </div>
                    <span className="font-bold text-slate-800">{visitor.vehicleNumber || 'Not Provided'}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      <span>ID Proof</span>
                    </div>
                    <span className="font-semibold text-slate-400">Not Provided</span>
                  </div>
                </div>
              </div>

              {/* Swipe/Hint text */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mb-3 font-medium">
                <span>← →</span>
                <span>Swipe to approve or reject</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRejectClick}
                  className="flex-1 h-13 py-3.5 px-4 rounded-2xl border-2 border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-600 font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-colors active:scale-95"
                >
                  <div className="w-5 h-5 rounded-full border-2 border-rose-500 flex items-center justify-center text-rose-600 font-black text-[10px]">
                    ✕
                  </div>
                  <span>Reject</span>
                </button>

                <button
                  type="button"
                  onClick={handleAllowClick}
                  className="flex-1 h-13 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-emerald-600/25"
                >
                  <div className="w-5 h-5 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-white font-black text-[10px]">
                    ✓
                  </div>
                  <span>Allow Entry</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-4"
            >
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 border border-rose-100">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Reject entry for {visitor.name}?
              </h3>
              <p className="text-xs text-slate-500 mb-6 max-w-xs mx-auto">
                The security guard at {visitor.gate || 'the gate'} will be immediately instructed to deny entry.
              </p>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={() => setConfirmReject(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="lg"
                  fullWidth
                  onClick={handleConfirmReject}
                >
                  Reject Visitor
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default VisitorApprovalSheet;

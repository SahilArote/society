import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, CheckCircle2, XCircle, MapPin, Building, Clock, Camera, Eye } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { PhotoViewerModal } from '../ui/PhotoViewerModal';
import { formatTime } from '../../lib/utils';
import { mockResident } from '../../data/mockResident';
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
  const [showPhotoModal, setShowPhotoModal] = useState(false);

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
        className="relative w-full max-w-lg bg-white rounded-t-[32px] p-6 pb-safe shadow-2xl z-10 max-h-[92vh] overflow-y-auto mobile-scroll-container"
      >
        {/* Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />

        <AnimatePresence mode="wait">
          {!confirmReject ? (
            <motion.div
              key="details"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    Gate Access Request
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Visitor Identity Card */}
              <div className="flex flex-col items-center text-center p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-5">
                {(() => {
                  const backendOrigin = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
                  const photoSrc = (visitor as any).photoUrl
                    ? (visitor as any).photoUrl.startsWith('http')
                      ? (visitor as any).photoUrl
                      : `${backendOrigin}${(visitor as any).photoUrl}`
                    : visitor.photo
                    ? visitor.photo.startsWith('http')
                      ? visitor.photo
                      : `${backendOrigin}${visitor.photo}`
                    : undefined;

                  return (
                    <>
                      <div
                        onClick={() => setShowPhotoModal(true)}
                        className="relative cursor-pointer group mb-3 select-none"
                        title="Tap to enlarge photo"
                      >
                        <Avatar
                          src={photoSrc}
                          name={visitor.name}
                          size="xl"
                          className="w-24 h-24 text-2xl ring-4 ring-white group-hover:ring-indigo-200 shadow-md rounded-2xl object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-indigo-600 group-hover:bg-indigo-700 text-white flex items-center justify-center ring-2 ring-white shadow-xs">
                          <Camera className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      <h2 className="text-xl font-extrabold text-slate-900">{visitor.name}</h2>
                      <div className="flex items-center justify-center gap-2 mt-0.5">
                        <p className="text-xs font-semibold text-primary-600 capitalize">
                          {visitor.purpose} Visit
                        </p>
                        {photoSrc && (
                          <button
                            type="button"
                            onClick={() => setShowPhotoModal(true)}
                            className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-200/80 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-indigo-600" /> View Photo
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()}

                {/* Metadata Row */}
                <div className="grid grid-cols-3 gap-2 w-full mt-4 pt-3 border-t border-slate-200/70 text-left">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-400" />
                      Flat
                    </span>
                    <p className="text-xs font-bold text-slate-800">{mockResident.flat.number}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      Gate
                    </span>
                    <p className="text-xs font-bold text-slate-800 truncate">{visitor.gate || 'Main Gate'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Time
                    </span>
                    <p className="text-xs font-bold text-slate-800">
                      {formatTime(visitor.requestedAt instanceof Date ? visitor.requestedAt : new Date(visitor.requestedAt))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Large Thumb-Friendly Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="danger"
                  size="lg"
                  className="flex-1 h-14 text-sm font-bold tracking-wider rounded-xl"
                  onClick={handleRejectClick}
                  icon={<XCircle className="w-5 h-5" />}
                >
                  REJECT
                </Button>

                <Button
                  variant="success"
                  size="lg"
                  className="flex-1 h-14 text-sm font-bold tracking-wider rounded-xl shadow-md shadow-emerald-500/20"
                  onClick={handleAllowClick}
                  icon={<CheckCircle2 className="w-5 h-5" />}
                >
                  ALLOW ENTRY
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-2"
            >
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Reject entry for {visitor.name}?
              </h3>
              <p className="text-xs text-slate-500 mb-6 max-w-xs mx-auto">
                The security guard at {visitor.gate || 'Gate 1'} will be immediately instructed to deny entry.
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
      {/* Full-Screen Gate Photo Modal */}
      <PhotoViewerModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        imageUrl={
          (visitor as any).photoUrl
            ? (visitor as any).photoUrl.startsWith('http')
              ? (visitor as any).photoUrl
              : `http://localhost:5000${(visitor as any).photoUrl}`
            : visitor.photo
            ? visitor.photo.startsWith('http')
              ? visitor.photo
              : `http://localhost:5000${visitor.photo}`
            : undefined
        }
        name={visitor.name}
        subtitle={`${visitor.purpose?.toUpperCase()} • Flat ${mockResident.flat.number} • ${visitor.gate || 'Main Gate'}`}
        tag="Security Gate Photo"
      />
    </div>
  );
}

export default VisitorApprovalSheet;

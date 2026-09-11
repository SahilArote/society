import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, ExternalLink, ShieldCheck, Camera, User } from 'lucide-react';

export interface PhotoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  name: string;
  subtitle?: string;
  tag?: string;
}

export function PhotoViewerModal({
  isOpen,
  onClose,
  imageUrl,
  name,
  subtitle,
  tag,
}: PhotoViewerModalProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      setIsZoomed(false);
      setImgError(false);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between items-center select-none">
          {/* Dark Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/95 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Top Bar */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="relative z-10 w-full max-w-lg px-4 pt-4 pb-2 flex items-center justify-between text-white"
          >
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {tag || 'Gate Photo'}
                </span>
              </div>
              <h2 className="text-base font-bold text-white truncate mt-1">{name}</h2>
              {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
            </div>

            <div className="flex items-center gap-2">
              {imageUrl && !imgError && (
                <>
                  <button
                    onClick={() => setIsZoomed((prev) => !prev)}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 hover:text-white flex items-center justify-center transition-all focus:outline-none"
                    title={isZoomed ? 'Zoom Out' : 'Zoom In'}
                    aria-label="Toggle zoom"
                  >
                    {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                  </button>
                  <a
                    href={imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 hover:text-white flex items-center justify-center transition-all focus:outline-none"
                    title="Open in new tab"
                    aria-label="Open original image"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </>
              )}

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all focus:outline-none"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          {/* Main Photo Center Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 flex-1 w-full max-w-lg flex items-center justify-center p-4 overflow-hidden"
          >
            {imageUrl && !imgError ? (
              <div
                className={`relative overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 ring-1 ring-white/20 max-w-full ${
                  isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
                }`}
                onClick={() => setIsZoomed((prev) => !prev)}
              >
                <img
                  src={imageUrl}
                  alt={name}
                  onError={() => setImgError(true)}
                  className={`object-contain max-h-[68vh] w-auto max-w-full transition-transform duration-300 select-none ${
                    isZoomed ? 'scale-150' : 'scale-100'
                  }`}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-800/80 rounded-3xl border border-slate-700 text-center max-w-xs">
                <div className="w-20 h-20 rounded-full bg-slate-700 text-slate-400 flex items-center justify-center mb-3 ring-4 ring-slate-600/50">
                  <User className="w-10 h-10" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">No Picture Available</h3>
                <p className="text-xs text-slate-400">
                  Security guard did not capture or upload a visitor photo for this entry request.
                </p>
              </div>
            )}
          </motion.div>

          {/* Bottom Bar Info */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="relative z-10 w-full max-w-lg px-4 pb-6 pt-2 text-center"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-slate-300 text-xs font-medium border border-white/10 shadow-lg">
              <Camera className="w-3.5 h-3.5 text-indigo-400" />
              <span>Captured Live at Gate by Guard</span>
              <span className="text-slate-500 mx-1">·</span>
              <span className="text-slate-400">Tap photo to zoom</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default PhotoViewerModal;

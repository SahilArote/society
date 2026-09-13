import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Share2, ArrowRight } from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { PageContainer } from '../components/layout/PageContainer';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { VisitorPassCard } from '../components/domain';
import { useToast } from '../hooks';

export default function InviteVisitor() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('14:00');
  const [purpose, setPurpose] = useState('guest');
  const [notes, setNotes] = useState('');
  const [isCreated, setIsCreated] = useState(false);
  const [passId, setPassId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const generatedId = `PASS-${Math.floor(1000 + Math.random() * 9000)}`;
    setPassId(generatedId);
    setIsCreated(true);
    showToast('Visitor pass generated', 'success');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'GreenGate Visitor Pass',
        text: `Visitor Pass for ${name} at Green Valley Residency (Flat A-402) on ${date} at ${time}.`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      showToast('Pass details copied to clipboard', 'info');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 relative min-h-0">
      <AppHeader
        title={isCreated ? 'Visitor Pass Ready' : 'Invite Visitor'}
        showBack
        onBack={() => {
          if (isCreated) {
            setIsCreated(false);
          } else {
            navigate(-1);
          }
        }}
      />

      <AnimatePresence mode="wait">
        {!isCreated ? (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <PageContainer className="space-y-4 pt-3 pb-28">
              {/* Group 1: Visitor Identity */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 mb-1.5 block">
                  Guest Information
                </span>
                <div className="bg-white rounded-2xl border border-slate-200/60 p-4 space-y-3 shadow-2xs">
                  <Input
                    label="Visitor Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    required
                    autoFocus
                  />
                  <Input
                    label="Mobile Number (Optional)"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98765 00000"
                    prefix={<span className="text-slate-600 font-semibold text-xs mr-1">+91</span>}
                  />
                </div>
              </div>

              {/* Group 2: Timing */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 mb-1.5 block">
                  Schedule
                </span>
                <div className="bg-white rounded-2xl border border-slate-200/60 p-4 grid grid-cols-2 gap-3 shadow-2xs">
                  <Input
                    label="Visit Date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                  <Input
                    label="Expected Time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Group 3: Purpose & Instructions */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 mb-1.5 block">
                  Details
                </span>
                <div className="bg-white rounded-2xl border border-slate-200/60 p-4 space-y-3 shadow-2xs">
                  <Select
                    label="Purpose of Visit"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    options={[
                      { value: 'guest', label: 'Guest / Personal Visit' },
                      { value: 'delivery', label: 'Parcel / Food Delivery' },
                      { value: 'maintenance', label: 'Home Repair / Service' },
                      { value: 'cab', label: 'Cab / Ride Pickup' },
                      { value: 'other', label: 'Other' },
                    ]}
                  />
                  <Input
                    label="Instructions for Guard (Optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Park in visitor slot V-4"
                  />
                </div>
              </div>
            </PageContainer>

            {/* Sticky Bottom Action Bar (Native Mobile CTA) */}
            <div className="sticky bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-4 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.04)] z-30">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={!name.trim()}
                className="h-12 font-bold text-sm rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-md shadow-indigo-600/25"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Create Visitor Pass
              </Button>
            </div>
          </form>
        ) : (
          <PageContainer className="space-y-4 pt-3 pb-8">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-4"
            >
              {/* Success Badge */}
              <div className="flex flex-col items-center text-center pt-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 ring-4 ring-emerald-100">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Pass Ready to Share</h2>
                <p className="text-xs text-slate-500">
                  Your guest can show this QR pass at Gate 1 for 1-tap fast entry.
                </p>
              </div>

              {/* Digital Pass Card */}
              <VisitorPassCard
                visitor={{
                  name,
                  date,
                  time,
                  id: passId,
                }}
              />

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleShare}
                  className="h-13 font-bold text-sm rounded-xl"
                  icon={<Share2 className="w-4 h-4" />}
                >
                  Share Pass with Visitor
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => navigate('/visitors')}
                  className="rounded-xl"
                >
                  Done
                </Button>
              </div>
            </motion.div>
          </PageContainer>
        )}
      </AnimatePresence>
    </div>
  );
}

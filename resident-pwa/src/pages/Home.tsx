import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, UsersRound, Heart, Car } from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { PageContainer } from '../components/layout/PageContainer';
import {
  VisitorApprovalCard,
  VisitorApprovalSheet,
  VisitorCard,
  QuickActionButton,
  AnnouncementCard,
  SecurityStatusCard,
  FloatingActionButton,
} from '../components/domain';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { useToast } from '../hooks';
import { getPendingVisitors, getRecentVisitors } from '../data/mockVisitors';
import { mockAnnouncements } from '../data/mockAnnouncements';
import { fetchVisitorRequests, approveVisitorRequest, rejectVisitorRequest } from '../services/api';
import { initResidentSocket, disconnectResidentSocket } from '../services/socket';
import { authSession } from '../services/authSession';
import type { Visitor } from '../types';

export default function Home() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentUser = authSession.getUser();
  const residentId = currentUser?.id || 'res_sahil';

  const [pendingVisitors, setPendingVisitors] = useState<Visitor[]>([]);
  const [realRecentVisitors, setRealRecentVisitors] = useState<Visitor[]>([]);
  const [selectedVisitorForSheet, setSelectedVisitorForSheet] = useState<Visitor | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject';
    visitor: Visitor;
  } | null>(null);

  // Load from API + Real-time Socket Setup
  useEffect(() => {
    const loadRequests = () => {
      fetchVisitorRequests().then((apiData) => {
        if (apiData && Array.isArray(apiData)) {
          const pending = apiData
            .filter((item: any) => item.status === 'PENDING')
            .map((item: any) => ({
              id: item.id,
              name: item.visitor?.name || 'Visitor',
              phone: item.visitor?.mobile,
              photoUrl: item.visitor?.photoUrl,
              photo: item.visitor?.photoUrl || item.visitor?.photo,
              purpose: item.visitor?.purpose || 'personal',
              status: 'pending' as const,
              gate: item.gate || 'Main Gate',
              flatNumber: item.flatNumber || currentUser?.flat || 'A-402',
              requestedAt: new Date(item.requestedAt),
            }))
            .sort((a: any, b: any) => b.requestedAt.getTime() - a.requestedAt.getTime());
          setPendingVisitors(pending);

          const nonPending = apiData
            .filter((item: any) => item.status !== 'PENDING')
            .map((item: any) => ({
              id: item.id,
              name: item.visitor?.name || 'Visitor',
              phone: item.visitor?.mobile,
              photoUrl: item.visitor?.photoUrl,
              photo: item.visitor?.photoUrl || item.visitor?.photo,
              purpose: item.visitor?.purpose || 'personal',
              status: (item.status === 'COMPLETED' ? 'entered' : item.status).toLowerCase() as any,
              gate: item.gate || 'Main Gate',
              flatNumber: item.flatNumber || currentUser?.flat || 'A-402',
              requestedAt: new Date(item.requestedAt),
            }))
            .sort((a: any, b: any) => b.requestedAt.getTime() - a.requestedAt.getTime());
          setRealRecentVisitors(nonPending);
        }
      });
    };

    loadRequests();
    const interval = setInterval(loadRequests, 3000);

    // 2. Real-time Socket Connection
    initResidentSocket(
      residentId,
      () => {
        loadRequests();
      },
      () => {
        loadRequests();
      }
    );

    return () => {
      clearInterval(interval);
    };
  }, [residentId]);

  const handleAllow = async (id: string) => {
    try {
      await approveVisitorRequest(id);
      showToast('Visitor access granted successfully', 'success');
    } catch (e) {
      showToast('Approved locally', 'success');
    }
    setPendingVisitors((prev) => prev.filter((v) => v.id !== id));
  };

  const handleReject = async (id: string) => {
    const visitor = pendingVisitors.find((v) => v.id === id);
    try {
      await rejectVisitorRequest(id, 'Entry denied by resident');
      showToast(`Access denied for ${visitor?.name || 'visitor'}`, 'error');
    } catch (e) {
      showToast(`Access denied for ${visitor?.name || 'visitor'}`, 'error');
    }
    setPendingVisitors((prev) => prev.filter((v) => v.id !== id));
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, visitor } = confirmAction;
    setConfirmAction(null);
    if (type === 'approve') {
      await handleAllow(visitor.id);
    } else {
      await handleReject(visitor.id);
    }
  };

  const recentVisitors = realRecentVisitors.length > 0 ? realRecentVisitors : getRecentVisitors();

  return (
    <div className="flex-1 flex flex-col bg-slate-50 relative min-h-0">
      {/* Native Compact Mobile App Header */}
      <AppHeader isHome />

      <PageContainer className="space-y-4 pt-3 pb-24">
        {/* Section 1: Urgent Gate Notification & Visitor Approval */}
        <AnimatePresence>
          {pendingVisitors.length > 0 && (
            <motion.section
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              {/* Prominent Live Notification Bar */}
              <div className="bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 p-0.5 rounded-2xl shadow-md">
                <div className="bg-white/95 backdrop-blur-sm p-3 rounded-[14px] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate">
                        Gate Entry Alert: <span className="text-rose-600">{pendingVisitors[0].name}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium truncate">
                        Waiting at {pendingVisitors[0].gate} · Action Required
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 flex-shrink-0">
                    {pendingVisitors.length} Waiting
                  </span>
                </div>
              </div>

              {/* Pending Approval Cards */}
              <div className="space-y-3">
                {pendingVisitors.map((visitor) => (
                  <VisitorApprovalCard
                    key={visitor.id}
                    visitor={visitor}
                    onAllow={() => setConfirmAction({ type: 'approve', visitor })}
                    onReject={() => setConfirmAction({ type: 'reject', visitor })}
                    onOpenDetails={() => setSelectedVisitorForSheet(visitor)}
                  />
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Section 2: Quick Actions (Native 4-column App Grid) */}
        <section>
          <div className="grid grid-cols-4 gap-1.5 bg-white p-2 rounded-2xl border border-slate-200/60 shadow-2xs">
            <QuickActionButton
              icon={UserPlus}
              label="Invite Visitor"
              onClick={() => navigate('/invite-visitor')}
            />
            <QuickActionButton
              icon={UsersRound}
              label="Visitors"
              onClick={() => navigate('/visitors')}
            />
            <QuickActionButton
              icon={Heart}
              label="Family"
              onClick={() => navigate('/family')}
            />
            <QuickActionButton
              icon={Car}
              label="Vehicles"
              onClick={() => navigate('/vehicles')}
            />
          </div>
        </section>

        {/* Section 3: Recent Visitors (Compact Mobile Activity Log) */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Recent Visitors
            </h2>
            <button
              onClick={() => navigate('/visitors')}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 active:opacity-70 transition-opacity"
            >
              View All
            </button>
          </div>

          <div className="space-y-2">
            {recentVisitors.slice(0, 3).map((visitor) => (
              <VisitorCard
                key={visitor.id}
                visitor={visitor}
              />
            ))}
          </div>
        </section>

        {/* Section 4: Security & Society Status Header */}
        <section>
          <SecurityStatusCard />
        </section>

        {/* Section 5: Society Announcements */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Society Announcements
            </h2>
          </div>
          <div className="space-y-2">
            {mockAnnouncements.slice(0, 2).map((announcement) => (
              <AnnouncementCard key={announcement.id} announcement={announcement} />
            ))}
          </div>
        </section>
      </PageContainer>

      {/* Floating Action Button */}
      <FloatingActionButton onClick={() => navigate('/invite-visitor')} />

      {/* Visitor Approval Bottom Sheet */}
      <VisitorApprovalSheet
        isOpen={Boolean(selectedVisitorForSheet)}
        visitor={selectedVisitorForSheet}
        onClose={() => setSelectedVisitorForSheet(null)}
        onAllow={(id) => {
          handleAllow(id);
          setSelectedVisitorForSheet(null);
        }}
        onReject={(id) => {
          handleReject(id);
          setSelectedVisitorForSheet(null);
        }}
      />

      {/* Allow / Reject Confirmation Dialog on Home Page */}
      <ConfirmationDialog
        isOpen={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.type === 'approve' ? 'Approve Visitor Entry?' : 'Deny Visitor Entry?'}
        message={
          confirmAction?.type === 'approve'
            ? `Are you sure you want to approve entry for ${confirmAction?.visitor.name}? Security will be notified to allow them through the gate.`
            : `Are you sure you want to deny entry for ${confirmAction?.visitor.name}? Security will be instructed not to let them in.`
        }
        confirmLabel={confirmAction?.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
        cancelLabel="Cancel"
        confirmVariant={confirmAction?.type === 'approve' ? 'success' : 'danger'}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}

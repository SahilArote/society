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
import { useToast } from '../hooks';
import { getPendingVisitors, getRecentVisitors } from '../data/mockVisitors';
import { mockAnnouncements } from '../data/mockAnnouncements';
import { fetchVisitorRequests, approveVisitorRequest, rejectVisitorRequest } from '../services/api';
import { initResidentSocket, disconnectResidentSocket } from '../services/socket';
import type { Visitor } from '../types';

export default function Home() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [pendingVisitors, setPendingVisitors] = useState<Visitor[]>(getPendingVisitors());
  const [selectedVisitorForSheet, setSelectedVisitorForSheet] = useState<Visitor | null>(null);

  // Load from API + Real-time Socket Setup
  useEffect(() => {
    // 1. Initial Fetch from API
    fetchVisitorRequests().then((apiData) => {
      if (apiData && Array.isArray(apiData) && apiData.length > 0) {
        const pending = apiData.filter((item: any) => item.status === 'PENDING').map((item: any) => ({
          id: item.id,
          name: item.visitor?.name || 'Visitor',
          phone: item.visitor?.mobile,
          photoUrl: item.visitor?.photoUrl,
          photo: item.visitor?.photoUrl || item.visitor?.photo,
          purpose: item.visitor?.purpose || 'personal',
          status: 'pending' as const,
          gate: item.gate || 'Main Gate',
          flatNumber: item.flatNumber || 'A-402',
          requestedAt: new Date(item.requestedAt),
        }));
        if (pending.length > 0) {
          setPendingVisitors(pending);
        }
      }
    });

    // 2. Real-time Socket Connection
    const socket = initResidentSocket(
      'res_sahil',
      (newVisitorData) => {
        const v = newVisitorData.visitor || {};
        const req = newVisitorData.request || {};
        const newVisitor: Visitor = {
          id: req.id || `REQ-${Date.now()}`,
          name: v.name || 'Visitor',
          phone: v.mobile,
          photoUrl: v.photoUrl,
          photo: v.photoUrl,
          purpose: v.purpose || 'personal',
          status: 'pending',
          gate: 'Main Gate',
          flatNumber: newVisitorData.flatNumber || 'A-402',
          requestedAt: new Date(),
        };

        setPendingVisitors((prev) => [newVisitor, ...prev.filter((p) => p.id !== newVisitor.id)]);
        showToast(`🔔 New Visitor at Gate: ${newVisitor.name}`, 'info');
      },
      (updatedData) => {
        if (updatedData.status !== 'PENDING') {
          setPendingVisitors((prev) => prev.filter((v) => v.id !== updatedData.requestId));
        }
      }
    );

    return () => {
      // Keep socket open or cleanup on unmount
    };
  }, []);

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

  const recentVisitors = getRecentVisitors();

  return (
    <div className="flex-1 flex flex-col bg-slate-50 relative min-h-0">
      {/* Native Compact Mobile App Header */}
      <AppHeader isHome />

      <PageContainer className="space-y-4 pt-3 pb-24">
        {/* Section 1: Urgent Visitor Approval (Highest Visual Priority) */}
        <AnimatePresence>
          {pendingVisitors.length > 0 && (
            <motion.section
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <VisitorApprovalCard
                visitor={pendingVisitors[0]}
                onAllow={() => handleAllow(pendingVisitors[0].id)}
                onReject={() => handleReject(pendingVisitors[0].id)}
                onOpenDetails={() => setSelectedVisitorForSheet(pendingVisitors[0])}
              />
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
    </div>
  );
}

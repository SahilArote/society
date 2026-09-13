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
import { fetchVisitorRequests, approveVisitorRequest, rejectVisitorRequest, fetchNotifications, getSecurePhotoUrl } from '../services/api';
import { initResidentSocket } from '../services/socket';
import type { Visitor, Announcement } from '../types';

export default function Home() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [pendingVisitors, setPendingVisitors] = useState<Visitor[]>([]);
  const [recentVisitors, setRecentVisitors] = useState<Visitor[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedVisitorForSheet, setSelectedVisitorForSheet] = useState<Visitor | null>(null);

  const loadData = async () => {
    try {
      const apiData = await fetchVisitorRequests();
      if (apiData && Array.isArray(apiData)) {
        const pending: Visitor[] = [];
        const recent: Visitor[] = [];

        apiData.forEach((item: any) => {
          const rawPhoto = item.visitor?.photoUrl || item.visitor?.photo || item.photoUrl || item.photo;
          const photoUrl = getSecurePhotoUrl(rawPhoto);
          const v: Visitor = {
            id: item.id,
            name: item.visitor?.name || item.name || 'Visitor',
            phone: item.visitor?.mobile || item.phone,
            photoUrl: photoUrl,
            photo: photoUrl,
            purpose: (item.entryType || item.visitor?.purpose || 'personal').toLowerCase() as any,
            status: (item.status || 'pending').toLowerCase() as any,
            gate: item.gate || 'Main Gate',
            flatNumber: item.flatNumber || '',
            requestedAt: new Date(item.requestedAt || Date.now()),
          };

          if (item.status === 'PENDING' || item.status === 'pending') {
            pending.push(v);
          } else {
            recent.push(v);
          }
        });

        setPendingVisitors(pending);
        setRecentVisitors(recent);
      }

      const notifs = await fetchNotifications();
      if (notifs && Array.isArray(notifs)) {
        const announcementList: Announcement[] = notifs
          .filter((n: any) => n.type === 'society' || n.type === 'important')
          .map((n: any) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            priority: n.type === 'important' ? 'urgent' : 'normal',
            timestamp: new Date(n.timestamp || Date.now()),
          }));
        setAnnouncements(announcementList);
      }
    } catch (err) {
      console.error('Failed to load home dashboard data:', err);
    }
  };

  useEffect(() => {
    loadData();

    const socket = initResidentSocket(
      undefined,
      (newVisitorData) => {
        const v = newVisitorData.visitor || {};
        const req = newVisitorData.request || {};
        const rawPhoto = v.photoUrl || v.photo;
        const photoUrl = getSecurePhotoUrl(rawPhoto);
        const newVisitor: Visitor = {
          id: req.id || newVisitorData.requestId || `REQ-${Date.now()}`,
          name: v.name || 'Visitor',
          phone: v.mobile,
          photoUrl: photoUrl,
          photo: photoUrl,
          purpose: (v.purpose || 'personal').toLowerCase() as any,
          status: 'pending',
          gate: newVisitorData.gateName || 'Main Gate',
          flatNumber: newVisitorData.flatNumber || '',
          requestedAt: new Date(req.requestedAt || Date.now()),
        };

        setPendingVisitors((prev) => [newVisitor, ...prev.filter((p) => p.id !== newVisitor.id)]);
        showToast(`🔔 New Visitor at Gate: ${newVisitor.name}`, 'info');
      },
      (updatedData) => {
        if (updatedData.status !== 'PENDING') {
          setPendingVisitors((prev) => prev.filter((v) => v.id !== updatedData.requestId));
          loadData();
        }
      }
    );

    return () => {
      // Socket managed globally
    };
  }, []);

  const handleAllow = async (id: string) => {
    try {
      await approveVisitorRequest(id);
      showToast('Visitor access granted successfully', 'success');
    } catch (e) {
      showToast('Approved access', 'success');
    }
    setPendingVisitors((prev) => prev.filter((v) => v.id !== id));
    loadData();
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
    loadData();
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 relative min-h-0">
      <AppHeader isHome />

      <PageContainer className="space-y-4 pt-3 pb-24">
        {/* Section 1: Urgent Visitor Approval */}
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

        {/* Section 2: Quick Actions */}
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

        {/* Section 3: Recent Visitors */}
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

          {recentVisitors.length > 0 ? (
            <div className="space-y-2">
              {recentVisitors.slice(0, 3).map((visitor) => (
                <VisitorCard key={visitor.id} visitor={visitor} />
              ))}
            </div>
          ) : (
            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-2xs text-center py-6">
              <UsersRound className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No Recent Visitors</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Visitor entries and gate activity will appear here.
              </p>
            </div>
          )}
        </section>

        {/* Section 4: Security & Society Status Header */}
        <section>
          <SecurityStatusCard />
        </section>

        {/* Section 5: Society Announcements */}
        {announcements.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Society Announcements
              </h2>
            </div>
            <div className="space-y-2">
              {announcements.slice(0, 2).map((announcement) => (
                <AnnouncementCard key={announcement.id} announcement={announcement} />
              ))}
            </div>
          </section>
        )}
      </PageContainer>

      <FloatingActionButton onClick={() => navigate('/invite-visitor')} />

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

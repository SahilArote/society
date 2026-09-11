import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UsersRound, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppHeader } from '../components/layout/AppHeader';
import { PageContainer } from '../components/layout/PageContainer';
import { VisitorCard, FloatingActionButton } from '../components/domain';
import { EmptyState } from '../components/ui/EmptyState';
import { fetchVisitorRequests } from '../services/api';
import type { Visitor } from '../types';

type TabType = 'upcoming' | 'recent' | 'all';

export default function Visitors() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [liveVisitors, setLiveVisitors] = useState<Visitor[]>([]);

  useEffect(() => {
    const load = () => {
      fetchVisitorRequests().then((data) => {
        if (data && Array.isArray(data)) {
          const mapped: Visitor[] = data.map((item: any) => ({
            id: item.id,
            name: item.visitor?.name || 'Visitor',
            phone: item.visitor?.mobile,
            photoUrl: item.visitor?.photoUrl,
            photo: item.visitor?.photoUrl || item.visitor?.photo,
            purpose: item.visitor?.purpose || 'personal',
            status: (item.status === 'COMPLETED' ? 'entered' : item.status).toLowerCase(),
            gate: item.gate || 'Main Gate',
            flatNumber: item.flatNumber || 'A-402',
            requestedAt: new Date(item.requestedAt),
            vehicleNumber: item.visitor?.vehicleNumber,
            isPreApproved: item.status === 'APPROVED',
          }));

          mapped.sort((a, b) => {
            const tA = a.requestedAt instanceof Date ? a.requestedAt.getTime() : new Date(a.requestedAt).getTime();
            const tB = b.requestedAt instanceof Date ? b.requestedAt.getTime() : new Date(b.requestedAt).getTime();
            return tB - tA;
          });

          setLiveVisitors(mapped);
        }
      });
    };

    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, []);

  const filteredVisitors = useMemo(() => {
    return liveVisitors.filter((visitor: Visitor) => {
      // Tab matching
      if (activeTab === 'upcoming') {
        const isUpcoming = (visitor.isPreApproved && visitor.status === 'approved') || visitor.status === 'pending';
        if (!isUpcoming) return false;
      } else if (activeTab === 'recent') {
        const isRecent = visitor.status === 'entered' || visitor.status === 'exited' || visitor.status === 'rejected';
        if (!isRecent) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          visitor.name.toLowerCase().includes(q) ||
          visitor.purpose.toLowerCase().includes(q) ||
          visitor.status.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [liveVisitors, activeTab, searchQuery]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 relative min-h-0">
      <AppHeader
        title="Visitors"
        subtitle="Gate entry passes & records"
        rightAction={
          <button
            onClick={() => {
              setIsSearchOpen((prev) => !prev);
              if (isSearchOpen) setSearchQuery('');
            }}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100/80 text-slate-700 hover:bg-slate-200/80 active:scale-95 transition-all tap-target focus:outline-none"
            aria-label="Search visitors"
          >
            {isSearchOpen ? <X className="w-4 h-4 text-slate-700" /> : <Search className="w-4 h-4 text-slate-700" />}
          </button>
        }
      />

      <PageContainer className="space-y-3 pt-3 pb-24">
        {/* Subtle Expandable Search Bar */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search visitor name or purpose..."
                  className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200/80 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  autoFocus
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compact Segmented Control Tabs */}
        <div className="flex bg-slate-200/60 p-1 rounded-xl w-full select-none">
          {(['upcoming', 'recent', 'all'] as TabType[]).map((tab) => {
            const labelMap = { upcoming: 'Upcoming', recent: 'Recent', all: 'All Passes' };
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors focus:outline-none tap-target ${
                  isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="visitorSegmentedTab"
                    className="absolute inset-0 bg-white rounded-lg shadow-2xs"
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  />
                )}
                <span className="relative z-10">{labelMap[tab]}</span>
              </button>
            );
          })}
        </div>

        {/* Visitor Cards List */}
        {filteredVisitors.length > 0 ? (
          <div className="space-y-2 pt-0.5">
            {filteredVisitors.map((visitor) => (
              <VisitorCard key={visitor.id} visitor={visitor} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={UsersRound}
            title={searchQuery ? 'No visitors found' : 'No visitor records'}
            description={
              searchQuery
                ? `No visitor matches "${searchQuery}".`
                : activeTab === 'upcoming'
                ? 'No upcoming guest arrivals. Create a visitor pass for instant entry.'
                : 'Visitor entry and exit activity logs will appear here.'
            }
            actionLabel="Invite Visitor"
            onAction={() => navigate('/invite-visitor')}
          />
        )}
      </PageContainer>

      <FloatingActionButton />
    </div>
  );
}

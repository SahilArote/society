import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Users, Eye, Clock, Shield, DoorOpen,
  AlertTriangle, CheckCircle2, XCircle, ChevronRight,
  Activity, Megaphone, ArrowUpRight, Car, Package, Wrench,
  Sparkles, UserPlus, BellRing, BarChart2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
  fetchAdminStats,
  fetchAdminActivity,
  fetchAdminGates,
  approveAdminVisitor,
  denyAdminVisitor,
  fetchAdminEvents
} from '../services/api';
import { initAdminSocket } from '../services/socket';
import StatCard from '../components/StatCard';

/* ── Recharts Custom Tooltip ─────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, fontSize: 11 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.fill || p.stroke, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize', fontSize: 11 }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Visitor Badge ────────────────────────────────────────── */
function VisitorBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:  'badge badge-warning',
    inside:   'badge badge-success',
    exited:   'badge badge-muted',
    approved: 'badge badge-info',
    denied:   'badge badge-danger',
    expired:  'badge badge-muted',
  };
  const labels: Record<string, string> = {
    pending: 'Pending', inside: 'Inside', exited: 'Exited',
    approved: 'Approved', denied: 'Denied', expired: 'Expired',
  };
  return <span className={map[status] ?? 'badge badge-muted'}>{labels[status] ?? status}</span>;
}

/* ── Purpose Icon ─────────────────────────────────────────── */
const purposeMap: Record<string, { icon: React.ElementType; color: string }> = {
  guest:       { icon: Users,   color: 'var(--accent-light)' },
  delivery:    { icon: Package, color: 'var(--amber)' },
  maintenance: { icon: Wrench,  color: 'var(--sky)' },
  cab:         { icon: Car,     color: 'var(--green)' },
  other:       { icon: Eye,     color: 'var(--text-secondary)' },
};

/* ── Priority Badge ───────────────────────────────────────── */
function PriorityBadge({ p }: { p: string }) {
  const map: Record<string, string> = {
    urgent:    'badge badge-danger',
    important: 'badge badge-warning',
    normal:    'badge badge-muted',
  };
  return <span className={map[p] ?? 'badge badge-muted'}>{p}</span>;
}

/* ── Gate Status Dot ──────────────────────────────────────── */
function GateDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    operational: 'dot-operational',
    maintenance: 'dot-maintenance',
    offline:     'dot-offline',
  };
  return <span className={`status-dot ${map[status] ?? 'dot-offline'}`} />;
}

/* ── Main Dashboard ───────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [visitorsList, setVisitorsList] = useState<any[]>([]);
  const [gatesList, setGatesList] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const s = stats || {
    totalFlats: 0,
    occupiedFlats: 0,
    vacantFlats: 0,
    occupancyRate: 0,
    totalResidents: 0,
    totalFamily: 0,
    visitorsToday: 0,
    insideToday: 0,
    exitedToday: 0,
    flaggedToday: 0,
    avgEntryTime: '—',
    pendingApprovals: 0,
    approvedCount: 0,
    rejectedCount: 0,
    activeGuards: 0,
    totalGuards: 0,
    operationalGates: 0,
    totalGates: 0,
    pendingRegistrations: 0,
    visitorTrend: [],
    monthlyTrend: [],
    maintenanceAmount: 0,
    maintenanceDueDay: 5,
    billingCycle: 'MONTHLY',
  };

  useEffect(() => {
    // 1. Fetch Real Database Data
    Promise.all([
      fetchAdminStats(),
      fetchAdminActivity(),
      fetchAdminGates(),
      fetchAdminEvents('upcoming').catch(() => []),
    ])
      .then(([st, acts, gts, evts]) => {
        if (st) setStats(st);
        if (acts && Array.isArray(acts)) {
          setVisitorsList(acts.map((item: any) => ({
            id: item.id,
            name: item.visitorName || 'Visitor',
            purpose: (item.purpose || item.visitorType || 'guest') as any,
            status: (item.status || 'pending').toLowerCase() as any,
            flatNumber: item.flatNumber || '—',
            residentName: item.residentName || 'Resident',
            gate: item.gateName || 'Gate',
            guardName: item.guardName || 'Security',
            requestedAt: new Date(item.requestedAt || Date.now()),
            isFlagged: (item.status || '').toLowerCase() === 'rejected' || Boolean(item.rejectionReason),
          })));
        }
        if (gts && Array.isArray(gts)) {
          setGatesList(gts);
        }
        if (evts && Array.isArray(evts)) {
          setEventsList(evts);
        }
      })
      .catch((err) => {
        console.error('Error fetching dashboard live data:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    // 2. Real-time Activity Listener via Socket.IO
    const socket = initAdminSocket((activityEvent) => {
      showToast(`⚡ Realtime Event: ${activityEvent.visitorName || 'Visitor'} is ${activityEvent.status || activityEvent.type}`);

      setVisitorsList((prev) => {
        const existingIdx = prev.findIndex((v) => v.id === activityEvent.requestId);
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            status: (activityEvent.status || 'pending').toLowerCase() as any,
          };
          return updated;
        }

        const newVisitor: any = {
          id: activityEvent.requestId || `REQ-${Date.now()}`,
          name: activityEvent.visitorName || 'Visitor',
          purpose: (activityEvent.purpose || 'guest') as any,
          status: (activityEvent.status || 'pending').toLowerCase() as any,
          flatNumber: activityEvent.flatNumber || '—',
          residentName: activityEvent.residentName || 'Resident',
          gate: activityEvent.gateName || 'Gate',
          guardName: activityEvent.guardName || 'Security',
          requestedAt: new Date(),
          isFlagged: (activityEvent.status || '').toLowerCase() === 'rejected',
        };
        return [newVisitor, ...prev];
      });

      // Refresh stats on new realtime activity
      fetchAdminStats().then((st) => st && setStats(st));
    });

    return () => {
      // keep connection active
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleApprove = async (id: string) => {
    try {
      await approveAdminVisitor(id);
      setVisitorsList(prev => prev.map(v => v.id === id ? { ...v, status: 'inside', enteredAt: new Date() } : v));
      showToast('Visitor approved & granted entry at barrier');
      const updatedStats = await fetchAdminStats();
      if (updatedStats) setStats(updatedStats);
    } catch (err: any) {
      showToast(err.message || 'Failed to approve visitor');
    }
  };

  const handleDeny = async (id: string) => {
    try {
      await denyAdminVisitor(id, 'Admin entry clearance denied');
      setVisitorsList(prev => prev.map(v => v.id === id ? { ...v, status: 'denied' } : v));
      showToast('Visitor entry denied');
      const updatedStats = await fetchAdminStats();
      if (updatedStats) setStats(updatedStats);
    } catch (err: any) {
      showToast(err.message || 'Failed to deny visitor');
    }
  };

  const recentVisitors = [...visitorsList]
    .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())
    .slice(0, 8);

  const pendingCount = visitorsList.filter(v => v.status === 'pending').length || s.pendingApprovals || 0;
  const insideCount = s.insideToday ?? visitorsList.filter(v => v.status === 'inside').length;
  const exitedCount = s.exitedToday ?? visitorsList.filter(v => v.status === 'exited').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Toast Alert */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed', top: 76, right: 24, zIndex: 999,
              background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
              borderRadius: 'var(--r-md)', padding: '10px 18px',
              display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <CheckCircle2 size={16} color="var(--accent)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stat Cards ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard
          icon={Home}
          label="Total Flats"
          value={s.totalFlats}
          pill={{
            text: `${s.totalFlats > 0 ? Math.round((s.occupiedFlats / s.totalFlats) * 100) : 0}% Occupied`,
            color: 'var(--green)',
            bg: 'var(--green-bg)',
          }}
          sub={`${s.occupiedFlats} occupied · ${s.vacantFlats} vacant`}
          accentColor="var(--accent)"
          bgColor="var(--accent-bg)"
          delay={0}
          onClick={() => navigate('/residents')}
        />
        <StatCard
          icon={Users}
          label="Residents"
          value={s.totalResidents + (s.totalFamily || 0)}
          pill={s.pendingRegistrations > 0
            ? {
                text: `${s.pendingRegistrations} Pending Reg.`,
                color: 'var(--amber)',
                bg: 'var(--amber-bg)',
              }
            : {
                text: 'Directory Active',
                color: 'var(--purple)',
                bg: 'var(--purple-bg)',
              }
          }
          sub={`${s.totalResidents} primary · ${s.totalFamily || 0} family members`}
          accentColor="var(--purple)"
          bgColor="var(--purple-bg)"
          delay={0.06}
          onClick={() => navigate('/residents')}
        />
        <StatCard
          icon={Eye}
          label="Visitors Today"
          value={s.visitorsToday}
          pill={{
            text: insideCount > 0
              ? `● ${insideCount} on premises`
              : '● Gate Live',
            color: 'var(--sky)',
            bg: 'var(--sky-bg)',
          }}
          sub={`${insideCount} on premises · ${exitedCount} exited`}
          accentColor="var(--sky)"
          bgColor="var(--sky-bg)"
          delay={0.12}
          onClick={() => navigate('/visitors')}
        />
        {(() => {
          const pendingVisitors = visitorsList.filter(v => v.status === 'pending');
          const oldestPending = pendingVisitors[0];
          const pendingSub = pendingCount > 0
            ? (oldestPending ? `${oldestPending.name} (${oldestPending.flatNumber}) waiting` : `${pendingCount} awaiting clearance`)
            : 'All gate clearances up to date';

          return (
            <StatCard
              icon={Clock}
              label="Pending Approvals"
              value={pendingCount}
              pill={pendingCount > 0
                ? { text: `⚡ ${pendingCount} Action Req.`, color: 'var(--amber)', bg: 'var(--amber-bg)' }
                : { text: 'All Clear ✓', color: 'var(--green)', bg: 'var(--green-bg)' }
              }
              sub={pendingSub}
              accentColor={pendingCount > 0 ? 'var(--amber)' : 'var(--green)'}
              bgColor={pendingCount > 0 ? 'var(--amber-bg)' : 'var(--green-bg)'}
              delay={0.18}
              onClick={() => pendingCount > 0 && navigate('/visitors')}
            />
          );
        })()}
      </div>

      {/* ── Quick Administrative Shortcuts Bar ──────────────── */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg, var(--bg-card) 0%, rgba(99,102,241,0.06) 100%)',
          flexWrap: 'wrap',
          gap: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={15} color="var(--accent-light)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Quick Launch</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/community')}
            className="btn-secondary"
            style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          >
            <Megaphone size={13} color="var(--accent-light)" /> Notice & Events
          </button>

          <button
            onClick={() => navigate('/residents')}
            className="btn-secondary"
            style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          >
            <UserPlus size={13} color="var(--green)" /> Enroll Flat
          </button>

          <button
            onClick={() => navigate('/notifications')}
            className="btn-secondary"
            style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          >
            <BellRing size={13} color="var(--amber)" /> Broadcast Push
          </button>

          <button
            onClick={() => navigate('/gates')}
            className="btn-secondary"
            style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          >
            <DoorOpen size={13} color="var(--sky)" /> Gate Barriers & CCTV
          </button>

          <button
            onClick={() => navigate('/reports')}
            className="btn-secondary"
            style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          >
            <BarChart2 size={13} color="var(--purple)" /> Reports
          </button>
        </div>
      </motion.div>

      {/* ── Charts Row ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

        {/* Visitor Trend */}
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
          <div className="card-ph" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Visitor Trends</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last 7 days by visitor type</p>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              {[['var(--accent-light)', 'Guest'], ['var(--amber)', 'Delivery'], ['var(--sky)', 'Service'], ['var(--green)', 'Cab']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: c, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: '16px 16px 12px' }}>
            <ResponsiveContainer width="100%" height={188}>
              <BarChart data={s.visitorTrend || []} barSize={7} barGap={2} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--accent-bg)', radius: 4 }} />
                <Bar dataKey="guests"      fill="var(--accent-light)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="deliveries"  fill="var(--amber)"        radius={[3, 3, 0, 0]} />
                <Bar dataKey="services"    fill="var(--sky)"          radius={[3, 3, 0, 0]} />
                <Bar dataKey="cabs"        fill="var(--green)"        radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Occupancy & Monthly Volume */}
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
          <div className="card-ph">
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Occupancy & Volume</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Society flats & monthly entries</p>
          </div>
          <div style={{ padding: '20px 16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Circular progress */}
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <svg width="110" height="110" viewBox="0 0 110 110">
                <circle cx="55" cy="55" r="44" fill="none" stroke="var(--bg-elevated)" strokeWidth="9" />
                <circle cx="55" cy="55" r="44" fill="none" stroke="url(#progressGrad)" strokeWidth="9"
                  strokeDasharray={`${2 * Math.PI * 44 * Math.min(100, Math.max(0, s.occupancyRate)) / 100} ${2 * Math.PI * 44}`}
                  strokeLinecap="round" transform="rotate(-90 55 55)"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.5))' }}
                />
                <defs>
                  <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#818CF8" />
                    <stop offset="100%" stopColor="#A855F7" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 1 }}>
                  {s.occupancyRate}%
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Occupied</span>
              </div>
            </div>

            {/* Mini area chart */}
            <ResponsiveContainer width="100%" height={72}>
              <AreaChart data={s.monthlyTrend && s.monthlyTrend.length > 0 ? s.monthlyTrend : [{ month: 'Past', total: 0 }, { month: 'Current', total: 0 }]}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="total" stroke="var(--accent-light)" strokeWidth={2}
                  fill="url(#areaGrad)" dot={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
              </AreaChart>
            </ResponsiveContainer>

            {/* Maintenance billing info */}
            <div style={{
              width: '100%',
              marginTop: 10,
              padding: '10px 14px',
              borderRadius: 'var(--r-md)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Maintenance
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                  ₹{Number(s.maintenanceAmount || 0).toLocaleString('en-IN')}{s.maintenanceAmount ? ` / ${s.billingCycle?.toLowerCase() || 'mo'}` : ''}
                </span>
              </div>
              <span className="badge badge-info" style={{ fontSize: 10 }}>
                Due {s.maintenanceDueDay || 5}th
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Live Activity + Gate Status ────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

        {/* Live Visitor Table */}
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
          <div className="card-ph" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={15} color="var(--accent-light)" />
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Live Gate Activity</p>
            </div>
            <button onClick={() => navigate('/visitors')} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              View All <ArrowUpRight size={12} />
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Visitor</th>
                  <th>Flat</th>
                  <th>Purpose</th>
                  <th>Gate</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentVisitors.length > 0 ? (
                  recentVisitors.map(v => {
                    const { icon: PIcon, color: pColor } = purposeMap[v.purpose] ?? purposeMap.other;
                    return (
                      <tr key={v.id} style={v.isFlagged ? { background: 'rgba(239,68,68,0.03)' } : {}}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="avatar avatar-sm" style={{ background: `linear-gradient(135deg, ${pColor}80, ${pColor}40)` }}>
                              {v.name[0]}
                            </div>
                            <div>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                {v.name}
                                {v.isFlagged && <AlertTriangle size={11} color="var(--red)" />}
                              </div>
                              {v.phone && <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{v.phone}</div>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{v.flatNumber}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{v.residentName}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <PIcon size={13} color={pColor} />
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{v.purpose}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v.gate}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {v.requestedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <VisitorBadge status={v.status} />
                            {v.status === 'pending' && (
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                  onClick={() => handleApprove(v.id)}
                                  className="btn-icon btn-icon-green"
                                  style={{ width: 24, height: 24 }}
                                  title="Approve Entry"
                                >
                                  <CheckCircle2 size={12} />
                                </button>
                                <button
                                  onClick={() => handleDeny(v.id)}
                                  className="btn-icon btn-icon-red"
                                  style={{ width: 24, height: 24 }}
                                  title="Deny Entry"
                                >
                                  <XCircle size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                      <Clock size={24} style={{ opacity: 0.35, margin: '0 auto 8px' }} />
                      <p style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-secondary)' }}>No visitor activity logged today</p>
                      <p style={{ fontSize: 11 }}>Live arrivals and barrier events will appear here in real time</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Right column: Gate Status + Notices & Events */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Gate Status */}
          <motion.div className="card card-p" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <DoorOpen size={14} color="var(--accent-light)" />
                <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>Gate Status</p>
              </div>
              <button onClick={() => navigate('/gates')} className="btn-ghost" style={{ padding: '4px 6px' }}>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Gate list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gatesList.length > 0 ? (
                gatesList.map(gate => (
                  <div key={gate.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 'var(--r-md)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                  }}>
                    <GateDot status={(gate.status || 'operational').toLowerCase()} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{gate.name}</p>
                      <p style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                        {gate.status?.toLowerCase() === 'maintenance' ? '🔧 Under maintenance' : `${gate.visitorsToday || 0} visitors today`}
                      </p>
                    </div>
                    <span className={`badge ${gate.status?.toLowerCase() === 'operational' ? 'badge-success' : gate.status?.toLowerCase() === 'maintenance' ? 'badge-warning' : 'badge-danger'}`}
                      style={{ fontSize: 9.5 }}>
                      {gate.status?.toLowerCase() === 'operational' ? 'OK' : gate.status?.toLowerCase() === 'maintenance' ? 'Maint.' : 'Offline'}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{
                  padding: '16px 12px', borderRadius: 'var(--r-md)',
                  background: 'var(--bg-elevated)', border: '1px dashed var(--border)',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>No gates registered yet.</p>
                </div>
              )}
            </div>

            {/* Mini stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 12 }}>
              {[
                { icon: CheckCircle2, label: 'Approved', val: s.approvedCount || 0, color: 'var(--green)' },
                { icon: Clock,        label: 'Pending',  val: s.pendingApprovals || 0, color: 'var(--amber)' },
                { icon: XCircle,      label: 'Denied',   val: s.rejectedCount || 0,  color: 'var(--red)' },
              ].map(({ icon: Icon, label, val, color }) => (
                <div key={label} style={{
                  textAlign: 'center', padding: '10px 6px',
                  borderRadius: 'var(--r-md)', background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                }}>
                  <Icon size={14} color={color} style={{ margin: '0 auto 4px' }} />
                  <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{val}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Notices & Events */}
          <motion.div className="card card-p" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Megaphone size={14} color="var(--accent-light)" />
                <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>Notices & Events</p>
              </div>
              <button onClick={() => navigate('/community')} className="btn-ghost" style={{ padding: '4px 6px' }}>
                <ChevronRight size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {eventsList.length > 0 ? (
                eventsList.slice(0, 2).map((evt: any) => (
                  <div
                    key={evt.id}
                    onClick={() => navigate('/community')}
                    style={{
                      padding: '10px 12px', borderRadius: 'var(--r-md)',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{evt.title}</p>
                      {evt.category && <span className="badge badge-muted" style={{ fontSize: 9.5 }}>{evt.category}</span>}
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      {evt.eventDate ? new Date(evt.eventDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : ''}
                      {evt.location ? ` · ${evt.location}` : ''}
                    </p>
                  </div>
                ))
              ) : (
                <div style={{
                  padding: '16px 12px', borderRadius: 'var(--r-md)',
                  background: 'var(--bg-elevated)', border: '1px dashed var(--border)',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>No upcoming notices or events posted.</p>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/community')}
              id="post-new-notice-btn"
              style={{
                width: '100%', marginTop: 12,
                padding: '9px 0', borderRadius: 'var(--r-md)',
                background: 'var(--accent-bg)',
                border: '1px dashed var(--border-accent)',
                color: 'var(--accent-light)',
                fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              + Post New Event / Notice
            </button>
          </motion.div>
        </div>
      </div>

      {/* ── Security Summary ────────────────────────────────── */}
      <motion.div className="card card-p" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Shield size={15} color="var(--accent-light)" />
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Security Summary — Today</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[
            {
              label: 'Guards on Duty',
              value: `${s.activeGuards || 0} / ${s.totalGuards || s.activeGuards || 0}`,
              icon: Shield,
              color: 'var(--accent-light)',
              bg: 'var(--accent-bg)',
            },
            {
              label: 'Gates Operational',
              value: `${s.operationalGates || 0} / ${s.totalGates || s.operationalGates || 0}`,
              icon: DoorOpen,
              color: 'var(--green)',
              bg: 'var(--green-bg)',
            },
            {
              label: 'Flagged Entries',
              value: String(s.flaggedToday ?? s.rejectedCount ?? 0),
              icon: AlertTriangle,
              color: (s.flaggedToday ?? s.rejectedCount ?? 0) > 0 ? 'var(--red)' : 'var(--text-muted)',
              bg: (s.flaggedToday ?? s.rejectedCount ?? 0) > 0 ? 'var(--red-bg)' : 'var(--bg-card)',
            },
            {
              label: 'Avg. Entry Turnaround',
              value: s.avgEntryTime || '—',
              icon: Clock,
              color: 'var(--amber)',
              bg: 'var(--amber-bg)',
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 'var(--r-md)',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            }}>
              <div style={{ padding: 9, borderRadius: 'var(--r-sm)', background: bg, flexShrink: 0 }}>
                <Icon size={16} color={color} />
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

    </div>
  );
}

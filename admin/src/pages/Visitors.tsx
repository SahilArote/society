import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, AlertTriangle, Users, Package, Wrench, Car, Eye,
  CheckCircle2, XCircle, Clock, Download, QrCode, Phone, ShieldCheck,
  Building, LogOut, X, Share2, Printer
} from 'lucide-react';
import { mockVisitors } from '../data/mockData';
import { fetchAdminActivity } from '../services/api';
import { initAdminSocket } from '../services/socket';
import type { AdminVisitor } from '../types';
import StatCard, { CircularGauge } from '../components/StatCard';

type Tab = 'live' | 'today' | 'history';

const purposeCfg: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  guest:       { icon: Users,   color: 'var(--accent-light)', label: 'Guest' },
  delivery:    { icon: Package, color: 'var(--amber)',        label: 'Delivery' },
  maintenance: { icon: Wrench,  color: 'var(--sky)',          label: 'Service' },
  cab:         { icon: Car,     color: 'var(--green)',         label: 'Cab' },
  other:       { icon: Eye,     color: 'var(--text-secondary)', label: 'Other' },
};

function VBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'badge badge-warning', inside: 'badge badge-success',
    exited: 'badge badge-muted', approved: 'badge badge-info',
    denied: 'badge badge-danger', expired: 'badge badge-muted',
  };
  const labels: Record<string, string> = {
    pending: 'Pending', inside: 'Inside', exited: 'Exited',
    approved: 'Approved', denied: 'Denied', expired: 'Expired',
  };
  return <span className={map[status] ?? 'badge badge-muted'}>{labels[status] ?? status}</span>;
}

function fmt(d: Date | string | undefined) {
  if (!d) return '—';
  const dateObj = d instanceof Date ? d : new Date(d);
  return dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function Visitors() {
  const [visitors, setVisitors] = useState<AdminVisitor[]>(mockVisitors);
  const [tab, setTab] = useState<Tab>('today');
  const [search, setSearch] = useState('');
  const [gate, setGate] = useState('all');
  const [purpose, setPurpose] = useState('all');
  const [selectedVisitor, setSelectedVisitor] = useState<AdminVisitor | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  useEffect(() => {
    fetchAdminActivity().then((apiActivity) => {
      if (apiActivity && apiActivity.length > 0) {
        const mapped: AdminVisitor[] = apiActivity.map((item: any) => ({
          id: item.id,
          name: item.visitorName,
          phone: item.visitorPhone || '',
          purpose: (item.purpose || 'guest') as any,
          status: (item.status === 'COMPLETED' ? 'inside' : item.status || 'pending').toLowerCase() as any,
          flatNumber: item.flatNumber,
          residentName: item.residentName,
          gate: item.gateName || 'Main Gate',
          guardName: 'Ramesh Singh',
          requestedAt: new Date(item.requestedAt || Date.now()),
          enteredAt: item.enteredAt ? new Date(item.enteredAt) : (item.status === 'COMPLETED' ? new Date(item.requestedAt) : undefined),
          exitedAt: item.exitedAt ? new Date(item.exitedAt) : undefined,
        }));
        setVisitors((prev) => [...mapped, ...prev]);
      }
    });

    const socket = initAdminSocket((activityEvent) => {
      showToast(`⚡ Realtime Event: ${activityEvent.visitorName || 'Visitor'} is ${activityEvent.status || activityEvent.type}`);
      setVisitors((prev) => {
        const existingIdx = prev.findIndex((v) => v.id === activityEvent.requestId);
        const resolvedStatus = (activityEvent.status === 'COMPLETED' ? 'inside' : activityEvent.status || 'pending').toLowerCase() as any;
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            status: resolvedStatus,
            enteredAt: resolvedStatus === 'inside' ? (updated[existingIdx].enteredAt || new Date()) : updated[existingIdx].enteredAt,
          };
          return updated;
        }

        const newV: AdminVisitor = {
          id: activityEvent.requestId || `REQ-${Date.now()}`,
          name: activityEvent.visitorName || 'New Visitor',
          phone: activityEvent.visitorPhone || '',
          purpose: (activityEvent.purpose || 'guest') as any,
          status: resolvedStatus,
          flatNumber: activityEvent.flatNumber || 'A-101',
          residentName: activityEvent.residentName || 'Resident',
          gate: activityEvent.gateName || 'Main Gate',
          guardName: 'Ramesh Singh',
          requestedAt: new Date(),
          enteredAt: resolvedStatus === 'inside' ? new Date() : undefined,
        };
        return [newV, ...prev];
      });
    });
  }, []);

  const handleApprove = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setVisitors(prev => prev.map(v => v.id === id ? { ...v, status: 'inside', enteredAt: new Date() } : v));
    showToast('Visitor approved & granted gate entry');
    if (selectedVisitor?.id === id) {
      setSelectedVisitor(prev => prev ? { ...prev, status: 'inside', enteredAt: new Date() } : null);
    }
  };

  const handleDeny = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setVisitors(prev => prev.map(v => v.id === id ? { ...v, status: 'denied' } : v));
    showToast('Visitor entry denied');
    if (selectedVisitor?.id === id) {
      setSelectedVisitor(prev => prev ? { ...prev, status: 'denied' } : null);
    }
  };

  const handleMarkExited = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setVisitors(prev => prev.map(v => v.id === id ? { ...v, status: 'exited', exitedAt: new Date() } : v));
    showToast('Visitor marked exited from gate');
    if (selectedVisitor?.id === id) {
      setSelectedVisitor(prev => prev ? { ...prev, status: 'exited', exitedAt: new Date() } : null);
    }
  };

  const exportCSV = () => {
    const headers = ['Name,Phone,Flat,Resident,Purpose,Gate,Guard,EnteredAt,ExitedAt,Status,Vehicle'];
    const rows = visitors.map(v => [
      `"${v.name}"`,
      `"${v.phone || ''}"`,
      `"${v.flatNumber}"`,
      `"${v.residentName}"`,
      `"${v.purpose}"`,
      `"${v.gate}"`,
      `"${v.guardName}"`,
      `"${v.enteredAt ? new Date(v.enteredAt).toLocaleString() : ''}"`,
      `"${v.exitedAt ? new Date(v.exitedAt).toLocaleString() : ''}"`,
      `"${v.status}"`,
      `"${v.vehicleNumber || 'None'}"`
    ].join(','));

    const blob = new Blob([[...headers, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GreenGate_Visitors_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded visitors export CSV');
  };

  const filtered = visitors.filter(v => {
    if (tab === 'live' && !['pending', 'inside'].includes(v.status)) return false;
    if (tab === 'history' && !['exited', 'denied', 'expired'].includes(v.status)) return false;
    if (gate !== 'all' && v.gate !== gate) return false;
    if (purpose !== 'all' && v.purpose !== purpose) return false;
    return v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.flatNumber.toLowerCase().includes(search.toLowerCase()) ||
      v.residentName.toLowerCase().includes(search.toLowerCase());
  });

  const liveCount = visitors.filter(v => ['pending', 'inside'].includes(v.status)).length;
  const insideCount = visitors.filter(v => v.status === 'inside').length;
  const pendingCount = visitors.filter(v => v.status === 'pending').length;
  const deniedCount = visitors.filter(v => v.status === 'denied').length;

  const stats = [
    { label: 'Total Today',      val: visitors.length, icon: Users,         color: 'var(--accent-light)', bg: 'var(--accent-bg)' },
    { label: 'Currently Inside', val: insideCount,      icon: CheckCircle2,  color: 'var(--green)',        bg: 'var(--green-bg)' },
    { label: 'Pending Approval', val: pendingCount,     icon: Clock,         color: 'var(--amber)',        bg: 'var(--amber-bg)' },
    { label: 'Denied Entries',   val: deniedCount,      icon: XCircle,       color: 'var(--red)',          bg: 'var(--red-bg)' },
  ];

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

      {/* Top Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        <StatCard
          icon={Users}
          label="Total Today"
          value={visitors.length}
          pill={{ text: 'Live Gates', color: 'var(--sky)', bg: 'var(--sky-bg)' }}
          sub={`${insideCount} inside · ${visitors.filter(v => v.status === 'exited').length} exited`}
          accentColor="var(--accent)"
          bgColor="var(--accent-bg)"
          delay={0}
        />

        <StatCard
          icon={CheckCircle2}
          label="Currently Inside"
          value={insideCount}
          pill={{ text: 'Verified Guests', color: 'var(--green)', bg: 'var(--green-bg)' }}
          sub="Flats A-102, B-204 on premises"
          accentColor="var(--green)"
          bgColor="var(--green-bg)"
          delay={0.06}
        />

        <StatCard
          icon={Clock}
          label="Pending Approval"
          value={pendingCount}
          pill={pendingCount > 0
            ? { text: '⚡ 1 Action Req.', color: 'var(--amber)', bg: 'var(--amber-bg)' }
            : { text: 'All Clear ✓', color: 'var(--green)', bg: 'var(--green-bg)' }
          }
          sub={pendingCount > 0 ? 'Gate 1: Rohan Mehta (B-204)' : 'No queue at gate barriers'}
          accentColor="var(--amber)"
          bgColor="var(--amber-bg)"
          delay={0.12}
          onClick={() => setTab('live')}
        />

        <StatCard
          icon={XCircle}
          label="Denied Entries"
          value={deniedCount}
          pill={{ text: 'Guarded', color: 'var(--red)', bg: 'var(--red-bg)' }}
          sub="Unconfirmed visitor rejected"
          accentColor="var(--red)"
          bgColor="var(--red-bg)"
          delay={0.18}
        />
      </div>

      {/* Tabs + Filter Bar */}
      <motion.div className="card card-p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div className="tab-bar">
            {([['live', 'Live Now', liveCount], ['today', 'All Today', visitors.length], ['history', 'History', null]] as const).map(([k, l, c]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                id={`visitor-tab-${k}`}
                className={`tab-btn${tab === k ? ' active' : ''}`}
              >
                {l}
                {c !== null && <span className="tab-count">{c}</span>}
              </button>
            ))}
          </div>

          <button
            id="export-csv-btn"
            onClick={exportCSV}
            className="btn-success"
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          >
            <Download size={13} /> Export CSV Log
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search visitor, phone, flat, or host resident..."
              className="field-input"
              style={{ paddingLeft: 36 }}
              id="visitors-search"
            />
          </div>

          <select value={gate} onChange={e => setGate(e.target.value)} className="field-select" style={{ width: 'auto' }} id="gate-filter">
            <option value="all">All Gates</option>
            <option value="Main Gate">Main Gate</option>
            <option value="East Gate">East Gate</option>
            <option value="Service Gate">Service Gate</option>
          </select>

          <select value={purpose} onChange={e => setPurpose(e.target.value)} className="field-select" style={{ width: 'auto' }} id="purpose-filter">
            <option value="all">All Purposes</option>
            <option value="guest">Guest</option>
            <option value="delivery">Delivery</option>
            <option value="maintenance">Service & Maintenance</option>
            <option value="cab">Cab / Taxi</option>
          </select>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Flat / Resident</th>
                <th>Purpose</th>
                <th>Gate · Guard</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => {
                const { icon: PIco, color: pCol, label: pLbl } = purposeCfg[v.purpose] ?? purposeCfg.other;
                return (
                  <tr
                    key={v.id}
                    onClick={() => setSelectedVisitor(v)}
                    style={{
                      cursor: 'pointer',
                      background: v.isFlagged ? 'rgba(239,68,68,0.04)' : undefined,
                    }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar avatar-sm" style={{ background: `linear-gradient(135deg, ${pCol}80, ${pCol}30)` }}>
                          {v.name[0]}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{v.name}</span>
                            {v.isFlagged && (
                              <span title="Security Alert Flagged" style={{ display: 'inline-flex', alignItems: 'center' }}>
                                <AlertTriangle size={12} color="var(--red)" />
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                            {v.phone && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.phone}</span>}
                            {v.vehicleNumber && (
                              <span style={{
                                fontSize: 10, color: 'var(--accent-light)',
                                background: 'var(--accent-bg)', padding: '1px 6px',
                                borderRadius: 4, fontFamily: 'monospace'
                              }}>
                                {v.vehicleNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{v.flatNumber}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.residentName}</div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <PIco size={13} color={pCol} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{pLbl}</span>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v.gate}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.guardName}</div>
                    </td>

                    <td>
                      {v.enteredAt ? (
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {fmt(v.enteredAt)}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>

                    <td>
                      {v.exitedAt ? (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmt(v.exitedAt)}</div>
                      ) : v.status === 'inside' ? (
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>Still inside</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>

                    <td>
                      <VBadge status={v.status} />
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {v.status === 'pending' && (
                          <>
                            <button
                              onClick={(e) => handleApprove(v.id, e)}
                              id={`approve-${v.id}`}
                              className="btn-icon btn-icon-green"
                              title="Approve Entry"
                              style={{ width: 28, height: 28 }}
                            >
                              <CheckCircle2 size={13} />
                            </button>
                            <button
                              onClick={(e) => handleDeny(v.id, e)}
                              id={`deny-${v.id}`}
                              className="btn-icon btn-icon-red"
                              title="Deny Entry"
                              style={{ width: 28, height: 28 }}
                            >
                              <XCircle size={13} />
                            </button>
                          </>
                        )}
                        {v.status === 'inside' && (
                          <button
                            onClick={(e) => handleMarkExited(v.id, e)}
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <LogOut size={11} /> Exit
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedVisitor(v); }}
                          className="btn-icon"
                          title="View Digital Pass"
                          style={{ width: 28, height: 28 }}
                        >
                          <QrCode size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="empty-state">
            <Users size={40} className="empty-state-icon" />
            <p className="empty-state-text">No visitors match this criteria</p>
          </div>
        )}
      </motion.div>

      {/* Digital VIP Visitor Gate Pass Modal */}
      <AnimatePresence>
        {selectedVisitor && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedVisitor(null); }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              style={{
                width: '100%',
                maxWidth: 440,
                background: 'var(--bg-surface)',
                borderRadius: 'var(--r-xl)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-xl)',
                overflow: 'hidden'
              }}
            >
              {/* Header banner */}
              <div style={{
                background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
                padding: '20px 24px',
                position: 'relative',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <ShieldCheck size={20} color="#fff" />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent-light)', textTransform: 'uppercase' }}>
                        GreenGate Security
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Digital Gate Pass</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedVisitor(null)}
                    className="btn-icon"
                    style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', width: 28, height: 28 }}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>
                    PASS #{selectedVisitor.id.toUpperCase()}-2026
                  </span>
                  <VBadge status={selectedVisitor.status} />
                </div>
              </div>

              {/* Pass Body */}
              <div style={{ padding: '24px' }}>
                {/* QR Code preview block */}
                <div style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--r-lg)',
                  padding: 18,
                  border: '1px dashed var(--border-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  marginBottom: 20
                }}>
                  <div style={{
                    width: 80, height: 80,
                    background: '#fff',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                  }}>
                    {/* Simulated visual QR Code matrix */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3, width: 62, height: 62 }}>
                      {Array.from({ length: 25 }).map((_, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: [0,1,2,4,5,6,10,12,14,18,20,21,22,24].includes(idx) ? '#0B0F19' : 'transparent',
                            borderRadius: 2
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {selectedVisitor.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      Purpose: <b style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{selectedVisitor.purpose}</b>
                    </div>
                    {selectedVisitor.vehicleNumber && (
                      <div style={{
                        marginTop: 6, display: 'inline-block',
                        fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                        background: 'rgba(99,102,241,0.15)', color: 'var(--accent-light)',
                        padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(99,102,241,0.3)'
                      }}>
                        🚗 {selectedVisitor.vehicleNumber}
                      </div>
                    )}
                  </div>
                </div>

                {/* Info Fields Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 'var(--r-md)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Destination Flat</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                      {selectedVisitor.flatNumber}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{selectedVisitor.residentName}</div>
                  </div>

                  <div style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 'var(--r-md)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Check-in Gate</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                      {selectedVisitor.gate}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Guard: {selectedVisitor.guardName}</div>
                  </div>

                  <div style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 'var(--r-md)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Entered At</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                      {fmt(selectedVisitor.enteredAt)}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 'var(--r-md)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Exit Time</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                      {selectedVisitor.exitedAt ? fmt(selectedVisitor.exitedAt) : (selectedVisitor.status === 'inside' ? 'Active' : '—')}
                    </div>
                  </div>
                </div>

                {/* Actions bottom bar */}
                <div style={{ display: 'flex', gap: 10 }}>
                  {selectedVisitor.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleApprove(selectedVisitor.id)}
                        className="btn-success"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <CheckCircle2 size={15} /> Grant Entry
                      </button>
                      <button
                        onClick={() => handleDeny(selectedVisitor.id)}
                        className="btn-secondary"
                        style={{ flex: 1, justifyContent: 'center', borderColor: 'var(--red)', color: 'var(--red)' }}
                      >
                        <XCircle size={15} /> Deny Entry
                      </button>
                    </>
                  ) : selectedVisitor.status === 'inside' ? (
                    <button
                      onClick={() => handleMarkExited(selectedVisitor.id)}
                      className="btn-secondary"
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <LogOut size={15} /> Mark Exited at Barrier
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedVisitor(null)}
                      className="btn-secondary"
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      Close Pass
                    </button>
                  )}
                  <button
                    onClick={() => showToast('Pass link copied to clipboard')}
                    className="btn-icon"
                    title="Share Pass"
                    style={{ height: 42, width: 42 }}
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

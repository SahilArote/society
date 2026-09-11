import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Phone, Mail, Car, Users, Home,
  Building2, AlertCircle, CheckCircle2, X, Download,
  UserPlus, MessageSquare, CreditCard, ShieldCheck, Plus
} from 'lucide-react';
import { mockFlats } from '../data/mockData';
import { fetchDirectoryFlats } from '../services/api';
import type { Flat, FlatResident as Resident } from '../types';
import StatCard, { CircularGauge } from '../components/StatCard';

/* ── Badges ──────────────────────────────────────────────── */
function MaintBadge({ s }: { s: string }) {
  const cls = s === 'paid' ? 'badge badge-success' : s === 'due' ? 'badge badge-warning' : 'badge badge-danger';
  return <span className={cls}>{s === 'paid' ? 'Paid' : s === 'due' ? 'Due' : 'Overdue'}</span>;
}
function StatusBadge({ s }: { s: string }) {
  const cls = s === 'occupied' ? 'badge badge-success' : s === 'vacant' ? 'badge badge-muted' : 'badge badge-danger';
  return <span className={cls}>{s === 'occupied' ? 'Occupied' : s === 'vacant' ? 'Vacant' : 'Locked'}</span>;
}

/* ── Flat Detail Panel ───────────────────────────────────── */
function FlatPanel({
  flat,
  onClose,
  onMarkPaid,
  onSendNotice
}: {
  flat: Flat;
  onClose: () => void;
  onMarkPaid: (flatId: string) => void;
  onSendNotice: (flatNumber: string) => void;
}) {
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 220 }}
      className="side-panel anim-slide-right"
    >
      <div className="side-panel-header">
        <div>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            Flat {flat.number}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Wing {flat.wing} · Floor {flat.floor} · {flat.type}
          </p>
        </div>
        <button className="btn-icon" onClick={onClose}><X size={15} /></button>
      </div>

      <div className="side-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Status pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatusBadge s={flat.status} />
          <MaintBadge s={flat.maintenanceStatus} />
          {flat.maintenanceDueAmount && (
            <span className="badge badge-danger">₹{flat.maintenanceDueAmount.toLocaleString()} due</span>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: Users, label: 'Members', val: flat.residents.length, color: 'var(--accent-light)', bg: 'var(--accent-bg)' },
            { icon: Car,   label: 'Vehicles', val: flat.vehicleCount,    color: 'var(--green)', bg: 'var(--green-bg)' },
          ].map(({ icon: Icon, label, val, color, bg }) => (
            <div key={label} style={{ padding: '14px 12px', borderRadius: 'var(--r-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <div style={{ padding: 8, borderRadius: 'var(--r-sm)', background: bg }}>
                  <Icon size={16} color={color} />
                </div>
              </div>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{val}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Residents list */}
        <div>
          <p className="section-label">Registered Members ({flat.residents.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {flat.residents.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                Flat is currently vacant. No members enrolled.
              </p>
            ) : flat.residents.map(r => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 'var(--r-md)',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              }}>
                <div className="avatar avatar-sm" style={{ background: 'var(--accent-bg)', color: 'var(--accent-light)' }}>
                  {r.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</span>
                    {r.isOwner && <span className="badge badge-accent" style={{ fontSize: 9.5 }}>Owner</span>}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 1 }}>
                    {r.role} · {r.phone}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <a href={`tel:${r.phone}`} className="btn-icon btn-icon-green" style={{ width: 28, height: 28 }} title={`Call ${r.name}`}>
                    <Phone size={12} />
                  </a>
                  {r.email && (
                    <a href={`mailto:${r.email}`} className="btn-icon btn-icon-accent" style={{ width: 28, height: 28 }} title={`Email ${r.name}`}>
                      <Mail size={12} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <p className="section-label">Administrative Actions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => onSendNotice(flat.number)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 14px', borderRadius: 'var(--r-md)',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ padding: 6, borderRadius: 'var(--r-sm)', background: 'var(--accent-bg)' }}>
                <Mail size={14} color="var(--accent-light)" />
              </div>
              Send Direct Alert to Flat {flat.number}
            </button>

            <button
              disabled={flat.maintenanceStatus === 'paid'}
              onClick={() => onMarkPaid(flat.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 14px', borderRadius: 'var(--r-md)',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: flat.maintenanceStatus === 'paid' ? 'var(--text-muted)' : 'var(--text-primary)',
                fontSize: 13, fontWeight: 500,
                cursor: flat.maintenanceStatus === 'paid' ? 'not-allowed' : 'pointer',
                opacity: flat.maintenanceStatus === 'paid' ? 0.4 : 1,
                textAlign: 'left',
              }}
            >
              <div style={{ padding: 6, borderRadius: 'var(--r-sm)', background: 'var(--green-bg)' }}>
                <CheckCircle2 size={14} color="var(--green)" />
              </div>
              {flat.maintenanceStatus === 'paid' ? 'Maintenance Already Settled' : 'Mark Maintenance as Paid (Cash / Cheque)'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main Page ────────────────────────────────────────────── */
export default function Residents() {
  const [flats, setFlats] = useState<Flat[]>(mockFlats);
  const [search, setSearch] = useState('');
  const [wing, setWing] = useState('all');
  const [status, setStatus] = useState('all');
  const [maint, setMaint] = useState('all');
  const [selected, setSelected] = useState<Flat | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showAddFlat, setShowAddFlat] = useState(false);

  useEffect(() => {
    fetchDirectoryFlats().then((apiFlats) => {
      if (apiFlats && apiFlats.length > 0) {
        const mapped: Flat[] = apiFlats.map((f: any) => ({
          id: f.id,
          number: f.flatNumber,
          wing: f.buildingWing || f.wing || 'A',
          floor: f.floor || parseInt(f.flatNumber?.replace(/\D/g, '').slice(0, 1)) || 1,
          type: (f.flatType || '2BHK') as any,
          status: (f.status || 'occupied').toLowerCase() as any,
          vehicleCount: f.vehicleCount || 1,
          maintenanceStatus: (f.maintenanceStatus || 'paid').toLowerCase() as any,
          maintenanceDueAmount: f.maintenanceDueAmount,
          residents: (f.residents || []).map((r: any) => ({
            id: r.id,
            name: r.name,
            phone: r.phone || r.phoneNumber || '',
            email: r.email || '',
            role: (r.role || 'Resident').toLowerCase() as any,
            isOwner: r.isOwner ?? true,
          })),
        }));
        setFlats(mapped);
      }
    });
  }, []);

  // New Flat Form State
  const [newNumber, setNewNumber] = useState('');
  const [newWing, setNewWing] = useState('A');
  const [newType, setNewType] = useState('2BHK');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleMarkPaid = (flatId: string) => {
    setFlats(prev => prev.map(f => f.id === flatId ? { ...f, maintenanceStatus: 'paid', maintenanceDueAmount: undefined } : f));
    if (selected?.id === flatId) {
      setSelected(prev => prev ? { ...prev, maintenanceStatus: 'paid', maintenanceDueAmount: undefined } : null);
    }
    showToast('Maintenance marked as Paid and receipt generated');
  };

  const handleSendNotice = (flatNum: string) => {
    showToast(`Notice alert dispatched to Flat ${flatNum}`);
  };

  const exportDirectory = () => {
    const headers = ['Flat,Wing,Type,Status,OwnerName,Phone,Vehicles,MaintenanceStatus,DueAmount'];
    const rows = flats.map(f => {
      const owner = f.residents.find(r => r.isOwner) ?? f.residents[0];
      return [
        `"${f.number}"`,
        `"${f.wing}"`,
        `"${f.type}"`,
        `"${f.status}"`,
        `"${owner ? owner.name : 'Vacant'}"`,
        `"${owner ? owner.phone : ''}"`,
        `"${f.vehicleCount}"`,
        `"${f.maintenanceStatus}"`,
        `"${f.maintenanceDueAmount || 0}"`
      ].join(',');
    });

    const blob = new Blob([[...headers, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GreenGate_Residents_Directory_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded residents directory CSV');
  };

  const handleAddFlat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber || !newOwnerName) return;
    const newF: Flat = {
      id: `flat-${newNumber.toLowerCase()}`,
      number: newNumber.toUpperCase(),
      wing: newWing,
      floor: parseInt(newNumber.slice(1, 2)) || 1,
      type: newType as any,
      status: 'occupied',
      residents: [
        {
          id: `res-${Date.now()}`,
          name: newOwnerName,
          phone: newOwnerPhone || '+91 98000 00000',
          role: 'owner',
          isOwner: true,
        }
      ],
      vehicleCount: 1,
      maintenanceStatus: 'paid',
    };
    setFlats(prev => [newF, ...prev]);
    setShowAddFlat(false);
    setNewNumber('');
    setNewOwnerName('');
    setNewOwnerPhone('');
    showToast(`Enrolled Flat ${newF.number} with owner ${newOwnerName}`);
  };

  const filtered = flats.filter(f => {
    const sr = f.number.toLowerCase().includes(search.toLowerCase()) ||
               f.residents.some(r => r.name.toLowerCase().includes(search.toLowerCase()));
    return sr &&
      (wing === 'all' || f.wing === wing) &&
      (status === 'all' || f.status === status) &&
      (maint === 'all' || f.maintenanceStatus === maint);
  });

  const stats = [
    { label: 'Total Flats',     val: flats.length,                                         icon: Building2,   color: 'var(--accent-light)', bg: 'var(--accent-bg)', pill: 'Society Total', sub: '120 planned units', progress: 100 },
    { label: 'Occupied',        val: flats.filter(f => f.status === 'occupied').length,     icon: Home,        color: 'var(--green)',        bg: 'var(--green-bg)', pill: `${Math.round((flats.filter(f => f.status === 'occupied').length/flats.length)*100)}% Occupancy`, sub: 'Active resident members', progress: Math.round((flats.filter(f => f.status === 'occupied').length/flats.length)*100) },
    { label: 'Vacant',          val: flats.filter(f => f.status === 'vacant').length,       icon: Home,        color: 'var(--text-secondary)', bg: 'var(--bg-elevated)', pill: 'Available', sub: 'Ready for possession', progress: Math.round((flats.filter(f => f.status === 'vacant').length/flats.length)*100) },
    { label: 'Maintenance Due', val: flats.filter(f => f.maintenanceStatus !== 'paid').length, icon: AlertCircle, color: 'var(--red)',         bg: 'var(--red-bg)', pill: 'Action Req.', sub: 'Overdue notices queued', progress: Math.round((flats.filter(f => f.maintenanceStatus !== 'paid').length/flats.length)*100) },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Toast */}
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

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        <StatCard
          icon={Building2}
          label="Total Flats"
          value={flats.length}
          pill={{ text: 'Society Total', color: 'var(--accent)', bg: 'var(--accent-bg)' }}
          sub="120 planned units in society"
          accentColor="var(--accent)"
          bgColor="var(--accent-bg)"
          delay={0}
        />

        <StatCard
          icon={Home}
          label="Occupied"
          value={flats.filter(f => f.status === 'occupied').length}
          pill={{
            text: `${Math.round((flats.filter(f => f.status === 'occupied').length / flats.length) * 100)}% Occupancy`,
            color: 'var(--green)',
            bg: 'var(--green-bg)',
          }}
          sub="Active resident families residing"
          accentColor="var(--green)"
          bgColor="var(--green-bg)"
          delay={0.06}
        />

        <StatCard
          icon={Users}
          label="Vacant Units"
          value={flats.filter(f => f.status === 'vacant').length}
          pill={{ text: 'Available', color: 'var(--sky)', bg: 'var(--sky-bg)' }}
          sub="14 Wing A · 8 Wing B ready"
          accentColor="var(--sky)"
          bgColor="var(--sky-bg)"
          delay={0.12}
        />

        <StatCard
          icon={AlertCircle}
          label="Maintenance Due"
          value={flats.filter(f => f.maintenanceStatus !== 'paid').length}
          pill={{ text: '⚡ Action Req.', color: 'var(--red)', bg: 'var(--red-bg)' }}
          sub="₹24.5K overdue notices queued"
          accentColor="var(--red)"
          bgColor="var(--red-bg)"
          delay={0.18}
          onClick={() => setMaint('due')}
        />
      </div>

      {/* Action bar + Filters */}
      <motion.div className="card card-p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 12, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Flat Directory</span>
            <span className="badge badge-muted">{filtered.length} of {flats.length} flats</span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={exportDirectory}
              className="btn-secondary"
              style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            >
              <Download size={13} /> Export Directory (.CSV)
            </button>
            <button
              onClick={() => setShowAddFlat(true)}
              className="btn-primary"
              style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            >
              <UserPlus size={13} /> Enroll Flat / Resident
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search flat number, resident name..."
              className="field-input"
              style={{ paddingLeft: 36 }}
              id="residents-search"
            />
          </div>
          {[
            { val: wing,   set: setWing,   opts: [['all','All Wings'],['A','Wing A'],['B','Wing B'],['C','Wing C'],['D','Wing D']], id: 'wing-filter' },
            { val: status, set: setStatus, opts: [['all','All Status'],['occupied','Occupied'],['vacant','Vacant']], id: 'status-filter' },
            { val: maint,  set: setMaint,  opts: [['all','All Maintenance'],['paid','Paid'],['due','Due'],['overdue','Overdue']], id: 'maint-filter' },
          ].map(({ val, set, opts, id }) => (
            <select
              key={id}
              value={val}
              onChange={e => set(e.target.value)}
              className="field-select"
              id={id}
              style={{ width: 'auto' }}
            >
              {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Flat Number</th>
                <th>Owner / Key Resident</th>
                <th>Unit Configuration</th>
                <th>Vehicles</th>
                <th>Maintenance Dues</th>
                <th>Occupancy Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(flat => {
                const owner = flat.residents.find(r => r.isOwner) ?? flat.residents[0];
                return (
                  <tr key={flat.id}>
                    <td>
                      <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{flat.number}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Wing {flat.wing} · Floor {flat.floor}</p>
                    </td>
                    <td>
                      {owner ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div className="avatar avatar-sm" style={{ background: 'var(--accent-bg)', color: 'var(--accent-light)' }}>
                            {owner.name[0]}
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{owner.name}</p>
                            <p style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                              {flat.residents.length > 1 ? `+${flat.residents.length - 1} family members` : 'Primary resident'}
                            </p>
                          </div>
                        </div>
                      ) : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Vacant Unit</span>}
                    </td>
                    <td><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{flat.type}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Car size={13} color="var(--text-muted)" />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{flat.vehicleCount}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MaintBadge s={flat.maintenanceStatus} />
                        {flat.maintenanceDueAmount && (
                          <span style={{ fontSize: 11.5, color: 'var(--red)', fontWeight: 700 }}>
                            ₹{flat.maintenanceDueAmount.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td><StatusBadge s={flat.status} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setSelected(flat)}
                        id={`view-flat-${flat.id}`}
                        className="btn-secondary"
                        style={{ padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}
                      >
                        Inspect Flat
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="empty-state">
            <Home size={40} className="empty-state-icon" />
            <p className="empty-state-text">No flats match your filters</p>
          </div>
        )}
      </motion.div>

      {/* Detail Slide-in Panel */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="panel-overlay"
              onClick={() => setSelected(null)}
            />
            <FlatPanel
              flat={selected}
              onClose={() => setSelected(null)}
              onMarkPaid={handleMarkPaid}
              onSendNotice={handleSendNotice}
            />
          </>
        )}
      </AnimatePresence>

      {/* Add Flat Modal */}
      <AnimatePresence>
        {showAddFlat && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={e => e.target === e.currentTarget && setShowAddFlat(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 20 }}
              style={{
                width: '100%', maxWidth: 440,
                background: 'var(--bg-card)',
                borderRadius: 'var(--r-xl)',
                border: '1px solid var(--border-accent)',
                overflow: 'hidden'
              }}
            >
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building2 size={16} color="var(--accent-light)" />
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Enroll New Flat & Resident</span>
                </div>
                <button className="btn-icon" onClick={() => setShowAddFlat(false)}><X size={14} /></button>
              </div>

              <form onSubmit={handleAddFlat} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="field-label">Flat Number *</label>
                    <input
                      value={newNumber}
                      onChange={e => setNewNumber(e.target.value)}
                      required
                      placeholder="e.g. B-404"
                      className="field-input"
                    />
                  </div>
                  <div>
                    <label className="field-label">Wing</label>
                    <select value={newWing} onChange={e => setNewWing(e.target.value)} className="field-select">
                      <option value="A">Wing A</option>
                      <option value="B">Wing B</option>
                      <option value="C">Wing C</option>
                      <option value="D">Wing D</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="field-label">Apartment Configuration</label>
                  <select value={newType} onChange={e => setNewType(e.target.value)} className="field-select">
                    <option value="1BHK">1BHK</option>
                    <option value="2BHK">2BHK</option>
                    <option value="3BHK">3BHK</option>
                    <option value="4BHK">4BHK Penthouse</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Primary Owner / Resident Name *</label>
                  <input
                    value={newOwnerName}
                    onChange={e => setNewOwnerName(e.target.value)}
                    required
                    placeholder="e.g. Rahul Patil"
                    className="field-input"
                  />
                </div>

                <div>
                  <label className="field-label">Contact Phone *</label>
                  <input
                    value={newOwnerPhone}
                    onChange={e => setNewOwnerPhone(e.target.value)}
                    required
                    placeholder="+91 98000 00000"
                    className="field-input"
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, paddingTop: 10 }}>
                  <button type="button" onClick={() => setShowAddFlat(false)} className="btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    Enroll Flat Unit
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DoorOpen, Shield, Sun, Moon, Phone, Plus, Settings,
  Video, Radio, AlertCircle, CheckCircle2, Lock, Unlock,
  X, UserCheck, Eye, RefreshCw
} from 'lucide-react';
import { mockGates, mockGuards } from '../data/mockData';
import type { GuardShift, GuardStatus, Gate, Guard } from '../types';

const shiftCfg: Record<GuardShift, { label: string; icon: React.ElementType; color: string; bg: string; time: string }> = {
  morning: { label: 'Morning', icon: Sun,    color: 'var(--amber)',        bg: 'var(--amber-bg)',   time: '6 AM – 2 PM' },
  evening: { label: 'Evening', icon: Sun,    color: 'var(--purple)',       bg: 'var(--purple-bg)',  time: '2 PM – 10 PM' },
  night:   { label: 'Night',   icon: Moon,   color: 'var(--accent-light)', bg: 'var(--accent-bg)', time: '10 PM – 6 AM' },
};

const statusCfg: Record<GuardStatus, { cls: string; label: string }> = {
  on_duty:  { cls: 'badge badge-success', label: 'On Duty' },
  off_duty: { cls: 'badge badge-muted',   label: 'Off Duty' },
  on_leave: { cls: 'badge badge-warning', label: 'On Leave' },
};

// CCTV metadata for gates
const gateCCTV: Record<string, { camId: string; detection: string; resolution: string; fps: number }> = {
  'gate-1': { camId: 'CAM-01 / MAIN GATE', detection: 'VEHICLE: MH 12 AB 1234', resolution: '1080P', fps: 30 },
  'gate-2': { camId: 'CAM-02 / EAST GATE', detection: 'PEDESTRIAN CLEAR', resolution: '1080P', fps: 30 },
  'gate-3': { camId: 'CAM-03 / SERVICE GATE', detection: 'DELIVERY VAN (INSP)', resolution: '1080P', fps: 24 },
};

export default function Gates() {
  const [gates, setGates] = useState<Gate[]>(mockGates);
  const [guards, setGuards] = useState<Guard[]>(mockGuards);
  const [shiftFilter, setShiftFilter] = useState<GuardShift | 'all'>('all');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showAddGuard, setShowAddGuard] = useState(false);
  const [cctvTime, setCctvTime] = useState('');

  // Add Guard Form
  const [newGuardName, setNewGuardName] = useState('');
  const [newGuardPhone, setNewGuardPhone] = useState('');
  const [newGuardGate, setNewGuardGate] = useState('Main Gate');
  const [newGuardShift, setNewGuardShift] = useState<GuardShift>('morning');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCctvTime(now.toISOString().replace('T', ' ').slice(0, 19));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const toggleGate = (gateId: string) => {
    setGates(prev => prev.map(g => {
      if (g.id === gateId) {
        const nextStatus = g.status === 'operational' ? 'maintenance' : 'operational';
        showToast(`${g.name} barrier ${nextStatus === 'operational' ? 'OPENED & ACTIVE' : 'LOCKED DOWN'}`);
        return { ...g, status: nextStatus };
      }
      return g;
    }));
  };

  const handleAddGuard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuardName) return;
    const newG: Guard = {
      id: `guard-${Date.now()}`,
      name: newGuardName,
      phone: newGuardPhone || '+91 99001 00000',
      assignedGate: newGuardGate,
      shift: newGuardShift,
      status: 'on_duty',
      joinedDate: new Date().toISOString().slice(0, 10),
    };
    setGuards(prev => [newG, ...prev]);
    setShowAddGuard(false);
    setNewGuardName('');
    setNewGuardPhone('');
    showToast(`Guard ${newG.name} registered and assigned to ${newGuardGate}`);
  };

  const filteredGuards = shiftFilter === 'all' ? guards : guards.filter(g => g.shift === shiftFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

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

      {/* Gate Status Cards with Enterprise Security Feed */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio size={16} color="var(--red)" />
            <p className="section-label" style={{ margin: 0 }}>Live Gate Surveillance & Access Points</p>
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            3 Active Security Streams · Automated License Plate Recognition (ALPR) Online
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
          {gates.map((gate, i) => {
            const guard = guards.find(g => g.id === gate.currentGuardId) || guards.find(g => g.assignedGate === gate.name);
            const isOp = gate.status === 'operational';
            const col = isOp ? 'var(--green)' : gate.status === 'maintenance' ? 'var(--amber)' : 'var(--red)';
            const bg  = isOp ? 'var(--green-bg)' : gate.status === 'maintenance' ? 'var(--amber-bg)' : 'var(--red-bg)';
            const cctv = gateCCTV[gate.id] ?? { camId: `CAM-0${i+1}`, detection: 'MONITORING', resolution: '1080P', fps: 30 };

            return (
              <motion.div
                key={gate.id}
                className="stat-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              >
                {/* Enterprise SOC Camera Viewport */}
                <div style={{
                  position: 'relative',
                  height: 140,
                  background: '#0F172A',
                  borderBottom: '1px solid var(--border)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {/* Subtle enterprise grid reticle */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                    pointerEvents: 'none'
                  }} />

                  {/* Clean camera center icon */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    opacity: 0.35, color: '#94A3B8'
                  }}>
                    <Video size={32} />
                    <span style={{ fontSize: 10, letterSpacing: '0.08em', fontWeight: 600, fontFamily: 'monospace' }}>
                      FEED ACTIVE · {cctv.fps} FPS
                    </span>
                  </div>

                  {/* Top Feed Status Bar */}
                  <div style={{
                    position: 'absolute', top: 8, left: 10, right: 10,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 10.5, fontFamily: 'monospace'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: isOp ? '#EF4444' : '#64748B'
                      }} />
                      <span style={{ color: '#F8FAFC', fontWeight: 700 }}>
                        {isOp ? 'LIVE' : 'IDLE'}
                      </span>
                      <span style={{ color: '#94A3B8' }}>{cctv.resolution}</span>
                    </div>
                    <span style={{ color: '#94A3B8', fontSize: 10 }}>{cctvTime}</span>
                  </div>

                  {/* Bottom Camera Tag Bar */}
                  <div style={{
                    position: 'absolute', bottom: 8, left: 10, right: 10,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 10, fontFamily: 'monospace'
                  }}>
                    <span style={{
                      color: '#E2E8F0', fontWeight: 600, background: 'rgba(0,0,0,0.5)',
                      padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      {cctv.camId}
                    </span>
                    <span style={{
                      background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 4,
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: isOp ? '#4ADE80' : '#94A3B8', fontSize: 9.5, fontWeight: 600
                    }}>
                      {cctv.detection}
                    </span>
                  </div>
                </div>

                {/* Gate Details Info */}
                <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ padding: 8, borderRadius: 'var(--r-md)', background: bg }}>
                        <DoorOpen size={18} color={col} />
                      </div>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{gate.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>RFID & Smart Barrier</p>
                      </div>
                    </div>
                    <span className={isOp ? 'badge badge-success' : 'badge badge-warning'}>
                      {isOp ? 'Operational' : 'Secured / Closed'}
                    </span>
                  </div>

                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 26, fontWeight: 800, color: col, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                      {gate.visitorsToday}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>crossings recorded today</span>
                  </div>

                  {/* Guard currently assigned */}
                  {guard && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      marginTop: 14, padding: '10px 12px', borderRadius: 'var(--r-md)',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    }}>
                      <div className="avatar avatar-sm" style={{ background: 'var(--accent-bg)', color: 'var(--accent-light)' }}>
                        {guard.name[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {guard.name}
                        </p>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>On Duty · {guard.shift} shift</p>
                      </div>
                      <a href={`tel:${guard.phone}`} className="btn-icon btn-icon-green" style={{ width: 28, height: 28 }} title={`Call ${guard.name}`}>
                        <Phone size={12} />
                      </a>
                    </div>
                  )}

                  {/* Toggle Barrier Button */}
                  <button
                    onClick={() => toggleGate(gate.id)}
                    id={`toggle-gate-${gate.id}`}
                    className={isOp ? 'btn-secondary' : 'btn-success'}
                    style={{
                      width: '100%', marginTop: 14, height: 36,
                      fontSize: 12, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      cursor: 'pointer'
                    }}
                  >
                    {isOp ? (
                      <><Lock size={13} color="var(--red)" /> Lock / Close Barrier</>
                    ) : (
                      <><Unlock size={13} /> Open / Authorize Barrier</>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Guard Roster Table */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="card-ph" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={16} color="var(--accent-light)" />
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Security Guard Roster & Deployment</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="tab-bar">
              {(['all', 'morning', 'evening', 'night'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setShiftFilter(s)}
                  id={`shift-filter-${s}`}
                  className={`tab-btn${shiftFilter === s ? ' active' : ''}`}
                  style={{ fontSize: 12 }}
                >
                  {s === 'all' ? 'All Shifts' : shiftCfg[s as GuardShift].label}
                </button>
              ))}
            </div>
            <button
              id="add-guard-btn"
              onClick={() => setShowAddGuard(true)}
              className="btn-primary"
              style={{ padding: '7px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            >
              <Plus size={13} /> Add Guard
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Guard Name</th>
                <th>Contact Phone</th>
                <th>Assigned Gate</th>
                <th>Shift Schedule</th>
                <th>Status</th>
                <th>Enrolled Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuards.map(g => {
                const shift = shiftCfg[g.shift];
                const ShiftIco = shift.icon;
                return (
                  <tr key={g.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg, #374151, #1F2937)' }}>
                          {g.name[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{g.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ID: {g.id.toUpperCase()}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <a href={`tel:${g.phone}`} style={{ fontSize: 12, color: 'var(--accent-light)', textDecoration: 'none', fontWeight: 500 }}>
                        {g.phone}
                      </a>
                    </td>

                    <td>
                      <span className="badge badge-muted">{g.assignedGate}</span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ padding: 5, borderRadius: 6, background: shift.bg }}>
                          <ShiftIco size={13} color={shift.color} />
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{shift.label}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{shift.time}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={statusCfg[g.status].cls}>{statusCfg[g.status].label}</span>
                    </td>

                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{g.joinedDate}</span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <a href={`tel:${g.phone}`} className="btn-icon btn-icon-green" id={`call-guard-${g.id}`} title="Call guard">
                          <Phone size={13} />
                        </a>
                        <button
                          onClick={() => {
                            setGuards(prev => prev.map(item => item.id === g.id ? {
                              ...item,
                              status: item.status === 'on_duty' ? 'off_duty' : 'on_duty'
                            } : item));
                            showToast(`Guard ${g.name} status updated`);
                          }}
                          className="btn-icon btn-icon-accent"
                          id={`toggle-duty-${g.id}`}
                          title="Toggle On/Off duty"
                        >
                          <UserCheck size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Shift Schedule 3-Column Overview */}
      <motion.div className="card card-p" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
          Shift Coverage & Guard Distribution
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {(['morning', 'evening', 'night'] as GuardShift[]).map(shift => {
            const cfg = shiftCfg[shift];
            const ShiftIco = cfg.icon;
            const gs = guards.filter(g => g.shift === shift);
            const onDuty = gs.filter(g => g.status === 'on_duty').length;
            return (
              <div key={shift} style={{ padding: '16px', borderRadius: 'var(--r-lg)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ padding: 8, borderRadius: 'var(--r-sm)', background: cfg.bg }}>
                    <ShiftIco size={16} color={cfg.color} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{cfg.label} Shift</p>
                    <p style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{cfg.time}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {gs.map(g => (
                    <div key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{g.name} ({g.assignedGate})</span>
                      <span className={statusCfg[g.status].cls} style={{ fontSize: 10 }}>{statusCfg[g.status].label}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    <span style={{ fontWeight: 800, color: cfg.color, fontSize: 14 }}>{onDuty}</span>/{gs.length} guards active on duty
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Add Guard Modal */}
      <AnimatePresence>
        {showAddGuard && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowAddGuard(false); }}
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
                  <Shield size={16} color="var(--accent-light)" />
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Enroll Security Guard</span>
                </div>
                <button className="btn-icon" onClick={() => setShowAddGuard(false)}><X size={14} /></button>
              </div>

              <form onSubmit={handleAddGuard} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="field-label">Full Name *</label>
                  <input
                    value={newGuardName}
                    onChange={(e) => setNewGuardName(e.target.value)}
                    required
                    placeholder="e.g. Anand Shinde"
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Phone Number *</label>
                  <input
                    value={newGuardPhone}
                    onChange={(e) => setNewGuardPhone(e.target.value)}
                    required
                    placeholder="+91 98000 12345"
                    className="field-input"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="field-label">Gate Assignment</label>
                    <select
                      value={newGuardGate}
                      onChange={(e) => setNewGuardGate(e.target.value)}
                      className="field-select"
                    >
                      <option value="Main Gate">Main Gate</option>
                      <option value="East Gate">East Gate</option>
                      <option value="Service Gate">Service Gate</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Shift</label>
                    <select
                      value={newGuardShift}
                      onChange={(e) => setNewGuardShift(e.target.value as GuardShift)}
                      className="field-select"
                    >
                      <option value="morning">Morning (6AM - 2PM)</option>
                      <option value="evening">Evening (2PM - 10PM)</option>
                      <option value="night">Night (10PM - 6AM)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, paddingTop: 10 }}>
                  <button type="button" onClick={() => setShowAddGuard(false)} className="btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    Confirm & Enroll
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

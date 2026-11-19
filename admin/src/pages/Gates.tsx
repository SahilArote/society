import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DoorOpen, Shield, Phone, Plus,
  Video, Radio, CheckCircle2, Lock, Unlock,
  X, UserCheck, Smartphone, KeyRound, Edit,
  Trash2, AlertTriangle, Check
} from 'lucide-react';
import type { GuardShift, GuardStatus, Gate, Guard } from '../types';
import {
  fetchAdminGates,
  toggleAdminGate,
  fetchAdminGuards,
  createAdminGuard,
  updateAdminGuard,
  deleteAdminGuard,
  fetchAdminSubscription,
} from '../services/api';

const statusCfg: Record<GuardStatus, { cls: string; label: string }> = {
  on_duty:  { cls: 'badge badge-success', label: 'On Duty' },
  off_duty: { cls: 'badge badge-muted',   label: 'Off Duty' },
  on_leave: { cls: 'badge badge-warning', label: 'On Leave' },
};

// CCTV metadata for gates
const gateCCTV: Record<string, { camId: string; detection: string; resolution: string; fps: number }> = {
  'gate_main':    { camId: 'CAM-01 / MAIN GATE', detection: 'VEHICLE: MH 12 AB 1234', resolution: '1080P', fps: 30 },
  'gate_east':    { camId: 'CAM-02 / EAST GATE', detection: 'PEDESTRIAN CLEAR', resolution: '1080P', fps: 30 },
  'gate_service': { camId: 'CAM-03 / SERVICE GATE', detection: 'DELIVERY VAN (INSP)', resolution: '1080P', fps: 24 },
  'gate-1':       { camId: 'CAM-01 / MAIN GATE', detection: 'VEHICLE: MH 12 AB 1234', resolution: '1080P', fps: 30 },
  'gate-2':       { camId: 'CAM-02 / EAST GATE', detection: 'PEDESTRIAN CLEAR', resolution: '1080P', fps: 30 },
  'gate-3':       { camId: 'CAM-03 / SERVICE GATE', detection: 'DELIVERY VAN (INSP)', resolution: '1080P', fps: 24 },
};

export default function Gates() {
  const [gates, setGates] = useState<Gate[]>([]);
  const [guards, setGuards] = useState<Guard[]>([]);
  const [_loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showAddGuard, setShowAddGuard] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cctvTime, setCctvTime] = useState('');

  // Device Limit & Plan Metadata
  const [guardMeta, setGuardMeta] = useState<{
    maxDevices: number;
    currentDevices: number;
    planName: string;
    canAddGuard: boolean;
  } | null>(null);

  // Add Guard Device Form
  const [newGuardName, setNewGuardName] = useState('');
  const [newGuardPhone, setNewGuardPhone] = useState('');
  const [newGuardPin, setNewGuardPin] = useState('1234');

  // Edit Guard Device Modal State
  const [editingGuard, setEditingGuard] = useState<Guard | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    pin: '',
    status: 'on_duty' as GuardStatus,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [gatesRes, guardsRes, subRes] = await Promise.all([
        fetchAdminGates(),
        fetchAdminGuards(),
        fetchAdminSubscription().catch(() => null),
      ]);

      const guardsList = Array.isArray(guardsRes) ? guardsRes : (guardsRes as any)?.guards || [];
      setGates(Array.isArray(gatesRes) ? gatesRes : (gatesRes as any)?.gates || []);
      setGuards(guardsList);

      const meta = (guardsRes as any)?.meta || null;
      const maxDevs = meta?.maxDevices || subRes?.maxDevices || 1;
      const pName = meta?.planName || subRes?.planName || 'STANDARD_1_DEVICE';

      setGuardMeta({
        maxDevices: maxDevs,
        currentDevices: guardsList.length,
        planName: pName,
        canAddGuard: guardsList.length < maxDevs,
      });
    } catch (err: any) {
      console.error('Failed to load security infrastructure:', err);
      showToast('Could not load security infrastructure from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const toggleGate = async (gateId: string) => {
    const target = gates.find(g => g.id === gateId);
    if (!target) return;
    const nextStatus = target.status === 'operational' ? 'maintenance' : 'operational';
    try {
      await toggleAdminGate(gateId, nextStatus);
      setGates(prev => prev.map(g => g.id === gateId ? { ...g, status: nextStatus } : g));
      showToast(`${target.name} barrier ${nextStatus === 'operational' ? 'OPENED & ACTIVE' : 'LOCKED DOWN'}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to update gate barrier status');
    }
  };

  const handleAddGuard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuardName.trim() || !newGuardPhone.trim()) return;

    const maxDevs = guardMeta?.maxDevices || 1;
    if (guards.length >= maxDevs) {
      showToast(`Device limit reached (${maxDevs} devices allowed on current plan).`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createAdminGuard({
        name: newGuardName.trim(),
        phone: newGuardPhone.trim(),
        pin: newGuardPin.trim() || '1234',
      });
      const guardObj = res.guard || res;
      if (guardObj) {
        showToast(`Guard device "${guardObj.name || newGuardName}" enrolled successfully.`);
        setShowAddGuard(false);
        setNewGuardName('');
        setNewGuardPhone('');
        setNewGuardPin('1234');
        await loadData();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to enroll guard');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (g: Guard) => {
    setEditingGuard(g);
    setEditForm({
      name: g.name,
      phone: g.phone ? g.phone.replace(/\D/g, '').slice(-10) : '',
      pin: '',
      status: g.status,
    });
  };

  const handleSaveEditGuard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuard) return;

    try {
      setIsSubmitting(true);
      await updateAdminGuard(editingGuard.id, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        pin: editForm.pin && editForm.pin.trim() ? editForm.pin.trim() : undefined,
        status: editForm.status,
      });

      showToast(`Guard device "${editForm.name}" updated successfully.`);
      setEditingGuard(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update guard device');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGuard = async (g: Guard) => {
    if (!window.confirm(`Are you sure you want to remove gate device "${g.name}" (${g.phone})? This will revoke guard access.`)) {
      return;
    }

    try {
      await deleteAdminGuard(g.id);
      showToast(`Guard device "${g.name}" removed successfully.`);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove guard device');
    }
  };

  const maxAllowedDevices = guardMeta?.maxDevices || 1;
  const canAddMoreDevices = guards.length < maxAllowedDevices;

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
            Active Security Streams · Automated License Plate Recognition (ALPR) Online
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
          {gates.map((gate, i) => {
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
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                    pointerEvents: 'none'
                  }} />

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

                {/* Gate Meta & Override Controls */}
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <DoorOpen size={16} color="var(--accent-light)" />
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{gate.name}</span>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                      padding: '2px 8px', borderRadius: 4, background: bg, color: col,
                      letterSpacing: '0.04em'
                    }}>
                      {gate.status}
                    </span>
                  </div>

                  <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 12 }}>
                    {(gate as any).location || 'Primary Society Entrance'}
                  </p>

                  <button
                    onClick={() => toggleGate(gate.id)}
                    className="btn-secondary"
                    style={{
                      width: '100%', justifyContent: 'center', fontSize: 12, padding: '7px 12px',
                      display: 'flex', alignItems: 'center', gap: 6,
                      color: isOp ? 'var(--amber)' : 'var(--green)',
                      borderColor: isOp ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'
                    }}
                  >
                    {isOp ? <Lock size={13} /> : <Unlock size={13} />}
                    {isOp ? 'Engage Security Lockdown' : 'Lift Lockdown & Activate'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Guard & Gate Device Table */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="card-ph" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={16} color="var(--accent-light)" />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Gate Tablet & Guard Devices
              </p>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                {guards.length} of {maxAllowedDevices} device(s) registered · Mobile & PIN Device Authentication
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* PLAN LIMIT ENFORCEMENT: If device limit is reached, hide Add Guard button and show informative badge */}
            {!canAddMoreDevices ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(234, 179, 8, 0.12)',
                  color: '#EAB308',
                  border: '1px solid rgba(234, 179, 8, 0.35)',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                }}
                title="Your society plan device limit has been reached. Upgrade plan in Super Admin to add more devices."
              >
                <Lock size={13} />
                <span>Device Limit Reached ({guards.length}/{maxAllowedDevices})</span>
              </div>
            ) : (
              <button
                id="add-guard-btn"
                onClick={() => {
                  setNewGuardName('');
                  setNewGuardPhone('');
                  setNewGuardPin('1234');
                  setShowAddGuard(true);
                }}
                className="btn-primary"
                style={{ padding: '7px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
              >
                <Plus size={13} /> Register Guard Device ({guards.length}/{maxAllowedDevices})
              </button>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Device / Guard Name</th>
                <th>Login Mobile Number</th>
                <th>Security PIN</th>
                <th>Status</th>
                <th>Registered Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {guards.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                    <Smartphone size={28} style={{ opacity: 0.4, margin: '0 auto 8px', display: 'block' }} />
                    <p style={{ margin: 0, fontWeight: 500, fontSize: 13 }}>No guard devices registered yet</p>
                    {canAddMoreDevices && (
                      <button
                        onClick={() => setShowAddGuard(true)}
                        className="btn-primary"
                        style={{ marginTop: 12, fontSize: 12, padding: '6px 14px' }}
                      >
                        <Plus size={12} /> Register First Device
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                guards.map(g => (
                  <tr key={g.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: '#FFF', fontWeight: 700 }}>
                          {g.name[0]?.toUpperCase() || 'G'}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{g.name}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {g.id.toUpperCase()}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <a href={`tel:${g.phone}`} style={{ fontSize: 12.5, color: 'var(--accent-light)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Smartphone size={13} color="var(--text-muted)" />
                        {g.phone}
                      </a>
                    </td>

                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontFamily: 'monospace',
                        fontSize: 11.5,
                        fontWeight: 600,
                        background: 'var(--bg-base)',
                        border: '1px solid var(--border)',
                        padding: '2px 8px',
                        borderRadius: 4,
                        color: 'var(--text-secondary)'
                      }}>
                        <KeyRound size={11} color="var(--accent-light)" />
                        PIN: 1234
                      </span>
                    </td>

                    <td>
                      <span className={statusCfg[g.status]?.cls || 'badge badge-success'}>
                        {statusCfg[g.status]?.label || 'Active'}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{g.joinedDate}</span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => openEditModal(g)}
                          className="btn-icon"
                          style={{
                            border: '1px solid var(--border)',
                            background: 'var(--bg-base)',
                            color: 'var(--text-primary)',
                            padding: 6,
                            borderRadius: 6,
                            cursor: 'pointer'
                          }}
                          title="Edit device name, mobile number or PIN"
                        >
                          <Edit size={13} />
                        </button>
                        <a
                          href={`tel:${g.phone}`}
                          className="btn-icon btn-icon-green"
                          title="Call device mobile"
                        >
                          <Phone size={13} />
                        </a>
                        <button
                          onClick={() => {
                            const next = g.status === 'on_duty' ? 'off_duty' : 'on_duty';
                            updateAdminGuard(g.id, { status: next })
                              .then(() => {
                                setGuards(prev => prev.map(item => item.id === g.id ? { ...item, status: next } : item));
                                showToast(`Guard ${g.name} status updated to ${next === 'on_duty' ? 'On Duty' : 'Off Duty'}`);
                              })
                              .catch(err => showToast(err.message || 'Failed to toggle status'));
                          }}
                          className="btn-icon btn-icon-accent"
                          title="Toggle On/Off Duty status"
                        >
                          <UserCheck size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteGuard(g)}
                          className="btn-icon"
                          style={{
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            background: 'rgba(239, 68, 68, 0.08)',
                            color: '#EF4444',
                            padding: 6,
                            borderRadius: 6,
                            cursor: 'pointer'
                          }}
                          title="Remove guard device"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Gate Tablet & Guard Device Authentication Guide */}
      <motion.div className="card card-p" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
          Gate Tablet & Guard Device Setup Guide
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          Each guard device operates as an independent security kiosk. Guards authenticate directly using their mobile number and 4-digit PIN.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          <div style={{ padding: '16px', borderRadius: 'var(--r-lg)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ padding: 8, borderRadius: 8, background: 'rgba(37, 99, 235, 0.1)', color: '#2563EB' }}>
                <Smartphone size={18} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>1. Launch Guard App</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Android Tablet / Phone</p>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Install the NexGate Guard APK on the gate tablet and open the login screen.
            </p>
          </div>

          <div style={{ padding: '16px', borderRadius: 'var(--r-lg)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ padding: 8, borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
                <KeyRound size={18} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>2. Enter Mobile & PIN</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Default PIN: 1234</p>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Enter the registered 10-digit mobile number and the 4-digit security PIN to log in instantly.
            </p>
          </div>

          <div style={{ padding: '16px', borderRadius: 'var(--r-lg)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ padding: 8, borderRadius: 8, background: 'rgba(234, 179, 8, 0.1)', color: '#EAB308' }}>
                <Shield size={18} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>3. Device Limit Quota</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{guards.length} of {maxAllowedDevices} Active</p>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              {canAddMoreDevices
                ? `You can register ${maxAllowedDevices - guards.length} more device(s) on your current subscription plan.`
                : `Maximum device limit reached (${maxAllowedDevices}/${maxAllowedDevices}). Contact Super Admin to upgrade.`}
            </p>
          </div>
        </div>
      </motion.div>

      {/* REGISTER GUARD DEVICE MODAL */}
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
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                      Register Gate Device (Guard Login)
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Device {guards.length + 1} of {maxAllowedDevices} Allowed
                    </span>
                  </div>
                </div>
                <button className="btn-icon" onClick={() => setShowAddGuard(false)}><X size={14} /></button>
              </div>

              <form onSubmit={handleAddGuard} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="field-label">Guard / Device Name *</label>
                  <input
                    value={newGuardName}
                    onChange={(e) => setNewGuardName(e.target.value)}
                    required
                    placeholder="e.g. Main Gate Kiosk or Tushal"
                    className="field-input"
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 3 }}>
                    Identifies this gate terminal or guard in visitor logs.
                  </span>
                </div>

                <div>
                  <label className="field-label">Login Mobile Number (10 digits) *</label>
                  <input
                    type="tel"
                    value={newGuardPhone}
                    onChange={(e) => setNewGuardPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    required
                    placeholder="e.g. 9768712674"
                    className="field-input"
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 3 }}>
                    The guard will enter this 10-digit mobile number to log in.
                  </span>
                </div>

                <div>
                  <label className="field-label">Security Access PIN (4 digits)</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={newGuardPin}
                    onChange={(e) => setNewGuardPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Default: 1234"
                    className="field-input"
                    style={{ letterSpacing: '0.2em', fontFamily: 'monospace', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 3 }}>
                    4-digit PIN for device authentication. Default is 1234.
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 10, paddingTop: 10 }}>
                  <button type="button" onClick={() => setShowAddGuard(false)} className="btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    {isSubmitting ? 'Registering...' : 'Register Device'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT GUARD DEVICE MODAL */}
      <AnimatePresence>
        {editingGuard && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setEditingGuard(null); }}
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
                  <Edit size={16} color="var(--accent-light)" />
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                      Edit Gate Device & Guard Access
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      ID: {editingGuard.id}
                    </span>
                  </div>
                </div>
                <button className="btn-icon" onClick={() => setEditingGuard(null)}><X size={14} /></button>
              </div>

              <form onSubmit={handleSaveEditGuard} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="field-label">Guard / Device Name *</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    placeholder="e.g. Main Gate Kiosk"
                    className="field-input"
                  />
                </div>

                <div>
                  <label className="field-label">Login Mobile Number (10 digits) *</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    required
                    placeholder="10-digit mobile number"
                    className="field-input"
                  />
                </div>

                <div>
                  <label className="field-label">Update Security PIN (Optional)</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={editForm.pin}
                    onChange={(e) => setEditForm({ ...editForm, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    placeholder="Leave blank to keep existing PIN"
                    className="field-input"
                    style={{ letterSpacing: '0.2em', fontFamily: 'monospace', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 3 }}>
                    Enter a new 4-digit PIN, or leave empty to keep unchanged.
                  </span>
                </div>

                <div>
                  <label className="field-label">Duty Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as GuardStatus })}
                    className="field-select"
                  >
                    <option value="on_duty">On Duty / Active</option>
                    <option value="off_duty">Off Duty</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 10, paddingTop: 10 }}>
                  <button type="button" onClick={() => setEditingGuard(null)} className="btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
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
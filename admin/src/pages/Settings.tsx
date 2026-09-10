import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, DoorOpen, CreditCard, Shield, Bell, Save, CheckCircle2,
  Plus, Download, Lock, Smartphone, Database, Server, UserPlus,
  Trash2, X, AlertTriangle, KeyRound, QrCode, Palette, Sun, Moon, Laptop
} from 'lucide-react';
import { mockSociety, mockFlats, mockGates, mockGuards } from '../data/mockData';
import { ThemeToggle } from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

export default function Settings() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'billing' | 'gates' | 'notifications' | 'admins' | 'appearance'>('profile');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Society State
  const [socName, setSocName] = useState(mockSociety.name);
  const [socCity, setSocCity] = useState(mockSociety.city);
  const [socAddress, setSocAddress] = useState(mockSociety.address);
  const [socFlats, setSocFlats] = useState(String(mockSociety.totalFlats));
  const [maintAmount, setMaintAmount] = useState(String(mockSociety.maintenanceAmount));
  const [maintDueDay, setMaintDueDay] = useState(String(mockSociety.maintenanceDueDay));
  const [upiId, setUpiId] = useState('greengate.society@hdfcbank');

  // Admin users state
  const [admins, setAdmins] = useState([
    { id: 1, name: 'Rajesh Sharma', role: 'Society Secretary', email: 'secretary@greengate.in', phone: '+91 98765 00001', access: 'Super Admin' },
    { id: 2, name: 'Vikram Joshi', role: 'Security Supervisor', email: 'security@greengate.in', phone: '+91 98765 00002', access: 'Gates & Guards' },
    { id: 3, name: 'Anita Deshmukh', role: 'Treasurer & Accounts', email: 'treasurer@greengate.in', phone: '+91 98765 00003', access: 'Billing & Reports' },
  ]);

  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('Committee Member');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    showToast('Society configuration saved successfully');
    setTimeout(() => setSaved(false), 3000);
  };

  const downloadBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      society: {
        name: socName,
        city: socCity,
        address: socAddress,
        totalFlats: socFlats,
        maintAmount,
        maintDueDay,
        upiId,
      },
      flats: mockFlats,
      gates: mockGates,
      guards: mockGuards,
      admins,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GreenGate_Backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded full system backup JSON');
  };

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName || !newAdminEmail) return;
    setAdmins(prev => [
      ...prev,
      {
        id: Date.now(),
        name: newAdminName,
        email: newAdminEmail,
        role: newAdminRole,
        phone: '+91 98000 00000',
        access: 'Standard Admin',
      }
    ]);
    setShowAddAdmin(false);
    setNewAdminName('');
    setNewAdminEmail('');
    showToast(`Added admin user: ${newAdminName}`);
  };

  const removeAdmin = (id: number) => {
    setAdmins(prev => prev.filter(a => a.id !== id));
    showToast('Admin user revoked');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

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

      {/* Main 2-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>

        {/* Left Sidebar: Society Identity, Health Score, Navigation Tabs & System Tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Society Identity Card */}
          <div className="card card-p" style={{ textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 'var(--r-md)',
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px', boxShadow: 'var(--shadow-sm)'
            }}>
              <Building2 size={26} color="#fff" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              {socName}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Reg: MH/PUN/2021/8941 · RERA Verified
            </p>

            <div style={{
              marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-around', textAlign: 'center'
            }}>
              <div>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{socFlats}</span>
                <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Flats</p>
              </div>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <div>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>3</span>
                <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Gates</p>
              </div>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <div>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>6</span>
                <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Guards</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="card" style={{ padding: 6 }}>
            {[
              { id: 'profile', label: 'Society Profile & Info', icon: Building2 },
              { id: 'appearance', label: 'Theme & Appearance', icon: Palette },
              { id: 'billing', label: 'Billing & Maintenance', icon: CreditCard },
              { id: 'gates', label: 'Gates & Barrier Automation', icon: DoorOpen },
              { id: 'notifications', label: 'Notification Rules', icon: Bell },
              { id: 'admins', label: 'Admin Team & Roles', icon: Shield },
            ].map(tab => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '11px 14px',
                    borderRadius: 'var(--r-md)',
                    border: 'none',
                    background: active ? 'var(--accent-bg)' : 'transparent',
                    color: active ? 'var(--accent-light)' : 'var(--text-secondary)',
                    fontWeight: active ? 700 : 500,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left'
                  }}
                >
                  <Icon size={16} color={active ? 'var(--accent-light)' : 'var(--text-muted)'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* System Health Widget */}
          <div className="card card-p" style={{ background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(16,185,129,0.04) 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Server size={14} color="var(--green)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>System Status</span>
              </div>
              <span className="badge badge-success" style={{ fontSize: 10 }}>99.98% Uptime</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Cloud database, gate ANPR relays, and WebSocket events operational without incidents.
            </p>

            <button
              onClick={downloadBackup}
              id="export-backup-btn"
              className="btn-secondary"
              style={{
                width: '100%', marginTop: 14, padding: '8px', fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                cursor: 'pointer'
              }}
            >
              <Database size={13} /> Export Backup (.JSON)
            </button>
          </div>

        </div>

        {/* Right Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Active Tab View */}
          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card card-p">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <Building2 size={16} color="var(--accent-light)" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Society Identification & Address
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="field-label">Official Society Name</label>
                  <input
                    value={socName}
                    onChange={e => setSocName(e.target.value)}
                    className="field-input"
                    id="soc-name"
                  />
                </div>
                <div>
                  <label className="field-label">City / District</label>
                  <input
                    value={socCity}
                    onChange={e => setSocCity(e.target.value)}
                    className="field-input"
                    id="soc-city"
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label">Complete Registered Address</label>
                  <input
                    value={socAddress}
                    onChange={e => setSocAddress(e.target.value)}
                    className="field-input"
                    id="soc-address"
                  />
                </div>
                <div>
                  <label className="field-label">Total Residential Flats</label>
                  <input
                    value={socFlats}
                    onChange={e => setSocFlats(e.target.value)}
                    type="number"
                    className="field-input"
                    id="soc-flats"
                  />
                </div>
                <div>
                  <label className="field-label">Building Wings</label>
                  <input
                    defaultValue="Wing A, Wing B, Wing C, Wing D"
                    className="field-input"
                    id="soc-wings"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'appearance' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card card-p">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Palette size={16} color="var(--accent)" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Theme & Workspace Appearance
                </h3>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20 }}>
                Configure the visual design system for your administration workspace. Supports Light, Dark, and automatic System synchronization.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                  {
                    id: 'light' as const,
                    title: 'Light Theme',
                    desc: 'Clean corporate Tailwind Slate palette, crisp white cards, high contrast.',
                    icon: Sun,
                    previewBg: '#F8FAFC',
                    previewCard: '#FFFFFF',
                    previewBorder: '#E2E8F0',
                    previewText: '#0F172A',
                  },
                  {
                    id: 'dark' as const,
                    title: 'Dark Theme',
                    desc: 'Deep enterprise Slate-950 canvas, zero neon glare, optimized for night shifts.',
                    icon: Moon,
                    previewBg: '#0B0F19',
                    previewCard: '#131D2E',
                    previewBorder: '#1E293B',
                    previewText: '#F8FAFC',
                  },
                  {
                    id: 'system' as const,
                    title: 'System Theme',
                    desc: 'Automatically tracks your operating system dark/light mode preference.',
                    icon: Laptop,
                    previewBg: 'linear-gradient(135deg, #F8FAFC 50%, #0B0F19 50%)',
                    previewCard: 'linear-gradient(135deg, #FFFFFF 50%, #131D2E 50%)',
                    previewBorder: '#94A3B8',
                    previewText: 'System Auto',
                  },
                ].map(opt => {
                  const Icon = opt.icon;
                  const isSelected = theme === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => {
                        setTheme(opt.id);
                        setToastMsg(`Switched to ${opt.title}`);
                      }}
                      id={`theme-card-${opt.id}`}
                      style={{
                        borderRadius: 'var(--r-lg)',
                        border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                        background: 'var(--bg-surface)',
                        padding: 16,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-xs)',
                        position: 'relative'
                      }}
                    >
                      {/* Mini Preview Box */}
                      <div style={{
                        height: 70,
                        borderRadius: 'var(--r-md)',
                        background: opt.previewBg,
                        border: `1px solid ${opt.previewBorder}`,
                        padding: 8,
                        marginBottom: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{
                          height: 14,
                          width: '45%',
                          borderRadius: 3,
                          background: opt.previewCard,
                          border: `1px solid ${opt.previewBorder}`
                        }} />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <div style={{ height: 16, flex: 1, borderRadius: 3, background: opt.previewCard, border: `1px solid ${opt.previewBorder}` }} />
                          <div style={{ height: 16, flex: 1, borderRadius: 3, background: opt.previewCard, border: `1px solid ${opt.previewBorder}` }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Icon size={15} color={isSelected ? 'var(--accent)' : 'var(--text-secondary)'} />
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{opt.title}</span>
                        </div>
                        {isSelected && (
                          <span className="badge badge-accent" style={{ fontSize: 9.5, padding: '1px 6px' }}>Active</span>
                        )}
                      </div>
                      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {opt.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div style={{
                padding: '14px 16px',
                borderRadius: 'var(--r-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Active Theme Setting: <span style={{ color: 'var(--accent)', textTransform: 'capitalize' }}>{theme}</span> ({resolvedTheme} mode active)
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    Changes apply immediately across all modules, tables, stat cards, and modals.
                  </div>
                </div>
                <ThemeToggle variant="segmented" />
              </div>
            </motion.div>
          )}

          {activeTab === 'billing' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card card-p">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <CreditCard size={16} color="var(--accent-light)" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Monthly Maintenance & Billing Automation
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 18 }}>
                <div>
                  <label className="field-label">Flat Maintenance (₹/month)</label>
                  <input
                    value={maintAmount}
                    onChange={e => setMaintAmount(e.target.value)}
                    type="number"
                    className="field-input"
                    id="maint-amount"
                  />
                </div>
                <div>
                  <label className="field-label">Due Day of Every Month</label>
                  <input
                    value={maintDueDay}
                    onChange={e => setMaintDueDay(e.target.value)}
                    type="number"
                    min="1"
                    max="28"
                    className="field-input"
                    id="due-day"
                  />
                </div>
                <div>
                  <label className="field-label">Collection UPI VPA Handle</label>
                  <input
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                    className="field-input"
                    id="maint-upi"
                  />
                </div>
              </div>

              <div style={{
                padding: '14px 16px', borderRadius: 'var(--r-md)',
                background: 'var(--accent-bg)', border: '1px solid var(--border-accent)',
                display: 'flex', alignItems: 'center', gap: 12
              }}>
                <CheckCircle2 size={18} color="var(--accent-light)" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Automated Razorpay & UPI payment webhook reconciles resident maintenance dues immediately upon payment, and auto-dispatches digital receipts with GST compliance.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'gates' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card card-p">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <DoorOpen size={16} color="var(--accent-light)" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Gate Barriers & Smart Access Control
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { name: 'Main Gate (North Avenue)', type: 'Vehicle & Pedestrian', status: 'operational', rfid: true },
                  { name: 'East Gate (Resident FastLane)', type: 'Resident RFID Only', status: 'operational', rfid: true },
                  { name: 'Service Gate (Delivery & Staff)', type: 'Commercial Trucks & Vans', status: 'maintenance', rfid: false },
                ].map((g, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '14px 18px', borderRadius: 'var(--r-md)',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{g.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{g.type}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input type="checkbox" defaultChecked={g.rfid} style={{ accentColor: 'var(--accent)' }} />
                        <span>RFID FastTag Auto-Barrier</span>
                      </label>
                      <select defaultValue={g.status} className="field-select" style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}>
                        <option value="operational">Operational</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="offline">Offline / Locked</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card card-p">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <Bell size={16} color="var(--accent-light)" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Automated Notification & SMS Dispatch Rules
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Instant Gate Visitor Arrival Push to resident smartphone', on: true, desc: 'Notifies flat resident as soon as guard enters vehicle or guest details' },
                  { label: 'Automated Overdue Maintenance WhatsApp Alert', on: true, desc: 'Dispatched 3 days prior to due date and on due date morning' },
                  { label: 'Panic / Security Siren broadcast to all flats', on: true, desc: 'Triggers high-priority audible siren notification on all resident phones' },
                  { label: 'Daily Delivery Courier aggregation summary', on: false, desc: 'Batches courier arrival notices every afternoon' },
                  { label: 'AGM and Society Meeting Reminders (24h prior)', on: true, desc: 'Calendar sync alert dispatched to verified flat owners' },
                ].map((item, idx) => (
                  <label
                    key={idx}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                      padding: '12px 16px', borderRadius: 'var(--r-md)',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      defaultChecked={item.on}
                      style={{ accentColor: 'var(--accent)', width: 16, height: 16, marginTop: 2, flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'admins' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card card-p">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={16} color="var(--accent-light)" />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Admin Users & Society Role Permissions
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddAdmin(true)}
                  id="add-admin-btn"
                  className="btn-primary"
                  style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                >
                  <UserPlus size={13} /> Add Admin
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {admins.map(adm => (
                  <div
                    key={adm.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 16px', borderRadius: 'var(--r-md)',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    }}
                  >
                    <div className="avatar avatar-sm" style={{ background: 'var(--accent-bg)', color: 'var(--accent-light)' }}>
                      {adm.name[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{adm.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{adm.email} · {adm.phone}</p>
                    </div>
                    <span className="badge badge-accent" style={{ fontSize: 11 }}>{adm.role}</span>
                    <span className="badge badge-muted" style={{ fontSize: 10 }}>{adm.access}</span>
                    <button
                      onClick={() => removeAdmin(adm.id)}
                      className="btn-icon btn-icon-red"
                      title="Revoke Admin Access"
                      style={{ width: 28, height: 28 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Save Bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderRadius: 'var(--r-lg)',
            background: 'var(--bg-card)', border: '1px solid var(--border)'
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Any configuration changes take effect immediately across all resident mobile apps.
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {saved && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green)', fontSize: 12, fontWeight: 600 }}>
                  <CheckCircle2 size={14} /> Saved!
                </div>
              )}
              <button
                onClick={handleSave}
                id="save-settings-btn"
                className="btn-primary"
                disabled={saving}
                style={{ padding: '8px 24px', cursor: 'pointer' }}
              >
                {saving ? <><div className="spinner" />Saving...</> : <><Save size={14} />Save Settings</>}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Add Admin Modal */}
      <AnimatePresence>
        {showAddAdmin && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={e => e.target === e.currentTarget && setShowAddAdmin(false)}
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
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Invite Admin User</span>
                </div>
                <button className="btn-icon" onClick={() => setShowAddAdmin(false)}><X size={14} /></button>
              </div>

              <form onSubmit={handleAddAdmin} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="field-label">Full Name *</label>
                  <input
                    value={newAdminName}
                    onChange={e => setNewAdminName(e.target.value)}
                    required
                    placeholder="e.g. Ramesh Kulkarni"
                    className="field-input"
                  />
                </div>

                <div>
                  <label className="field-label">Official Email Address *</label>
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={e => setNewAdminEmail(e.target.value)}
                    required
                    placeholder="e.g. ramesh@greengate.in"
                    className="field-input"
                  />
                </div>

                <div>
                  <label className="field-label">Role Assignment</label>
                  <select
                    value={newAdminRole}
                    onChange={e => setNewAdminRole(e.target.value)}
                    className="field-select"
                  >
                    <option value="Society Secretary">Society Secretary (Full Access)</option>
                    <option value="Treasurer & Accounts">Treasurer & Accounts (Billing/Reports)</option>
                    <option value="Security Supervisor">Security Supervisor (Gates/Guards/Visitors)</option>
                    <option value="Committee Member">Committee Member (View Only)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 10, paddingTop: 10 }}>
                  <button type="button" onClick={() => setShowAddAdmin(false)} className="btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    Send Admin Invite
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

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, CreditCard, Shield, Save, CheckCircle2,
  Lock, Server, AlertTriangle, QrCode, Palette, Sun, Moon, Laptop,
  Copy, Check, Upload, FileText, ExternalLink, RefreshCw, AlertCircle,
  HelpCircle, Clock
} from 'lucide-react';
import {
  getAdminUser,
  fetchAdminSettings,
  updateAdminSettings,
  fetchAdminSubscription,
  submitRechargeProof,
  fetchRechargeHistory
} from '../services/api';
import { ThemeToggle } from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

export default function Settings() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'billing' | 'admins' | 'appearance'>('profile');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Society State
  const [socName, setSocName] = useState('');
  const [socCity, setSocCity] = useState('');
  const [socAddress, setSocAddress] = useState('');
  const [socFlats, setSocFlats] = useState('');
  const [maintAmount, setMaintAmount] = useState('2500');
  const [maintDueDay, setMaintDueDay] = useState('5');
  const [upiId, setUpiId] = useState('');

  // Subscription / Plan State
  const [subInfo, setSubInfo] = useState<any | null>(null);
  const [loadingSub, setLoadingSub] = useState(false);

  // Recharge Submission State
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [rechargeNotes, setRechargeNotes] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);
  const [rechargeHistory, setRechargeHistory] = useState<any[]>([]);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Admin users state (Read-only)
  const [admins] = useState(() => {
    const current = getAdminUser();
    if (current) {
      return [
        {
          id: 1,
          name: current.name || 'Society Admin',
          role: (current.role || 'ADMIN').replace('_', ' '),
          email: current.email || 'admin@nexgate.co.in',
          phone: current.mobile || '+91 98765 00000',
          access: current.role === 'SUPER_ADMIN' ? 'Platform Administrator' : 'Primary Society Administrator',
        }
      ];
    }
    return [
      { id: 1, name: 'Society Administrator', role: 'Admin', email: 'admin@nexgate.co.in', phone: '+91 98765 00000', access: 'Primary Society Administrator' }
    ];
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadSubscriptionData = async () => {
    try {
      setLoadingSub(true);
      const sub = await fetchAdminSubscription();
      if (sub) {
        setSubInfo(sub);
      }
      const history = await fetchRechargeHistory();
      if (Array.isArray(history)) {
        setRechargeHistory(history);
      }
    } catch (_) {
    } finally {
      setLoadingSub(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchAdminSettings().then(data => {
      if (active && data) {
        if (data.name) setSocName(data.name);
        if (data.city) setSocCity(data.city);
        if (data.address) setSocAddress(data.address);
        if (data.totalFlats) setSocFlats(String(data.totalFlats));
        if (data.upiId) setUpiId(data.upiId);
        if (data.maintenanceAmount !== undefined) setMaintAmount(String(data.maintenanceAmount));
        if (data.maintenanceDueDay !== undefined) setMaintDueDay(String(data.maintenanceDueDay));
      }
    });

    loadSubscriptionData();

    return () => { active = false; };
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateAdminSettings({
        name: socName.trim(),
        city: socCity.trim(),
        address: socAddress.trim(),
        totalFlats: socFlats,
        upiId: upiId.trim(),
        maintenanceAmount: Number(maintAmount) || 0,
        maintenanceDueDay: Number(maintDueDay) || 5,
      });
      setSaving(false);
      setSaved(true);
      showToast('Society configuration saved & synchronized successfully');
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaving(false);
      showToast(err.message || 'Failed to update settings');
    }
  };

  const handleCopyUpi = (vpa: string) => {
    navigator.clipboard.writeText(vpa);
    setCopiedUpi(true);
    showToast(`Copied UPI ID: ${vpa}`);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image file size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitRechargeProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim()) {
      showToast('Please enter the 12-digit UTR / UPI Transaction Reference Number');
      return;
    }
    try {
      setSubmittingProof(true);
      await submitRechargeProof({
        utrNumber: utrNumber.trim(),
        screenshotUrl: screenshotPreview || undefined,
        planName: subInfo?.planCode || 'STANDARD_1_DEVICE',
        amount: subInfo?.monthlyPrice || 1999,
        notes: rechargeNotes.trim() || undefined,
      });
      setSubmittingProof(false);
      setUtrNumber('');
      setScreenshotPreview(null);
      setRechargeNotes('');
      showToast('Payment verification proof submitted! Super admin will verify and renew within 2 hours.');
      // Refresh recharges list
      const updatedHistory = await fetchRechargeHistory();
      if (Array.isArray(updatedHistory)) {
        setRechargeHistory(updatedHistory);
      }
    } catch (err: any) {
      setSubmittingProof(false);
      showToast(err.message || 'Failed to submit payment verification proof');
    }
  };

  const platformBillingUpi = 'nexgate.billing@icici';
  const rechargeAmount = subInfo?.monthlyPrice || 1999;
  const planDisplayName = subInfo?.planName || 'Standard (1 Device)';
  const upiPayPayload = `upi://pay?pa=${platformBillingUpi}&pn=NexGate%20Technologies&am=${rechargeAmount}&cu=INR&tn=${encodeURIComponent('NexGate_Recharge_' + (socName || 'Society'))}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiPayPayload)}`;

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
      <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: 24 }}>

        {/* Left Sidebar: Society Identity, Health Score & Navigation Tabs */}
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
              {socName || 'NexGate Society'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {socCity ? `${socCity} · RERA Registered` : 'RERA Verified Society'}
            </p>

            <div style={{
              marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-around', textAlign: 'center'
            }}>
              <div>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{socFlats || '0'}</span>
                <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Flats</p>
              </div>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <div>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{subInfo?.maxDevices || 1}</span>
                <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Allowed Device</p>
              </div>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <div>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>1</span>
                <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Gate</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs (Gates & Notification Rules Removed) */}
          <div className="card" style={{ padding: 6 }}>
            {[
              { id: 'profile', label: 'Society Profile & Info', icon: Building2 },
              { id: 'billing', label: 'Plan Subscription & Recharge', icon: CreditCard },
              { id: 'admins', label: 'Admin Team & Roles (Read-Only)', icon: Shield },
              { id: 'appearance', label: 'Theme & Appearance', icon: Palette },
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

          {/* System Health Widget (Backup JSON Download Removed per requirement) */}
          <div className="card card-p" style={{ background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(16,185,129,0.04) 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Server size={14} color="var(--green)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Cloud Infrastructure</span>
              </div>
              <span className="badge badge-success" style={{ fontSize: 10 }}>99.98% Uptime</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.45 }}>
              NexGate security nodes, guard sync engine, and encrypted databases are operating normally. Database snapshots are managed centrally by Super Admin.
            </p>
          </div>

        </div>

        {/* Right Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Tab 1: Profile */}
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
                    placeholder="e.g. Wing A, Wing B, Wing C, Wing D"
                    className="field-input"
                    id="soc-wings"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 2: Plan Subscription & Recharge */}
          {activeTab === 'billing' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Current Plan Overview Card */}
              <div className="card card-p" style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(16, 185, 129, 0.05) 100%)',
                border: '1px solid var(--border-accent)'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Current Subscription Plan
                    </span>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                      {planDisplayName}
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                      ₹{rechargeAmount.toLocaleString('en-IN')} / month · Billed monthly · Device Quota: <b>{subInfo?.maxDevices || 1} Guard Device{((subInfo?.maxDevices || 1) > 1) ? 's' : ''}</b>
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    {subInfo?.isTrial ? (
                      <span className="badge badge-accent" style={{ fontSize: 12, padding: '4px 10px', fontWeight: 700 }}>
                        ⏳ 1-Month Free Trial ({subInfo?.daysRemaining ?? 30} days remaining)
                      </span>
                    ) : subInfo?.status === 'GRACE' ? (
                      <span className="badge badge-danger" style={{ fontSize: 12, padding: '4px 10px', fontWeight: 700 }}>
                        ⚠️ Renewal Due (Grace Period: {subInfo?.daysRemaining ?? 0} days remaining)
                      </span>
                    ) : (
                      <span className="badge badge-success" style={{ fontSize: 12, padding: '4px 10px', fontWeight: 700 }}>
                        ✓ Active Subscription
                      </span>
                    )}

                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Valid until: {subInfo?.expiresAt ? new Date(subInfo.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '30 Days Trial'}
                    </span>
                  </div>
                </div>

                {/* Free Trial Banner Notice */}
                {subInfo?.isTrial && (
                  <div style={{
                    marginTop: 14,
                    padding: '10px 14px',
                    borderRadius: 'var(--r-md)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <Clock size={15} color="var(--accent-light)" />
                    <span>
                      Your 30-day complimentary trial is active. You can recharge anytime below to extend uninterrupted security operations after trial completion.
                    </span>
                  </div>
                )}
              </div>

              {/* Recharge via Official NexGate UPI QR Section */}
              <div className="card card-p">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <QrCode size={18} color="var(--accent-light)" />
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Recharge Society Subscription via UPI
                  </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'center' }}>
                  {/* Dynamic UPI QR Code */}
                  <div style={{
                    background: '#ffffff',
                    padding: 12,
                    borderRadius: 'var(--r-lg)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-md)'
                  }}>
                    <img
                      src={qrCodeUrl}
                      alt="NexGate UPI QR Code"
                      style={{ width: 190, height: 190, display: 'block', borderRadius: 6 }}
                    />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', marginTop: 8, textAlign: 'center' }}>
                      Scan with any UPI App
                    </span>
                    <span style={{ fontSize: 10, color: '#64748b' }}>
                      GPay · PhonePe · Paytm · BHIM
                    </span>
                  </div>

                  {/* Payment Details & Steps */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Platform Billing UPI VPA
                      </span>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginTop: 4,
                        padding: '10px 14px',
                        borderRadius: 'var(--r-md)',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)'
                      }}>
                        <code style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-light)', flex: 1, letterSpacing: '0.02em' }}>
                          {platformBillingUpi}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopyUpi(platformBillingUpi)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}
                        >
                          {copiedUpi ? <Check size={12} color="var(--green)" /> : <Copy size={12} />}
                          <span>{copiedUpi ? 'Copied' : 'Copy UPI'}</span>
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Amount to Transfer</span>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                          ₹{rechargeAmount.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div style={{ padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Account Beneficiary</span>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                          NexGate Technologies
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      <b>Recharge Steps:</b><br />
                      1. Open any UPI application and scan the QR or pay to <b>{platformBillingUpi}</b>.<br />
                      2. Complete the transfer of <b>₹{rechargeAmount}</b>.<br />
                      3. Copy the 12-digit <b>UTR / Transaction Ref Number</b> and upload payment screenshot below.
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Proof Submission Form */}
              <div className="card card-p">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <FileText size={17} color="var(--accent-light)" />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Submit Payment Verification (UTR / Screenshot)
                  </h3>
                </div>

                <form onSubmit={handleSubmitRechargeProof} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="field-label">12-Digit UTR / Transaction Reference Number *</label>
                      <input
                        value={utrNumber}
                        onChange={e => setUtrNumber(e.target.value)}
                        placeholder="e.g. 412389104821"
                        required
                        className="field-input"
                        id="recharge-utr"
                      />
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
                        Found in your UPI app payment receipt / SMS confirmation.
                      </span>
                    </div>

                    <div>
                      <label className="field-label">Upload Payment Screenshot (Optional)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <label style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: '9px 14px',
                          borderRadius: 'var(--r-md)',
                          border: '1px dashed var(--border-accent)',
                          background: 'var(--bg-elevated)',
                          cursor: 'pointer',
                          fontSize: 12,
                          color: 'var(--text-secondary)'
                        }}>
                          <Upload size={14} color="var(--accent-light)" />
                          <span>{screenshotPreview ? 'Change Screenshot' : 'Choose Receipt Image'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleScreenshotChange}
                            style={{ display: 'none' }}
                          />
                        </label>

                        {screenshotPreview && (
                          <div style={{ position: 'relative' }}>
                            <img
                              src={screenshotPreview}
                              alt="Receipt Preview"
                              style={{ width: 38, height: 38, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)' }}
                            />
                            <button
                              type="button"
                              onClick={() => setScreenshotPreview(null)}
                              style={{
                                position: 'absolute', top: -5, right: -5, width: 16, height: 16,
                                borderRadius: '50%', background: 'var(--red)', color: '#fff',
                                border: 'none', cursor: 'pointer', fontSize: 10, display: 'flex',
                                alignItems: 'center', justifyContent: 'center'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="field-label">Payment Remarks / Notes (Optional)</label>
                    <input
                      value={rechargeNotes}
                      onChange={e => setRechargeNotes(e.target.value)}
                      placeholder="e.g. Paid from HDFC Bank account via Google Pay for 1 month subscription renewal"
                      className="field-input"
                      id="recharge-notes"
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <button
                      type="submit"
                      disabled={submittingProof || !utrNumber.trim()}
                      className="btn-primary"
                      style={{ padding: '9px 24px', fontSize: 13, cursor: 'pointer' }}
                    >
                      {submittingProof ? (
                        <>Submitting Verification...</>
                      ) : (
                        <>Submit Payment Proof</>
                      )}
                    </button>
                  </div>
                </form>

                {/* Past Submissions Table if any */}
                {rechargeHistory.length > 0 && (
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                      Recent Recharge Submissions
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {rechargeHistory.map((rec: any) => (
                        <div
                          key={rec.id}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 'var(--r-md)',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: 12
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              UTR: {rec.utr_number || rec.utrNumber}
                            </span>
                            <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                              · ₹{Number(rec.amount || 0).toLocaleString('en-IN')} ({rec.plan_name?.replace(/_/g, ' ') || 'Plan'})
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                              {rec.created_at ? new Date(rec.created_at).toLocaleDateString('en-IN') : 'Recent'}
                            </span>
                            {rec.status === 'VERIFIED' ? (
                              <span className="badge badge-success" style={{ fontSize: 10 }}>Verified</span>
                            ) : rec.status === 'REJECTED' ? (
                              <span className="badge badge-danger" style={{ fontSize: 10 }}>Rejected</span>
                            ) : (
                              <span className="badge badge-accent" style={{ fontSize: 10 }}>Pending Verification</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Society Resident Maintenance Collection Settings */}
              <div className="card card-p">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <CreditCard size={16} color="var(--accent-light)" />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Resident Monthly Maintenance Collection Settings
                  </h3>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Configure what your residents pay for society maintenance in the resident mobile application.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 14 }}>
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
                    <label className="field-label">Society Collection UPI VPA</label>
                    <input
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      placeholder="e.g. society@okhdfcbank"
                      className="field-input"
                      id="maint-upi"
                    />
                  </div>
                </div>

                <div style={{
                  padding: '12px 14px', borderRadius: 'var(--r-md)',
                  background: 'var(--accent-bg)', border: '1px solid var(--border-accent)',
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <CheckCircle2 size={16} color="var(--accent-light)" style={{ flexShrink: 0 }} />
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    When residents pay their maintenance via the NexGate mobile app, receipts are automatically recorded against their flat ledger and verified using this UPI VPA.
                  </p>
                </div>
              </div>

            </motion.div>
          )}

          {/* Tab 3: Admin Team & Roles (STRICTLY READ-ONLY) */}
          {activeTab === 'admins' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card card-p">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={16} color="var(--accent-light)" />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Society Administrators & Role Privileges (Read-Only)
                  </h3>
                </div>
                <span className="badge badge-accent" style={{ fontSize: 11, textTransform: 'uppercase' }}>
                  Managed by Platform Super Admin
                </span>
              </div>

              {/* Informational Enterprise Notice */}
              <div style={{
                padding: '14px 16px',
                borderRadius: 'var(--r-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-accent)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                marginBottom: 18
              }}>
                <Lock size={18} color="var(--accent-light)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <b style={{ color: 'var(--text-primary)' }}>Security Policy:</b> Society administrator accounts, login credentials, and permission tiers are centrally provisioned and audited by the <b>NexGate Platform Super Admin</b>. To onboard new administrators, rotate passwords, or modify access roles, contact Platform Support at <a href="mailto:superadmin@nexgate.co.in" style={{ color: 'var(--accent-light)', textDecoration: 'underline' }}>superadmin@nexgate.co.in</a>.
                </div>
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
                    <div className="avatar avatar-sm" style={{ background: 'var(--accent-bg)', color: 'var(--accent-light)', fontWeight: 700 }}>
                      {adm.name[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{adm.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{adm.email} · {adm.phone}</p>
                    </div>
                    <span className="badge badge-accent" style={{ fontSize: 11 }}>{adm.role}</span>
                    <span className="badge badge-muted" style={{ fontSize: 10 }}>{adm.access}</span>
                    <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={12} /> Verified Active
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Tab 4: Theme & Appearance */}
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

          {/* Bottom Save Bar (active for profile & maintenance changes) */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderRadius: 'var(--r-lg)',
            background: 'var(--bg-card)', border: '1px solid var(--border)'
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Society configuration changes take effect immediately across all resident mobile apps.
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

    </div>
  );
}

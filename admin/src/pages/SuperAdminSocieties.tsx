import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Plus,
  Search,
  Globe,
  Smartphone,
  ShieldCheck,
  CreditCard,
  User,
  ExternalLink,
  Power,
  RefreshCw,
  Copy,
  Check,
  Edit,
  X,
  IndianRupee,
  Clock,
  Sparkles,
  AlertTriangle,
  KeyRound,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Download,
} from 'lucide-react';
import {
  fetchSuperAdminSocieties,
  toggleSocietyStatus,
  updateSuperAdminSociety,
  updateSocietyAdminCredentials,
  renewSocietySubscription,
  fetchSocietyBackup,
} from '../services/api';

export default function SuperAdminSocieties() {
  const navigate = useNavigate();
  const [societies, setSocieties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [planFilter, setPlanFilter] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedSubdomain, setCopiedSubdomain] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Modal State
  const [editingSociety, setEditingSociety] = useState<any | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    subdomain: '',
    upiId: '',
    maintenanceAmount: '',
    planName: 'STANDARD_1_DEVICE',
    maxDevices: 1,
    contactEmail: '',
    contactPhone: '',
    adminName: '',
    adminEmail: '',
    adminMobile: '',
    adminPassword: '',
  });

  // Dedicated Admin Credentials Modal State
  const [credentialsSociety, setCredentialsSociety] = useState<any | null>(null);
  const [showCredentialsPassword, setShowCredentialsPassword] = useState(false);
  const [credentialsForm, setCredentialsForm] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
  });

  // Recharge / Renew Modal State
  const [rechargingSociety, setRechargingSociety] = useState<any | null>(null);
  const [rechargeForm, setRechargeForm] = useState({
    months: 1,
    planName: 'STANDARD_1_DEVICE',
    paymentMode: 'UPI',
    referenceId: '',
  });

  const loadSocieties = async () => {
    setLoading(true);
    try {
      const data = await fetchSuperAdminSocieties();
      setSocieties(data);
    } catch (err) {
      console.error('Failed to load societies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSocieties();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleStatus = async (society: any) => {
    const newStatus = society.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!window.confirm(`Are you sure you want to mark ${society.name} as ${newStatus}?`)) {
      return;
    }

    setActionLoadingId(society.id);
    try {
      await toggleSocietyStatus(society.id, newStatus);
      setSocieties((prev) =>
        prev.map((s) => (s.id === society.id ? { ...s, status: newStatus } : s))
      );
      showToast(`Society ${society.name} is now ${newStatus}`);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const copyToClipboard = (text: string, type: 'subdomain' | 'upi') => {
    navigator.clipboard.writeText(text);
    if (type === 'subdomain') {
      setCopiedSubdomain(text);
      setTimeout(() => setCopiedSubdomain(null), 2000);
    } else {
      setCopiedUpi(text);
      setTimeout(() => setCopiedUpi(null), 2000);
    }
    showToast(`Copied to clipboard: ${text}`);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  const openEditModal = (soc: any) => {
    setEditingSociety(soc);
    setShowEditPassword(false);
    setEditForm({
      name: soc.name || '',
      subdomain: soc.subdomain || '',
      upiId: soc.upiId || '',
      maintenanceAmount: String(soc.maintenanceAmount || 0),
      planName: soc.planName || 'STANDARD_1_DEVICE',
      maxDevices: soc.maxDevices || 1,
      contactEmail: soc.contactEmail || '',
      contactPhone: soc.contactPhone || '',
      adminName: soc.admin?.name || (soc.name + ' Admin'),
      adminEmail: soc.admin?.email || soc.contactEmail || '',
      adminMobile: soc.admin?.mobile || soc.contactPhone || '',
      adminPassword: '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSociety) return;
    setActionLoadingId(editingSociety.id);
    try {
      await updateSuperAdminSociety(editingSociety.id, {
        name: editForm.name,
        subdomain: editForm.subdomain,
        upiId: editForm.upiId,
        maintenanceAmount: Number(editForm.maintenanceAmount),
        planName: editForm.planName,
        maxDevices: Number(editForm.maxDevices),
        contactEmail: editForm.contactEmail,
        contactPhone: editForm.contactPhone,
        adminName: editForm.adminName,
        adminEmail: editForm.adminEmail,
        adminMobile: editForm.adminMobile,
        adminPassword: editForm.adminPassword && editForm.adminPassword.trim() ? editForm.adminPassword.trim() : undefined,
      });
      showToast('Society and admin credentials updated successfully');
      setEditingSociety(null);
      await loadSocieties();
    } catch (err: any) {
      alert(err.message || 'Failed to update society');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openCredentialsModal = (soc: any) => {
    setCredentialsSociety(soc);
    setShowCredentialsPassword(false);
    setCredentialsForm({
      name: soc.admin?.name || (soc.name + ' Admin'),
      email: soc.admin?.email || soc.contactEmail || '',
      mobile: soc.admin?.mobile || soc.contactPhone || '',
      password: '',
    });
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialsSociety) return;
    setActionLoadingId(credentialsSociety.id);
    try {
      await updateSocietyAdminCredentials(credentialsSociety.id, {
        name: credentialsForm.name,
        email: credentialsForm.email,
        mobile: credentialsForm.mobile,
        password: credentialsForm.password && credentialsForm.password.trim() ? credentialsForm.password.trim() : undefined,
      });
      showToast(`Admin login credentials updated for ${credentialsSociety.name}`);
      setCredentialsSociety(null);
      await loadSocieties();
    } catch (err: any) {
      alert(err.message || 'Failed to update credentials');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openRechargeModal = (soc: any) => {
    setRechargingSociety(soc);
    const plan =
      soc.planName === 'ENTERPRISE_3_DEVICE' || soc.planName === 'PRO_3_DEVICE'
        ? 'ENTERPRISE_3_DEVICE'
        : soc.planName === 'PREMIUM_2_DEVICE' || soc.planName === 'DUAL_2_DEVICE'
        ? 'PREMIUM_2_DEVICE'
        : 'STANDARD_1_DEVICE';

    setRechargeForm({
      months: 1,
      planName: plan,
      paymentMode: 'UPI',
      referenceId: '',
    });
  };

  const handleConfirmRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rechargingSociety) return;
    setActionLoadingId(rechargingSociety.id);
    try {
      await renewSocietySubscription(rechargingSociety.id, {
        months: Number(rechargeForm.months),
        planName: rechargeForm.planName,
        paymentMode: rechargeForm.paymentMode,
        referenceId: rechargeForm.referenceId,
      });
      showToast(`Subscription renewed for ${rechargingSociety.name}!`);
      setRechargingSociety(null);
      await loadSocieties();
    } catch (err: any) {
      alert(err.message || 'Failed to renew subscription');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadSocietyBackup = async (soc: any) => {
    try {
      showToast(`Generating complete backup for ${soc.name}...`);
      const backupData = await fetchSocietyBackup(soc.id);
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NexGate_${soc.subdomain || soc.name.replace(/\s+/g, '_')}_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded backup JSON for ${soc.name}`);
    } catch (err: any) {
      showToast(`Failed to export backup: ${err.message || 'Error'}`);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = societies.length;
    const active = societies.filter((s) => s.status === 'ACTIVE').length;
    const totalDevices = societies.reduce((acc, s) => acc + (s.totalGuards || 0), 0);
    const maxDevices = societies.reduce((acc, s) => acc + (s.maxDevices || 1), 0);
    const totalFlats = societies.reduce((acc, s) => acc + (s.totalFlats || 0), 0);
    return { total, active, inactive: total - active, totalDevices, maxDevices, totalFlats };
  }, [societies]);

  // Filtered Societies
  const filteredSocieties = useMemo(() => {
    return societies.filter((s) => {
      const matchSearch =
        search === '' ||
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.subdomain?.toLowerCase().includes(search.toLowerCase()) ||
        s.city?.toLowerCase().includes(search.toLowerCase()) ||
        s.admin?.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.upiId?.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
      const matchPlan = planFilter === 'ALL' || s.planName === planFilter;

      return matchSearch && matchStatus && matchPlan;
    });
  }, [societies, search, statusFilter, planFilter]);

  const getPlanBadge = (plan?: string) => {
    switch (plan) {
      case 'STANDARD_1_DEVICE':
      case 'STARTER_1_DEVICE':
        return { label: 'Standard (1 Device)', price: '₹1,999/mo', bg: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', border: 'rgba(59, 130, 246, 0.25)' };
      case 'PREMIUM_2_DEVICE':
      case 'DUAL_2_DEVICE':
        return { label: 'Premium (2 Devices)', price: '₹2,999/mo', bg: 'rgba(16, 185, 129, 0.1)', color: '#10B981', border: 'rgba(16, 185, 129, 0.25)' };
      case 'ENTERPRISE_3_DEVICE':
      case 'PRO_3_DEVICE':
      case 'ENTERPRISE_CUSTOM':
        return { label: 'Enterprise (3 Devices)', price: '₹3,999/mo', bg: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6', border: 'rgba(139, 92, 246, 0.25)' };
      default:
        return { label: 'Standard (1 Device)', price: '₹1,999/mo', bg: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', border: 'rgba(59, 130, 246, 0.25)' };
    }
  };

  const getSubscriptionBadge = (soc: any) => {
    const sub = soc.subscription;
    const isSuspended = soc.status === 'INACTIVE' || sub?.isSuspended;

    if (isSuspended) {
      return {
        label: 'Suspended',
        subtext: 'Kiosks Locked',
        bg: 'rgba(239, 68, 68, 0.1)',
        color: '#EF4444',
        border: 'rgba(239, 68, 68, 0.25)',
      };
    }

    if (sub?.isGracePeriod) {
      return {
        label: '⚠️ Payment Due',
        subtext: `${sub.daysRemainingInGrace}d grace left`,
        bg: 'rgba(245, 158, 11, 0.12)',
        color: '#D97706',
        border: 'rgba(245, 158, 11, 0.35)',
      };
    }

    if (sub?.isTrialActive || soc.subscriptionStatus === 'TRIAL') {
      const days = sub?.daysRemainingInTrial ?? 30;
      return {
        label: 'Free Trial',
        subtext: `${days}d trial left`,
        bg: 'rgba(6, 182, 212, 0.12)',
        color: '#0891B2',
        border: 'rgba(6, 182, 212, 0.3)',
      };
    }

    return {
      label: 'Active Paid',
      subtext: 'Subscribed',
      bg: 'rgba(16, 185, 129, 0.1)',
      color: '#10B981',
      border: 'rgba(16, 185, 129, 0.25)',
    };
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: 24,
              right: 28,
              zIndex: 9999,
              background: '#0F172A',
              color: '#F8FAFC',
              padding: '10px 18px',
              borderRadius: 8,
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
              fontSize: 13.5,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Check size={16} color="#10B981" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                background: 'rgba(37, 99, 235, 0.12)',
                color: '#2563EB',
                padding: '3px 9px',
                borderRadius: 4,
              }}
            >
              Platform Super Admin
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>• Multi-Tenant Management</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Societies Directory
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 4, marginBottom: 0 }}>
            Manage client societies, subdomains, device plans, gate limits, and active subscription status.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={loadSocieties}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => navigate('/admin/super/onboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
              borderRadius: 8,
              border: 'none',
              background: '#2563EB',
              color: '#FFFFFF',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
            }}
          >
            <Plus size={16} />
            Onboard New Society
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Societies</span>
            <Building2 size={18} color="#2563EB" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{metrics.total}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            <span style={{ color: '#10B981', fontWeight: 600 }}>{metrics.active} Active</span> •{' '}
            <span style={{ color: '#EF4444', fontWeight: 600 }}>{metrics.inactive} Inactive</span>
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gate Devices</span>
            <Smartphone size={18} color="#10B981" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
            {metrics.totalDevices} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>/ {metrics.maxDevices} allocated</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Live guard kiosks configured</div>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Configured Flats</span>
            <ShieldCheck size={18} color="#8B5CF6" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{metrics.totalFlats}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Residential flats mapped</div>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>SaaS Device Billing</span>
            <CreditCard size={18} color="#F59E0B" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
            ₹{societies.reduce((acc, s) => acc + (s.planAmount || 0), 0).toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Monthly subscription pipeline</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 240 }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search society by name, subdomain, city, admin, or UPI ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: 13.5,
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-base)',
              color: 'var(--text-primary)',
              fontSize: 12.5,
            }}
          >
            <option value="ALL">All Device Plans</option>
            <option value="STANDARD_1_DEVICE">Standard (1 Device) - ₹1,999</option>
            <option value="PREMIUM_2_DEVICE">Premium (2 Devices) - ₹2,999</option>
            <option value="ENTERPRISE_3_DEVICE">Enterprise (3 Devices) - ₹3,999</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-base)',
              color: 'var(--text-primary)',
              fontSize: 12.5,
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Societies</option>
            <option value="INACTIVE">Inactive / Suspended</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Society & Subdomain</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Device Plan</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Guard Limit</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Subscription & Trial</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Maintenance & UPI</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Society Admin</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading societies directory...
                  </td>
                </tr>
              ) : filteredSocieties.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No societies found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredSocieties.map((soc) => {
                  const planBadge = getPlanBadge(soc.planName);
                  const isSuspended = soc.status === 'INACTIVE';
                  const fullDomain = soc.subdomain ? `${soc.subdomain}.nexgate.co.in` : 'Standard Domain';

                  return (
                    <tr
                      key={soc.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: isSuspended ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Society Name & Subdomain */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 8,
                              background: isSuspended ? 'rgba(239,68,68,0.1)' : 'rgba(37,99,235,0.1)',
                              color: isSuspended ? '#EF4444' : '#2563EB',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 14,
                              flexShrink: 0,
                            }}
                          >
                            {soc.logoUrl ? (
                              <img src={soc.logoUrl} alt={soc.name} style={{ width: '100%', height: '100%', borderRadius: 8, objectFit: 'cover' }} />
                            ) : (
                              soc.name?.slice(0, 2).toUpperCase() || 'SO'
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13.5 }}>
                              {soc.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                              <span
                                onClick={() => soc.subdomain && copyToClipboard(fullDomain, 'subdomain')}
                                style={{
                                  fontSize: 11.5,
                                  fontFamily: 'monospace',
                                  color: soc.subdomain ? '#2563EB' : 'var(--text-muted)',
                                  background: soc.subdomain ? 'rgba(37,99,235,0.08)' : 'var(--bg-base)',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  cursor: soc.subdomain ? 'pointer' : 'default',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                                title="Click to copy full subdomain"
                              >
                                <Globe size={11} />
                                {fullDomain}
                                {copiedSubdomain === fullDomain ? <Check size={11} color="#10B981" /> : <Copy size={10} />}
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {soc.city ? `• ${soc.city}` : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Device Plan */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: 11.5,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: planBadge.bg,
                            color: planBadge.color,
                            border: `1px solid ${planBadge.border}`,
                          }}
                        >
                          {planBadge.label}
                        </span>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                          ₹{(soc.planAmount || 0).toLocaleString()} / {soc.billingCycle?.toLowerCase() || 'monthly'}
                        </div>
                      </td>

                      {/* Guard Devices Limit */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 13.5,
                              color: soc.activeDevices >= (soc.maxDevices || 1) ? '#F59E0B' : '#10B981',
                            }}
                          >
                            {soc.activeDevices || 0} / {soc.maxDevices || 1}
                          </div>
                          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Devices</span>
                        </div>
                        <div
                          style={{
                            width: 90,
                            height: 5,
                            background: 'var(--border)',
                            borderRadius: 3,
                            marginTop: 5,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, ((soc.activeDevices || 0) / (soc.maxDevices || 1)) * 100)}%`,
                              height: '100%',
                              background: soc.activeDevices >= (soc.maxDevices || 1) ? '#F59E0B' : '#10B981',
                              borderRadius: 3,
                            }}
                          />
                        </div>
                      </td>

                      {/* Subscription & Trial */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                        {(() => {
                          const subBadge = getSubscriptionBadge(soc);
                          return (
                            <div>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  background: subBadge.bg,
                                  color: subBadge.color,
                                  border: `1px solid ${subBadge.border}`,
                                }}
                              >
                                {subBadge.label}
                              </span>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                {subBadge.subtext}
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Maintenance & UPI ID */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                        {soc.upiId ? (
                          <div>
                            <span
                              onClick={() => copyToClipboard(soc.upiId, 'upi')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 12,
                                fontWeight: 500,
                                color: 'var(--text-primary)',
                                background: 'var(--bg-base)',
                                border: '1px solid var(--border)',
                                padding: '3px 7px',
                                borderRadius: 5,
                                cursor: 'pointer',
                              }}
                              title="Click to copy UPI ID"
                            >
                              <CreditCard size={12} color="#10B981" />
                              {soc.upiId}
                              {copiedUpi === soc.upiId ? <Check size={11} color="#10B981" /> : <Copy size={11} color="var(--text-muted)" />}
                            </span>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                              Maint: ₹{(soc.maintenanceAmount || 0).toLocaleString()} (Due {soc.maintenanceDueDay || 5}th)
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No UPI Configured
                          </span>
                        )}
                      </td>

                      {/* Society Admin */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                        {soc.admin ? (
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 5 }}>
                              <User size={13} color="var(--accent-light, #6366f1)" />
                              {soc.admin.name}
                            </div>
                            {soc.admin.email && (
                              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Mail size={11} color="var(--text-muted)" />
                                <span>{soc.admin.email}</span>
                              </div>
                            )}
                            {soc.admin.mobile && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                                {soc.admin.mobile}
                              </div>
                            )}
                            <button
                              onClick={() => openCredentialsModal(soc)}
                              style={{
                                marginTop: 4,
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--accent-light, #6366f1)',
                                fontSize: 11,
                                cursor: 'pointer',
                                padding: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                textDecoration: 'underline',
                              }}
                            >
                              <KeyRound size={10} />
                              Update email/password
                            </button>
                          </div>
                        ) : (
                          <div>
                            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Unassigned</span>
                            <button
                              onClick={() => openCredentialsModal(soc)}
                              style={{
                                display: 'block',
                                marginTop: 3,
                                fontSize: 11,
                                color: '#2563EB',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                textDecoration: 'underline',
                              }}
                            >
                              + Set Admin Login
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 11.5,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 20,
                            background: isSuspended ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: isSuspended ? '#EF4444' : '#10B981',
                            border: `1px solid ${isSuspended ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: isSuspended ? '#EF4444' : '#10B981',
                            }}
                          />
                          {soc.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={() => openRechargeModal(soc)}
                            title="Recharge or extend society subscription"
                            style={{
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              background: 'rgba(16, 185, 129, 0.08)',
                              color: '#10B981',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            <CreditCard size={12} />
                            Recharge
                          </button>

                          <button
                            onClick={() => openCredentialsModal(soc)}
                            title="Update Admin Login Email and Password"
                            style={{
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              background: 'rgba(99, 102, 241, 0.08)',
                              color: 'var(--accent-light, #6366f1)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            <KeyRound size={12} />
                            Credentials
                          </button>

                          <button
                            onClick={() => openEditModal(soc)}
                            title="Edit Plan, Devices, or UPI ID"
                            style={{
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                              background: 'var(--bg-base)',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                            }}
                          >
                            <Edit size={12} />
                            Edit
                          </button>

                          <button
                            onClick={() => handleDownloadSocietyBackup(soc)}
                            title="Download complete society JSON backup"
                            style={{
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              background: 'rgba(59, 130, 246, 0.08)',
                              color: '#3B82F6',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            <Download size={12} />
                            Backup
                          </button>

                          <button
                            onClick={() => handleToggleStatus(soc)}
                            disabled={actionLoadingId === soc.id}
                            title={isSuspended ? 'Activate Society' : 'Suspend Society'}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: isSuspended ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                              background: isSuspended ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: isSuspended ? '#10B981' : '#EF4444',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                              fontWeight: 500,
                            }}
                          >
                            <Power size={12} />
                            {isSuspended ? 'Activate' : 'Suspend'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECHARGE / RENEW SUBSCRIPTION MODAL */}
      <AnimatePresence>
        {rechargingSociety && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                width: '100%',
                maxWidth: 500,
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: 'var(--shadow-xl)',
                padding: '24px 28px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={18} color="#10B981" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Recharge / Renew Subscription
                    </h3>
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)' }}>
                      {rechargingSociety.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRechargingSociety(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmRecharge} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Plan Selection */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Choose Device Plan *
                  </label>
                  <select
                    value={rechargeForm.planName}
                    onChange={(e) => setRechargeForm({ ...rechargeForm, planName: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}
                  >
                    <option value="STANDARD_1_DEVICE">Standard (1 Device) — ₹1,999/mo</option>
                    <option value="PREMIUM_2_DEVICE">Premium (2 Devices) — ₹2,999/mo</option>
                    <option value="ENTERPRISE_3_DEVICE">Enterprise (3 Devices) — ₹3,999/mo</option>
                  </select>
                </div>

                {/* Duration */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Recharge Duration *
                    </label>
                    <select
                      value={rechargeForm.months}
                      onChange={(e) => setRechargeForm({ ...rechargeForm, months: Number(e.target.value) })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
                    >
                      <option value={1}>1 Month</option>
                      <option value={3}>3 Months</option>
                      <option value={6}>6 Months</option>
                      <option value={12}>12 Months (1 Year)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Payment Method
                    </label>
                    <select
                      value={rechargeForm.paymentMode}
                      onChange={(e) => setRechargeForm({ ...rechargeForm, paymentMode: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
                    >
                      <option value="UPI">UPI Payment</option>
                      <option value="NET_BANKING">Net Banking / NEFT</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CASH">Cash / Offline</option>
                    </select>
                  </div>
                </div>

                {/* Reference ID / UTR */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Transaction Reference / UTR (Optional)
                  </label>
                  <input
                    type="text"
                    value={rechargeForm.referenceId}
                    onChange={(e) => setRechargeForm({ ...rechargeForm, referenceId: e.target.value })}
                    placeholder="e.g. UPI Ref 3291823910"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
                  />
                </div>

                {/* Amount Summary */}
                {(() => {
                  const rate = rechargeForm.planName === 'ENTERPRISE_3_DEVICE' ? 3999 : rechargeForm.planName === 'PREMIUM_2_DEVICE' ? 2999 : 1999;
                  const total = rate * Number(rechargeForm.months);
                  return (
                    <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Amount to Bill</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#10B981' }}>
                          ₹{total.toLocaleString()}
                        </div>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', textAlign: 'right' }}>
                        ₹{rate.toLocaleString()}/mo × {rechargeForm.months} month(s)
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => setRechargingSociety(null)}
                    style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoadingId !== null}
                    style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#10B981', color: '#FFF', fontWeight: 600, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Check size={14} />
                    Confirm Recharge & Activate
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT SOCIETY MODAL */}
      <AnimatePresence>
        {editingSociety && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                width: '100%',
                maxWidth: 520,
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: 'var(--shadow-xl)',
                padding: '24px 28px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Edit Society Configuration
                  </h3>
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)' }}>
                    {editingSociety.name}
                  </p>
                </div>
                <button
                  onClick={() => setEditingSociety(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Society Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Subdomain Prefix
                    </label>
                    <input
                      type="text"
                      value={editForm.subdomain}
                      onChange={(e) => setEditForm({ ...editForm, subdomain: e.target.value })}
                      placeholder="e.g. eco"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Device Plan
                    </label>
                    <select
                      value={editForm.planName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const devs = val === 'ENTERPRISE_3_DEVICE' ? 3 : val === 'PREMIUM_2_DEVICE' ? 2 : 1;
                        setEditForm({ ...editForm, planName: val, maxDevices: devs });
                      }}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
                    >
                      <option value="STANDARD_1_DEVICE">Standard (1 Device) - ₹1,999/mo</option>
                      <option value="PREMIUM_2_DEVICE">Premium (2 Devices) - ₹2,999/mo</option>
                      <option value="ENTERPRISE_3_DEVICE">Enterprise (3 Devices) - ₹3,999/mo</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Max Allowed Devices (Guards)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={editForm.maxDevices}
                      onChange={(e) => setEditForm({ ...editForm, maxDevices: Number(e.target.value) })}
                      required
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Maintenance Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={editForm.maintenanceAmount}
                      onChange={(e) => setEditForm({ ...editForm, maintenanceAmount: e.target.value })}
                      placeholder="e.g. 2500"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Society UPI ID (For In-App Maintenance Payments)
                  </label>
                  <input
                    type="text"
                    value={editForm.upiId}
                    onChange={(e) => setEditForm({ ...editForm, upiId: e.target.value })}
                    placeholder="e.g. your-society@okhdfcbank"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 3 }}>
                    Residents will use this UPI ID to pay monthly maintenance directly inside the mobile app.
                  </span>
                </div>

                {/* Society Admin Account Credentials Section */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <KeyRound size={15} color="#2563EB" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Society Admin Login Account
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                        Admin Name
                      </label>
                      <input
                        type="text"
                        value={editForm.adminName}
                        onChange={(e) => setEditForm({ ...editForm, adminName: e.target.value })}
                        placeholder="e.g. Rahul Sharma"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                        Admin Mobile (10-digits)
                      </label>
                      <input
                        type="tel"
                        value={editForm.adminMobile}
                        onChange={(e) => setEditForm({ ...editForm, adminMobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        placeholder="e.g. 9876543210"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Admin Login Email
                    </label>
                    <input
                      type="email"
                      value={editForm.adminEmail}
                      onChange={(e) => setEditForm({ ...editForm, adminEmail: e.target.value })}
                      placeholder="e.g. admin@society.nexgate.co.in"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 3 }}>
                      Used to log into the Admin Portal at this society's subdomain.
                    </span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Update Admin Password (Optional)
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, adminPassword: generateRandomPassword() })}
                        style={{ background: 'transparent', border: 'none', color: '#2563EB', fontSize: 11, cursor: 'pointer', padding: 0 }}
                      >
                        Generate Password
                      </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        value={editForm.adminPassword}
                        onChange={(e) => setEditForm({ ...editForm, adminPassword: e.target.value })}
                        placeholder="Leave blank to keep existing password"
                        style={{ width: '100%', padding: '8px 36px 8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        {showEditPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={() => setEditingSociety(null)}
                    style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoadingId !== null}
                    style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#2563EB', color: '#FFF', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DEDICATED ADMIN CREDENTIALS MODAL */}
      <AnimatePresence>
        {credentialsSociety && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                width: '100%',
                maxWidth: 480,
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: 'var(--shadow-xl)',
                padding: '24px 28px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <KeyRound size={18} color="#2563EB" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Update Admin Credentials
                    </h3>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                      {credentialsSociety.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCredentialsSociety(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Subdomain pill info */}
              {credentialsSociety.subdomain && (
                <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Portal Login URL:</span>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-light, #6366f1)' }}>
                    {credentialsSociety.subdomain}.nexgate.co.in
                  </span>
                </div>
              )}

              <form onSubmit={handleSaveCredentials} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Admin Full Name
                  </label>
                  <input
                    type="text"
                    value={credentialsForm.name}
                    onChange={(e) => setCredentialsForm({ ...credentialsForm, name: e.target.value })}
                    required
                    placeholder="e.g. Rahul Sharma"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Admin Login Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      value={credentialsForm.email}
                      onChange={(e) => setCredentialsForm({ ...credentialsForm, email: e.target.value })}
                      required
                      placeholder="e.g. admin@society.nexgate.co.in"
                      style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
                    />
                    <Mail size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 3 }}>
                    The admin will use this email address to log in to the admin portal.
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Admin Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={credentialsForm.mobile}
                    onChange={(e) => setCredentialsForm({ ...credentialsForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    required
                    placeholder="10-digit mobile number"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      New Password (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setCredentialsForm({ ...credentialsForm, password: generateRandomPassword() })}
                      style={{ background: 'transparent', border: 'none', color: '#2563EB', fontSize: 11, cursor: 'pointer', padding: 0 }}
                    >
                      Generate Password
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCredentialsPassword ? 'text' : 'password'}
                      value={credentialsForm.password}
                      onChange={(e) => setCredentialsForm({ ...credentialsForm, password: e.target.value })}
                      placeholder="Leave blank to keep current password"
                      style={{ width: '100%', padding: '9px 36px 9px 34px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
                    />
                    <Lock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                    <button
                      type="button"
                      onClick={() => setShowCredentialsPassword(!showCredentialsPassword)}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {showCredentialsPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 3 }}>
                    Minimum 6 characters. If changed, the admin must use this new password immediately.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => setCredentialsSociety(null)}
                    style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoadingId !== null}
                    style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#2563EB', color: '#FFF', fontWeight: 600, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Check size={14} />
                    Update Credentials
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

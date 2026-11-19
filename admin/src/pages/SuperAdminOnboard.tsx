import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Globe,
  CreditCard,
  ShieldCheck,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Smartphone,
  Eye,
  EyeOff,
  Copy,
  Check,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { onboardSociety } from '../services/api';

const DEVICE_PLANS = [
  {
    id: 'STANDARD_1_DEVICE',
    name: 'Standard (1 Device)',
    devices: 1,
    tagline: 'Ideal for standalone societies & small apartment complexes',
    priceMonthly: 1999,
    priceAnnually: 19990,
    trialNotice: '30-Day Free Trial Included',
    features: [
      '1 Concurrent Guard Kiosk Device',
      '30-Day Free Full Access Trial',
      '7-Day Grace Period Protection',
      'Unlimited Resident Mobile Apps',
      'Digital QR Visitor Passes & Approvals',
      'Resident Maintenance UPI Integration',
    ],
    recommended: false,
  },
  {
    id: 'PREMIUM_2_DEVICE',
    name: 'Premium (2 Devices)',
    devices: 2,
    tagline: 'Mid-sized societies with Main Entrance + Back / Service Gate',
    priceMonthly: 2999,
    priceAnnually: 29990,
    trialNotice: '30-Day Free Trial Included',
    features: [
      '2 Concurrent Guard Kiosk Devices',
      '30-Day Free Full Access Trial',
      '7-Day Grace Period Protection',
      'Multi-Gate Realtime Sync & Handover',
      'Delivery Vendor & Daily Staff Queueing',
      'Resident Maintenance UPI Integration',
    ],
    recommended: true,
  },
  {
    id: 'ENTERPRISE_3_DEVICE',
    name: 'Enterprise (3 Devices)',
    devices: 3,
    tagline: 'Multi-tower societies & integrated residential estates',
    priceMonthly: 3999,
    priceAnnually: 39990,
    trialNotice: '30-Day Free Trial Included',
    features: [
      '3 Concurrent Guard Kiosk Devices',
      '30-Day Free Full Access Trial',
      '7-Day Grace Period Protection',
      'Multi-Tower Traffic & Inter-Gate Routing',
      'Vehicle Blacklisting & Incident Logs',
      'Resident Maintenance UPI Integration',
    ],
    recommended: false,
  },
];

export default function SuperAdminOnboard() {
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Society Profile & Subdomain
    name: '',
    subdomain: '',
    address: '',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    contactEmail: '',
    contactPhone: '',
    logoUrl: '',

    // Step 2: Maintenance & UPI
    upiId: '',
    maintenanceAmount: '2500',
    maintenanceDueDay: 5,

    // Step 3: Plan & Devices
    planName: 'STANDARD_1_DEVICE',
    maxDevices: 1,
    billingCycle: 'MONTHLY',

    // Step 4: Initial Gate & Admin User
    initialGateName: 'Main Entrance Gate',
    adminName: '',
    adminMobile: '',
    adminEmail: '',
    adminPassword: 'Admin@1234',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Handle subdomain auto-generation from society name
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 20);

    setFormData((prev) => ({
      ...prev,
      name,
      subdomain: prev.subdomain ? prev.subdomain : slug,
    }));
  };

  const handlePlanSelect = (plan: typeof DEVICE_PLANS[0]) => {
    setFormData((prev) => ({
      ...prev,
      planName: plan.id,
      maxDevices: plan.devices,
    }));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic Validations
    if (!formData.name.trim()) {
      setError('Please provide the Society Name.');
      setLoading(false);
      return;
    }
    if (!formData.address.trim()) {
      setError('Please provide the full street address.');
      setLoading(false);
      return;
    }
    if (!formData.adminName.trim() || !formData.adminMobile.trim() || !formData.adminPassword.trim()) {
      setError('Please provide Admin Name, Mobile Number, and Password.');
      setLoading(false);
      return;
    }

    const cleanMobile = formData.adminMobile.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length < 10) {
      setError('Admin mobile must be a valid 10-digit number.');
      setLoading(false);
      return;
    }

    try {
      const selectedPlanObj = DEVICE_PLANS.find((p) => p.id === formData.planName);
      const planAmount =
        formData.billingCycle === 'ANNUALLY'
          ? (selectedPlanObj?.priceAnnually || 9990)
          : (selectedPlanObj?.priceMonthly || 999);

      const result = await onboardSociety({
        name: formData.name.trim(),
        subdomain: formData.subdomain.trim().toLowerCase(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        contactEmail: formData.contactEmail.trim() || undefined,
        contactPhone: formData.contactPhone.trim() || undefined,
        logoUrl: formData.logoUrl.trim() || undefined,
        upiId: formData.upiId.trim() || undefined,
        maintenanceAmount: Number(formData.maintenanceAmount || 0),
        maintenanceDueDay: Number(formData.maintenanceDueDay || 5),
        planName: formData.planName,
        maxDevices: Number(formData.maxDevices),
        planAmount,
        billingCycle: formData.billingCycle,
        initialGateName: formData.initialGateName.trim(),
        adminName: formData.adminName.trim(),
        adminMobile: cleanMobile,
        adminEmail: formData.adminEmail.trim() || undefined,
        adminPassword: formData.adminPassword.trim(),
      });

      setSuccessResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to onboard society. Please verify details.');
    } finally {
      setLoading(false);
    }
  };

  const fullDomainPreview = formData.subdomain
    ? `${formData.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '')}.nexgate.co.in`
    : 'your-society.nexgate.co.in';

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1040, margin: '0 auto' }}>
      {/* Back button */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => navigate('/admin/super/societies')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: 13,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <ArrowLeft size={16} />
          Back to Societies Directory
        </button>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
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
            Society Onboarding Wizard
          </span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          Onboard New Society
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 4, marginBottom: 0 }}>
          Provision society infrastructure, configure subdomains, choose device subscription plans, and setup maintenance UPI.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#EF4444',
            marginBottom: 24,
            fontSize: 13.5,
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* SECTION 1: SOCIETY IDENTITY & SUBDOMAIN */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Building2 size={20} color="#2563EB" />
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                1. Society Profile & Subdomain
              </h2>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                Basic society identification and custom portal web address.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                Official Society Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Sunrise Greens Co-operative Housing Society"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '9px 13px',
                  borderRadius: 7,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  fontSize: 13.5,
                }}
              />
            </div>

            {/* Subdomain Input with Live Preview */}
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                Society Subdomain (For Dedicated Portal Access) *
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    placeholder="e.g. sunrisegreens"
                    value={formData.subdomain}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                      })
                    }
                    required
                    style={{
                      width: '100%',
                      padding: '9px 13px',
                      borderRadius: 7,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-base)',
                      color: 'var(--text-primary)',
                      fontSize: 13.5,
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
                <span style={{ fontSize: 13.5, color: 'var(--text-muted)', fontWeight: 600 }}>.nexgate.co.in</span>
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: '#2563EB',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'rgba(37, 99, 235, 0.08)',
                  padding: '3px 8px',
                  borderRadius: 5,
                }}
              >
                <Globe size={12} />
                Live Portal URL: <strong>https://{fullDomainPreview}</strong>
              </div>
            </div>

            {/* Street Address */}
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                Physical Address *
              </label>
              <input
                type="text"
                placeholder="Plot / Sector / Landmark Road, Area"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '9px 13px',
                  borderRadius: 7,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  fontSize: 13.5,
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  State *
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Pincode *
                </label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
                />
              </div>
            </div>

            {/* Logo URL */}
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                Logo Image URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://example.com/society-logo.png"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 13px',
                  borderRadius: 7,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  fontSize: 13.5,
                }}
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: MAINTENANCE & UPI INTEGRATION */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <CreditCard size={20} color="#10B981" />
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                2. Maintenance & UPI Payment Integration
              </h2>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                Allows flat residents to pay society maintenance fees directly via UPI in the NexGate mobile app.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                Society Official UPI ID (e.g. HDFC / SBI / ICICI / BHIM)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="e.g. sunrisegreens@okhdfcbank"
                  value={formData.upiId}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value.trim() })}
                  style={{
                    width: '100%',
                    padding: '9px 13px',
                    borderRadius: 7,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-base)',
                    color: 'var(--text-primary)',
                    fontSize: 13.5,
                    fontFamily: 'monospace',
                  }}
                />
              </div>
              {formData.upiId && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: '#10B981',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(16, 185, 129, 0.08)',
                    padding: '3px 8px',
                    borderRadius: 5,
                  }}
                >
                  <QrCode size={13} />
                  In-App URI Preview: <code>upi://pay?pa={formData.upiId}&pn={encodeURIComponent(formData.name || 'Society')}&cu=INR</code>
                </div>
              )}
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                Default Monthly Maintenance (₹)
              </label>
              <input
                type="number"
                min={0}
                placeholder="2500"
                value={formData.maintenanceAmount}
                onChange={(e) => setFormData({ ...formData, maintenanceAmount: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 13px',
                  borderRadius: 7,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  fontSize: 13.5,
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                Payment Due Day of Month
              </label>
              <input
                type="number"
                min={1}
                max={28}
                value={formData.maintenanceDueDay}
                onChange={(e) => setFormData({ ...formData, maintenanceDueDay: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '9px 13px',
                  borderRadius: 7,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  fontSize: 13.5,
                }}
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: SUBSCRIPTION & DEVICE PLAN */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Smartphone size={20} color="#8B5CF6" />
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  3. Device Plan & Security Gate Kiosks
                </h2>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                  Billing is charged based on the number of physical guard kiosk devices registered at entry gates.
                </p>
              </div>
            </div>

            {/* Billing Cycle Toggle */}
            <div style={{ display: 'flex', background: 'var(--bg-base)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, billingCycle: 'MONTHLY' })}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: formData.billingCycle === 'MONTHLY' ? '#2563EB' : 'transparent',
                  color: formData.billingCycle === 'MONTHLY' ? '#FFF' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, billingCycle: 'ANNUALLY' })}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: formData.billingCycle === 'ANNUALLY' ? '#2563EB' : 'transparent',
                  color: formData.billingCycle === 'ANNUALLY' ? '#FFF' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Annually (2 Mo Free)
              </button>
            </div>
          </div>

          {/* Trial & Grace Period Highlight Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'linear-gradient(90deg, rgba(37, 99, 235, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16,
            }}
          >
            <Sparkles size={20} color="#2563EB" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.45 }}>
              <strong style={{ color: '#2563EB' }}>1-Month Free Trial on All Plans:</strong> Every newly onboarded society starts with a{' '}
              <strong>30-day complimentary trial</strong>. After 1 month, an automated <strong>1-week grace period</strong> alerts the admin for payment renewal with QR & UPI recharge notifications before gate devices lock.
            </div>
          </div>

          {/* Plan Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {DEVICE_PLANS.map((plan) => {
              const isSelected = formData.planName === plan.id;
              const price = formData.billingCycle === 'ANNUALLY' ? plan.priceAnnually : plan.priceMonthly;

              return (
                <div
                  key={plan.id}
                  onClick={() => handlePlanSelect(plan)}
                  style={{
                    border: isSelected ? '2px solid #2563EB' : '1px solid var(--border)',
                    background: isSelected ? 'rgba(37, 99, 235, 0.04)' : 'var(--bg-base)',
                    borderRadius: 10,
                    padding: '18px 16px',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {plan.recommended && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -9,
                        right: 12,
                        background: '#2563EB',
                        color: '#FFF',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 10,
                        letterSpacing: '0.04em',
                      }}
                    >
                      POPULAR
                    </span>
                  )}

                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {plan.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', minHeight: 32, marginBottom: 12 }}>
                    {plan.tagline}
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                      ₹{price.toLocaleString()}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      /{formData.billingCycle === 'ANNUALLY' ? 'yr' : 'mo'}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      color: isSelected ? '#2563EB' : 'var(--text-secondary)',
                      background: isSelected ? 'rgba(37, 99, 235, 0.1)' : 'var(--border)',
                      padding: '3px 8px',
                      borderRadius: 4,
                      marginBottom: 12,
                    }}
                  >
                    <Smartphone size={12} />
                    {plan.devices} Guard Device{plan.devices > 1 ? 's' : ''} Limit
                  </div>

                  <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, color: 'var(--text-secondary)' }}>
                    {plan.features.slice(0, 3).map((f, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Check size={12} color="#10B981" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Custom Device Limit Override */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              <strong>Active Device Limit Enforcement:</strong> The society administrator will be restricted from registering more than{' '}
              <strong style={{ color: '#2563EB' }}>{formData.maxDevices} device(s)</strong>.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Device Limit:</label>
              <input
                type="number"
                min={1}
                max={50}
                value={formData.maxDevices}
                onChange={(e) => setFormData({ ...formData, maxDevices: Number(e.target.value) })}
                style={{ width: 64, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', textAlign: 'center', fontSize: 13, fontWeight: 700 }}
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: INITIAL GATE & SOCIETY ADMIN ACCOUNT */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <User size={20} color="#F59E0B" />
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                4. Primary Society Administrator & Gate Setup
              </h2>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                Provision the credentials for the society secretary / manager to log into their portal.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                Primary Gate Name *
              </label>
              <input
                type="text"
                value={formData.initialGateName}
                onChange={(e) => setFormData({ ...formData, initialGateName: e.target.value })}
                required
                style={{ width: '100%', padding: '9px 13px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13.5 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                Admin Full Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Rajesh Sharma (Secretary)"
                value={formData.adminName}
                onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                required
                style={{ width: '100%', padding: '9px 13px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13.5 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                Admin 10-Digit Mobile Number *
              </label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                maxLength={10}
                value={formData.adminMobile}
                onChange={(e) => setFormData({ ...formData, adminMobile: e.target.value })}
                required
                style={{ width: '100%', padding: '9px 13px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13.5 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                Admin Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. admin@sunrise.co.in"
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                style={{ width: '100%', padding: '9px 13px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13.5 }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                Admin Password *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.adminPassword}
                  onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                  required
                  style={{ width: '100%', padding: '9px 40px 9px 13px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13.5 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => navigate('/admin/super/societies')}
            style={{
              padding: '11px 22px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '11px 28px',
              borderRadius: 8,
              border: 'none',
              background: '#2563EB',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
            }}
          >
            <Sparkles size={16} />
            {loading ? 'Onboarding Society...' : 'Deploy & Onboard Society'}
          </button>
        </div>
      </form>

      {/* SUCCESS MODAL */}
      <AnimatePresence>
        {successResult && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                width: '100%',
                maxWidth: 540,
                boxShadow: 'var(--shadow-2xl)',
                padding: '32px 36px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 18px',
                }}
              >
                <CheckCircle2 size={32} color="#10B981" />
              </div>

              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                Society Successfully Onboarded!
              </h2>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 24 }}>
                <strong>{successResult.society.name}</strong> is live with dedicated subdomain access and device plan allocation.
              </p>

              {/* Summary Cards */}
              <div
                style={{
                  textAlign: 'left',
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 18,
                  marginBottom: 24,
                  fontSize: 13,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Portal Web Address:</span>
                  <span
                    onClick={() => handleCopy(`https://${successResult.society.fullDomain}`)}
                    style={{ fontWeight: 600, color: '#2563EB', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    https://{successResult.society.fullDomain || 'standard'}
                    <Copy size={12} />
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Device Plan:</span>
                  <span style={{ fontWeight: 600, color: '#10B981' }}>
                    {successResult.society.planName} ({successResult.society.maxDevices} Guard Devices Limit)
                  </span>
                </div>

                {successResult.society.upiId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Maintenance UPI ID:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {successResult.society.upiId}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Admin Login:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {successResult.admin.mobile} / {successResult.admin.email || 'N/A'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Default Gate:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {successResult.gate.name}
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigate('/admin/super/societies')}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#2563EB',
                  color: '#FFF',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                View in Societies Directory
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

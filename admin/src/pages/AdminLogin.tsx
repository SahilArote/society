import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  Globe,
  Sparkles,
  ArrowRight,
  Check,
} from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { adminLogin, fetchPublicSocietyBySubdomain } from '../services/api';
import { extractSubdomainFromUrl, setExplicitSubdomain } from '../utils/subdomain';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Subdomain & Society Branding State
  const [subdomain, setSubdomain] = useState<string | null>(() => extractSubdomainFromUrl());
  const [society, setSociety] = useState<any | null>(null);
  const [subdomainInput, setSubdomainInput] = useState('');
  const [showSubdomainModal, setShowSubdomainModal] = useState(false);
  const [loadingSociety, setLoadingSociety] = useState(false);

  useEffect(() => {
    const detected = extractSubdomainFromUrl();
    setSubdomain(detected);
    if (detected) {
      setLoadingSociety(true);
      fetchPublicSocietyBySubdomain(detected)
        .then((data) => {
          if (data) {
            setSociety(data);
            localStorage.setItem('gg_admin_society_settings', JSON.stringify(data));
          }
        })
        .finally(() => setLoadingSociety(false));
    }
  }, []);

  const handleApplySubdomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subdomainInput.trim()) return;
    const clean = subdomainInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    setExplicitSubdomain(clean);
    setSubdomain(clean);
    setShowSubdomainModal(false);
    setLoadingSociety(true);
    const data = await fetchPublicSocietyBySubdomain(clean);
    if (data) {
      setSociety(data);
      localStorage.setItem('gg_admin_society_settings', JSON.stringify(data));
    }
    setLoadingSociety(false);
  };

  const handleResetSubdomain = () => {
    setExplicitSubdomain(null);
    setSubdomain(null);
    setSociety(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await adminLogin(email, password);
      if (result.user?.role === 'SUPER_ADMIN') {
        navigate('/admin/super/societies');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        position: 'relative',
      }}
    >
      {/* Top right controls */}
      <div style={{ position: 'absolute', top: 20, right: 24, zIndex: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => setShowSubdomainModal(true)}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          title="Switch or test society subdomain (e.g. eco, omkar-meredia)"
        >
          <Globe size={13} color="#2563EB" />
          {subdomain ? `Subdomain: ${subdomain}` : 'Test Subdomain'}
        </button>

        <ThemeToggle variant="segmented" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-xl)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-xl)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ padding: '36px 32px 32px' }}>
          {/* LOGO & DYNAMIC SOCIETY HEADER */}
          <div style={{ textAlign: 'center', marginBottom: 26 }}>
            {/* NexGate Logo paired with Society Identity */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 14 }}>
              <img
                src="/assets/images/nexgate_icon_rounded.svg"
                alt="NexGate Logo"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 'var(--r-md)',
                  display: 'block',
                  objectFit: 'contain',
                }}
              />
              {society?.logoUrl && (
                <>
                  <span style={{ fontSize: 18, color: 'var(--border)', fontWeight: 300 }}>×</span>
                  <img
                    src={society.logoUrl}
                    alt={society.name}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 'var(--r-md)',
                      display: 'block',
                      objectFit: 'cover',
                      border: '1px solid var(--border)',
                    }}
                  />
                </>
              )}
            </div>

            {/* Society Name or Platform Branding */}
            {society ? (
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(37,99,235,0.08)', padding: '2px 8px', borderRadius: 4, marginBottom: 6 }}>
                  <Building2 size={12} color="#2563EB" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', fontFamily: 'monospace' }}>
                    {society.subdomain || subdomain}.nexgate.co.in
                  </span>
                </div>
                <h1
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 21,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    lineHeight: 1.25,
                    marginBottom: 4,
                  }}
                >
                  {society.name}
                </h1>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                  Secured by NexGate Gate Automation · {society.city || 'Smart Security'}
                </p>
              </div>
            ) : (
              <div>
                <h1
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    lineHeight: 1.2,
                    marginBottom: 4,
                  }}
                >
                  NexGate Admin
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                  Enterprise Society & Gate Management
                </p>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 'var(--r-md)',
                  background: 'var(--red-bg)',
                  border: '1px solid rgba(239,68,68,0.25)',
                }}
              >
                <AlertCircle size={14} color="var(--red)" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 12.5, color: 'var(--red)', lineHeight: 1.4, margin: 0 }}>{error}</p>
              </motion.div>
            )}

            {/* Email / Mobile */}
            <div>
              <label className="field-label" htmlFor="admin-email">
                Email Address or Admin Mobile
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={15}
                  color="var(--text-muted)"
                  style={{
                    position: 'absolute',
                    left: 13,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                />
                <input
                  id="admin-email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field-input"
                  style={{ paddingLeft: 38 }}
                  placeholder="admin@nexgate.co.in or 9876543210"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="field-label" htmlFor="admin-password" style={{ marginBottom: 0 }}>
                  Password
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={15}
                  color="var(--text-muted)"
                  style={{
                    position: 'absolute',
                    left: 13,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                />
                <input
                  id="admin-password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field-input"
                  style={{ paddingLeft: 38, paddingRight: 38 }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="admin-login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '11px',
                fontSize: 14,
                fontWeight: 600,
                marginTop: 4,
                cursor: 'pointer',
                justifyContent: 'center',
              }}
            >
              {loading ? 'Authenticating...' : `Sign In to ${society ? society.name : 'NexGate'}`}
            </button>
          </form>

          {/* Subdomain Switcher Info Footer */}
          {society && (
            <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
              <button
                type="button"
                onClick={handleResetSubdomain}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: 11.5,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Clear Subdomain / Return to Platform
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* SUBDOMAIN TEST / SWITCH MODAL */}
      <AnimatePresence>
        {showSubdomainModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 10000,
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
                maxWidth: 420,
                padding: '24px 28px',
                boxShadow: 'var(--shadow-xl)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Globe size={20} color="#2563EB" />
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Localhost Subdomain Simulation
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    Access by subdomain on localhost
                  </p>
                </div>
              </div>

              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
                On local development, you can test society branding by opening:{' '}
                <code style={{ background: 'var(--bg-base)', padding: '2px 6px', borderRadius: 4, color: '#2563EB' }}>
                  http://eco.localhost:5174
                </code>{' '}
                or entering the subdomain slug below:
              </p>

              <form onSubmit={handleApplySubdomain} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="field-label">Society Subdomain Prefix</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                    <input
                      type="text"
                      placeholder="e.g. eco or omkar-meredia"
                      value={subdomainInput}
                      onChange={(e) => setSubdomainInput(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-primary)',
                        fontSize: 13,
                        outline: 'none',
                      }}
                    />
                    <span style={{ padding: '0 12px', fontSize: 12, color: 'var(--text-muted)', borderLeft: '1px solid var(--border)' }}>
                      .nexgate.co.in
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowSubdomainModal(false)}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    Apply Branding
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

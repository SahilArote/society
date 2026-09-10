import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@greengate.in');
  const [password, setPassword] = useState('admin123');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 900));
    if (email === 'admin@greengate.in' && password === 'admin123') {
      localStorage.setItem('gg_admin_auth', 'true');
      navigate('/dashboard');
    } else {
      setError('Invalid email or password. Try admin@greengate.in / admin123');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      position: 'relative',
    }}>
      {/* Top right theme toggle */}
      <div style={{ position: 'absolute', top: 20, right: 24, zIndex: 10 }}>
        <ThemeToggle variant="segmented" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          width: '100%', maxWidth: 400,
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
          {/* Logo & Header */}
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div
              style={{
                width: 48, height: 48, borderRadius: 'var(--r-md)', margin: '0 auto 14px',
                background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Shield size={22} color="white" />
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
              color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: 4,
            }}>
              GreenGate Admin
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Enterprise Society Management Portal</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', borderRadius: 'var(--r-md)',
                  background: 'var(--red-bg)', border: '1px solid rgba(239,68,68,0.25)',
                }}
              >
                <AlertCircle size={14} color="var(--red)" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 12.5, color: 'var(--red)', lineHeight: 1.4 }}>{error}</p>
              </motion.div>
            )}

            {/* Email */}
            <div>
              <label className="field-label" htmlFor="admin-email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="var(--text-muted)" style={{
                  position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)'
                }} />
                <input
                  id="admin-email" type="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="field-input" style={{ paddingLeft: 38 }}
                  placeholder="admin@greengate.in"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="field-label" htmlFor="admin-password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="var(--text-muted)" style={{
                  position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)'
                }} />
                <input
                  id="admin-password" type={showPwd ? 'text' : 'password'} required
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="field-input" style={{ paddingLeft: 38, paddingRight: 38 }}
                  placeholder="••••••••"
                />
                <button
                  type="button" onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    padding: 0, display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button id="admin-login-btn" type="submit" disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '11px', marginTop: 4, fontSize: 14 }}>
              {loading
                ? <><div className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} />Signing in...</>
                : 'Sign In to Dashboard'}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{
            marginTop: 20, padding: '12px 14px', borderRadius: 'var(--r-md)',
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
              DEMO CREDENTIALS
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              admin@greengate.in · admin123
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 32px', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-elevated)',
        }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            🔒 GreenGate Admin Panel · Secure Access Only
          </p>
        </div>
      </motion.div>
    </div>
  );
}

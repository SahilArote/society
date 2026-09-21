import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Clock, ArrowLeft, Bell,
  ShieldCheck, Send, Check
} from 'lucide-react';

interface ComingSoonFeatureProps {
  title: string;
  subtitle: string;
  moduleName: string;
  icon: React.ElementType;
  accentColor: string;
  badgeText?: string;
  version?: string;
  eta?: string;
  features: {
    title: string;
    description: string;
    status: 'In Development' | 'Testing' | 'Architecture';
  }[];
}

export function ComingSoonFeature({
  title,
  subtitle,
  moduleName,
  icon: Icon,
  accentColor,
  badgeText = 'Under Active Development',
  version = 'v2.2 Enterprise',
  eta = 'Next Platform Update',
  features,
}: ComingSoonFeatureProps) {
  const navigate = useNavigate();
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState('');

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribed(true);
    setTimeout(() => setSubscribed(false), 4000);
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px 0 40px' }}>
      {/* Top Breadcrumb / Back Navigation */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 14px' }}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>

      {/* Main Glassmorphic Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '40px 36px',
          border: '1px solid var(--border)',
          background: 'linear-gradient(145deg, var(--bg-surface) 0%, var(--bg-card) 100%)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Subtle Ambient Background Aura */}
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accentColor}18 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        {/* Top Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: `${accentColor}15`,
            color: accentColor,
            border: `1px solid ${accentColor}30`,
            padding: '4px 12px',
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase'
          }}>
            <Sparkles size={12} /> {badgeText}
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
            padding: '4px 10px',
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'monospace'
          }}>
            Release {version}
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            color: 'var(--text-muted)',
            fontSize: 11,
            marginLeft: 'auto'
          }}>
            <Clock size={12} /> Estimated ETA: <strong style={{ color: 'var(--text-secondary)' }}>{eta}</strong>
          </div>
        </div>

        {/* Hero Title & Icon Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 24 }}>
          <div style={{
            width: 60, height: 60,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 8px 24px ${accentColor}35`,
            flexShrink: 0
          }}>
            <Icon size={28} color="#fff" />
          </div>

          <div>
            <h1 style={{
              fontSize: 26,
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              margin: '0 0 6px 0'
            }}>
              {title}
            </h1>
            <p style={{
              fontSize: 14,
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              maxWidth: 680,
              margin: 0
            }}>
              {subtitle}
            </p>
          </div>
        </div>

        {/* Feature Roadmap Showcase */}
        <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 14
          }}>
            What We're Building for {moduleName}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {features.map((f, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {f.title}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: f.status === 'Testing' ? 'var(--green-bg)' : 'var(--accent-bg)',
                    color: f.status === 'Testing' ? 'var(--green)' : 'var(--accent-light)',
                    border: `1px solid ${f.status === 'Testing' ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)'}`,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    {f.status}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Early Access / Notify Section */}
        <div style={{
          marginTop: 28,
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--r-lg)',
          border: '1px dashed var(--border-accent)',
          padding: '20px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'var(--accent-bg)', color: 'var(--accent-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Bell size={20} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                Request Early Beta Access
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Get notified the moment this feature goes live for your society.
              </div>
            </div>
          </div>

          {subscribed ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              color: 'var(--green)', fontSize: 13, fontWeight: 700,
              background: 'var(--green-bg)', padding: '8px 16px', borderRadius: 'var(--r-md)',
              border: '1px solid rgba(34,197,94,0.3)'
            }}>
              <Check size={16} /> Beta Access Registered!
            </div>
          ) : (
            <form onSubmit={handleNotify} style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your admin email"
                className="field-input"
                style={{ width: 220, fontSize: 12 }}
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ fontSize: 12, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Send size={13} /> Notify Me
              </button>
            </form>
          )}
        </div>

        {/* Security & Reliability Footnote */}
        <div style={{
          marginTop: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11,
          color: 'var(--text-muted)'
        }}>
          <ShieldCheck size={14} color="var(--green)" />
          Engineered under high-availability multi-tenant compliance standards.
        </div>
      </motion.div>
    </div>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Send, Users, Shield, CreditCard, AlertTriangle, CheckCircle2,
  Smartphone, Sparkles, Clock, ArrowRight, RefreshCw, Layers
} from 'lucide-react';
import { mockNotifications } from '../data/mockData';
import type { NotificationType, AnnouncementTarget, AdminNotification } from '../types';
import StatCard, { CircularGauge } from '../components/StatCard';

const typeCfg: Record<NotificationType, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  society:   { icon: Bell,          color: 'var(--accent-light)', bg: 'var(--accent-bg)', label: 'Society Notice' },
  security:  { icon: Shield,        color: 'var(--red)',          bg: 'var(--red-bg)',    label: 'Security Alert' },
  billing:   { icon: CreditCard,    color: 'var(--amber)',        bg: 'var(--amber-bg)',  label: 'Billing' },
  emergency: { icon: AlertTriangle, color: 'var(--red)',          bg: 'var(--red-bg)',    label: 'Emergency' },
};

const targetLabels: Record<AnnouncementTarget, string> = {
  all: 'All Residents (120)',
  wing_a: 'Wing A (30 Flats)',
  wing_b: 'Wing B (30 Flats)',
  wing_c: 'Wing C (30 Flats)',
  wing_d: 'Wing D (30 Flats)',
};

const TEMPLATES = [
  {
    name: '💰 Maintenance Due',
    type: 'billing' as NotificationType,
    title: 'Monthly Maintenance Reminder',
    body: 'Maintenance payment of ₹3,500 is due by 10th of this month. Please clear dues via GreenGate app.',
  },
  {
    name: '💧 Water Supply',
    type: 'society' as NotificationType,
    title: 'Water Supply Scheduled Maintenance',
    body: 'Water supply will be temporarily stopped from 10:00 AM to 2:00 PM tomorrow for pipeline cleaning.',
  },
  {
    name: '🚨 Security Alert',
    type: 'security' as NotificationType,
    title: 'Security Verification Notice',
    body: 'Visitor screening protocols have been tightened at Main Gate. Please approve guests via app.',
  },
  {
    name: '🎉 Society Event',
    type: 'society' as NotificationType,
    title: 'Community Gathering this Saturday',
    body: 'Join all residents at the Society Clubhouse this Saturday at 6:00 PM for community dinner.',
  },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>(mockNotifications);
  const [type, setType] = useState<NotificationType>('society');
  const [title, setTitle] = useState('Monthly Maintenance Reminder');
  const [body, setBody] = useState('Maintenance payment of ₹3,500 is due by 10th of this month. Please clear dues via GreenGate app.');
  const [target, setTarget] = useState<AnnouncementTarget>('all');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;
    setSending(true);
    await new Promise(r => setTimeout(r, 800));

    const newNotif: AdminNotification = {
      id: `notif-${Date.now()}`,
      title,
      body,
      type,
      target,
      sentAt: new Date(),
      deliveredCount: 120,
      openedCount: 0,
      sentBy: 'Admin Secretary',
    };

    setNotifications(prev => [newNotif, ...prev]);
    setSending(false);
    setSent(true);
    showToast(`Push alert broadcasted to ${targetLabels[target]}`);
  };

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setType(tpl.type);
    setTitle(tpl.title);
    setBody(tpl.body);
    showToast(`Loaded "${tpl.name}" template`);
  };

  const totalDelivered = notifications.reduce((s, n) => s + n.deliveredCount, 0);
  const totalOpened = notifications.reduce((s, n) => s + n.openedCount, 0);

  const stats = [
    { label: 'Total Broadcasts', val: notifications.length, icon: Bell,         color: 'var(--accent-light)', bg: 'var(--accent-bg)' },
    { label: 'Delivered Pushes', val: totalDelivered,        icon: CheckCircle2, color: 'var(--green)',        bg: 'var(--green-bg)' },
    { label: 'Opened Receipts',  val: totalOpened,           icon: Users,        color: 'var(--sky)',          bg: 'var(--sky-bg)' },
    {
      label: 'Avg Open Rate',
      val: totalDelivered > 0 ? `${Math.round(totalOpened / totalDelivered * 100)}%` : '0%',
      icon: AlertTriangle, color: 'var(--amber)', bg: 'var(--amber-bg)'
    },
  ];

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

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        <StatCard
          icon={Bell}
          label="Total Broadcasts"
          value={notifications.length}
          pill={{ text: 'Cloud Push', color: 'var(--accent-light)', bg: 'var(--accent-bg)' }}
          sub="FCM & APNs dispatches active"
          accentColor="var(--accent-light)"
          bgColor="var(--accent-bg)"
          delay={0}
        />

        <StatCard
          icon={CheckCircle2}
          label="Delivered Pushes"
          value={totalDelivered.toLocaleString()}
          pill={{ text: '99.8% Rate', color: 'var(--green)', bg: 'var(--green-bg)' }}
          sub="Zero bounce-backs recorded"
          accentColor="var(--green)"
          bgColor="var(--green-bg)"
          delay={0.06}
        />

        <StatCard
          icon={Users}
          label="Opened Receipts"
          value={totalOpened.toLocaleString()}
          pill={{ text: 'Acknowledged', color: 'var(--sky)', bg: 'var(--sky-bg)' }}
          sub="Read on iOS & Android apps"
          accentColor="var(--sky)"
          bgColor="var(--sky-bg)"
          delay={0.12}
        />

        <StatCard
          icon={Sparkles}
          label="Avg Open Rate"
          value={totalDelivered > 0 ? `${Math.round(totalOpened / totalDelivered * 100)}%` : '0%'}
          pill={{ text: 'High Attention', color: 'var(--amber)', bg: 'var(--amber-bg)' }}
          sub="High resident responsiveness"
          accentColor="var(--amber)"
          bgColor="var(--amber-bg)"
          delay={0.18}
        />
      </div>

      {/* Main 2-Column: Left (Form + Templates) & Right (Live Mobile Lockscreen Preview + Sent History) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>

        {/* Compose Form */}
        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="card-ph" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ padding: 6, borderRadius: 8, background: 'var(--accent-bg)' }}>
                <Bell size={15} color="var(--accent-light)" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Broadcast Push Notification</p>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>FCM & Apple APNs Dispatch</span>
          </div>

          {sent ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: 'var(--green-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
              }}>
                <CheckCircle2 size={32} color="var(--green)" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Notification Dispatched!</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
                Delivered instantaneously to {targetLabels[target]}
              </p>
              <button
                onClick={() => { setSent(false); setTitle(''); setBody(''); }}
                id="send-another-btn"
                className="btn-primary"
                style={{ marginTop: 24, padding: '8px 20px', fontSize: 13 }}
              >
                Compose Another Broadcast
              </button>
            </div>
          ) : (
            <form onSubmit={handleSend} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Quick Template Chips */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Sparkles size={12} color="var(--accent-light)" />
                  <label className="field-label" style={{ margin: 0 }}>Quick Templates</label>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {TEMPLATES.map((tpl, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => applyTemplate(tpl)}
                      className="tab-btn"
                      style={{ fontSize: 11.5, padding: '5px 10px' }}
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type selector */}
              <div>
                <label className="field-label">Notification Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {(Object.entries(typeCfg) as [NotificationType, typeof typeCfg[NotificationType]][]).map(([k, v]) => {
                    const Ico = v.icon;
                    const active = type === k;
                    return (
                      <button
                        type="button"
                        key={k}
                        onClick={() => setType(k)}
                        id={`notif-type-${k}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '10px 12px', borderRadius: 'var(--r-md)',
                          background: active ? v.bg : 'var(--bg-elevated)',
                          border: `1px solid ${active ? v.color : 'var(--border)'}`,
                          color: active ? v.color : 'var(--text-secondary)',
                          fontSize: 12.5, fontWeight: 600,
                          cursor: 'pointer', transition: 'all 0.15s ease',
                        }}
                      >
                        <Ico size={14} color={v.color} />
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="field-label">Notification Title *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  className="field-input"
                  placeholder="e.g. Maintenance Due Reminder"
                  id="notif-title"
                />
              </div>

              <div>
                <label className="field-label">Message Content *</label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  required
                  rows={3}
                  className="field-input"
                  style={{ resize: 'none' }}
                  placeholder="Type the message sent directly to residents' phone notifications..."
                  id="notif-body"
                />
              </div>

              <div>
                <label className="field-label">Target Audience</label>
                <select
                  value={target}
                  onChange={e => setTarget(e.target.value as AnnouncementTarget)}
                  className="field-select"
                  id="notif-target"
                >
                  {Object.entries(targetLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={sending}
                id="send-notification-btn"
                className="btn-primary"
                style={{ height: 42, fontSize: 13, fontWeight: 700, justifyContent: 'center', cursor: 'pointer' }}
              >
                {sending ? (
                  <><div className="spinner" />Broadcasting...</>
                ) : (
                  <><Send size={14} />Broadcast Push to {targetLabels[target]}</>
                )}
              </button>
            </form>
          )}
        </motion.div>

        {/* Right Column: Live Mobile Lockscreen Push Preview + Sent History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Realistic Mobile Lockscreen Preview */}
          <motion.div
            className="card card-p"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            style={{
              background: 'linear-gradient(180deg, #090E1A 0%, #10162A 100%)',
              border: '1px solid var(--border-accent)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Smartphone size={15} color="var(--accent-light)" />
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Resident Device Preview
                </p>
              </div>
              <span className="badge badge-info" style={{ fontSize: 10 }}>iOS & Android APNs</span>
            </div>

            {/* Mobile Lockscreen Notification Banner Widget */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 18,
              padding: '14px 16px',
              boxShadow: '0 12px 28px rgba(0,0,0,0.6)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Shield size={12} color="#fff" />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
                    GREENGATE
                  </span>
                </div>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>now</span>
              </div>

              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                {title || 'Notification Title'}
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
                {body || 'Notification message preview will appear here in real time...'}
              </div>

              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <span style={{ fontSize: 10.5, color: 'var(--accent-light)', fontWeight: 600 }}>Open App →</span>
              </div>
            </div>
          </motion.div>

          {/* Sent History */}
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="card-ph" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Broadcast Log & Engagement</p>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last 30 Days</span>
            </div>

            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {notifications.map(n => {
                const cfg = typeCfg[n.type];
                const Ico = cfg.icon;
                const rate = n.deliveredCount > 0 ? Math.round(n.openedCount / n.deliveredCount * 100) : 0;
                return (
                  <div
                    key={n.id}
                    style={{
                      padding: '12px 16px', borderBottom: '1px solid var(--border)',
                      display: 'flex', gap: 12, alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ padding: 7, borderRadius: 'var(--r-sm)', background: cfg.bg, flexShrink: 0 }}>
                      <Ico size={13} color={cfg.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {n.title}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.body}
                      </p>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                          {new Date(n.sentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>✓ {n.deliveredCount} delivered</span>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--green)' }}>{rate}% open rate</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

        </div>
      </div>

    </div>
  );
}

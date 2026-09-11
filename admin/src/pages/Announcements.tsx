import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone, Plus, X, Eye, Users, AlertTriangle, CheckCircle2,
  Trash2, Pin, Calendar, Tag, Filter, Search, ArrowUpRight
} from 'lucide-react';
import { mockAnnouncements } from '../data/mockData';
import type { AnnouncementPriority, AnnouncementTarget, Announcement } from '../types';
import StatCard, { CircularGauge } from '../components/StatCard';

const priorityCls: Record<AnnouncementPriority, string> = {
  urgent: 'badge badge-danger', important: 'badge badge-warning', normal: 'badge badge-muted',
};
const priorityColor: Record<AnnouncementPriority, string> = {
  urgent: 'var(--red)', important: 'var(--amber)', normal: 'var(--text-muted)',
};
const targetLabels: Record<AnnouncementTarget, string> = {
  all: 'All Residents (120)', wing_a: 'Wing A', wing_b: 'Wing B', wing_c: 'Wing C', wing_d: 'Wing D',
};

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (ann: Announcement) => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [target, setTarget] = useState<AnnouncementTarget>('all');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setLoading(false);
    setDone(true);
    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      title,
      body,
      priority,
      target,
      createdBy: 'Rajesh Sharma (Secretary)',
      createdAt: new Date(),
      readCount: 0,
      isPublished: true,
    };
    onCreated(newAnn);
    setTimeout(onClose, 1000);
  };

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="modal"
        initial={{ scale: 0.94, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 20 }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ padding: 7, borderRadius: 8, background: 'var(--accent-bg)' }}>
              <Megaphone size={14} color="var(--accent-light)" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Post Official Notice</p>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={14} /></button>
        </div>

        {done ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: 'var(--green-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={28} color="var(--green)" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Notice Published Live!</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
              Push alert dispatched to {targetLabels[target]}
            </p>
          </div>
        ) : (
          <form onSubmit={submit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="field-label">Notice Title *</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                className="field-input"
                placeholder="E.g. Elevators annual maintenance schedule"
                id="ann-title"
              />
            </div>

            <div>
              <label className="field-label">Detailed Notice Content *</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                required
                rows={4}
                className="field-input"
                style={{ resize: 'none' }}
                placeholder="Write the full notice text for residents..."
                id="ann-body"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label">Priority Level</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as AnnouncementPriority)}
                  className="field-select"
                  id="ann-priority"
                >
                  <option value="normal">Normal (Routine)</option>
                  <option value="important">Important (High)</option>
                  <option value="urgent">Urgent (Immediate)</option>
                </select>
              </div>

              <div>
                <label className="field-label">Audience Target</label>
                <select
                  value={target}
                  onChange={e => setTarget(e.target.value as AnnouncementTarget)}
                  className="field-select"
                  id="ann-target"
                >
                  {Object.entries(targetLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
              <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button type="submit" id="submit-announcement-btn" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                {loading ? <><div className="spinner" />Publishing...</> : 'Publish Notice'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>(mockAnnouncements);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | AnnouncementPriority>('all');
  const [pinnedId, setPinnedId] = useState<string>('ann-1');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleDelete = (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    showToast('Announcement removed');
  };

  const togglePin = (id: string) => {
    setPinnedId(prev => prev === id ? '' : id);
    showToast(pinnedId === id ? 'Unpinned notice' : 'Pinned notice to top');
  };

  const filtered = announcements.filter(a => {
    if (priorityFilter !== 'all' && a.priority !== priorityFilter) return false;
    return a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.body.toLowerCase().includes(search.toLowerCase());
  });

  const pinnedNotice = announcements.find(a => a.id === pinnedId);

  const stats = [
    { label: 'Total Notices',  val: announcements.length,                                    icon: Megaphone,    color: 'var(--accent-light)', bg: 'var(--accent-bg)' },
    { label: 'Urgent Alerts',  val: announcements.filter(a => a.priority === 'urgent').length, icon: AlertTriangle, color: 'var(--red)',          bg: 'var(--red-bg)' },
    { label: 'Published Live', val: announcements.filter(a => a.isPublished).length,          icon: CheckCircle2,  color: 'var(--green)',        bg: 'var(--green-bg)' },
    {
      label: 'Avg Read Rate',
      val: announcements.length ? `${Math.round((announcements.reduce((s, a) => s + a.readCount, 0) / (announcements.length * 120)) * 100)}%` : '0%',
      icon: Eye, color: 'var(--sky)', bg: 'var(--sky-bg)'
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
          icon={Megaphone}
          label="Total Notices"
          value={announcements.length}
          pill={{ text: 'Notice Board', color: 'var(--accent-light)', bg: 'var(--accent-bg)' }}
          sub="Official society broadcast notices"
          accentColor="var(--accent-light)"
          bgColor="var(--accent-bg)"
          delay={0}
        />

        <StatCard
          icon={AlertTriangle}
          label="Urgent Alerts"
          value={announcements.filter(a => a.priority === 'urgent').length}
          pill={{ text: '⚡ Priority Push', color: 'var(--red)', bg: 'var(--red-bg)' }}
          sub="Immediate push popup alerts"
          accentColor="var(--red)"
          bgColor="var(--red-bg)"
          delay={0.06}
        />

        <StatCard
          icon={CheckCircle2}
          label="Published Live"
          value={announcements.filter(a => a.isPublished).length}
          pill={{ text: 'Live Feed', color: 'var(--green)', bg: 'var(--green-bg)' }}
          sub="Synced across all 4 wings"
          accentColor="var(--green)"
          bgColor="var(--green-bg)"
          delay={0.12}
        />

        <StatCard
          icon={Eye}
          label="Avg Read Rate"
          value={announcements.length ? `${Math.round((announcements.reduce((s, a) => s + a.readCount, 0) / (announcements.length * 120)) * 100)}%` : '0%'}
          pill={{ text: 'Engagement', color: 'var(--sky)', bg: 'var(--sky-bg)' }}
          sub="~98 flats active readers"
          accentColor="var(--sky)"
          bgColor="var(--sky-bg)"
          delay={0.18}
        />
      </div>

      {/* Featured Pinned Announcement Banner */}
      {pinnedNotice && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-xl)',
            padding: '20px 24px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                background: 'var(--accent)', color: '#fff',
                padding: '4px 10px', borderRadius: 'var(--r-sm)',
                fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5
              }}>
                <Pin size={12} /> PINNED NOTICE
              </div>
              <span className={priorityCls[pinnedNotice.priority]}>{pinnedNotice.priority.toUpperCase()}</span>
              <span className="badge badge-muted">{targetLabels[pinnedNotice.target]}</span>
            </div>
            <button
              onClick={() => togglePin(pinnedNotice.id)}
              className="btn-icon"
              title="Unpin"
              style={{ width: 28, height: 28 }}
            >
              <X size={13} />
            </button>
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            {pinnedNotice.title}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 900 }}>
            {pinnedNotice.body}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 14, fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Eye size={13} color="var(--sky)" /> {pinnedNotice.readCount} residents acknowledged
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={13} /> By {pinnedNotice.createdBy}
            </span>
          </div>
        </motion.div>
      )}

      {/* Filter and Action Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {(['all', 'urgent', 'important', 'normal'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`tab-btn${priorityFilter === p ? ' active' : ''}`}
              style={{ padding: '6px 14px', fontSize: 12 }}
            >
              {p === 'all' ? 'All Notices' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 240 }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notices..."
              className="field-input"
              style={{ paddingLeft: 34 }}
              id="announcements-search"
            />
          </div>

          <button
            onClick={() => setShowCreate(true)}
            id="create-announcement-btn"
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          >
            <Plus size={14} /> Post New Notice
          </button>
        </div>
      </div>

      {/* Announcement Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <AnimatePresence>
          {filtered.map((ann, i) => {
            const isPinned = ann.id === pinnedId;
            const readPercentage = Math.min(100, Math.round((ann.readCount / 120) * 100));

            return (
              <motion.div
                key={ann.id}
                className="card card-p"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                style={{ position: 'relative' }}
              >
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  {/* Left accent bar */}
                  <div style={{
                    width: 4, alignSelf: 'stretch', borderRadius: 4,
                    background: priorityColor[ann.priority], flexShrink: 0
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Header tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span className={priorityCls[ann.priority]} style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.05em' }}>
                        {ann.priority}
                      </span>
                      <span className="badge badge-muted" style={{ fontSize: 10 }}>{targetLabels[ann.target]}</span>
                      {ann.isPublished && <span className="badge badge-success" style={{ fontSize: 10 }}>Published</span>}
                      {isPinned && <span className="badge badge-info" style={{ fontSize: 10 }}>📌 Pinned</span>}
                    </div>

                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.4 }}>
                      {ann.title}
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
                      {ann.body}
                    </p>

                    {/* Read receipt bar & meta */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Eye size={13} color="var(--text-muted)" />
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {ann.readCount} reads ({readPercentage}%)
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Users size={13} color="var(--text-muted)" />
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>By {ann.createdBy}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={13} color="var(--text-muted)" />
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {new Date(ann.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      {/* Read progress bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 140 }}>
                        <div style={{ flex: 1, height: 5, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${readPercentage}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{readPercentage}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => togglePin(ann.id)}
                      className={`btn-icon${isPinned ? ' btn-icon-accent' : ''}`}
                      title={isPinned ? 'Unpin' : 'Pin to top'}
                    >
                      <Pin size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(ann.id)}
                      id={`delete-ann-${ann.id}`}
                      className="btn-icon btn-icon-red"
                      title="Delete notice"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="empty-state">
            <Megaphone size={40} className="empty-state-icon" />
            <p className="empty-state-text">No announcements match the selected filter</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateModal
            onClose={() => setShowCreate(false)}
            onCreated={(newAnn) => {
              setAnnouncements(prev => [newAnn, ...prev]);
              showToast('New announcement created and published');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

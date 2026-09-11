import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Search, RefreshCw, CheckCircle2, Shield,
  Users, UserCheck, DoorOpen, Megaphone, Settings,
  AlertTriangle, Clock, ArrowRight, X, Sparkles, ExternalLink
} from 'lucide-react';
import { mockFlats, mockVisitors, mockGuards, mockAnnouncements } from '../../data/mockData';
import { ThemeToggle } from '../ThemeToggle';

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/dashboard':     { title: 'Dashboard',       sub: 'Society overview & live gate activity' },
  '/residents':     { title: 'Residents',        sub: 'Manage flats, residents & maintenance' },
  '/visitors':      { title: 'Visitors',         sub: 'Society-wide gate visitor log' },
  '/gates':         { title: 'Gates & Guards',   sub: 'Gate operations & guard roster' },
  '/announcements': { title: 'Announcements',    sub: 'Post and manage society notices' },
  '/notifications': { title: 'Notifications',    sub: 'Broadcast push alerts to residents' },
  '/reports':       { title: 'Reports',          sub: 'Analytics, insights & data exports' },
  '/settings':      { title: 'Settings',         sub: 'Society configuration & admin users' },
};

export function AdminHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const meta = PAGE_META[pathname] ?? { title: 'Admin', sub: '' };

  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [cmdSearch, setCmdSearch] = useState('');
  const [notifList, setNotifList] = useState([
    { id: 1, title: 'Visitor waiting at Main Gate', sub: 'Raj Sharma · Flat A-402', time: '2m ago', unread: true, type: 'visitor' },
    { id: 2, title: 'Overdue Maintenance Alert', sub: '4 flats pending past due date', time: '18m ago', unread: true, type: 'billing' },
    { id: 3, title: 'East Gate opened by guard', sub: 'Guard Suresh Yadav · Normal shift', time: '34m ago', unread: false, type: 'gate' },
    { id: 4, title: 'Water supply notice read by 78%', sub: 'Published by Secretary', time: '1h ago', unread: false, type: 'notice' },
  ]);

  // Live ticking clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      setDate(now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const notifRef = useRef<HTMLDivElement>(null);

  // Close notification popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPopover(false);
      }
    };
    if (showNotifPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifPopover]);

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowNotifPopover(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }, 800);
  };

  const unreadCount = notifList.filter(n => n.unread).length;

  const markAllRead = () => {
    setNotifList(prev => prev.map(n => ({ ...n, unread: false })));
  };

  // Command palette search results
  const q = cmdSearch.toLowerCase().trim();
  const searchResults = [
    // Navigation items
    { type: 'Page', title: 'Dashboard', sub: '', icon: Shield, link: '/dashboard' },
    { type: 'Page', title: 'Residents Management', sub: '', icon: Users, link: '/residents' },
    { type: 'Page', title: 'Visitors Log', sub: '', icon: UserCheck, link: '/visitors' },
    { type: 'Page', title: 'Gates & CCTV Guard Roster', sub: '', icon: DoorOpen, link: '/gates' },
    { type: 'Page', title: 'Announcements', sub: '', icon: Megaphone, link: '/announcements' },
    { type: 'Page', title: 'Society Settings', sub: '', icon: Settings, link: '/settings' },
    // Flats
    ...mockFlats.map(f => ({
      type: 'Flat',
      title: `Flat ${f.number} (${f.type})`,
      sub: `${f.residents.map(r => r.name).join(', ') || 'Vacant'} · ${f.status}`,
      icon: Users,
      link: '/residents',
    })),
    // Visitors
    ...mockVisitors.map(v => ({
      type: 'Visitor',
      title: `${v.name} (${v.purpose})`,
      sub: `Visiting ${v.flatNumber} · Status: ${v.status}`,
      icon: UserCheck,
      link: '/visitors',
    })),
    // Guards
    ...mockGuards.map(g => ({
      type: 'Guard',
      title: `${g.name} (${g.assignedGate})`,
      sub: `Shift: ${g.shift} · ${g.phone}`,
      icon: DoorOpen,
      link: '/gates',
    })),
  ].filter(item => {
    if (!q) return true;
    return item.title.toLowerCase().includes(q) || (item.sub && item.sub.toLowerCase().includes(q)) || item.type.toLowerCase().includes(q);
  }).slice(0, 8);

  return (
    <>
      <header className="admin-header">
        {/* Left */}
        <div>
          <h1 className="header-title">{meta.title}</h1>
          <p className="header-sub">{meta.sub}</p>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Live Ticking Time */}
          <div style={{ textAlign: 'right', marginRight: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '0.04em', lineHeight: 1.3 }}>
              {time || '--:--:--'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{date}</div>
          </div>

          {/* Theme Selector (Light / Dark / System) */}
          <ThemeToggle variant="segmented" />

          {/* Search / Command Palette trigger */}
          <button
            id="header-search-btn"
            className="header-btn"
            onClick={() => setShowCommandPalette(true)}
            style={{ cursor: 'pointer' }}
          >
            <Search size={14} />
            <span style={{ color: 'var(--text-secondary)' }}>Quick Search</span>
            <span style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 5,
              background: 'var(--bg-elevated)', color: 'var(--accent)',
              border: '1px solid var(--border)', fontWeight: 600
            }}>⌘K</span>
          </button>

          {/* Refresh button */}
          <button
            id="header-refresh-btn"
            className="header-icon-btn"
            title="Sync Live Data"
            onClick={handleRefresh}
            style={{ cursor: 'pointer' }}
          >
            <RefreshCw
              size={14}
              style={{
                transition: 'transform 0.8s ease',
                transform: isRefreshing ? 'rotate(360deg)' : 'none'
              }}
            />
          </button>

          {/* Notifications bell with Popover */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              id="header-notifications-btn"
              className="header-icon-btn"
              style={{ position: 'relative', cursor: 'pointer' }}
              onClick={() => setShowNotifPopover(prev => !prev)}
            >
              <Bell size={14} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -3, right: -3,
                  minWidth: 16, height: 16, borderRadius: '50%',
                  background: 'var(--red)',
                  border: '2px solid var(--bg-surface)',
                  fontSize: 9, fontWeight: 800, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover */}
            <AnimatePresence>
              {showNotifPopover && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0,
                    width: 340,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--r-lg)',
                    boxShadow: 'var(--shadow-xl)',
                    zIndex: 100,
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-elevated)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Bell size={14} color="var(--accent-light)" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Live Alerts</span>
                      {unreadCount > 0 && (
                        <span className="badge badge-danger" style={{ fontSize: 10, padding: '1px 6px' }}>{unreadCount} new</span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        style={{
                          background: 'none', border: 'none', color: 'var(--accent-light)',
                          fontSize: 11, cursor: 'pointer', fontWeight: 600
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: 300, overflowY: 'auto', padding: '6px 0' }}>
                    {notifList.map(n => (
                      <div
                        key={n.id}
                        style={{
                          padding: '10px 16px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          background: n.unread ? 'rgba(99,102,241,0.05)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          cursor: 'pointer',
                          transition: 'background 0.15s'
                        }}
                        onClick={() => {
                          setNotifList(prev => prev.map(x => x.id === n.id ? { ...x, unread: false } : x));
                        }}
                      >
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: n.unread ? 'var(--accent)' : 'transparent',
                          marginTop: 5, flexShrink: 0
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{n.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{n.sub}</div>
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{n.time}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    padding: '8px 16px',
                    borderTop: '1px solid var(--border)',
                    background: 'var(--bg-elevated)',
                    textAlign: 'center'
                  }}>
                    <button
                      onClick={() => { setShowNotifPopover(false); navigate('/notifications'); }}
                      style={{
                        background: 'none', border: 'none', color: 'var(--accent-light)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex',
                        alignItems: 'center', gap: 6
                      }}
                    >
                      View All Broadcasts <ArrowRight size={12} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Live pill with Pulse */}
          <div className="live-pill" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="live-dot" />
            <span style={{ fontWeight: 700, letterSpacing: '0.06em' }}>LIVE</span>
          </div>
        </div>
      </header>

      {/* Refresh Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: 76,
              right: 24,
              zIndex: 999,
              background: 'var(--bg-surface)',
              border: '1px solid var(--green-border)',
              borderRadius: 'var(--r-md)',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <CheckCircle2 size={16} color="var(--green)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              Society data synced successfully · 120 flats active
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Command Palette Modal (⌘K) */}
      <AnimatePresence>
        {showCommandPalette && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowCommandPalette(false); }}
            style={{ zIndex: 1000 }}
          >
            <motion.div
              initial={{ scale: 0.95, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -20 }}
              style={{
                width: '100%',
                maxWidth: 580,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-xl)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-xl)'
              }}
            >
              {/* Search input header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-surface)'
              }}>
                <Search size={18} color="var(--accent-light)" />
                <input
                  autoFocus
                  value={cmdSearch}
                  onChange={(e) => setCmdSearch(e.target.value)}
                  placeholder="Search flats (A-101), residents, visitors, pages..."
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: 15,
                    fontFamily: 'var(--font-sans)'
                  }}
                />
                <button
                  onClick={() => setShowCommandPalette(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Quick Results */}
              <div style={{ maxHeight: 360, overflowY: 'auto', padding: 8 }}>
                {searchResults.length === 0 ? (
                  <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No results found for "{cmdSearch}"
                  </div>
                ) : (
                  searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setShowCommandPalette(false);
                        navigate(item.link);
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--r-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        background: 'transparent',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div style={{
                          padding: 8,
                          borderRadius: 'var(--r-sm)',
                          background: 'var(--accent-bg)',
                          color: 'var(--accent-light)'
                        }}>
                          <item.icon size={16} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.title}
                          </div>
                          {item.sub && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              {item.sub}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="badge badge-muted" style={{ fontSize: 10, textTransform: 'uppercase' }}>
                        {item.type}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div style={{
                padding: '10px 16px',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 11,
                color: 'var(--text-muted)'
              }}>
                <span>Use <b>↑</b> <b>↓</b> to navigate, <b>ESC</b> to close</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Sparkles size={11} color="var(--accent-light)" /> Quick Spotlight Command
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

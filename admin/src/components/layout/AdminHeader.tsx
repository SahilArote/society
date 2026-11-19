import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Search, RefreshCw, CheckCircle2, Shield,
  Users, UserCheck, DoorOpen, Megaphone, Settings,
  ArrowRight, X, Sparkles, User, LogOut, ChevronDown,
  Palette, Building2, Plus
} from 'lucide-react';
import { fetchAdminActivity, fetchAdminFlats, getAdminUser, clearAdminSession } from '../../services/api';
import { initAdminSocket } from '../../services/socket';
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
  '/super/societies': { title: 'Societies Directory', sub: 'Platform-level multi-tenant management & device plans' },
  '/super/onboard': { title: 'Onboard Society', sub: 'Deploy new society infrastructure, subdomains & initial admin' },
};

export function AdminHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const normalizedKey = pathname.replace(/^\/admin/, '') || '/dashboard';
  const meta = PAGE_META[normalizedKey] ?? PAGE_META[pathname] ?? { title: 'Admin', sub: '' };

  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [cmdSearch, setCmdSearch] = useState('');
  const [notifList, setNotifList] = useState<any[]>([]);
  const [searchFlats, setSearchFlats] = useState<any[]>([]);

  const profileRef = useRef<HTMLDivElement>(null);
  const currentUser = getAdminUser();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const displayName = currentUser?.name || 'Administrator';
  const displayRole = (currentUser?.role || 'ADMIN').replace('_', ' ');
  const avatarInitials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'A';

  useEffect(() => {
    let isMounted = true;
    fetchAdminActivity().then((items: any[]) => {
      if (isMounted && Array.isArray(items) && items.length > 0) {
        const list = items.slice(0, 8).map((act: any, idx: number) => ({
          id: act.id || idx,
          title: act.visitorName ? `Visitor ${act.visitorName}` : 'Gate Activity',
          sub: `Flat ${act.flatNumber || 'N/A'} · ${act.purpose || 'Visitor'} · Status: ${act.status || 'LOGGED'}`,
          time: act.entryTime || act.createdAt ? new Date(act.entryTime || act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
          unread: idx < 2,
          type: 'visitor',
        }));
        setNotifList(list);
      }
    }).catch(() => {});

    initAdminSocket((event: any) => {
      if (isMounted && event) {
        setNotifList(prev => [
          {
            id: event.id || Date.now(),
            title: `Visitor: ${event.visitorName || 'Guest'}`,
            sub: `Flat ${event.flatNumber || 'N/A'} · ${event.purpose || 'Visit'}`,
            time: 'Just now',
            unread: true,
            type: 'visitor',
          },
          ...prev.slice(0, 15),
        ]);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (showCommandPalette && searchFlats.length === 0) {
      fetchAdminFlats().then(flats => {
        if (Array.isArray(flats)) setSearchFlats(flats);
      }).catch(() => {});
    }
  }, [showCommandPalette, searchFlats.length]);

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

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPopover(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfilePopover(false);
      }
    };
    if (showNotifPopover || showProfilePopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifPopover, showProfilePopover]);

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
        setShowProfilePopover(false);
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
  const basePages = isSuperAdmin
    ? [
        { type: 'Page', title: 'Societies Directory', sub: 'Platform multi-tenant directory & devices', icon: Building2, link: '/admin/super/societies' },
        { type: 'Page', title: 'Onboard Society', sub: 'Deploy new society infrastructure & initial admin', icon: Plus, link: '/admin/super/onboard' },
        { type: 'Page', title: 'Platform Settings', sub: 'System configuration & preferences', icon: Settings, link: '/admin/settings' },
      ]
    : [
        { type: 'Page', title: 'Dashboard', sub: 'Society overview & live gate activity', icon: Shield, link: '/admin/dashboard' },
        { type: 'Page', title: 'Residents Management', sub: 'Manage flats, residents & directory', icon: Users, link: '/admin/residents' },
        { type: 'Page', title: 'Visitors Log', sub: 'Society-wide gate visitor logs', icon: UserCheck, link: '/admin/visitors' },
        { type: 'Page', title: 'Gates & CCTV Guard Roster', sub: 'Gate operations & guard roster', icon: DoorOpen, link: '/admin/gates' },
        { type: 'Page', title: 'Services & Directory', sub: 'Society vendors & utility contacts', icon: Shield, link: '/admin/services' },
        { type: 'Page', title: 'Events & Community', sub: 'Society noticeboard & lost items', icon: Megaphone, link: '/admin/community' },
        { type: 'Page', title: 'Society Settings', sub: 'Society configuration & admin users', icon: Settings, link: '/admin/settings' },
      ];

  const searchResults = [
    ...basePages,
    // Live flats from database (only for society admin)
    ...(!isSuperAdmin ? searchFlats.map((f: any) => ({
      type: 'Flat',
      title: `Flat ${f.number || f.flatNumber || ''} ${f.wing ? `(${f.wing})` : ''}`,
      sub: `${f.residents?.map((r: any) => r.name).join(', ') || f.ownerName || 'Vacant'} · ${f.status || 'Active'}`,
      icon: Users,
      link: '/admin/residents',
    })) : []),
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Live Ticking Time */}
          <div style={{ textAlign: 'right', marginRight: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '0.04em', lineHeight: 1.3 }}>
              {time || '--:--:--'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{date}</div>
          </div>

          {/* Sync Refresh button */}
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

          {/* Live pill with Pulse */}
          <div className="live-pill" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="live-dot" />
            <span style={{ fontWeight: 700, letterSpacing: '0.06em' }}>LIVE</span>
          </div>

          {/* Profile Button & Menu Popover */}
          <div ref={profileRef} style={{ position: 'relative' }}>
            <button
              id="header-profile-btn"
              onClick={() => setShowProfilePopover(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 10px 4px 5px',
                borderRadius: 'var(--r-full, 9999px)',
                background: showProfilePopover ? 'var(--accent-bg)' : 'var(--bg-elevated)',
                border: `1px solid ${showProfilePopover ? 'var(--accent)' : 'var(--border)'}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                color: 'var(--text-primary)',
              }}
            >
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent) 0%, #4338ca 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.02em',
                boxShadow: '0 1px 3px rgba(0,0,0,0.18)'
              }}>
                {avatarInitials}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </span>
                <span style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                  {displayRole.toLowerCase()}
                </span>
              </div>
              <ChevronDown
                size={13}
                color="var(--text-muted)"
                style={{
                  transform: showProfilePopover ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.15s ease'
                }}
              />
            </button>

            {/* Profile Popover */}
            <AnimatePresence>
              {showProfilePopover && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 290,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--r-lg)',
                    boxShadow: 'var(--shadow-xl)',
                    zIndex: 110,
                    overflow: 'hidden'
                  }}
                >
                  {/* User Profile Header */}
                  <div style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}>
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--accent) 0%, #4338ca 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 15,
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                    }}>
                      {avatarInitials}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayName}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                        {currentUser?.email || 'admin@nexgate.co.in'}
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <span className="badge badge-accent" style={{ fontSize: 9.5, padding: '1px 6px', textTransform: 'uppercase' }}>
                          {displayRole}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Navigation */}
                  <div style={{ padding: '6px' }}>
                    {/* Quick Search */}
                    <button
                      onClick={() => {
                        setShowProfilePopover(false);
                        setShowCommandPalette(true);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 12px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 'var(--r-md)',
                        color: 'var(--text-primary)',
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <Search size={14} color="var(--accent-light)" />
                        <span>Quick Spotlight Search</span>
                      </div>
                      <span style={{
                        fontSize: 10, padding: '1px 5px', borderRadius: 4,
                        background: 'var(--bg-elevated)', color: 'var(--accent)',
                        border: '1px solid var(--border)', fontWeight: 600
                      }}>⌘K</span>
                    </button>

                    {/* Super Admin specific navigation vs Society Admin */}
                    {isSuperAdmin ? (
                      <>
                        <button
                          onClick={() => {
                            setShowProfilePopover(false);
                            navigate('/admin/super/societies');
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 9,
                            padding: '9px 12px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 'var(--r-md)',
                            color: 'var(--text-primary)',
                            fontSize: 12.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <Building2 size={14} color="var(--accent-light)" />
                          <span>Societies Directory</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowProfilePopover(false);
                            navigate('/admin/super/onboard');
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 9,
                            padding: '9px 12px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 'var(--r-md)',
                            color: 'var(--text-primary)',
                            fontSize: 12.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <Plus size={14} color="var(--accent-light)" />
                          <span>Onboard New Society</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setShowProfilePopover(false);
                          navigate('/admin/notifications');
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '9px 12px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 'var(--r-md)',
                          color: 'var(--text-primary)',
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <Bell size={14} color="var(--accent-light)" />
                          <span>Society Alerts & Broadcasts</span>
                        </div>
                        {unreadCount > 0 && (
                          <span className="badge badge-danger" style={{ fontSize: 9.5, padding: '1px 6px' }}>
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    )}

                    {/* Settings */}
                    <button
                      onClick={() => {
                        setShowProfilePopover(false);
                        navigate('/admin/settings');
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        padding: '9px 12px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 'var(--r-md)',
                        color: 'var(--text-primary)',
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Settings size={14} color="var(--accent-light)" />
                      <span>{isSuperAdmin ? 'Platform Settings' : 'Society Settings & Billing'}</span>
                    </button>
                  </div>

                  {/* Theme Selector Section */}
                  <div style={{
                    padding: '10px 14px',
                    borderTop: '1px solid var(--border)',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-surface)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Interface Theme
                      </span>
                    </div>
                    <ThemeToggle variant="segmented" />
                  </div>

                  {/* Logout Row */}
                  <div style={{ padding: '6px' }}>
                    <button
                      onClick={() => {
                        setShowProfilePopover(false);
                        clearAdminSession();
                        navigate('/admin/login');
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        padding: '9px 12px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 'var(--r-md)',
                        color: 'var(--red)',
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <LogOut size={14} color="var(--red)" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
              Society data synchronized successfully
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

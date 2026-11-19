import { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck,
  DoorOpen, Megaphone, Bell, BarChart3,
  Settings, LogOut, Building2, ChevronRight,
  Wrench, CalendarDays, Plus, Shield
} from 'lucide-react';
import { clearAdminSession, fetchAdminSettings, fetchPublicSocietyBySubdomain, fetchAdminSubscription } from '../../services/api';
import { extractSubdomainFromUrl } from '../../utils/subdomain';

export function AdminSidebar() {
  const navigate = useNavigate();
  const [societyInfo, setSocietyInfo] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('gg_admin_society_settings');
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return null;
  });

  const [subData, setSubData] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSocietyDetails = async () => {
      const detected = extractSubdomainFromUrl();
      if (detected) {
        try {
          const cached = localStorage.getItem('gg_admin_society_settings');
          const parsed = cached ? JSON.parse(cached) : null;
          if (parsed && parsed.subdomain === detected) {
            if (isMounted) setSocietyInfo(parsed);
            return;
          }
          const fresh = await fetchPublicSocietyBySubdomain(detected);
          if (fresh && isMounted) {
            setSocietyInfo(fresh);
            localStorage.setItem('gg_admin_society_settings', JSON.stringify(fresh));
            return;
          }
        } catch (_) {}
      }

      // Live authenticated society loading
      try {
        const settings = await fetchAdminSettings();
        if (settings && isMounted) {
          setSocietyInfo(settings);
        }
      } catch (_) {}

      try {
        const sub = await fetchAdminSubscription();
        if (sub && isMounted) {
          setSubData(sub);
        }
      } catch (_) {}
    };

    loadSocietyDetails();

    const handleUpdate = (e: any) => {
      if (e?.detail) {
        setSocietyInfo(e.detail);
        return;
      }
      try {
        const cached = localStorage.getItem('gg_admin_society_settings');
        if (cached) setSocietyInfo(JSON.parse(cached));
      } catch (_) {}
    };

    window.addEventListener('nexgate_society_updated', handleUpdate);
    window.addEventListener('nexgate_subdomain_changed', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('nexgate_society_updated', handleUpdate);
      window.removeEventListener('nexgate_subdomain_changed', handleUpdate);
    };
  }, []);

  // Dynamic logged in admin user
  const [currentUser] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('gg_admin_user');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return null;
  });

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const displayName = currentUser?.name || 'Administrator';
  const displayRole = (currentUser?.role || 'ADMIN').replace('_', ' ');
  const avatarInitials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'A';

  const grouped = useMemo(() => {
    const navItems = isSuperAdmin
      ? [
          { to: '/admin/super/societies', icon: Building2, label: 'Societies Directory', section: 'Platform' },
          { to: '/admin/super/onboard', icon: Plus, label: 'Onboard Society', section: 'Platform' },
          { to: '/admin/settings', icon: Settings, label: 'Settings', section: 'Configuration' },
        ]
      : [
          { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', section: 'Management' },
          { to: '/admin/residents', icon: Users, label: 'Residents', section: 'Management' },
          { to: '/admin/visitors', icon: UserCheck, label: 'Visitors', section: 'Management' },
          { to: '/admin/gates', icon: DoorOpen, label: 'Gates & Guards', section: 'Management' },
          { to: '/admin/services', icon: Wrench, label: 'Services', section: 'Society' },
          { to: '/admin/community', icon: CalendarDays, label: 'Events & Community', section: 'Society' },
          { to: '/admin/announcements', icon: Megaphone, label: 'Announcements', section: 'Society', badge: 'Soon' },
          { to: '/admin/notifications', icon: Bell, label: 'Notifications', section: 'Society', badge: 'Soon' },
          { to: '/admin/reports', icon: BarChart3, label: 'Reports', section: 'Society', badge: 'Soon' },
          { to: '/admin/settings', icon: Settings, label: 'Settings', section: 'Configuration' },
        ];

    return navItems.reduce((acc, item) => {
      if (!acc[item.section]) acc[item.section] = [];
      acc[item.section].push(item);
      return acc;
    }, {} as Record<string, typeof navItems>);
  }, [isSuperAdmin]);

  const handleLogout = () => {
    clearAdminSession();
    navigate('/admin/login');
  };

  return (
    <aside className="sidebar">
      {/* Brand header */}
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 14px' }}>
        <img
          src="/assets/images/nexgate_icon_rounded.svg"
          alt="NexGate Logo"
          style={{ width: 32, height: 32, borderRadius: 8, display: 'block', objectFit: 'contain' }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="sidebar-logo-title" style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
            NexGate
          </div>
          <div className="sidebar-logo-sub" style={{ marginTop: 1 }}>
            {isSuperAdmin ? (
              <span style={{ color: '#2563EB', fontWeight: 700, fontSize: 10, letterSpacing: '0.04em' }}>SUPER ADMIN</span>
            ) : (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>ADMIN PORTAL</span>
            )}
          </div>
        </div>
      </div>

      {/* Society card & Plan */}
      <div
        className="sidebar-society"
        style={{
          margin: '8px 12px 12px',
          padding: '10px 12px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 8,
          overflow: 'hidden',
          boxSizing: 'border-box',
          width: 'calc(100% - 24px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, width: '100%' }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              background: isSuperAdmin ? 'rgba(37, 99, 235, 0.1)' : 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Building2 size={15} color={isSuperAdmin ? '#2563EB' : 'var(--accent-light)'} />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <div
              className="sidebar-society-name"
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
              title={isSuperAdmin ? 'Platform Management' : (societyInfo?.name || subData?.societyName || 'Society Portal')}
            >
              {isSuperAdmin ? 'Platform Management' : (societyInfo?.name || subData?.societyName || 'Society Portal')}
            </div>
            <div
              className="sidebar-society-meta"
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: 11,
                color: 'var(--text-muted)',
                marginTop: 1,
              }}
            >
              {isSuperAdmin
                ? 'Multi-Tenant SaaS'
                : (societyInfo?.city || 'Society Admin')}
            </div>
          </div>
        </div>

        {/* Plan Display in Sidebar (Set by Super Admin) */}
        {!isSuperAdmin && (
          <div
            style={{
              paddingTop: 8,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 6,
              minWidth: 0,
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <Shield size={12} color="var(--accent-light, #6366f1)" style={{ flexShrink: 0 }} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
                title={(() => {
                  const raw = subData?.planName || societyInfo?.planName || 'STANDARD_1_DEVICE';
                  if (raw.includes('ENTERPRISE') || raw.includes('PRO')) return 'Enterprise (3 Devices)';
                  if (raw.includes('PREMIUM') || raw.includes('DUAL')) return 'Premium (2 Devices)';
                  return 'Standard (1 Device)';
                })()}
              >
                {(() => {
                  const raw = subData?.planName || societyInfo?.planName || 'STANDARD_1_DEVICE';
                  if (raw.includes('ENTERPRISE') || raw.includes('PRO')) return 'Enterprise (3 Devices)';
                  if (raw.includes('PREMIUM') || raw.includes('DUAL')) return 'Premium (2 Devices)';
                  return 'Standard (1 Device)';
                })()}
              </span>
            </div>
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                padding: '2px 5px',
                borderRadius: 4,
                background: subData?.isTrialActive ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: subData?.isTrialActive ? '#60A5FA' : '#10B981',
                border: `1px solid ${subData?.isTrialActive ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {subData?.isTrialActive ? 'Free Trial' : 'Active'}
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {Object.entries(grouped).map(([section, items]) => (
          <div key={section}>
            <div className="sidebar-section-label">{section}</div>
            {items.map(({ to, icon: Icon, label, badge }: any) => (
              <NavLink
                key={to}
                to={to}
                id={`nav-${to.replace(/\//g, '-')}`}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={16} className="nav-item-icon" />
                    <span className="nav-item-label">{label}</span>
                    {badge && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          background: 'rgba(99,102,241,0.15)',
                          color: 'var(--accent-light)',
                          border: '1px solid rgba(99,102,241,0.25)',
                          borderRadius: 4,
                          padding: '1px 5px',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          marginLeft: 'auto',
                          marginRight: isActive ? 4 : 0,
                        }}
                      >
                        {badge}
                      </span>
                    )}
                    {isActive && <ChevronRight size={13} style={{ opacity: 0.5, marginLeft: badge ? 0 : 'auto' }} />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="sidebar-user">
        <div className="sidebar-user-card">
          <div className="sidebar-avatar" style={{ background: isSuperAdmin ? '#2563EB' : undefined }}>
            {avatarInitials}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name" title={displayName}>{displayName}</div>
            <div className="sidebar-user-role" style={{ color: isSuperAdmin ? '#2563EB' : undefined }}>
              {displayRole}
            </div>
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={handleLogout}
            title="Sign out of Admin Portal"
            aria-label="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

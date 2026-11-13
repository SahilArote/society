import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck,
  DoorOpen, Megaphone, Bell, BarChart3,
  Settings, LogOut, Building2, ChevronRight,
  Wrench, CalendarDays
} from 'lucide-react';
import { mockAdminUser } from '../../data/mockData';
import { clearAdminSession } from '../../services/api';

const NAV = [
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

const grouped = NAV.reduce((acc, item) => {
  if (!acc[item.section]) acc[item.section] = [];
  acc[item.section].push(item);
  return acc;
}, {} as Record<string, typeof NAV>);

export function AdminSidebar() {
  const navigate = useNavigate();
  const [societyInfo, setSocietyInfo] = useState(() => {
    try {
      const cached = localStorage.getItem('gg_admin_society_settings');
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return { name: 'Eco Residency Co-operative Housing Society Ltd', city: 'Mumbai, MH', totalFlats: '120' };
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const cached = localStorage.getItem('gg_admin_society_settings');
        if (cached) setSocietyInfo(JSON.parse(cached));
      } catch (_) {}
    };
    window.addEventListener('nexgate_society_updated', handleUpdate);
    return () => window.removeEventListener('nexgate_society_updated', handleUpdate);
  }, []);

  // Dynamic logged in admin user
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('gg_admin_user');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return mockAdminUser;
  });

  const displayName = currentUser?.name || 'Admin';
  const displayRole = (currentUser?.role || 'ADMIN').replace('_', ' ');
  const avatarInitials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'A';

  const handleLogout = () => {
    clearAdminSession();
    navigate('/admin/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <img
          src="/assets/images/nexgate_icon_rounded.svg"
          alt="NexGate Logo"
          style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', objectFit: 'contain', flexShrink: 0 }}
        />
        <div>
          <div className="sidebar-logo-title">NexGate</div>
          <div className="sidebar-logo-sub">ADMIN PORTAL</div>
        </div>
      </div>

      {/* Society pill */}
      <div className="sidebar-society" style={{ margin: '12px 12px 4px' }}>
        <Building2 size={14} color="var(--accent-light)" style={{ flexShrink: 0 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            className="sidebar-society-name"
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={societyInfo.name || 'Eco Residency Co-operative Housing Society Ltd'}
          >
            {societyInfo.name || 'Eco Residency Co-operative Housing Society Ltd'}
          </div>
          <div
            className="sidebar-society-meta"
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {societyInfo.totalFlats || 120} Flats · {societyInfo.city || societyInfo.address || 'Mumbai, MH'}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {Object.entries(grouped).map(([section, items]) => (
          <div key={section}>
            <div className="sidebar-section-label">{section}</div>
            {items.map(({ to, icon: Icon, label, badge }) => (
              <NavLink
                key={to}
                to={to}
                id={`nav-${to.replace('/', '')}`}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={16} className="nav-item-icon" />
                    <span className="nav-item-label">{label}</span>
                    {badge && (
                      <span style={{
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
                        marginRight: isActive ? 4 : 0
                      }}>
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
          <div className="sidebar-avatar">
            {avatarInitials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={displayName}>
              {displayName}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 1 }}>
              {displayRole}
            </div>
          </div>
          <button
            onClick={handleLogout}
            id="sidebar-logout-btn"
            className="btn-icon"
            title="Logout"
            style={{ width: 28, height: 28 }}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}

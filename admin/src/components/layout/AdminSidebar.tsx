import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield, LayoutDashboard, Users, UserCheck,
  DoorOpen, Megaphone, Bell, BarChart3,
  Settings, LogOut, Building2, ChevronRight
} from 'lucide-react';
import { mockAdminUser } from '../../data/mockData';

const NAV = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard',      section: 'Management' },
  { to: '/residents',     icon: Users,           label: 'Residents',       section: 'Management' },
  { to: '/visitors',      icon: UserCheck,       label: 'Visitors',        section: 'Management' },
  { to: '/gates',         icon: DoorOpen,        label: 'Gates & Guards',  section: 'Management' },
  { to: '/announcements', icon: Megaphone,       label: 'Announcements',   section: 'Society' },
  { to: '/notifications', icon: Bell,            label: 'Notifications',   section: 'Society' },
  { to: '/reports',       icon: BarChart3,       label: 'Reports',         section: 'Society' },
  { to: '/settings',      icon: Settings,        label: 'Settings',        section: 'Configuration' },
];

const grouped = NAV.reduce((acc, item) => {
  if (!acc[item.section]) acc[item.section] = [];
  acc[item.section].push(item);
  return acc;
}, {} as Record<string, typeof NAV>);

export function AdminSidebar() {
  const navigate = useNavigate();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Shield size={18} color="white" />
        </div>
        <div>
          <div className="sidebar-logo-title">GreenGate</div>
          <div className="sidebar-logo-sub">ADMIN PORTAL</div>
        </div>
      </div>

      {/* Society pill */}
      <div className="sidebar-society" style={{ margin: '12px 12px 4px' }}>
        <Building2 size={14} color="var(--accent-light)" style={{ flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div className="sidebar-society-name">Green Valley Residency</div>
          <div className="sidebar-society-meta">120 Flats · Pune, MH</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {Object.entries(grouped).map(([section, items]) => (
          <div key={section}>
            <div className="sidebar-section-label">{section}</div>
            {items.map(({ to, icon: Icon, label }) => (
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
                    {isActive && <ChevronRight size={13} style={{ opacity: 0.5 }} />}
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
            {mockAdminUser.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {mockAdminUser.name}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 1 }}>
              {mockAdminUser.role.replace('_', ' ')}
            </div>
          </div>
          <button
            onClick={() => { localStorage.removeItem('gg_admin_auth'); navigate('/login'); }}
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

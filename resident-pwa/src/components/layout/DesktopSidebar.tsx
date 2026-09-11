import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Users, Bell, User, Heart, Car, Building2, Plus, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getUnreadCount } from '../../data/mockNotifications';
import { mockResident } from '../../data/mockResident';
import { BRAND_CONFIG } from '../../config/branding';
import { Avatar } from '../ui/Avatar';

export function DesktopSidebar() {
  const navigate = useNavigate();
  const unreadCount = getUnreadCount();

  const mainNav = [
    { label: 'Home Dashboard', path: '/home', icon: Home },
    { label: 'Visitors & Passes', path: '/visitors', icon: Users },
    { label: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
    { label: 'My Profile', path: '/profile', icon: User },
  ];

  const quickNav = [
    { label: 'Family Members', path: '/family', icon: Heart },
    { label: 'Vehicles', path: '/vehicles', icon: Car },
    { label: 'Flat Details', path: '/flat', icon: Building2 },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 min-h-screen p-5 flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 py-1 mb-6">
        <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm border border-slate-200 flex-shrink-0">
          <img src={BRAND_CONFIG.logo.src} alt={BRAND_CONFIG.logo.alt} className="w-full h-full object-contain rounded-lg" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 leading-tight">{BRAND_CONFIG.name}</h2>
          <p className="text-xs text-slate-500 truncate max-w-[140px]">{mockResident.society.name}</p>
        </div>
      </div>

      {/* Primary CTA */}
      <button
        onClick={() => navigate('/invite-visitor')}
        className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-4 rounded-xl shadow-sm transition-all btn-press mb-6"
      >
        <Plus className="w-4 h-4" />
        <span>Invite Visitor</span>
      </button>

      {/* Main Navigation */}
      <div className="space-y-1 mb-6">
        <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Menu
        </p>
        {mainNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                )
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              {Boolean(item.badge && item.badge > 0) && (
                <span className="min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Household Navigation */}
      <div className="space-y-1 mb-6">
        <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Household
        </p>
        {quickNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                )
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Resident Info at bottom */}
      <div className="mt-auto pt-4 border-t border-slate-100">
        <div
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
        >
          <Avatar name={mockResident.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{mockResident.name}</p>
            <p className="text-xs text-slate-500 truncate">Flat {mockResident.flat.number}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate('/login');
            }}
            title="Log Out"
            className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

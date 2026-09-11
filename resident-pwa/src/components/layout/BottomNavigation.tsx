import { NavLink } from 'react-router-dom';
import { House, UsersRound, Bell, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { getUnreadCount } from '../../data/mockNotifications';

export function BottomNavigation() {
  const unreadCount = getUnreadCount();

  const navItems = [
    { label: 'Home', path: '/home', icon: House },
    { label: 'Visitors', path: '/visitors', icon: UsersRound },
    { label: 'Alerts', path: '/notifications', icon: Bell, badge: unreadCount },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <nav className="w-full bg-white/95 backdrop-blur-md border-t border-slate-200/80 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.03)] select-none flex-shrink-0 z-40">
      <div className="w-full flex items-center justify-around h-14 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center justify-center flex-1 h-full py-1 tap-target transition-all focus:outline-none',
                  isActive
                    ? 'text-indigo-600'
                    : 'text-slate-400 hover:text-slate-600'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon
                      className={cn(
                        'w-5 h-5 transition-transform duration-200',
                        isActive ? 'scale-105' : 'scale-100'
                      )}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    {Boolean(item.badge && item.badge > 0) && (
                      <span className="absolute -top-1 -right-2.5 min-w-[15px] h-[15px] px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] mt-1 tracking-tight',
                      isActive ? 'font-bold text-indigo-600' : 'font-medium text-slate-500'
                    )}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-1 w-1.5 h-1.5 bg-indigo-600 rounded-full"
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNavigation;

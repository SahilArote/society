import { Outlet } from 'react-router-dom';
import { BottomNavigation } from './BottomNavigation';
import { OfflineIndicator } from '../domain/OfflineIndicator';
import { MobilePushNotificationBanner } from './MobilePushNotificationBanner';
import { useVisitorPushListener } from '../../hooks/useVisitorPushListener';

export function ResponsiveShell() {
  useVisitorPushListener();

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex items-center justify-center bg-slate-950 overflow-hidden">
      {/* Mobile App Canvas Container (Full on mobile, centered max-w-[440px] phone canvas on desktop) */}
      <div className="relative w-full max-w-[440px] h-full bg-slate-50 flex flex-col overflow-hidden shadow-2xl md:ring-1 md:ring-slate-800">
        {/* Floating In-App Heads-Up Mobile Push Notification Banner */}
        <MobilePushNotificationBanner />

        {/* Floating Non-intrusive Offline Pill */}
        <OfflineIndicator />

        {/* Isolated Scrollable Viewport with Momentum Scrolling */}
        <main className="flex-1 w-full flex flex-col overflow-y-auto overscroll-y-contain mobile-scroll-container relative">
          <Outlet />
        </main>

        {/* Fixed Mobile Bottom Navigation */}
        <BottomNavigation />
      </div>
    </div>
  );
}

export default ResponsiveShell;

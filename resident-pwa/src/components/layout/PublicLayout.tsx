import { Outlet } from 'react-router-dom';
import { OfflineIndicator } from '../domain/OfflineIndicator';

export function PublicLayout() {
  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex items-center justify-center bg-slate-950 overflow-hidden select-none">
      <div className="relative w-full max-w-[440px] h-full bg-white flex flex-col overflow-y-auto overscroll-y-contain mobile-scroll-container shadow-2xl md:ring-1 md:ring-slate-800">
        <OfflineIndicator />
        <div className="flex-1 w-full flex flex-col min-h-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default PublicLayout;

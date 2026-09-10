import { Outlet, Navigate } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

function isAuthenticated() {
  return localStorage.getItem('gg_admin_auth') === 'true';
}

export function AdminShell() {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <div className="main-content">
        <AdminHeader />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

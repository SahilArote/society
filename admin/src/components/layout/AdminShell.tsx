import { Outlet, Navigate } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { ErrorBoundary } from '../common/ErrorBoundary';

function isAuthenticated() {
  return localStorage.getItem('gg_admin_auth') === 'true';
}

export function AdminShell() {
  if (!isAuthenticated()) return <Navigate to="/admin/login" replace />;

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <div className="main-content">
        <AdminHeader />
        <main className="page-content">
          <ErrorBoundary fallbackTitle="View Rendering Error">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

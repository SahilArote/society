import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AdminShell } from './components/layout/AdminShell';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { getAdminUser } from './services/api';

// Lazy-loaded routes for code splitting and instant initial loading
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Residents = lazy(() => import('./pages/Residents'));
const Visitors = lazy(() => import('./pages/Visitors'));
const Gates = lazy(() => import('./pages/Gates'));
const Maintenance = lazy(() => import('./pages/Maintenance'));
const Services = lazy(() => import('./pages/Services'));
const Community = lazy(() => import('./pages/Community'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const SuperAdminSocieties = lazy(() => import('./pages/SuperAdminSocieties'));
const SuperAdminOnboard = lazy(() => import('./pages/SuperAdminOnboard'));

function PageLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        width: '100%',
        color: 'var(--text-secondary, #94A3B8)',
        flexDirection: 'column',
        gap: 12,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '3px solid rgba(37, 99, 235, 0.2)',
          borderTopColor: '#2563EB',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.02em' }}>Loading NexGate...</span>
    </div>
  );
}

function AdminHomeRedirect() {
  const user = getAdminUser();
  if (user?.role === 'SUPER_ADMIN') {
    return <Navigate to="/admin/super/societies" replace />;
  }
  return <Navigate to="/admin/dashboard" replace />;
}

function SocietyDashboardRoute() {
  const user = getAdminUser();
  if (user?.role === 'SUPER_ADMIN') {
    return <Navigate to="/admin/super/societies" replace />;
  }
  return <Dashboard />;
}

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Application Error">
      <ThemeProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Root: Sleek React Landing Page */}
              <Route path="/" element={<LandingPage />} />

              {/* Admin Login */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/login" element={<Navigate to="/admin/login" replace />} />

              {/* Admin Portal Layout & Protected Routes */}
              <Route path="/admin" element={<AdminShell />}>
                <Route index element={<AdminHomeRedirect />} />
                <Route path="dashboard" element={<SocietyDashboardRoute />} />
                <Route path="residents" element={<Residents />} />
                <Route path="visitors" element={<Visitors />} />
                <Route path="gates" element={<Gates />} />
                <Route path="maintenance" element={<Maintenance />} />
                <Route path="services" element={<Services />} />
                <Route path="community" element={<Community />} />
                <Route path="announcements" element={<Announcements />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />

                {/* Super Admin Platform Routes */}
                <Route path="super/societies" element={<SuperAdminSocieties />} />
                <Route path="super/onboard" element={<SuperAdminOnboard />} />
                <Route path="super" element={<Navigate to="/admin/super/societies" replace />} />
              </Route>

              {/* Direct convenience aliases */}
              <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/residents" element={<Navigate to="/admin/residents" replace />} />
              <Route path="/visitors" element={<Navigate to="/admin/visitors" replace />} />
              <Route path="/gates" element={<Navigate to="/admin/gates" replace />} />
              <Route path="/maintenance" element={<Navigate to="/admin/maintenance" replace />} />
              <Route path="/services" element={<Navigate to="/admin/services" replace />} />
              <Route path="/community" element={<Navigate to="/admin/community" replace />} />
              <Route path="/announcements" element={<Navigate to="/admin/announcements" replace />} />
              <Route path="/notifications" element={<Navigate to="/admin/notifications" replace />} />
              <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />
              <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
              <Route path="/super" element={<Navigate to="/admin/super/societies" replace />} />
              <Route path="/super/societies" element={<Navigate to="/admin/super/societies" replace />} />
              <Route path="/super/onboard" element={<Navigate to="/admin/super/onboard" replace />} />

              {/* Fallback to Landing Page */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

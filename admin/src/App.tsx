import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AdminShell } from './components/layout/AdminShell';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Lazy-loaded routes for code splitting and instant initial loading
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Residents = lazy(() => import('./pages/Residents'));
const Visitors = lazy(() => import('./pages/Visitors'));
const Gates = lazy(() => import('./pages/Gates'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));

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

              {/* Admin Portal Redirect & Routes */}
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin" element={<AdminShell />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="residents" element={<Residents />} />
                <Route path="visitors" element={<Visitors />} />
                <Route path="gates" element={<Gates />} />
                <Route path="announcements" element={<Announcements />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Direct convenience aliases */}
              <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/residents" element={<Navigate to="/admin/residents" replace />} />
              <Route path="/visitors" element={<Navigate to="/admin/visitors" replace />} />
              <Route path="/gates" element={<Navigate to="/admin/gates" replace />} />
              <Route path="/announcements" element={<Navigate to="/admin/announcements" replace />} />
              <Route path="/notifications" element={<Navigate to="/admin/notifications" replace />} />
              <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />
              <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />

              {/* Fallback to Landing Page */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

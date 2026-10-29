import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AdminShell } from './components/layout/AdminShell';
import LandingPage from './pages/LandingPage';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import Residents from './pages/Residents';
import Visitors from './pages/Visitors';
import Gates from './pages/Gates';
import Announcements from './pages/Announcements';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </ThemeProvider>
  );
}

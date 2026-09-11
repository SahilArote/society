import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AdminShell } from './components/layout/AdminShell';
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
          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Public: Admin Login */}
          <Route path="/login" element={<AdminLogin />} />

          {/* Protected: Admin Shell */}
          <Route element={<AdminShell />}>
            <Route path="/dashboard"     element={<Dashboard />} />
            <Route path="/residents"     element={<Residents />} />
            <Route path="/visitors"      element={<Visitors />} />
            <Route path="/gates"         element={<Gates />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/reports"       element={<Reports />} />
            <Route path="/settings"      element={<Settings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

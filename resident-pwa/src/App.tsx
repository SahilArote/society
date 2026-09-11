import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ResponsiveShell } from './components/layout/ResponsiveShell';
import { PublicLayout } from './components/layout/PublicLayout';
import { SplashScreen } from './components/common/SplashScreen';
import { PwaUpdateBanner } from './components/common/PwaUpdateBanner';
import { ToastProvider } from './components/ui/Toast';
import { pwaInstallManager } from './services/pwaInstallManager';
import { authSession } from './services/authSession';

// Public pages
import Landing from './pages/Landing';
import PwaInstall from './pages/PwaInstall';
import Login from './pages/Login';
import OtpVerify from './pages/OtpVerify';

// Authenticated pages
import Home from './pages/Home';
import Visitors from './pages/Visitors';
import VisitorDetail from './pages/VisitorDetail';
import InviteVisitor from './pages/InviteVisitor';
import VisitorApproval from './pages/VisitorApproval';
import Family from './pages/Family';
import AddFamilyMember from './pages/AddFamilyMember';
import Vehicles from './pages/Vehicles';
import AddVehicle from './pages/AddVehicle';
import FlatDetails from './pages/FlatDetails';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';

/**
 * RootEntry: Distinguishes between:
 * Mode A: Browser / Public Web Mode -> Landing Page with Install CTA
 * Mode B: Installed PWA Mode -> Directly Home or Login (Never marketing)
 */
function RootEntry() {
  const isStandalone = pwaInstallManager.checkIsStandalone();
  const isAuthenticated = authSession.isAuthenticated();

  if (isStandalone) {
    return isAuthenticated ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />;
  }

  return <Landing />;
}

/**
 * ProtectedRoute: Ensures resident is authenticated for app shell
 */
function ProtectedRoute() {
  const isAuthenticated = authSession.isAuthenticated();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <ResponsiveShell />;
}

/**
 * ProtectedActionRoute: Ensures resident is authenticated for full-screen flows
 */
function ProtectedActionRoute() {
  const isAuthenticated = authSession.isAuthenticated();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <PublicLayout />;
}

/**
 * LoginRoute: Auto-routes to /home if already logged in inside installed PWA
 */
function LoginRoute() {
  const isStandalone = pwaInstallManager.checkIsStandalone();
  const isAuthenticated = authSession.isAuthenticated();

  if (isStandalone && isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return <Login />;
}

export default function App() {
  const isStandalone = pwaInstallManager.checkIsStandalone();
  // Show launch splash during initial boot of installed PWA
  const [showSplash, setShowSplash] = useState(isStandalone);

  return (
    <ToastProvider>
      <PwaUpdateBanner />
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <BrowserRouter>
        <Routes>
          {/* Root Entry (Mode A vs Mode B detection) */}
          <Route path="/" element={<RootEntry />} />

          {/* Public / Onboarding routes */}
          <Route element={<PublicLayout />}>
            <Route path="/install" element={<PwaInstall />} />
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/verify-otp" element={<OtpVerify />} />
          </Route>

          {/* Authenticated Resident routes inside App Shell */}
          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<Home />} />
            <Route path="/visitors" element={<Visitors />} />
            <Route path="/visitors/:id" element={<VisitorDetail />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/family" element={<Family />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/flat" element={<FlatDetails />} />
          </Route>

          {/* Authenticated full-screen action flows */}
          <Route element={<ProtectedActionRoute />}>
            <Route path="/invite-visitor" element={<InviteVisitor />} />
            <Route path="/add-family" element={<AddFamilyMember />} />
            <Route path="/add-vehicle" element={<AddVehicle />} />
            <Route path="/visitor-approval/:id" element={<VisitorApproval />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

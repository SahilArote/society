import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ResponsiveShell } from './components/layout/ResponsiveShell';
import { PublicLayout } from './components/layout/PublicLayout';
import { SplashScreen } from './components/common/SplashScreen';
import { PwaUpdateBanner } from './components/common/PwaUpdateBanner';
import { VisitorHeadsUpPopup } from './components/common/VisitorHeadsUpPopup';
import { ToastProvider } from './components/ui/Toast';
import { pwaInstallManager } from './services/pwaInstallManager';
import { AuthProvider, useAuth } from './context/AuthContext';

// Public pages
import Landing from './pages/Landing';
import PwaInstall from './pages/PwaInstall';
import Login from './pages/Login';
import Register from './pages/Register';
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

function RootEntry() {
  const isStandalone = pwaInstallManager.checkIsStandalone();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm font-semibold text-slate-500">Connecting to NexGate...</div>;
  }

  if (isStandalone) {
    return isAuthenticated ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />;
  }

  return <Landing />;
}

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm font-semibold text-slate-500">Verifying session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <ResponsiveShell />;
}

function ProtectedActionRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm font-semibold text-slate-500">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <PublicLayout />;
}

function LoginRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return <Login />;
}

export default function App() {
  const isStandalone = pwaInstallManager.checkIsStandalone();
  const [showSplash, setShowSplash] = useState(isStandalone);

  return (
    <AuthProvider>
      <ToastProvider>
        <PwaUpdateBanner />
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
        <BrowserRouter>
          <VisitorHeadsUpPopup />
          <Routes>
            <Route path="/" element={<RootEntry />} />

            <Route element={<PublicLayout />}>
              <Route path="/install" element={<PwaInstall />} />
              <Route path="/login" element={<LoginRoute />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-otp" element={<OtpVerify />} />
              <Route path="/otp-verify" element={<OtpVerify />} />
            </Route>

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

            <Route element={<ProtectedActionRoute />}>
              <Route path="/invite-visitor" element={<InviteVisitor />} />
              <Route path="/add-family" element={<AddFamilyMember />} />
              <Route path="/add-vehicle" element={<AddVehicle />} />
              <Route path="/visitor-approval/:id" element={<VisitorApproval />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

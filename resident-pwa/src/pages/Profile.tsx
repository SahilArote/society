import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Heart,
  Car,
  Bell,
  HelpCircle,
  Shield,
  FileText,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { PageContainer } from '../components/layout/PageContainer';
import { Avatar } from '../components/ui/Avatar';
import { BottomSheet } from '../components/ui/BottomSheet';
import { Button } from '../components/ui/Button';
import { mockResident } from '../data/mockResident';
import { useToast } from '../hooks';
import { authSession } from '../services/authSession';

export default function Profile() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [showLogoutSheet, setShowLogoutSheet] = useState(false);

  const handleLogoutConfirm = () => {
    setShowLogoutSheet(false);
    authSession.clearSession();
    showToast('Signed out of society portal', 'info');
    navigate('/login', { replace: true });
  };

  const homeRows = [
    {
      icon: Building2,
      iconBg: 'bg-indigo-50 text-indigo-600',
      label: 'My Flat & Unit',
      value: `Flat ${mockResident.flat.number}`,
      onClick: () => navigate('/flat'),
    },
    {
      icon: Heart,
      iconBg: 'bg-rose-50 text-rose-600',
      label: 'Family Members',
      value: '4 members',
      onClick: () => navigate('/family'),
    },
    {
      icon: Car,
      iconBg: 'bg-amber-50 text-amber-600',
      label: 'My Vehicles',
      value: '3 registered',
      onClick: () => navigate('/vehicles'),
    },
  ];

  const appRows = [
    {
      icon: Bell,
      iconBg: 'bg-blue-50 text-blue-600',
      label: 'Notifications',
      onClick: () => navigate('/notifications'),
    },
    {
      icon: HelpCircle,
      iconBg: 'bg-emerald-50 text-emerald-600',
      label: 'Help & Security Desk',
      onClick: () => showToast('Security Desk Intercom: 101', 'info'),
    },
  ];

  const legalRows = [
    {
      icon: Shield,
      iconBg: 'bg-slate-100 text-slate-600',
      label: 'Privacy Policy',
      onClick: () => showToast('GreenGate complies with Digital Personal Data Protection', 'info'),
    },
    {
      icon: FileText,
      iconBg: 'bg-slate-100 text-slate-600',
      label: 'Society Bye-Laws',
      onClick: () => showToast('Society Bye-Laws available in society office', 'info'),
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-50">
      <AppHeader title="Profile & Settings" />

      <PageContainer className="space-y-4 pt-3 pb-24 select-none">
        {/* Top Resident Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-2xs flex items-center gap-4">
          <Avatar
            name={mockResident.name}
            size="lg"
            className="ring-4 ring-indigo-50/80 shadow-2xs font-extrabold"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-extrabold text-slate-900 leading-tight">
              {mockResident.name}
            </h1>
            <p className="text-xs font-bold text-indigo-600 mt-0.5">
              Flat {mockResident.flat.number} · {mockResident.flat.building}
            </p>
            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
              {mockResident.society.name}
            </p>
          </div>
        </div>

        {/* Section 1: My Home */}
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 mb-1.5 block">
            My Home
          </span>
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {homeRows.map((row) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.label}
                  onClick={row.onClick}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer card-pressable"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${row.iconBg}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">{row.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">{row.value}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: App Settings */}
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 mb-1.5 block">
            App Settings
          </span>
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {appRows.map((row) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.label}
                  onClick={row.onClick}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer card-pressable"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${row.iconBg}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">{row.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Legal */}
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 mb-1.5 block">
            Legal & Terms
          </span>
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {legalRows.map((row) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.label}
                  onClick={row.onClick}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer card-pressable"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${row.iconBg}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">{row.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 4: Account / Logout */}
        <div>
          <div className="bg-white rounded-2xl border border-rose-100 shadow-2xs overflow-hidden">
            <button
              onClick={() => setShowLogoutSheet(true)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-rose-50/50 active:bg-rose-100/50 text-rose-600 cursor-pointer card-pressable text-left focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <LogOut className="w-4 h-4 text-rose-600" />
                </div>
                <span className="text-xs font-extrabold text-rose-600">Sign Out</span>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-300" />
            </button>
          </div>
        </div>

        <div className="text-center pt-1 pb-4">
          <p className="text-[10px] font-semibold text-slate-400">GreenGate Resident PWA · v1.0.0</p>
        </div>
      </PageContainer>

      {/* Mobile Native Logout Confirmation Bottom Sheet */}
      <BottomSheet
        isOpen={showLogoutSheet}
        onClose={() => setShowLogoutSheet(false)}
        title="Sign Out"
      >
        <div className="text-center py-2">
          <p className="text-xs text-slate-500 mb-6 max-w-xs mx-auto">
            Are you sure you want to sign out? You will need to verify via OTP to access your flat gate controls again.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => setShowLogoutSheet(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="lg"
              fullWidth
              onClick={handleLogoutConfirm}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

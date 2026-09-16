import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone, Building2, Layers, Home, CheckCircle2, Clock,
  AlertCircle, ArrowRight, ArrowLeft, Edit3, RefreshCw, XCircle, Shield
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BRAND_CONFIG } from '../config/branding';
import {
  fetchRegistrationFlats,
  checkRegistrationStatus,
  submitRegistration,
  ApiError,
} from '../services/api';
import { io, Socket } from 'socket.io-client';

interface FlatItem {
  id: string;
  flatNumber: string;
  wing: string;
  floor: number;
  isOccupied?: boolean;
}

interface FlatHierarchy {
  wings: string[];
  floors: Record<string, number[]>;
  flats: FlatItem[];
}

interface RegistrationData {
  id?: string;
  mobile: string;
  name?: string;
  wing: string;
  floor: number | '';
  flatNumber: string;
  flatId?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_REGISTERED';
  rejectionReason?: string;
  createdAt?: string;
  reviewedAt?: string;
}

const STORAGE_KEY = 'nexgate_pending_registration';

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();

  // Multi-step states: 1 = Mobile, 2 = Select Flat, 3 = Confirm, 4 = Pending, 5 = Rejected
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [mobile, setMobile] = useState('');
  const [wing, setWing] = useState('');
  const [floor, setFloor] = useState<number | ''>('');
  const [flatNumber, setFlatNumber] = useState('');
  const [flatId, setFlatId] = useState('');
  const [residentName, setResidentName] = useState('');

  // Backend Flats Hierarchy
  const [hierarchy, setHierarchy] = useState<FlatHierarchy | null>(null);
  const [loadingFlats, setLoadingFlats] = useState(false);

  // Completed / Pending Registration state
  const [activeReg, setActiveReg] = useState<RegistrationData | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Initialize: Check localStorage for existing pending registration or router state
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.mobile) {
          setMobile(parsed.mobile);
          setActiveReg(parsed);
          setStep(4);
          refreshLiveStatus(parsed.mobile);
          return;
        }
      } catch (_) {}
    }

    // Router state passed from Login page
    if (location.state?.mobile) {
      setMobile(location.state.mobile);
      if (location.state.pendingRequest) {
        setActiveReg(location.state.pendingRequest);
        setStep(4);
        refreshLiveStatus(location.state.mobile);
      }
    }
  }, [location.state]);

  // Load real flats from backend when entering Step 2
  useEffect(() => {
    if (step === 2 && !hierarchy) {
      setLoadingFlats(true);
      fetchRegistrationFlats()
        .then((data) => {
          setHierarchy(data);
          if (data?.wings?.length > 0 && !wing) {
            setWing(data.wings[0]);
          }
        })
        .catch((err) => {
          console.error('Failed to load flats hierarchy:', err);
          setError('Failed to load society flat list. Please try again.');
        })
        .finally(() => setLoadingFlats(false));
    }
  }, [step, hierarchy, wing]);

  // Set default floor and flat when wing changes
  useEffect(() => {
    if (!hierarchy || !wing) return;
    const availableFloors = hierarchy.floors[wing] || [];
    if (availableFloors.length > 0) {
      const defaultFloor = availableFloors.includes(Number(floor)) ? Number(floor) : availableFloors[0];
      setFloor(defaultFloor);
    } else {
      setFloor('');
      setFlatNumber('');
      setFlatId('');
    }
  }, [wing, hierarchy]);

  // Set default flat when floor or wing changes
  useEffect(() => {
    if (!hierarchy || !wing || floor === '') return;
    const matchingFlats = hierarchy.flats.filter(
      (f) => f.wing === wing && Number(f.floor) === Number(floor)
    );
    if (matchingFlats.length > 0) {
      const currentExists = matchingFlats.some((f) => f.flatNumber === flatNumber);
      if (!currentExists) {
        setFlatNumber(matchingFlats[0].flatNumber);
        setFlatId(matchingFlats[0].id);
      }
    } else {
      setFlatNumber('');
      setFlatId('');
    }
  }, [wing, floor, hierarchy]);

  // Realtime Socket.IO Connection for Pending Registration Screen
  useEffect(() => {
    if (step !== 4 || !activeReg?.mobile) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'https://society-d521.onrender.com';
    let socket: Socket | null = null;

    try {
      socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        setSocketConnected(true);
        if (activeReg.id) {
          socket?.emit('join_registration', activeReg.id);
        }
      });

      socket.on('resident:registration_updated', (data: any) => {
        if (
          (data.requestId && data.requestId === activeReg.id) ||
          (data.mobile && data.mobile === activeReg.mobile)
        ) {
          if (data.status === 'APPROVED') {
            setActiveReg((prev) => (prev ? { ...prev, status: 'APPROVED' } : null));
            localStorage.removeItem(STORAGE_KEY);
          } else if (data.status === 'REJECTED') {
            setActiveReg((prev) => (prev ? { ...prev, status: 'REJECTED', rejectionReason: data.rejectionReason } : null));
            setStep(5);
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      });
    } catch (e) {
      console.warn('Socket connection error:', e);
    }

    // Robust Polling fallback every 8 seconds
    const interval = setInterval(() => {
      if (activeReg?.mobile) {
        refreshLiveStatus(activeReg.mobile);
      }
    }, 8000);

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.disconnect();
      }
    };
  }, [step, activeReg?.id, activeReg?.mobile]);

  const refreshLiveStatus = async (phoneToCheck: string) => {
    const cleanDigits = phoneToCheck.replace(/\D/g, '').slice(-10);
    if (!cleanDigits) return;

    setCheckingStatus(true);
    try {
      const res = await checkRegistrationStatus(cleanDigits);
      if (res) {
        if (res.status === 'APPROVED') {
          setActiveReg((prev) => ({
            ...(prev || {}),
            mobile: cleanDigits,
            wing: prev?.wing || '',
            floor: prev?.floor || 1,
            flatNumber: prev?.flatNumber || '',
            status: 'APPROVED',
          }));
          localStorage.removeItem(STORAGE_KEY);
        } else if (res.status === 'REJECTED') {
          setActiveReg((prev) => ({
            ...(prev || {}),
            mobile: cleanDigits,
            wing: res.request?.wing || prev?.wing || '',
            floor: res.request?.floor || prev?.floor || 1,
            flatNumber: res.request?.flatNumber || prev?.flatNumber || '',
            status: 'REJECTED',
            rejectionReason: res.request?.rejectionReason || 'Application rejected by society administrator',
          }));
          setStep(5);
          localStorage.removeItem(STORAGE_KEY);
        } else if (res.status === 'PENDING' && res.request) {
          setActiveReg(res.request);
        }
      }
    } catch (err) {
      console.warn('Status check check error:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  // Step 1: Submit Mobile Number
  const handleMobileContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = mobile.replace(/\D/g, '').slice(-10);

    if (cleanDigits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanDigits)) {
      setError('Please enter a valid Indian mobile number starting with 6, 7, 8, or 9');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const statusRes = await checkRegistrationStatus(cleanDigits);

      if (statusRes.status === 'APPROVED') {
        setError('This mobile number is already registered and approved. Redirecting to Login...');
        setTimeout(() => {
          navigate('/login', { state: { mobile: cleanDigits } });
        }, 1500);
        return;
      }

      if (statusRes.status === 'PENDING') {
        setActiveReg(statusRes.request);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(statusRes.request));
        setStep(4);
        return;
      }

      if (statusRes.status === 'REJECTED') {
        setActiveReg(statusRes.request);
        setStep(5);
        return;
      }

      // If new, advance to flat selection
      setStep(2);
    } catch (err: any) {
      console.error('Status check error:', err);
      // If network or other error, allow user to proceed to flat selection
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm Flat Selection
  const handleFlatContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wing) {
      setError('Please select your Wing');
      return;
    }
    if (floor === '') {
      setError('Please select your Floor');
      return;
    }
    if (!flatNumber) {
      setError('Please select your Flat Number');
      return;
    }

    setError('');
    setStep(3); // Go to confirmation screen
  };

  // Step 3: Final Submission
  const handleSubmitRegistration = async () => {
    const cleanDigits = mobile.replace(/\D/g, '').slice(-10);
    setLoading(true);
    setError('');

    try {
      const res = await submitRegistration({
        mobile: cleanDigits,
        wing,
        floor: Number(floor),
        flatNumber,
        flatId: flatId || undefined,
        name: residentName || 'Resident',
        societyId: 'soc_greengate',
      });

      const request = res.data?.request;
      const trackingToken = res.data?.trackingToken;

      const regPayload: RegistrationData = {
        id: request?.id || `reg_${Date.now()}`,
        mobile: cleanDigits,
        name: residentName,
        wing,
        floor: Number(floor),
        flatNumber,
        flatId,
        status: 'PENDING',
        createdAt: request?.createdAt || new Date().toISOString(),
      };

      setActiveReg(regPayload);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(regPayload));

      if (trackingToken) {
        localStorage.setItem('nexgate_reg_token', trackingToken);
      }

      setStep(4); // Move to Pending Screen
    } catch (err: any) {
      console.error('Submission failed:', err);
      if (err instanceof ApiError && err.code === 'REQUEST_ALREADY_PENDING') {
        const pReq = err.data || { mobile: cleanDigits, wing, floor, flatNumber, status: 'PENDING' };
        setActiveReg(pReq);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pReq));
        setStep(4);
      } else if (err instanceof ApiError && err.code === 'USER_ALREADY_REGISTERED') {
        setError('An active resident account already exists for this number. Please log in.');
      } else {
        setError(err.message || 'Failed to submit registration. Please check your details and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Re-apply after rejection
  const handleReapply = () => {
    setActiveReg(null);
    localStorage.removeItem(STORAGE_KEY);
    setStep(2); // Retain mobile, choose flat or re-verify
  };

  // Filtered lists for Step 2
  const availableWings = hierarchy?.wings || ['Wing A', 'Wing B', 'Wing C'];
  const availableFloors = wing && hierarchy?.floors[wing] ? hierarchy.floors[wing] : [1, 2, 3, 4];
  const availableFlats =
    hierarchy?.flats.filter(
      (f) => f.wing === wing && Number(f.floor) === Number(floor)
    ) || [];

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between p-6">
      {/* Top Society Brand Header */}
      <div className="pt-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white p-0.5 border border-slate-200 shadow-sm flex items-center justify-center">
            <img
              src={BRAND_CONFIG.logo.src}
              alt={BRAND_CONFIG.logo.alt}
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900">
            {BRAND_CONFIG.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {step <= 3 && (
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              Step {step} of 3
            </span>
          )}
          <button
            onClick={() => navigate('/login')}
            className="text-xs text-slate-600 font-medium hover:text-slate-900 px-2 py-1"
          >
            Log in
          </button>
        </div>
      </div>

      {/* Main Multi-Step Content Area */}
      <div className="max-w-sm w-full mx-auto my-auto py-6">
        <AnimatePresence mode="wait">
          {/* ========================================================= */}
          {/* STEP 1: MOBILE NUMBER SCREEN                              */}
          {/* ========================================================= */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              className="space-y-6"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Create your Resident Account
                </h1>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Register your mobile number and flat to access NexGate.
                </p>
              </div>

              <form onSubmit={handleMobileContinue} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Mobile Number
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 flex items-center gap-1 text-slate-700 font-bold text-sm select-none border-r border-slate-200 pr-2.5">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setMobile(val);
                        setError('');
                      }}
                      placeholder="98765 43210"
                      maxLength={10}
                      className="w-full pl-24 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-base focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    An OTP will be sent to verify your identity after admin approval.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs font-medium leading-relaxed">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  icon={<ArrowRight className="w-5 h-5" />}
                >
                  Continue
                </Button>
              </form>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: SELECT YOUR FLAT SCREEN                           */}
          {/* ========================================================= */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-6"
            >
              <div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3"
                >
                  <ArrowLeft className="w-4 h-4" /> Change Mobile Number
                </button>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Select your Flat
                </h1>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Choose your Wing, Floor, and Flat unit registered with society records.
                </p>
              </div>

              {loadingFlats ? (
                <div className="py-12 text-center text-slate-400 text-sm font-medium flex flex-col items-center gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                  <span>Loading society flat records...</span>
                </div>
              ) : (
                <form onSubmit={handleFlatContinue} className="space-y-4">
                  {/* Optional Resident Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      value={residentName}
                      onChange={(e) => setResidentName(e.target.value)}
                      placeholder="e.g. Sahil Arote"
                      className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                    />
                  </div>

                  {/* Sequential Dropdown 1: Wing */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Wing / Tower
                    </label>
                    <div className="relative">
                      <select
                        value={wing}
                        onChange={(e) => {
                          setWing(e.target.value);
                          setError('');
                        }}
                        className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all appearance-none cursor-pointer"
                      >
                        {availableWings.map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                        ▼
                      </div>
                    </div>
                  </div>

                  {/* Sequential Dropdown 2: Floor */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" /> Floor
                    </label>
                    <div className="relative">
                      <select
                        value={floor}
                        onChange={(e) => {
                          setFloor(Number(e.target.value));
                          setError('');
                        }}
                        className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all appearance-none cursor-pointer"
                      >
                        {availableFloors.map((fl) => (
                          <option key={fl} value={fl}>
                            Floor {fl}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                        ▼
                      </div>
                    </div>
                  </div>

                  {/* Sequential Dropdown 3: Flat Number */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 text-indigo-600" /> Flat Number
                    </label>
                    <div className="relative">
                      <select
                        value={flatNumber}
                        onChange={(e) => {
                          const selectedNum = e.target.value;
                          setFlatNumber(selectedNum);
                          const found = availableFlats.find((f) => f.flatNumber === selectedNum);
                          setFlatId(found?.id || '');
                          setError('');
                        }}
                        className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all appearance-none cursor-pointer"
                      >
                        {availableFlats.map((flat) => (
                          <option key={flat.id} value={flat.flatNumber}>
                            {flat.flatNumber} {flat.isOccupied ? '(Existing Resident)' : ''}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                        ▼
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs font-medium leading-relaxed">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    icon={<ArrowRight className="w-5 h-5" />}
                  >
                    Continue to Confirmation
                  </Button>
                </form>
              )}
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: CONFIRMATION SCREEN                               */}
          {/* ========================================================= */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Confirm your details
                </h1>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Please verify your details before submitting to the administrator.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Mobile Number
                    </span>
                    <p className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                      +91 {mobile.slice(0, 5)} {mobile.slice(5)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 border-b border-slate-200/80 pb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Wing
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{wing}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Floor
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">Floor {floor}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Flat
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{flatNumber}</p>
                  </div>
                </div>

                {residentName && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Name
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{residentName}</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs font-medium leading-relaxed">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2.5">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  onClick={handleSubmitRegistration}
                  icon={<CheckCircle2 className="w-5 h-5" />}
                >
                  Submit Registration
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => setStep(2)}
                  disabled={loading}
                >
                  Back
                </Button>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* STEP 4: PENDING / APPROVED SCREEN                         */}
          {/* ========================================================= */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {activeReg?.status === 'APPROVED' ? (
                /* Approved Celebration View */
                <div className="text-center space-y-4 py-4">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-sm">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 mb-2">
                      🟢 Account Approved
                    </span>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                      Registration Approved! 🎉
                    </h1>
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                      Your resident account for flat{' '}
                      <span className="font-bold text-slate-900">{activeReg.flatNumber}</span> has
                      been activated by the society administrator.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => navigate('/login', { state: { mobile: activeReg.mobile } })}
                    icon={<ArrowRight className="w-5 h-5" />}
                  >
                    Proceed to Login
                  </Button>
                </div>
              ) : (
                /* Pending Admin Approval View */
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto shadow-sm mb-3">
                      <Clock className="w-8 h-8 animate-pulse" />
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 mb-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                      🟡 Pending Admin Approval
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                      Registration Submitted
                    </h1>
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                      Your registration request has been sent to the society administrator.
                    </p>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200">
                      <span className="text-slate-500">Mobile Number</span>
                      <span className="font-bold text-slate-900 font-mono">
                        +91 {activeReg?.mobile}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200">
                      <span className="text-slate-500">Flat Details</span>
                      <span className="font-bold text-slate-900">
                        {activeReg?.flatNumber} ({activeReg?.wing}, Floor {activeReg?.floor})
                      </span>
                    </div>
                    {activeReg?.id && (
                      <div className="flex justify-between items-center text-[11px] text-slate-400">
                        <span>Request ID</span>
                        <span className="font-mono">{activeReg.id}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs leading-relaxed flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span>
                      Your account will be activated after the administrator approves your request.
                      You cannot access the resident dashboard until approval.
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => activeReg?.mobile && refreshLiveStatus(activeReg.mobile)}
                      disabled={checkingStatus}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 py-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
                      {checkingStatus ? 'Checking live status...' : 'Check Status Now'}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Back to Login
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* STEP 5: REJECTED SCREEN                                   */}
          {/* ========================================================= */}
          {step === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 text-center"
            >
              <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto shadow-sm mb-2">
                <XCircle className="w-9 h-9" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-200 mb-2">
                  🔴 Request Rejected
                </span>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Registration Not Approved
                </h1>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  The society administrator was unable to approve your registration.
                </p>
              </div>

              {activeReg?.rejectionReason && (
                <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-left">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block mb-1">
                    Reason for Rejection
                  </span>
                  <p className="text-xs text-rose-950 font-medium leading-relaxed">
                    "{activeReg.rejectionReason}"
                  </p>
                </div>
              )}

              <div className="space-y-2.5">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleReapply}
                  icon={<RefreshCw className="w-4 h-4" />}
                >
                  Submit Again
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => navigate('/login')}
                >
                  Return to Login
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Legal Notice */}
      <div className="pb-2 text-center">
        <p className="text-[11px] text-slate-400">
          Green Gate Residential Security Platform · Production Version
        </p>
      </div>
    </div>
  );
}

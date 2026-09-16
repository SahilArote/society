import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle,
  AlertCircle, RefreshCw, Shield, Edit3, Smartphone, Building2
} from 'lucide-react';
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

  // Multi-step states: 1 = Mobile, 2 = Select Flat (The Screen), 3 = Confirm, 4 = Pending, 5 = Rejected
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [mobile, setMobile] = useState('');
  const [residentName, setResidentName] = useState('');

  // Flat Selection State (Defaults to null so user can select, matching screenshot 1 and 2)
  const [selectedWing, setSelectedWing] = useState<string>('Wing A');
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [selectedFlatUnit, setSelectedFlatUnit] = useState<number | null>(null);

  // Backend Flats Hierarchy
  const [hierarchy, setHierarchy] = useState<FlatHierarchy | null>(null);
  const [loadingFlats, setLoadingFlats] = useState(false);

  // Completed / Pending Registration state
  const [activeReg, setActiveReg] = useState<RegistrationData | null>(null);

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

  // Load real flats from backend
  useEffect(() => {
    setLoadingFlats(true);
    fetchRegistrationFlats()
      .then((data) => {
        setHierarchy(data);
        if (data?.wings?.length > 0) {
          if (!data.wings.includes(selectedWing)) {
            setSelectedWing(data.wings[0]);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load flats hierarchy:', err);
      })
      .finally(() => setLoadingFlats(false));
  }, []);

  // Compute available wings from backend hierarchy or defaults
  const wingsList = useMemo(() => {
    if (hierarchy?.wings && hierarchy.wings.length > 0) {
      return hierarchy.wings;
    }
    return ['Wing A', 'Wing B', 'Wing C'];
  }, [hierarchy]);

  // Compute available floors for the selected wing (Floors 1 to 13 matching reference UI)
  const floorsList = useMemo(() => {
    if (hierarchy?.floors && hierarchy.floors[selectedWing] && hierarchy.floors[selectedWing].length >= 10) {
      return hierarchy.floors[selectedWing];
    }
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  }, [hierarchy, selectedWing]);

  // Available flat units per floor (Flats 1 to 8 matching reference UI)
  const flatUnitsList = useMemo(() => {
    return [1, 2, 3, 4, 5, 6, 7, 8];
  }, []);

  // Calculate full flat number display (e.g. "A-402")
  const calculatedFlatNumber = useMemo(() => {
    if (!selectedWing || selectedFloor === null || selectedFlatUnit === null) {
      return '';
    }
    const wingLetter = selectedWing.replace(/^(Wing|Tower)\s*/i, '').trim();
    // Unit format e.g. 402, 101
    return `${wingLetter}-${selectedFloor}0${selectedFlatUnit}`;
  }, [selectedWing, selectedFloor, selectedFlatUnit]);

  // Find exact database flat matching the selection
  const matchedDbFlat = useMemo(() => {
    if (!hierarchy?.flats || !calculatedFlatNumber) return null;
    return (
      hierarchy.flats.find(
        (f) =>
          f.wing === selectedWing &&
          Number(f.floor) === Number(selectedFloor) &&
          f.flatNumber.toUpperCase() === calculatedFlatNumber.toUpperCase()
      ) || null
    );
  }, [hierarchy, selectedWing, selectedFloor, calculatedFlatNumber]);

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

    // Polling fallback every 8 seconds
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
            wing: prev?.wing || selectedWing,
            floor: prev?.floor || selectedFloor || 1,
            flatNumber: prev?.flatNumber || calculatedFlatNumber,
            status: 'APPROVED',
          }));
          localStorage.removeItem(STORAGE_KEY);
        } else if (res.status === 'REJECTED') {
          setActiveReg((prev) => ({
            ...(prev || {}),
            mobile: cleanDigits,
            wing: res.request?.wing || prev?.wing || selectedWing,
            floor: res.request?.floor || prev?.floor || selectedFloor || 1,
            flatNumber: res.request?.flatNumber || prev?.flatNumber || calculatedFlatNumber,
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
      console.warn('Status check error:', err);
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
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm Flat Selection
  const handleConfirmFlatClick = () => {
    if (!selectedWing || selectedFloor === null || selectedFlatUnit === null) {
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
        wing: selectedWing,
        floor: Number(selectedFloor),
        flatNumber: calculatedFlatNumber,
        flatId: matchedDbFlat?.id || undefined,
        name: residentName || 'Resident',
        societyId: 'soc_greengate',
      });

      const request = res.data?.request;
      const trackingToken = res.data?.trackingToken;

      const regPayload: RegistrationData = {
        id: request?.id || `reg_${Date.now()}`,
        mobile: cleanDigits,
        name: residentName,
        wing: selectedWing,
        floor: Number(selectedFloor),
        flatNumber: calculatedFlatNumber,
        flatId: matchedDbFlat?.id,
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
        const pReq = err.data || { mobile: cleanDigits, wing: selectedWing, floor: selectedFloor, flatNumber: calculatedFlatNumber, status: 'PENDING' };
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

  const isFlatReady = selectedWing && selectedFloor !== null && selectedFlatUnit !== null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 select-none font-sans">
      {/* ── Top Bar Header ────────────────────────────────────────── */}
      <div className="pt-2 max-w-md w-full mx-auto">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => {
              if (step === 2) setStep(1);
              else if (step === 3) setStep(2);
              else navigate('/login');
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="text-center">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Green Gate Residency
            </h2>
            <p className="text-[11px] font-medium text-slate-500">
              Resident Setup
            </p>
          </div>

          <div className="w-10 h-10" /> {/* Spacer for symmetry */}
        </div>

        {/* 3 Step Progress Dashes */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step >= 1 ? 'w-8 bg-indigo-600' : 'w-8 bg-slate-200'
            }`}
          />
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step >= 2 ? 'w-8 bg-indigo-600' : 'w-8 bg-slate-200'
            }`}
          />
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step >= 3 ? 'w-8 bg-indigo-600' : 'w-8 bg-slate-200'
            }`}
          />
        </div>
      </div>

      {/* ── Main Dynamic Multi-Step Body ─────────────────────────── */}
      <div className="max-w-md w-full mx-auto my-auto py-2">
        <AnimatePresence mode="wait">
          {/* ========================================================= */}
          {/* STEP 1: MOBILE NUMBER SCREEN                              */}
          {/* ========================================================= */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Create your resident account
                </h1>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Register your mobile number and flat to access NexGate.
                </p>
              </div>

              <form onSubmit={handleMobileContinue} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Mobile Number
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 flex items-center gap-1.5 text-slate-800 font-bold text-sm select-none border-r border-slate-200 pr-2.5">
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
                      className="w-full pl-24 pr-4 py-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold text-base focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal shadow-xs"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    An OTP will be sent to verify your identity after administrator approval.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs font-medium leading-relaxed">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || mobile.replace(/\D/g, '').length < 10}
                  className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
                    mobile.replace(/\D/g, '').length === 10
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 active:scale-[0.98] cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Continue</span>
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: EXACT "SELECT YOUR FLAT" CHIP/GRID SCREEN        */}
          {/* ========================================================= */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Heading */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Select your flat
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Choose Wing, Floor, and Flat
                </p>
              </div>

              {/* 1. WING Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  WING
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {wingsList.map((w) => {
                    const isSelected = selectedWing === w;
                    return (
                      <button
                        key={w}
                        type="button"
                        onClick={() => {
                          setSelectedWing(w);
                          setError('');
                        }}
                        className={`py-3.5 px-3 rounded-xl font-extrabold text-sm sm:text-base text-center transition-all duration-200 active:scale-95 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-600'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs'
                        }`}
                      >
                        {w}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. FLOOR Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  FLOOR
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {floorsList.map((fl) => {
                    const isSelected = selectedFloor === fl;
                    return (
                      <button
                        key={fl}
                        type="button"
                        onClick={() => {
                          setSelectedFloor(fl);
                          setError('');
                        }}
                        className={`py-2.5 rounded-xl font-bold text-xs sm:text-sm text-center transition-all duration-150 active:scale-95 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-600'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs'
                        }`}
                      >
                        Floor {fl}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. FLAT NUMBER Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  FLAT NUMBER
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {flatUnitsList.map((unit) => {
                    const isSelected = selectedFlatUnit === unit;
                    return (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => {
                          setSelectedFlatUnit(unit);
                          setError('');
                        }}
                        className={`py-2.5 rounded-xl font-bold text-xs sm:text-sm text-center transition-all duration-150 active:scale-95 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-600'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs'
                        }`}
                      >
                        Flat {unit}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Flat Preview Card (Exact from Screenshot in PWA Theme) */}
              {isFlatReady && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-indigo-50/80 border border-indigo-200/90 rounded-2xl py-3.5 px-4 text-center select-none shadow-xs"
                >
                  <span className="text-slate-600 text-sm font-medium">Selected Flat: </span>
                  <span className="text-indigo-600 text-base font-extrabold tracking-wide ml-1">
                    {calculatedFlatNumber}
                  </span>
                </motion.div>
              )}

              {/* Action Button: Confirm Flat (Exact from Screenshot in PWA Theme) */}
              <button
                type="button"
                onClick={handleConfirmFlatClick}
                disabled={!isFlatReady}
                className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-1.5 transition-all duration-200 ${
                  isFlatReady
                    ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-md shadow-indigo-600/25 active:scale-[0.98] cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Confirm Flat</span>
                <ChevronRight className="w-5 h-5 ml-0.5" />
              </button>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: CONFIRMATION DETAILS SCREEN                       */}
          {/* ========================================================= */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Confirm your details
                </h1>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Please verify your information before sending your request to the administrator.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
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

                <div className="grid grid-cols-3 gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Wing
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedWing}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Floor
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">Floor {selectedFloor}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Flat Number
                    </span>
                    <p className="text-sm font-extrabold text-indigo-600 mt-0.5">{calculatedFlatNumber}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Your Full Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={residentName}
                    onChange={(e) => setResidentName(e.target.value)}
                    placeholder="e.g. Sahil Arote"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm focus:border-indigo-600 focus:bg-white outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs font-medium leading-relaxed">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleSubmitRegistration}
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Submit Registration</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-transparent hover:bg-slate-100 text-slate-600 font-semibold text-sm transition-colors"
                >
                  Back to Flat Selection
                </button>
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
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                      🟢 Account Approved
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      Registration Approved! 🎉
                    </h1>
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                      Your resident account for flat{' '}
                      <span className="font-extrabold text-indigo-600">{activeReg.flatNumber}</span> has
                      been activated by the society administrator.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/login', { state: { mobile: activeReg.mobile } })}
                    className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <span>Proceed to Login</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                /* Pending Admin Approval View */
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto shadow-sm mb-3">
                      <Clock className="w-8 h-8 animate-pulse" />
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 mb-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                      🟡 Pending Admin Approval
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      Registration Submitted
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                      Your registration request has been sent to the society administrator.
                    </p>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                      <span className="text-slate-500">Mobile Number</span>
                      <span className="font-bold text-slate-900 font-mono">
                        +91 {activeReg?.mobile}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                      <span className="text-slate-500">Flat Details</span>
                      <span className="font-extrabold text-indigo-600">
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
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 py-1.5"
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
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 mb-2">
                  🔴 Request Rejected
                </span>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Registration Not Approved
                </h1>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  The society administrator was unable to approve your registration.
                </p>
              </div>

              {activeReg?.rejectionReason && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-left">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block mb-1">
                    Reason for Rejection
                  </span>
                  <p className="text-xs text-rose-800 font-medium leading-relaxed">
                    "{activeReg.rejectionReason}"
                  </p>
                </div>
              )}

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveReg(null);
                    localStorage.removeItem(STORAGE_KEY);
                    setStep(2);
                  }}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Submit Again</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full py-3 rounded-xl bg-transparent text-slate-500 hover:text-slate-800 font-semibold text-xs"
                >
                  Return to Login
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom Footer ────────────────────────────────────────── */}
      <div className="pb-2 text-center">
        <p className="text-[11px] text-slate-400">
          Green Gate Residential Security Platform · Production Setup
        </p>
      </div>
    </div>
  );
}

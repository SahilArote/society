import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { OtpInput } from '../components/domain';
import { maskPhone } from '../lib/utils';
import { useToast } from '../hooks';

import { authSession } from '../services/authSession';
import { loginResident, sendOtp } from '../services/api';

export default function OtpVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const phone = location.state?.phone || '98765 43210';
  const [countdown, setCountdown] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleComplete = async (otp: string) => {
    setIsVerifying(true);
    try {
      const cleanDigits = phone.replace(/\D/g, '');
      const data = await loginResident(cleanDigits, otp);
      setIsVerifying(false);
      setIsSuccess(true);
      if (data && data.token && data.user) {
        authSession.setFullSession(data.token, {
          id: data.user.id,
          name: data.user.name,
          phone: data.user.mobile,
          flat: data.user.flat?.flatNumber || 'A-402',
          societyId: data.user.societyId,
          societyName: data.user.societyName,
        });
      } else {
        authSession.setSession(phone, 'Resident', 'A-402');
      }
      showToast('Authentication verified successfully', 'success');
      setTimeout(() => {
        navigate('/home', { replace: true });
      }, 700);
    } catch (err: any) {
      setIsVerifying(false);
      showToast(err?.message || 'Invalid OTP code. Please try again.', 'error');
    }
  };

  const handleResend = async () => {
    setCountdown(30);
    try {
      const cleanDigits = phone.replace(/\D/g, '');
      await sendOtp(cleanDigits);
      showToast('A new 6-digit OTP has been sent via SMS', 'info');
    } catch {
      showToast('A new 6-digit OTP has been sent via SMS', 'info');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between p-6">
      {/* Top Bar with back */}
      <div className="pt-2 flex items-center">
        <button
          onClick={() => navigate('/login')}
          className="p-2 -ml-2 rounded-full text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none"
          aria-label="Back to login"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Main Verification Card */}
      <div className="max-w-sm w-full mx-auto my-auto py-6 text-center">
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              key="success"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-12 flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 ring-8 ring-emerald-100">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Verified!</h2>
              <p className="text-xs text-slate-500 mt-1">Logging you in securely...</p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-5">
                <ShieldCheck className="w-7 h-7" />
              </div>

              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Verify your mobile number
              </h1>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                We've sent a 6-digit verification code to <br />
                <span className="font-semibold text-slate-800 tracking-wider">
                  +91 {maskPhone(phone)}
                </span>
              </p>

              {/* Segmented OTP Input */}
              <div className="my-8">
                <OtpInput onComplete={handleComplete} />
              </div>

              {/* Status / Spinner */}
              {isVerifying && (
                <p className="text-xs text-primary-600 font-medium animate-pulse mb-4">
                  Checking code...
                </p>
              )}

              {/* Countdown & Resend */}
              <div className="space-y-3">
                {countdown > 0 ? (
                  <p className="text-xs text-slate-400">
                    Resend code in{' '}
                    <span className="font-semibold text-slate-600">
                      0:{countdown < 10 ? `0${countdown}` : countdown}
                    </span>
                  </p>
                ) : (
                  <button
                    onClick={handleResend}
                    className="text-xs font-semibold text-primary-600 hover:text-primary-700 underline focus:outline-none"
                  >
                    Resend OTP Code
                  </button>
                )}

                <div>
                  <button
                    onClick={() => navigate('/login')}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Change mobile number
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Safety Notice */}
      <div className="pb-4 text-center">
        <p className="text-[11px] text-slate-400">
          GreenGate uses secure, tamper-proof OTP authentication
        </p>
      </div>
    </div>
  );
}

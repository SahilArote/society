import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BRAND_CONFIG } from '../config/branding';
import { sendOtp, ApiError } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, '');

    if (cleanDigits.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await sendOtp(cleanDigits);
      navigate('/otp-verify', { state: { mobile: cleanDigits } });
    } catch (err: any) {
      console.error('Login error:', err);
      if (err instanceof ApiError && (err.status === 404 || err.code === 'USER_NOT_FOUND')) {
        setError('Account not found. This mobile number is not registered with NexGate. Please contact your society administrator.');
      } else {
        setError(err.message || 'Account not found. Please verify your mobile number with your society administrator.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between p-6">
      {/* Top Society Brand Tag */}
      <div className="pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white p-0.5 border border-slate-200 shadow-sm flex items-center justify-center">
            <img src={BRAND_CONFIG.logo.src} alt={BRAND_CONFIG.logo.alt} className="w-full h-full object-contain rounded-lg" />
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900">{BRAND_CONFIG.name}</span>
        </div>
        <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-full">
          Resident Portal
        </span>
      </div>

      {/* Center Form Section */}
      <div className="max-w-sm w-full mx-auto my-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back 👋
          </h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Enter your registered mobile number associated with your society flat.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              label="Registered Mobile Number"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError('');
              }}
              placeholder="Enter 10-digit mobile number"
              error={error}
              prefix={<span className="font-semibold text-slate-700 text-sm mr-1">+91</span>}
              autoFocus
            />
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
            Send Verification Code
          </Button>
        </form>
      </div>

      {/* Bottom Legal / Policy */}
      <div className="pb-4 text-center">
        <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
          By signing in, you agree to our{' '}
          <a href="#terms" className="underline hover:text-slate-600">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#privacy" className="underline hover:text-slate-600">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}

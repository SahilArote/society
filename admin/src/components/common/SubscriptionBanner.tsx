import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  AlertTriangle,
  AlertOctagon,
  CreditCard,
  X,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { fetchAdminSubscription, getAdminUser } from '../../services/api';

export function SubscriptionBanner() {
  const [subData, setSubData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const adminUser = getAdminUser();
  const isSuperAdmin = adminUser?.role === 'SUPER_ADMIN';

  useEffect(() => {
    // Only load subscription status for society administrators
    if (isSuperAdmin) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    fetchAdminSubscription()
      .then((data) => {
        if (isMounted && data) {
          setSubData(data);
        }
      })
      .catch((err) => console.warn('Could not load subscription banner:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isSuperAdmin]);

  if (isSuperAdmin || loading || !subData) {
    return null;
  }

  const {
    status,
    planName,
    amountDue,
    isTrialActive,
    isGracePeriod,
    isSuspended,
    daysRemainingInTrial,
    daysRemainingInGrace,
    platformUpiId,
  } = subData;

  const copyUpiId = () => {
    navigator.clipboard.writeText(platformUpiId || 'nexgate.billing@icici');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const upiPayUri = `upi://pay?pa=${encodeURIComponent(
    platformUpiId || 'nexgate.billing@icici'
  )}&pn=NexGate%20Technologies&am=${amountDue || 1999}&cu=INR&tn=NexGate_${encodeURIComponent(
    subData.societyName || 'Society'
  )}_Recharge`;

  return (
    <>
      {/* 1. COMPLIMENTARY 1-MONTH FREE TRIAL BANNER */}
      {isTrialActive && (
        <div
          style={{
            background: 'linear-gradient(90deg, #1E293B 0%, #0F172A 100%)',
            borderBottom: '1px solid rgba(59, 130, 246, 0.25)',
            padding: '9px 24px',
            color: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12.5,
            fontWeight: 500,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#60A5FA',
                padding: '2px 8px',
                borderRadius: 4,
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.04em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Sparkles size={12} />
              1-MONTH FREE TRIAL
            </span>
            <span>
              Your society is on a complimentary 30-day trial for <strong>{planName}</strong> (₹{amountDue?.toLocaleString()}/mo).{' '}
              <strong style={{ color: '#93C5FD' }}>{daysRemainingInTrial} {daysRemainingInTrial === 1 ? 'day' : 'days'} remaining</strong>.
            </span>
          </div>

          <button
            onClick={() => setShowModal(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFF',
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <CreditCard size={12} />
            Subscription Details
          </button>
        </div>
      )}

      {/* 2. 1-WEEK GRACE PERIOD PAYMENT DUE ALERT BANNER */}
      {isGracePeriod && (
        <div
          style={{
            background: 'linear-gradient(90deg, #78350F 0%, #B45309 100%)',
            borderBottom: '1px solid #D97706',
            padding: '10px 24px',
            color: '#FEF3C7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(180, 83, 9, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                background: '#FEF3C7',
                color: '#92400E',
                padding: '2px 8px',
                borderRadius: 4,
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: '0.05em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <AlertTriangle size={12} />
              PAYMENT DUE (1-WEEK GRACE)
            </span>
            <span>
              Free trial has ended. ₹{amountDue?.toLocaleString()} is due for <strong>{planName}</strong>.{' '}
              <strong style={{ color: '#FFF', textDecoration: 'underline' }}>
                {daysRemainingInGrace} {daysRemainingInGrace === 1 ? 'day' : 'days'} remaining in grace period
              </strong>{' '}
              before guard kiosk tablets are locked.
            </span>
          </div>

          <button
            onClick={() => setShowModal(true)}
            style={{
              background: '#FFF',
              border: 'none',
              color: '#92400E',
              padding: '5px 14px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }}
          >
            <CreditCard size={14} />
            Recharge Now via UPI
          </button>
        </div>
      )}

      {/* 3. SUSPENDED / OVERDUE LOCKOUT BANNER */}
      {isSuspended && (
        <div
          style={{
            background: 'linear-gradient(90deg, #7F1D1D 0%, #991B1B 100%)',
            borderBottom: '2px solid #EF4444',
            padding: '12px 24px',
            color: '#FEE2E2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(153, 27, 27, 0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                background: '#FEE2E2',
                color: '#991B1B',
                padding: '3px 8px',
                borderRadius: 4,
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: '0.05em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <AlertOctagon size={13} />
              KIOSKS SUSPENDED
            </span>
            <span>
              Subscription and 1-week grace period have expired. Guard gate devices are locked. Recharge ₹{amountDue?.toLocaleString()} immediately to resume gate operations.
            </span>
          </div>

          <button
            onClick={() => setShowModal(true)}
            style={{
              background: '#EF4444',
              border: '1px solid #FFF',
              color: '#FFF',
              padding: '6px 16px',
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }}
          >
            <CreditCard size={14} />
            Recharge & Unlock Devices
          </button>
        </div>
      )}

      {/* RECHARGE / SUBSCRIPTION MODAL */}
      <AnimatePresence>
        {showModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                width: '100%',
                maxWidth: 480,
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                padding: '24px 28px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: isSuspended ? 'rgba(239, 68, 68, 0.1)' : 'rgba(37, 99, 235, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CreditCard size={18} color={isSuspended ? '#EF4444' : '#2563EB'} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                      NexGate Subscription Recharge
                    </h3>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                      {subData.societyName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status Notice */}
              <div
                style={{
                  background: isSuspended ? 'rgba(239,68,68,0.08)' : isGracePeriod ? 'rgba(245,158,11,0.08)' : 'rgba(37,99,235,0.08)',
                  border: `1px solid ${isSuspended ? 'rgba(239,68,68,0.25)' : isGracePeriod ? 'rgba(245,158,11,0.25)' : 'rgba(37,99,235,0.25)'}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  marginBottom: 16,
                  fontSize: 12.5,
                  color: 'var(--text-primary)',
                  lineHeight: 1.45,
                }}
              >
                {isSuspended ? (
                  <span>
                    <strong style={{ color: '#EF4444' }}>Gate Device Access Suspended:</strong> Guard kiosks are locked due to expired trial & grace period. Complete payment to re-enable immediately.
                  </span>
                ) : isGracePeriod ? (
                  <span>
                    <strong style={{ color: '#D97706' }}>1-Week Grace Period Active:</strong> {daysRemainingInGrace} days left to complete payment of ₹{amountDue?.toLocaleString()} before gate kiosks lock.
                  </span>
                ) : (
                  <span>
                    <strong style={{ color: '#2563EB' }}>1-Month Trial Active:</strong> {daysRemainingInTrial} days remaining. Plan automatically switches to ₹{amountDue?.toLocaleString()}/mo after trial.
                  </span>
                )}
              </div>

              {/* Plan & Amount Summary */}
              <div
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '14px 18px',
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Plan & Devices</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {planName}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                    Includes {subData.maxDevices} guard kiosk tablet(s)
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Renewal Fee</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#10B981' }}>
                    ₹{amountDue?.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>per month</div>
                </div>
              </div>

              {/* UPI ID Details */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Platform Recharge UPI ID (Scan or Copy to GPay / PhonePe / Paytm / BHIM):
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '8px 12px',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {platformUpiId || 'nexgate.billing@icici'}
                  </span>
                  <button
                    onClick={copyUpiId}
                    style={{
                      background: copiedUpi ? '#10B981' : 'rgba(37, 99, 235, 0.1)',
                      border: 'none',
                      color: copiedUpi ? '#FFF' : '#2563EB',
                      padding: '4px 10px',
                      borderRadius: 5,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {copiedUpi ? <Check size={12} /> : <Copy size={12} />}
                    {copiedUpi ? 'Copied' : 'Copy UPI'}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a
                  href={upiPayUri}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px 16px',
                    borderRadius: 8,
                    background: '#2563EB',
                    color: '#FFF',
                    fontWeight: 700,
                    fontSize: 13.5,
                    textDecoration: 'none',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
                  }}
                >
                  <ExternalLink size={15} />
                  Open in UPI App (Pay ₹{amountDue?.toLocaleString()})
                </a>

                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
                  After payment, send UTR / transaction screenshot to <strong>billing@nexgate.co.in</strong> or your Super Admin to instantly verify.
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

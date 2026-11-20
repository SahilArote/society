import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Download,
  Bell,
  Settings,
  AlertCircle,
  X,
  Building2,
  Check,
  RotateCcw,
  Edit3,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import {
  fetchMaintenanceOverview,
  fetchVerificationQueue,
  approveMaintenancePayment,
  rejectMaintenancePayment,
  fetchSocietyUpiConfig,
  setSocietyUpiConfig,
  remindUnpaidResidents,
  uploadBankStatementFile,
  downloadMaintenanceLedger,
  editAdminMaintenanceAmount,
  resetAdminPayment,
  type AdminMaintenanceOverview,
  type VerificationQueueItem,
} from '../services/api';

export default function Maintenance() {
  const [overview, setOverview] = useState<AdminMaintenanceOverview>({
    collectedNov: 0,
    collectedNovFormatted: '₹0',
    pendingCheck: 0,
    unpaidFlats: 0,
    gatewayFees: 0,
  });
  const [queue, setQueue] = useState<VerificationQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals State
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [selectedProofFlat, setSelectedProofFlat] = useState<string>('');
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [isEditAmountModalOpen, setIsEditAmountModalOpen] = useState(false);
  const [editTargetId, setEditTargetId] = useState<string>('');
  const [editAmountValue, setEditAmountValue] = useState<string>('2500');
  const [rejectModalPayment, setRejectModalPayment] = useState<VerificationQueueItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Form State for Set Society UPI
  const [upiForm, setUpiForm] = useState({
    merchantVpa: '',
    merchantName: '',
    bankName: 'ICICI Bank',
    accountNumber: '',
  });

  const [savedUpiConfig, setSavedUpiConfig] = useState<{
    merchantVpa: string;
    merchantName: string;
    bankName: string;
    accountNumber: string;
    isConfigured: boolean;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatINR = (amt: number) => {
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ovData, queueData, upiData] = await Promise.all([
        fetchMaintenanceOverview(),
        fetchVerificationQueue(),
        fetchSocietyUpiConfig().catch(() => null),
      ]);
      if (ovData) setOverview(ovData);
      if (queueData) setQueue(queueData);
      if (upiData) {
        setSavedUpiConfig(upiData);
        setUpiForm({
          merchantVpa: upiData.merchantVpa || '',
          merchantName: upiData.merchantName || '',
          bankName: upiData.bankName || 'ICICI Bank',
          accountNumber: upiData.accountNumber || '',
        });
      }
    } catch (err: any) {
      console.warn('Maintenance load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Handle Approve Payment
  const handleApprove = async (paymentId: string) => {
    setIsActionLoading(true);
    try {
      const res = await approveMaintenancePayment(paymentId);
      showFeedback('success', res.message);
      loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to approve payment');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Reject Payment
  const handleRejectConfirm = async () => {
    if (!rejectModalPayment) return;
    setIsActionLoading(true);
    try {
      const res = await rejectMaintenancePayment(rejectModalPayment.paymentId, rejectReason);
      showFeedback('success', res.message);
      setRejectModalPayment(null);
      setRejectReason('');
      loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to reject payment');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Save UPI
  const handleSaveUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionLoading(true);
    try {
      await setSocietyUpiConfig(upiForm);
      showFeedback('success', 'Society Merchant UPI ID updated successfully!');
      setIsUpiModalOpen(false);
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update UPI ID');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Remind Unpaid
  const handleRemindUnpaid = async () => {
    try {
      const res = await remindUnpaidResidents();
      showFeedback('success', `Sent payment reminder push notification to ${res.sentCount} unpaid flat(s)!`);
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to send reminders');
    }
  };

  // Handle Export Ledger
  const handleExportLedger = async () => {
    try {
      await downloadMaintenanceLedger();
      showFeedback('success', 'Maintenance ledger CSV downloaded successfully!');
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to export ledger');
    }
  };

  // Handle Bank Statement Upload
  const handleStatementFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsActionLoading(true);
    try {
      const res = await uploadBankStatementFile(file);
      showFeedback(
        'success',
        `Statement matched! ${res.matchedCount} payment(s) verified, ${res.shortAmountCount} short amount(s).`
      );
      setIsStatementModalOpen(false);
      loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to process statement');
    } finally {
      setIsActionLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Reset Payment
  const handleResetPayment = async (item: VerificationQueueItem) => {
    if (!window.confirm(`Reset payment for Flat ${item.flatNumber}? This will mark the bill as UNPAID and let the resident pay again fresh.`)) {
      return;
    }
    setIsActionLoading(true);
    try {
      await resetAdminPayment(item.invoiceId || item.paymentId);
      showFeedback('success', `Payment for Flat ${item.flatNumber} has been reset to UNPAID.`);
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to reset payment');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Edit Amount
  const handleSaveAmount = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(editAmountValue);
    if (isNaN(num) || num < 0) {
      showFeedback('error', 'Please enter a valid amount');
      return;
    }
    setIsActionLoading(true);
    try {
      await editAdminMaintenanceAmount(editTargetId || 'flat_a101', num);
      showFeedback('success', `Maintenance bill updated to ₹${num.toLocaleString('en-IN')}`);
      setIsEditAmountModalOpen(false);
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update maintenance amount');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-6" style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      {/* Feedback Banner */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--r-md)',
              background: feedback.type === 'success' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${feedback.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: feedback.type === 'success' ? '#22c55e' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP METRIC CARDS (Exact match to reference mockup) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {/* Card 1: Collected Nov */}
        <StatCard
          label="Collected Nov"
          value={overview.collectedNovFormatted || '₹3.1L'}
          icon={FileText}
          pill={{ text: 'Month Total', color: '#155EEF', bg: 'rgba(21, 94, 239, 0.12)' }}
        />

        {/* Card 2: Pending check */}
        <StatCard
          label="Pending check"
          value={overview.pendingCheck}
          icon={RefreshCw}
          pill={{ text: 'Awaiting Admin', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' }}
        />

        {/* Card 3: Unpaid flats */}
        <StatCard
          label="Unpaid flats"
          value={overview.unpaidFlats}
          icon={AlertCircle}
          pill={{ text: 'Dues Outstanding', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' }}
        />

        {/* Card 4: Gateway fees (₹0) */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--r-md)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 0 15px rgba(34, 197, 94, 0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Gateway fees</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#22c55e',
                background: 'rgba(34, 197, 94, 0.12)',
                padding: '2px 8px',
                borderRadius: 12,
              }}
            >
              Zero Fee UPI
            </span>
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#22c55e', letterSpacing: '-0.02em' }}>₹0</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Direct Bank Settlement</span>
          </div>
        </div>
      </div>

      {/* VERIFICATION QUEUE SECTION */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--r-md)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
        }}
      >
        {/* Section Header */}
        <div
          style={{
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Verification queue
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Confirm resident 12-digit UPI transaction references directly against society bank credits.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => {
                setEditTargetId('');
                setEditAmountValue('2500');
                setIsEditAmountModalOpen(true);
              }}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 'var(--r-sm)',
              }}
            >
              <Edit3 size={14} />
              Edit bill amount
            </button>

            <button
              onClick={() => setIsStatementModalOpen(true)}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 'var(--r-sm)',
              }}
            >
              <Upload size={15} />
              Upload bank statement • auto-match
            </button>

            <button
              onClick={loadData}
              className="btn-secondary"
              style={{ padding: '8px 12px', display: 'flex', alignItems: 'center' }}
              title="Refresh Queue"
            >
              <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {/* Verification Queue Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Flat</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Amount</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>UTR</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Bank match</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                    Loading verification queue...
                  </td>
                </tr>
              ) : queue.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <CheckCircle2 size={36} style={{ color: '#22c55e', margin: '0 auto 8px', opacity: 0.8 }} />
                    <div style={{ fontWeight: 600, fontSize: 14 }}>All payments verified</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      No pending UTRs in queue. New resident submissions will appear here.
                    </div>
                  </td>
                </tr>
              ) : (
                queue.map((item) => {
                  const isApproved = item.status === 'APPROVED';
                  const isRejected = item.status === 'REJECTED';

                  return (
                    <tr
                      key={item.paymentId}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        opacity: isApproved ? 0.6 : 1,
                        background: isApproved ? 'rgba(34, 197, 94, 0.02)' : 'transparent',
                      }}
                    >
                      {/* Flat */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
                          {item.flatNumber}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {item.residentName} · {item.wing}
                        </div>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
                        {formatINR(item.amount)}
                      </td>

                      {/* UTR */}
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
                          {item.utr}
                        </span>
                        {item.receiptNumber && (
                          <div style={{ fontSize: 11, color: '#22c55e', marginTop: 2 }}>
                            {item.receiptNumber}
                          </div>
                        )}
                      </td>

                      {/* Bank Match Status Pill */}
                      <td style={{ padding: '14px 20px' }}>
                        {item.bankMatchStatus === 'FOUND' && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 10px',
                              borderRadius: 16,
                              fontSize: 12,
                              fontWeight: 700,
                              background: 'rgba(34, 197, 94, 0.15)',
                              color: '#22c55e',
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                            Found
                          </span>
                        )}

                        {item.bankMatchStatus === 'AMOUNT_SHORT' && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 10px',
                              borderRadius: 16,
                              fontSize: 12,
                              fontWeight: 700,
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#ef4444',
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                            Amount short
                          </span>
                        )}

                        {item.bankMatchStatus === 'NOT_YET' && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 10px',
                              borderRadius: 16,
                              fontSize: 12,
                              fontWeight: 700,
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#f59e0b',
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
                            Not yet
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                          {/* View Proof Button */}
                          {item.screenshotUrl ? (
                            <button
                              onClick={() => {
                                setSelectedProofUrl(item.screenshotUrl || null);
                                setSelectedProofFlat(item.flatNumber);
                              }}
                              className="btn-secondary"
                              style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <Eye size={13} />
                              View proof
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedProofUrl(
                                  'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80'
                                );
                                setSelectedProofFlat(item.flatNumber);
                              }}
                              className="btn-secondary"
                              style={{ padding: '6px 10px', fontSize: 12, opacity: 0.8 }}
                            >
                              View proof
                            </button>
                          )}

                          {!isApproved && !isRejected ? (
                            <>
                              {/* Approve Button */}
                              <button
                                disabled={isActionLoading}
                                onClick={() => handleApprove(item.paymentId)}
                                style={{
                                  background: '#22c55e',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '6px 14px',
                                  borderRadius: 'var(--r-sm)',
                                  fontWeight: 700,
                                  fontSize: 12,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                Approve
                              </button>

                              {/* Reject Button */}
                              <button
                                disabled={isActionLoading}
                                onClick={() => {
                                  setRejectModalPayment(item);
                                  setRejectReason('UTR not reflected in society bank statement');
                                }}
                                style={{
                                  background: 'transparent',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  padding: '6px 12px',
                                  borderRadius: 'var(--r-sm)',
                                  fontWeight: 600,
                                  fontSize: 12,
                                  cursor: 'pointer',
                                }}
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: isApproved ? '#22c55e' : '#ef4444',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                {isApproved ? <Check size={14} /> : <XCircle size={14} />}
                                {isApproved ? 'Approved' : 'Rejected'}
                              </span>

                              <button
                                disabled={isActionLoading}
                                onClick={() => handleResetPayment(item)}
                                title="Reset payment back to UNPAID"
                                style={{
                                  background: 'rgba(239, 68, 68, 0.08)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  padding: '5px 10px',
                                  borderRadius: 'var(--r-sm)',
                                  fontWeight: 600,
                                  fontSize: 11,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <RotateCcw size={11} />
                                Reset
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOTTOM ACTION BAR (Exact match to reference mockup) */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Set society UPI ID */}
        <button
          onClick={() => setIsUpiModalOpen(true)}
          className="btn-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 'var(--r-sm)',
            border: savedUpiConfig?.isConfigured ? '1px solid var(--accent)' : undefined,
          }}
        >
          <Settings size={15} />
          {savedUpiConfig?.isConfigured && savedUpiConfig.merchantVpa
            ? `UPI: ${savedUpiConfig.merchantVpa}`
            : 'Set society UPI ID'}
        </button>

        {savedUpiConfig?.isConfigured && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 'var(--r-sm)',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#10B981',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Check size={14} />
            <span>Active: {savedUpiConfig.merchantName} ({savedUpiConfig.bankName} {savedUpiConfig.accountNumber ? `· ${savedUpiConfig.accountNumber}` : ''})</span>
          </div>
        )}

        {/* Remind unpaid */}
        <button
          onClick={handleRemindUnpaid}
          className="btn-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 'var(--r-sm)',
          }}
        >
          <Bell size={15} />
          Remind unpaid
        </button>

        {/* Export ledger */}
        <button
          onClick={handleExportLedger}
          className="btn-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 'var(--r-sm)',
          }}
        >
          <Download size={15} />
          Export ledger
        </button>
      </div>

      {/* MODAL: VIEW PROOF SCREENSHOT */}
      <AnimatePresence>
        {selectedProofUrl && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 16,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: '100%',
                maxWidth: 420,
                background: 'var(--bg-card)',
                borderRadius: 'var(--r-lg)',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                  Payment Proof — Flat {selectedProofFlat}
                </div>
                <button
                  onClick={() => setSelectedProofUrl(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: 20, textAlign: 'center', background: '#000000' }}>
                <img
                  src={selectedProofUrl}
                  alt="Payment Proof"
                  style={{ maxHeight: 450, maxWidth: '100%', objectFit: 'contain', borderRadius: 8 }}
                />
              </div>

              <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-card)' }}>
                <button
                  onClick={() => setSelectedProofUrl(null)}
                  className="btn-primary"
                  style={{ padding: '6px 18px', fontSize: 13 }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: SET SOCIETY UPI ID */}
      <AnimatePresence>
        {isUpiModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 16,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: '100%',
                maxWidth: 460,
                background: 'var(--bg-card)',
                borderRadius: 'var(--r-lg)',
                border: '1px solid var(--border-subtle)',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building2 size={18} style={{ color: 'var(--accent)' }} />
                  Set Society Merchant UPI ID
                </h3>
                <button
                  onClick={() => setIsUpiModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Use a free merchant UPI ID from PhonePe Business, Paytm, GPay, or society bank account. Money goes directly from resident to society with zero aggregator fee.
              </p>

              <form onSubmit={handleSaveUpi} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Society Merchant UPI VPA *
                  </label>
                  <input
                    type="text"
                    required
                    value={upiForm.merchantVpa}
                    onChange={(e) => setUpiForm({ ...upiForm, merchantVpa: e.target.value })}
                    placeholder="e.g. greenvalley@icici"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--r-sm)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Official Payee Name (Shown in GPay / PhonePe) *
                  </label>
                  <input
                    type="text"
                    required
                    value={upiForm.merchantName}
                    onChange={(e) => setUpiForm({ ...upiForm, merchantName: e.target.value })}
                    placeholder="e.g. Green Valley CHS Ltd"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--r-sm)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={upiForm.bankName}
                      onChange={(e) => setUpiForm({ ...upiForm, bankName: e.target.value })}
                      placeholder="ICICI Bank"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--r-sm)',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: 13,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={upiForm.accountNumber}
                      onChange={(e) => setUpiForm({ ...upiForm, accountNumber: e.target.value })}
                      placeholder="•••• •••• 4589"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--r-sm)',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: 13,
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => setIsUpiModalOpen(false)}
                    className="btn-secondary"
                    style={{ padding: '8px 16px', fontSize: 13 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isActionLoading}
                    className="btn-primary"
                    style={{ padding: '8px 20px', fontSize: 13 }}
                  >
                    Save UPI Settings
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: UPLOAD BANK STATEMENT */}
      <AnimatePresence>
        {isStatementModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 16,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: '100%',
                maxWidth: 460,
                background: 'var(--bg-card)',
                borderRadius: 'var(--r-lg)',
                border: '1px solid var(--border-subtle)',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Upload size={18} style={{ color: 'var(--accent)' }} />
                  Upload Bank Statement
                </h3>
                <button
                  onClick={() => setIsStatementModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Upload your society bank statement (CSV/Excel). The system automatically parses 12-digit UTRs and matches them against the verification queue.
              </p>

              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border-subtle)',
                  borderRadius: 'var(--r-md)',
                  padding: '36px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.01)',
                  transition: 'border-color 0.2s',
                }}
              >
                <Upload size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 10px' }} />
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                  Click to select Bank Statement CSV
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Supports HDFC, ICICI, SBI, Axis CSV statements
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleStatementFileChange}
                  style={{ display: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsStatementModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: REJECT REASON */}
      <AnimatePresence>
        {rejectModalPayment && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 16,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: '100%',
                maxWidth: 420,
                background: 'var(--bg-card)',
                borderRadius: 'var(--r-lg)',
                border: '1px solid var(--border-subtle)',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Reject Payment for Flat {rejectModalPayment.flatNumber}
                </h3>
                <button
                  onClick={() => setRejectModalPayment(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Rejection Reason (Sent to resident)
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setRejectModalPayment(null)}
                  className="btn-secondary"
                  style={{ padding: '6px 14px', fontSize: 12 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={handleRejectConfirm}
                  style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 16px',
                    borderRadius: 'var(--r-sm)',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Confirm Reject
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT BILL AMOUNT */}
      <AnimatePresence>
        {isEditAmountModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 16,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: '100%',
                maxWidth: 440,
                background: 'var(--bg-card)',
                borderRadius: 'var(--r-lg)',
                border: '1px solid var(--border-subtle)',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Edit3 size={18} style={{ color: 'var(--accent)' }} />
                  Edit Maintenance Bill Amount
                </h3>
                <button
                  onClick={() => setIsEditAmountModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Update the monthly maintenance dues amount. Residents will see the updated amount and their direct UPI payment links will automatically update.
              </p>

              <form onSubmit={handleSaveAmount} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    New Monthly Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={editAmountValue}
                    onChange={(e) => setEditAmountValue(e.target.value)}
                    placeholder="e.g. 2500"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--r-sm)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: 15,
                      fontWeight: 700,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setIsEditAmountModalOpen(false)}
                    className="btn-secondary"
                    style={{ padding: '8px 16px', fontSize: 13 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isActionLoading}
                    className="btn-primary"
                    style={{ padding: '8px 20px', fontSize: 13 }}
                  >
                    {isActionLoading ? 'Saving...' : 'Save New Amount'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCheck, Clock, CheckCircle2, XCircle, AlertCircle,
  RefreshCw, Filter, Shield, Phone, Home, Layers, Building2,
  X, Check, AlertTriangle
} from 'lucide-react';
import {
  fetchAdminRegistrations,
  approveAdminRegistration,
  rejectAdminRegistration,
} from '../services/api';
import { initAdminSocket } from '../services/socket';

interface RegistrationItem {
  id: string;
  societyId: string;
  mobile: string;
  name?: string;
  wing: string;
  floor: number;
  flatId: string;
  flatNumber: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export function RegistrationRequestsSection({
  onToast,
  onPendingCountChange,
}: {
  onToast: (msg: string) => void;
  onPendingCountChange?: (count: number) => void;
}) {
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Action states
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingItem, setRejectingItem] = useState<RegistrationItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAdminRegistrations(filter);
      setRegistrations(data);

      const pendingCount = data.filter((r: RegistrationItem) => r.status === 'PENDING').length;
      if (onPendingCountChange) {
        onPendingCountChange(pendingCount);
      }
    } catch (err: any) {
      console.error('Failed to load registrations:', err);
      onToast(err.message || 'Failed to load registration requests');
    } finally {
      setLoading(false);
    }
  }, [filter, onToast, onPendingCountChange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime Socket.IO Sync
  useEffect(() => {
    const socket = initAdminSocket(undefined, (event: any) => {
      if (event?.type === 'NEW_REGISTRATION' && event?.registration) {
        setRegistrations((prev) => {
          const exists = prev.some((r) => r.id === event.registration.id);
          if (exists) return prev;
          return [event.registration, ...prev];
        });
        onToast(`New resident registration request for flat ${event.registration.flatNumber}`);
      } else if (event?.requestId && event?.status) {
        setRegistrations((prev) =>
          prev.map((r) =>
            r.id === event.requestId
              ? { ...r, status: event.status, rejectionReason: event.rejectionReason }
              : r
          )
        );
      }
    });

    return () => {
      // socket persists globally
    };
  }, [onToast]);

  const handleApprove = async (item: RegistrationItem) => {
    try {
      setApprovingId(item.id);
      await approveAdminRegistration(item.id);
      setRegistrations((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, status: 'APPROVED' } : r))
      );
      onToast(`Approved registration for flat ${item.flatNumber}. Resident account activated!`);
    } catch (err: any) {
      console.error('Approval failed:', err);
      onToast(err.message || 'Failed to approve registration');
    } finally {
      setApprovingId(null);
    }
  };

  const handleOpenRejectModal = (item: RegistrationItem) => {
    setRejectingItem(item);
    setRejectionReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    try {
      setIsSubmittingReject(true);
      await rejectAdminRegistration(rejectingItem.id, rejectionReason);
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === rejectingItem.id
            ? { ...r, status: 'REJECTED', rejectionReason: rejectionReason || 'Application rejected' }
            : r
        )
      );
      onToast(`Rejected registration for flat ${rejectingItem.flatNumber}`);
      setRejectingItem(null);
    } catch (err: any) {
      console.error('Rejection failed:', err);
      onToast(err.message || 'Failed to reject registration');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const filteredItems = registrations.filter((r) => {
    if (filter === 'ALL') return true;
    return r.status === filter;
  });

  const pendingCount = registrations.filter((r) => r.status === 'PENDING').length;
  const approvedCount = registrations.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = registrations.filter((r) => r.status === 'REJECTED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header & Filter Pills */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', margin: 0 }}>
            Resident Registration Requests
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, margin: 0 }}>
            Review, approve, or reject resident enrollment requests submitted via Resident PWA.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => loadData()}
            className="btn-icon"
            title="Refresh requests"
            style={{ width: 34, height: 34 }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { key: 'ALL', label: 'All Requests', count: registrations.length },
          { key: 'PENDING', label: 'Pending Approval', count: pendingCount, highlight: pendingCount > 0 },
          { key: 'APPROVED', label: 'Approved', count: approvedCount },
          { key: 'REJECTED', label: 'Rejected', count: rejectedCount },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 14px',
              borderRadius: 'var(--r-md)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              border: filter === tab.key ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: filter === tab.key ? 'var(--accent-bg)' : 'var(--bg-elevated)',
              color: filter === tab.key ? 'var(--accent-light)' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{tab.label}</span>
            <span
              style={{
                fontSize: 11,
                padding: '2px 7px',
                borderRadius: 999,
                background: tab.highlight ? 'var(--amber)' : filter === tab.key ? 'var(--accent)' : 'var(--bg-surface)',
                color: tab.highlight ? '#000' : 'var(--text-primary)',
                fontWeight: 700,
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Registrations List / Table */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {loading && registrations.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
            Loading resident registration requests...
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: 'var(--text-muted)' }}>
              <UserCheck size={22} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              No {filter !== 'ALL' ? filter.toLowerCase() : ''} requests found
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              {filter === 'PENDING'
                ? 'All resident onboarding requests have been reviewed.'
                : 'Registration requests will appear here when residents submit from the NexGate PWA.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>
                  <th style={{ padding: '12px 16px' }}>Resident & Phone</th>
                  <th style={{ padding: '12px 16px' }}>Flat Unit</th>
                  <th style={{ padding: '12px 16px' }}>Request Time</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Request ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Resident Name & Phone */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 'var(--r-md)',
                            background: item.status === 'APPROVED' ? 'var(--green-bg)' : item.status === 'PENDING' ? 'var(--amber-bg)' : 'var(--red-bg)',
                            color: item.status === 'APPROVED' ? 'var(--green)' : item.status === 'PENDING' ? 'var(--amber)' : 'var(--red)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 13,
                          }}
                        >
                          {(item.name || 'R')[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
                            {item.name || 'Resident'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 11, marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                            <Phone size={10} /> +91 {item.mobile}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Flat Unit */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text-primary)' }}>
                        <Home size={13} color="var(--accent-light)" />
                        <span>Flat {item.flatNumber}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {item.wing} · Floor {item.floor}
                      </div>
                    </td>

                    {/* Request Date & Time */}
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} color="var(--text-muted)" />
                        <span>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '14px 16px' }}>
                      {item.status === 'PENDING' && (
                        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)' }} />
                          Pending Review
                        </span>
                      )}
                      {item.status === 'APPROVED' && (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <CheckCircle2 size={12} />
                          Approved
                        </span>
                      )}
                      {item.status === 'REJECTED' && (
                        <div>
                          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <XCircle size={12} />
                            Rejected
                          </span>
                          {item.rejectionReason && (
                            <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 3, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.rejectionReason}>
                              {item.rejectionReason}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Request ID */}
                    <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      {item.id}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      {item.status === 'PENDING' ? (
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button
                            onClick={() => handleApprove(item)}
                            disabled={approvingId === item.id}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 'var(--r-md)',
                              background: 'var(--green-bg)',
                              color: 'var(--green)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              fontWeight: 700,
                              fontSize: 11,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            {approvingId === item.id ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <Check size={12} />
                            )}
                            Approve
                          </button>

                          <button
                            onClick={() => handleOpenRejectModal(item)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 'var(--r-md)',
                              background: 'var(--red-bg)',
                              color: 'var(--red)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              fontWeight: 700,
                              fontSize: 11,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <X size={12} />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Processed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Confirmation Modal Dialog */}
      <AnimatePresence>
        {rejectingItem && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0, 0, 0, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              backdropFilter: 'blur(4px)',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              style={{
                width: '100%',
                maxWidth: 440,
                background: 'var(--bg-surface)',
                borderRadius: 'var(--r-lg)',
                border: '1px solid var(--border-strong)',
                boxShadow: 'var(--shadow-xl)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', background: 'var(--red-bg)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={16} />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Reject Registration
                  </h3>
                </div>
                <button
                  onClick={() => setRejectingItem(null)}
                  className="btn-icon"
                  style={{ width: 28, height: 28 }}
                >
                  <X size={14} />
                </button>
              </div>

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Are you sure you want to reject the registration request for Flat{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{rejectingItem.flatNumber}</strong> (Mobile: +91 {rejectingItem.mobile})?
                </p>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                    Reason for rejection (Optional)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Identity verification failed, Flat details do not match society registry records..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--r-md)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      fontSize: 12,
                      fontFamily: 'inherit',
                      outline: 'none',
                      resize: 'none',
                    }}
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                  <button
                    onClick={() => setRejectingItem(null)}
                    disabled={isSubmittingReject}
                    className="btn btn-secondary"
                    style={{ padding: '8px 14px', fontSize: 12 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmReject}
                    disabled={isSubmittingReject}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--r-md)',
                      background: 'var(--red)',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {isSubmittingReject ? <RefreshCw size={13} className="animate-spin" /> : <X size={13} />}
                    Confirm Reject
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

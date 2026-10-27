import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket, QrCode, Search, Plus, Copy, Check, Share2,
  Calendar, Clock, CheckCircle2, XCircle, Download, X,
  ShieldCheck, Package, Wrench, Users, Car
} from 'lucide-react';
import type { InvitedVisitor, InviteStatus } from '../types';
import StatCard from './StatCard';

const initialInvitedVisitors: InvitedVisitor[] = [
  {
    id: 'inv-101',
    passCode: '582910',
    visitorName: 'Rahul Sharma',
    visitorPhone: '+91 98765 22334',
    purpose: 'guest',
    status: 'expected',
    flatNumber: 'A-402',
    residentName: 'Priya Deshmukh',
    residentRole: 'owner',
    residentPhone: '+91 99887 55441',
    scheduledDate: 'Today, 24 Oct 2026',
    scheduledTime: '07:00 PM',
    validUntil: '11:30 PM',
    entryType: 'single_entry',
    notes: 'Visiting for family dinner celebration. Guest parking bay G-04.',
    createdAt: '2026-10-23 16:30',
    vehicleNumber: 'MH12 QR 4567',
  },
  {
    id: 'inv-102',
    passCode: '349102',
    visitorName: 'Urban Company - AC Tech (Sunil)',
    visitorPhone: '+91 97654 33221',
    purpose: 'service',
    status: 'checked_in',
    flatNumber: 'B-203',
    residentName: 'Amit Joshi',
    residentRole: 'owner',
    residentPhone: '+91 77665 44332',
    scheduledDate: 'Today, 24 Oct 2026',
    scheduledTime: '02:00 PM',
    validUntil: '06:00 PM',
    entryType: 'single_entry',
    notes: 'Master bedroom AC cleaning & filter replacement.',
    createdAt: '2026-10-23 10:15',
    vehicleNumber: 'MH14 JK 9821',
    gateCheckInTime: '02:18 PM',
    guardName: 'Ramesh Patil (Main Gate)',
  },
  {
    id: 'inv-103',
    passCode: '891445',
    visitorName: 'Rohit Singhania',
    visitorPhone: '+91 98220 54321',
    purpose: 'guest',
    status: 'upcoming',
    flatNumber: 'C-101',
    residentName: 'Vikram Mehta',
    residentRole: 'owner',
    residentPhone: '+91 91234 56789',
    scheduledDate: 'Tomorrow, 25 Oct 2026',
    scheduledTime: '11:00 AM',
    validUntil: '03:00 PM',
    entryType: 'single_entry',
    notes: 'Society committee documentation discussion.',
    createdAt: '2026-10-23 18:00',
  },
  {
    id: 'inv-104',
    passCode: '712389',
    visitorName: 'BlueDart Courier (Sanjay)',
    visitorPhone: '+91 91234 88776',
    purpose: 'delivery',
    status: 'checked_in',
    flatNumber: 'A-101',
    residentName: 'Sahil Arote',
    residentRole: 'owner',
    residentPhone: '+91 98765 43210',
    scheduledDate: 'Today, 24 Oct 2026',
    scheduledTime: '11:30 AM',
    validUntil: '01:30 PM',
    entryType: 'single_entry',
    notes: 'Important parcel delivery. Direct to 1st floor.',
    createdAt: '2026-10-23 09:40',
    gateCheckInTime: '11:42 AM',
    guardName: 'Ramesh Patil (Main Gate)',
  },
  {
    id: 'inv-105',
    passCode: '604219',
    visitorName: 'Uber Driver - Mahesh',
    visitorPhone: '+91 99881 22334',
    purpose: 'cab',
    status: 'expected',
    flatNumber: 'B-305',
    residentName: 'Neha Kulkarni',
    residentRole: 'tenant',
    residentPhone: '+91 88776 33221',
    scheduledDate: 'Today, 24 Oct 2026',
    scheduledTime: '08:30 PM',
    validUntil: '09:15 PM',
    entryType: 'single_entry',
    notes: 'Airport drop pickup. Drive to Wing B lobby.',
    createdAt: '2026-10-23 17:10',
    vehicleNumber: 'MH12 KN 7788',
  },
  {
    id: 'inv-106',
    passCode: '450812',
    visitorName: 'Rajesh Verma (Uncle)',
    visitorPhone: '+91 94223 99881',
    purpose: 'guest',
    status: 'expired',
    flatNumber: 'D-101',
    residentName: 'Suresh Nair',
    residentRole: 'owner',
    residentPhone: '+91 98001 23456',
    scheduledDate: 'Yesterday, 23 Oct 2026',
    scheduledTime: '05:00 PM',
    validUntil: '09:00 PM',
    entryType: 'single_entry',
    notes: 'Weekend tea and family catchup.',
    createdAt: '2026-10-22 14:00',
  },
  {
    id: 'inv-107',
    passCode: '918720',
    visitorName: 'Interior Woodcraft - Anil & Team',
    visitorPhone: '+91 93211 44556',
    purpose: 'service',
    status: 'upcoming',
    flatNumber: 'B-401',
    residentName: 'Deepak Rane',
    residentRole: 'owner',
    residentPhone: '+91 91122 33445',
    scheduledDate: '26 Oct 2026',
    scheduledTime: '10:00 AM',
    validUntil: '06:00 PM',
    entryType: 'multi_day',
    notes: 'Kitchen woodwork and repair. Carrying heavy tools.',
    createdAt: '2026-10-23 15:45',
  },
  {
    id: 'inv-108',
    passCode: '205673',
    visitorName: 'Swiggy Instamart Agent',
    visitorPhone: '+91 88997 76655',
    purpose: 'delivery',
    status: 'revoked',
    flatNumber: 'D-302',
    residentName: 'Ganesh Pawar',
    residentRole: 'owner',
    residentPhone: '+91 70011 22334',
    scheduledDate: '22 Oct 2026',
    scheduledTime: '03:00 PM',
    validUntil: '04:00 PM',
    entryType: 'single_entry',
    notes: 'Order cancelled by resident. Pass revoked.',
    createdAt: '2026-10-22 14:50',
  },
];

const purposeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  guest:    { icon: Users,   color: 'var(--accent-light)', label: 'Guest' },
  delivery: { icon: Package, color: 'var(--amber)',        label: 'Delivery' },
  service:  { icon: Wrench,  color: 'var(--sky)',          label: 'Service' },
  cab:      { icon: Car,     color: 'var(--green)',        label: 'Cab / Taxi' },
};

function StatusPill({ status }: { status: InviteStatus }) {
  switch (status) {
    case 'expected':
      return (
        <span className="badge badge-info">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
          Expected Today
        </span>
      );
    case 'checked_in':
      return (
        <span className="badge badge-success">
          <CheckCircle2 size={11} />
          Checked In
        </span>
      );
    case 'upcoming':
      return (
        <span className="badge badge-accent">
          <Calendar size={11} />
          Upcoming
        </span>
      );
    case 'expired':
      return (
        <span className="badge badge-muted">
          <Clock size={11} />
          Expired
        </span>
      );
    case 'revoked':
      return (
        <span className="badge badge-danger">
          <XCircle size={11} />
          Revoked
        </span>
      );
    default:
      return null;
  }
}

interface Props {
  onBackToLive?: () => void;
  onShowToast: (msg: string) => void;
}

export default function InvitedVisitorsSection({ onShowToast }: Props) {
  const [invites, setInvites] = useState<InvitedVisitor[]>(initialInvitedVisitors);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [purposeFilter, setPurposeFilter] = useState<string>('all');
  const [selectedPass, setSelectedPass] = useState<InvitedVisitor | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Invite Form State
  const [formData, setFormData] = useState({
    flatNumber: 'A-402',
    residentName: 'Priya Deshmukh',
    visitorName: '',
    visitorPhone: '',
    purpose: 'guest' as 'guest' | 'delivery' | 'service' | 'cab',
    scheduledDate: 'Today, 24 Oct 2026',
    scheduledTime: '06:00 PM',
    validUntil: '10:00 PM',
    vehicleNumber: '',
    notes: '',
  });

  const handleCopyCode = (code: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard?.writeText(code);
    setCopiedId(code);
    onShowToast(`Passcode ${code} copied to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSharePass = (invite: InvitedVisitor, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const text = `🎫 GreenGate Entry Pass\nPasscode: ${invite.passCode}\nVisitor: ${invite.visitorName}\nDestination: Flat ${invite.flatNumber} (${invite.residentName})\nValid: ${invite.scheduledDate} at ${invite.scheduledTime}\nPlease show this passcode or QR at security gate.`;
    navigator.clipboard?.writeText(text);
    onShowToast(`Pass details for ${invite.visitorName} copied!`);
  };

  const handleCreatePassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.visitorName.trim()) {
      onShowToast('Please enter visitor name');
      return;
    }

    const randomPassCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newInvite: InvitedVisitor = {
      id: `inv-${Date.now()}`,
      passCode: randomPassCode,
      visitorName: formData.visitorName.trim(),
      visitorPhone: formData.visitorPhone.trim() || undefined,
      purpose: formData.purpose,
      status: 'expected',
      flatNumber: formData.flatNumber,
      residentName: formData.residentName,
      residentRole: 'owner',
      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime,
      validUntil: formData.validUntil,
      entryType: 'single_entry',
      notes: formData.notes.trim() || 'Pre-approved entry pass issued by Society Admin',
      createdAt: 'Just now',
      vehicleNumber: formData.vehicleNumber.trim() || undefined,
    };

    setInvites([newInvite, ...invites]);
    setShowCreateModal(false);
    setSelectedPass(newInvite);
    onShowToast(`Pre-Approved Pass #${randomPassCode} created!`);
    setFormData({
      flatNumber: 'A-402',
      residentName: 'Priya Deshmukh',
      visitorName: '',
      visitorPhone: '',
      purpose: 'guest',
      scheduledDate: 'Today, 24 Oct 2026',
      scheduledTime: '06:00 PM',
      validUntil: '10:00 PM',
      vehicleNumber: '',
      notes: '',
    });
  };

  const exportInvitesCSV = () => {
    const headers = ['Passcode,Visitor,Phone,Flat,Resident,Purpose,Date,Time,ValidUntil,Status,Vehicle,Notes'];
    const rows = filteredInvites.map(i => [
      `"${i.passCode}"`,
      `"${i.visitorName}"`,
      `"${i.visitorPhone || ''}"`,
      `"${i.flatNumber}"`,
      `"${i.residentName}"`,
      `"${i.purpose}"`,
      `"${i.scheduledDate}"`,
      `"${i.scheduledTime}"`,
      `"${i.validUntil}"`,
      `"${i.status}"`,
      `"${i.vehicleNumber || ''}"`,
      `"${i.notes || ''}"`
    ].join(','));

    const blob = new Blob([[...headers, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GreenGate_PreApproved_Invites_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Downloaded pre-approved invites CSV log');
  };

  const filteredInvites = invites.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (purposeFilter !== 'all' && item.purpose !== purposeFilter) return false;

    const q = search.toLowerCase();
    return (
      item.visitorName.toLowerCase().includes(q) ||
      item.passCode.toLowerCase().includes(q) ||
      item.flatNumber.toLowerCase().includes(q) ||
      item.residentName.toLowerCase().includes(q) ||
      (item.visitorPhone && item.visitorPhone.includes(q))
    );
  });

  const totalInvitesCount = invites.length;
  const expectedCount = invites.filter(i => i.status === 'expected').length;
  const checkedInCount = invites.filter(i => i.status === 'checked_in').length;
  const expiredCount = invites.filter(i => ['expired', 'revoked'].includes(i.status)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 4 Standard Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard
          icon={Ticket}
          label="Total Pre-Invites"
          value={totalInvitesCount}
          pill={{ text: 'Resident App', color: 'var(--accent)', bg: 'var(--accent-bg)' }}
          sub="Pre-authorized passes"
          accentColor="var(--accent)"
          bgColor="var(--accent-bg)"
          delay={0}
        />

        <StatCard
          icon={Clock}
          label="Expected Today"
          value={expectedCount}
          pill={{ text: 'Upcoming', color: 'var(--sky)', bg: 'var(--sky-bg)' }}
          sub={`${expectedCount} guests arriving today`}
          accentColor="var(--sky)"
          bgColor="var(--sky-bg)"
          delay={0.06}
        />

        <StatCard
          icon={CheckCircle2}
          label="Checked In"
          value={checkedInCount}
          pill={{ text: 'On Premises', color: 'var(--green)', bg: 'var(--green-bg)' }}
          sub="Verified at gate barrier"
          accentColor="var(--green)"
          bgColor="var(--green-bg)"
          delay={0.12}
        />

        <StatCard
          icon={XCircle}
          label="Past / Expired"
          value={expiredCount}
          pill={{ text: 'Completed', color: 'var(--text-muted)', bg: 'var(--bg-elevated)' }}
          sub="Expired or cancelled"
          accentColor="var(--text-muted)"
          bgColor="var(--bg-elevated)"
          delay={0.18}
        />
      </div>

      {/* Filter and Action Bar */}
      <motion.div
        className="card card-p"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, flex: 1, minWidth: 280 }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
              <Search
                size={14}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search visitor, phone, flat, or passcode..."
                className="field-input"
                style={{ paddingLeft: 36 }}
                id="invited-visitors-search"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="field-select"
              style={{ width: 'auto' }}
              id="invite-status-filter"
            >
              <option value="all">All Statuses ({totalInvitesCount})</option>
              <option value="expected">Expected Today ({expectedCount})</option>
              <option value="checked_in">Checked In ({checkedInCount})</option>
              <option value="upcoming">Upcoming</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>

            <select
              value={purposeFilter}
              onChange={e => setPurposeFilter(e.target.value)}
              className="field-select"
              style={{ width: 'auto' }}
              id="invite-purpose-filter"
            >
              <option value="all">All Purposes</option>
              <option value="guest">Guest</option>
              <option value="delivery">Delivery</option>
              <option value="service">Service & Maintenance</option>
              <option value="cab">Cab / Taxi</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
              id="create-invite-btn"
            >
              <Plus size={15} /> New Pre-Pass
            </button>

            <button
              onClick={exportInvitesCSV}
              className="btn-success"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}
              id="export-invites-csv"
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
        </div>
      </motion.div>

      {/* Spacious Enterprise DataTable */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ overflow: 'hidden' }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" id="invited-visitors-datatable" style={{ minWidth: 980 }}>
            <thead>
              <tr>
                <th style={{ width: 140, whiteSpace: 'nowrap' }}>Passcode (OTP)</th>
                <th style={{ minWidth: 200, whiteSpace: 'nowrap' }}>Visitor</th>
                <th style={{ minWidth: 160, whiteSpace: 'nowrap' }}>Flat / Resident</th>
                <th style={{ minWidth: 120, whiteSpace: 'nowrap' }}>Purpose</th>
                <th style={{ minWidth: 160, whiteSpace: 'nowrap' }}>Schedule</th>
                <th style={{ minWidth: 130, whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ minWidth: 180 }}>Notes</th>
                <th style={{ textAlign: 'right', width: 90, whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvites.map(item => {
                const pInfo = purposeConfig[item.purpose] || purposeConfig.guest;
                const PIcon = pInfo.icon;
                const isCopied = copiedId === item.passCode;

                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedPass(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Passcode (OTP) */}
                    <td>
                      <div
                        onClick={(e) => handleCopyCode(item.passCode, e)}
                        className="badge badge-accent"
                        title="Click to copy 6-digit passcode"
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          padding: '3px 8px',
                          cursor: 'pointer',
                          gap: 6,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <QrCode size={12} />
                        <span>{item.passCode}</span>
                        {isCopied ? (
                          <Check size={11} color="var(--green)" />
                        ) : (
                          <Copy size={11} style={{ opacity: 0.7 }} />
                        )}
                      </div>
                    </td>

                    {/* Visitor */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          className="avatar avatar-sm"
                          style={{
                            background: `linear-gradient(135deg, ${pInfo.color}80, ${pInfo.color}30)`,
                            color: '#FFFFFF',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <PIcon size={13} color="#FFFFFF" />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                            {item.visitorName}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            {item.visitorPhone && (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                {item.visitorPhone}
                              </span>
                            )}
                            {item.vehicleNumber && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  fontFamily: 'monospace',
                                  background: 'var(--bg-elevated)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--text-secondary)',
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {item.vehicleNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Destination Flat & Resident */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          Flat {item.flatNumber}
                        </span>
                        <span className="badge badge-muted" style={{ fontSize: 9.5, padding: '1px 5px', whiteSpace: 'nowrap' }}>
                          {item.residentRole === 'owner' ? 'Owner' : 'Tenant'}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap' }}>
                        {item.residentName}
                      </div>
                    </td>

                    {/* Purpose */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <PIcon size={13} color={pInfo.color} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {pInfo.label}
                        </span>
                      </div>
                    </td>

                    {/* Schedule */}
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {item.scheduledDate}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap' }}>
                        {item.scheduledTime} – {item.validUntil}
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <StatusPill status={item.status} />
                      {item.gateCheckInTime && (
                        <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 3, whiteSpace: 'nowrap' }}>
                          Gate in at {item.gateCheckInTime}
                        </div>
                      )}
                    </td>

                    {/* Notes */}
                    <td style={{ maxWidth: 220 }}>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={item.notes}
                      >
                        {item.notes || '—'}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPass(item);
                          }}
                          className="btn-icon"
                          title="View Digital Pass & QR"
                          style={{ width: 28, height: 28 }}
                        >
                          <QrCode size={13} />
                        </button>
                        <button
                          onClick={(e) => handleSharePass(item, e)}
                          className="btn-icon"
                          title="Copy Pass Details"
                          style={{ width: 28, height: 28 }}
                        >
                          <Share2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredInvites.length === 0 && (
          <div className="empty-state" style={{ padding: '36px 20px', textAlign: 'center' }}>
            <Ticket size={36} className="empty-state-icon" style={{ opacity: 0.4, margin: '0 auto 10px' }} />
            <p className="empty-state-text" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              No pre-approved visitor passes found
            </p>
            <button
              onClick={() => { setSearch(''); setStatusFilter('all'); setPurposeFilter('all'); }}
              className="btn-secondary"
              style={{ marginTop: 10, fontSize: 12 }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </motion.div>

      {/* Digital Pass Modal Preview */}
      <AnimatePresence>
        {selectedPass && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedPass(null); }}
            style={{ zIndex: 1100 }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              style={{
                width: '100%',
                maxWidth: 440,
                background: 'var(--bg-surface)',
                borderRadius: 'var(--r-xl)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-xl)',
                overflow: 'hidden',
              }}
            >
              {/* Header Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
                  padding: '20px 24px',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ShieldCheck size={20} color="#FFFFFF" />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent-light)', textTransform: 'uppercase' }}>
                        GreenGate Pre-Approval
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF' }}>
                        Digital Visitor Pass
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPass(null)}
                    className="btn-icon"
                    style={{ background: 'rgba(255,255,255,0.1)', color: '#FFFFFF', width: 28, height: 28 }}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>
                    PASS #{selectedPass.id.toUpperCase()}
                  </span>
                  <StatusPill status={selectedPass.status} />
                </div>
              </div>

              {/* Pass Body */}
              <div style={{ padding: '24px' }}>
                {/* 6-Digit Gate Pass OTP Display */}
                <div
                  style={{
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--r-lg)',
                    padding: 16,
                    border: '1px dashed var(--border-accent)',
                    textAlign: 'center',
                    marginBottom: 20,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Gate Barrier Entry Passcode (OTP)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '10px 0' }}>
                    {selectedPass.passCode.split('').map((digit, idx) => (
                      <span
                        key={idx}
                        style={{
                          width: 38,
                          height: 44,
                          background: 'var(--bg-card)',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                          fontWeight: 800,
                          color: 'var(--text-primary)',
                          boxShadow: 'var(--shadow-sm)',
                          border: '1px solid var(--border)',
                          fontFamily: 'monospace',
                        }}
                      >
                        {digit}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Visitor provides this passcode or scans QR at gate barrier
                  </div>
                </div>

                {/* QR Code and Visitor Summary */}
                <div
                  style={{
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--r-lg)',
                    padding: 16,
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      width: 74,
                      height: 74,
                      background: '#FFFFFF',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      flexShrink: 0
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3, width: 56, height: 56 }}>
                      {Array.from({ length: 25 }).map((_, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: [0, 1, 2, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 21, 22, 24].includes(idx)
                              ? '#0B0F19'
                              : 'transparent',
                            borderRadius: 2,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {selectedPass.visitorName}
                    </div>
                    {selectedPass.visitorPhone && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {selectedPass.visitorPhone}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--accent-light)', marginTop: 4, fontWeight: 600 }}>
                      Purpose: <span style={{ textTransform: 'capitalize' }}>{selectedPass.purpose}</span>
                    </div>
                  </div>
                </div>

                {/* Info Fields Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 'var(--r-md)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Invited By</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                      {selectedPass.residentName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--accent-light)', fontWeight: 600 }}>
                      Flat {selectedPass.flatNumber}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 'var(--r-md)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Scheduled Slot</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                      {selectedPass.scheduledTime}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {selectedPass.scheduledDate}
                    </div>
                  </div>

                  {selectedPass.vehicleNumber && (
                    <div style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 'var(--r-md)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vehicle Tag</div>
                      <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-light)', marginTop: 2 }}>
                        {selectedPass.vehicleNumber}
                      </div>
                    </div>
                  )}

                  <div style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 'var(--r-md)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Validity</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                      Until {selectedPass.validUntil}
                    </div>
                  </div>
                </div>

                {selectedPass.notes && (
                  <div
                    style={{
                      background: 'var(--bg-elevated)',
                      padding: '10px 14px',
                      borderRadius: 'var(--r-md)',
                      marginBottom: 20,
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                      borderLeft: '3px solid var(--accent)',
                    }}
                  >
                    <strong>Resident Note:</strong> {selectedPass.notes}
                  </div>
                )}

                {/* Actions Bottom Bar */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => handleSharePass(selectedPass)}
                    className="btn-success"
                    style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Share2 size={14} />
                    Copy Pass Details
                  </button>
                  <button
                    onClick={() => {
                      onShowToast('Pass sent via WhatsApp & SMS simulation');
                    }}
                    className="btn-secondary"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Resend SMS/App
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Pre-Approved Pass Modal Preview */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
            style={{ zIndex: 1100 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: '100%',
                maxWidth: 480,
                background: 'var(--bg-card)',
                borderRadius: 'var(--r-xl)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-xl)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '18px 24px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Create Pre-Approved Visitor Pass
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                    Issue pre-authorized entry OTP pass for expected guests
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-icon"
                  style={{ width: 28, height: 28 }}
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleCreatePassSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Destination Flat & Resident */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      FLAT NUMBER *
                    </label>
                    <select
                      value={formData.flatNumber}
                      onChange={e => {
                        const flat = e.target.value;
                        const hostMap: Record<string, string> = {
                          'A-402': 'Priya Deshmukh',
                          'A-101': 'Sahil Arote',
                          'B-203': 'Amit Joshi',
                          'B-305': 'Neha Kulkarni',
                          'C-101': 'Vikram Mehta',
                          'D-101': 'Suresh Nair',
                          'B-401': 'Deepak Rane',
                        };
                        setFormData({
                          ...formData,
                          flatNumber: flat,
                          residentName: hostMap[flat] || 'Society Resident',
                        });
                      }}
                      className="field-select"
                      style={{ width: '100%' }}
                    >
                      <option value="A-402">A-402 (Priya Deshmukh)</option>
                      <option value="A-101">A-101 (Sahil Arote)</option>
                      <option value="B-203">B-203 (Amit Joshi)</option>
                      <option value="B-305">B-305 (Neha Kulkarni)</option>
                      <option value="C-101">C-101 (Vikram Mehta)</option>
                      <option value="D-101">D-101 (Suresh Nair)</option>
                      <option value="B-401">B-401 (Deepak Rane)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      PURPOSE *
                    </label>
                    <select
                      value={formData.purpose}
                      onChange={e => setFormData({ ...formData, purpose: e.target.value as any })}
                      className="field-select"
                      style={{ width: '100%' }}
                    >
                      <option value="guest">Guest / Personal</option>
                      <option value="delivery">Courier / Delivery</option>
                      <option value="service">Service & Repair</option>
                      <option value="cab">Cab / Taxi Pickup</option>
                    </select>
                  </div>
                </div>

                {/* Visitor Name & Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      VISITOR FULL NAME *
                    </label>
                    <input
                      value={formData.visitorName}
                      onChange={e => setFormData({ ...formData, visitorName: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      className="field-input"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      MOBILE NUMBER
                    </label>
                    <input
                      value={formData.visitorPhone}
                      onChange={e => setFormData({ ...formData, visitorPhone: e.target.value })}
                      placeholder="+91 98765..."
                      className="field-input"
                    />
                  </div>
                </div>

                {/* Date & Time Slot */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      SCHEDULED DATE
                    </label>
                    <input
                      value={formData.scheduledDate}
                      onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })}
                      className="field-input"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      ARRIVAL TIME
                    </label>
                    <input
                      value={formData.scheduledTime}
                      onChange={e => setFormData({ ...formData, scheduledTime: e.target.value })}
                      className="field-input"
                    />
                  </div>
                </div>

                {/* Vehicle & Notes */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    VEHICLE NUMBER (OPTIONAL)
                  </label>
                  <input
                    value={formData.vehicleNumber}
                    onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    placeholder="e.g. MH12 AB 1234"
                    className="field-input"
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    ENTRY NOTES / INSTRUCTIONS
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Allow direct parking in visitor bay, family birthday party..."
                    className="field-input"
                    rows={2}
                    style={{ resize: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn-secondary"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Generate Passcode (OTP)
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

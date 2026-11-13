import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench, Plus, Search, Phone, MapPin, Clock, Star,
  ShieldCheck, Trash2, X, Loader2, AlertCircle, RefreshCw,
  Building2, Users, CheckCircle2
} from 'lucide-react';
import StatCard from '../components/StatCard';
import {
  fetchAdminServices,
  createAdminService,
  deleteAdminService,
  type AdminServiceItem
} from '../services/api';

export default function Services() {
  const [services, setServices] = useState<AdminServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'VENDOR' | 'UTILITY' | 'STAFF'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Electrician',
    serviceType: 'VENDOR' as 'VENDOR' | 'UTILITY' | 'STAFF',
    providerName: '',
    phone: '',
    alternatePhone: '',
    address: '',
    description: '',
    timing: '9:00 AM - 8:00 PM',
    rating: 4.5,
    isVerified: true,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminServices({
        type: selectedType !== 'ALL' ? selectedType : undefined,
        search: search.trim() || undefined,
      });
      setServices(data);
    } catch (err: any) {
      console.error('Error fetching services:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from society services?`)) {
      return;
    }
    try {
      await deleteAdminService(id);
      setFeedback({ type: 'success', text: `Service "${name}" removed successfully.` });
      setServices(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to delete service.' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.category.trim()) {
      setFeedback({ type: 'error', text: 'Please fill all required fields.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createAdminService({
        name: formData.name.trim(),
        category: formData.category.trim(),
        serviceType: formData.serviceType,
        providerName: formData.providerName.trim() || undefined,
        phone: formData.phone.trim(),
        alternatePhone: formData.alternatePhone.trim() || undefined,
        address: formData.address.trim() || undefined,
        description: formData.description.trim() || undefined,
        timing: formData.timing.trim() || undefined,
        rating: Number(formData.rating) || 4.5,
        isVerified: formData.isVerified,
      });

      setServices(prev => [created, ...prev]);
      setIsAddModalOpen(false);
      setFeedback({ type: 'success', text: `Service "${created.name}" added successfully!` });
      setFormData({
        name: '',
        category: 'Electrician',
        serviceType: 'VENDOR',
        providerName: '',
        phone: '',
        alternatePhone: '',
        address: '',
        description: '',
        timing: '9:00 AM - 8:00 PM',
        rating: 4.5,
        isVerified: true,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to add service.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stat metrics
  const totalCount = services.length;
  const vendorsCount = services.filter(s => s.serviceType === 'VENDOR').length;
  const utilitiesCount = services.filter(s => s.serviceType === 'UTILITY').length;
  const staffCount = services.filter(s => s.serviceType === 'STAFF').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', margin: 0 }}>
            Society Services & Directory
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Manage verified vendors, domestic staff, and emergency utilities available to society residents.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => setIsAddModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px' }}
        >
          <Plus size={16} />
          Add Service
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--r-md)',
            background: feedback.type === 'success' ? 'var(--green-bg)' : 'var(--red-bg)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: feedback.type === 'success' ? 'var(--green)' : 'var(--red)',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.text}</span>
          </div>
          <button className="btn-icon" onClick={() => setFeedback(null)} style={{ padding: 4 }}>
            <X size={14} />
          </button>
        </motion.div>
      )}

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
        <StatCard
          icon={Wrench}
          label="Total Services"
          value={totalCount}
          accentColor="var(--accent-light)" bgColor="var(--accent-bg)"
        />
        <StatCard
          icon={ShieldCheck}
          label="Verified Vendors"
          value={vendorsCount}
          accentColor="var(--green)" bgColor="var(--green-bg)"
        />
        <StatCard
          icon={Building2}
          label="Utilities & AMCs"
          value={utilitiesCount}
          accentColor="var(--blue)" bgColor="var(--blue-bg)"
        />
        <StatCard
          icon={Users}
          label="Domestic Staff"
          value={staffCount}
          accentColor="var(--amber)" bgColor="var(--amber-bg)"
        />
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          padding: 16,
          borderRadius: 'var(--r-lg)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Type pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Services' },
            { id: 'VENDOR', label: 'Vendors' },
            { id: 'UTILITY', label: 'Utilities' },
            { id: 'STAFF', label: 'Staff Hire' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id as any)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--r-full)',
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid',
                borderColor: selectedType === tab.id ? 'var(--accent-light)' : 'var(--border)',
                background: selectedType === tab.id ? 'var(--accent-bg)' : 'transparent',
                color: selectedType === tab.id ? 'var(--accent-light)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, minWidth: 260 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search vendor, contact, category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: 34, fontSize: 13, height: 38 }}
            />
          </div>
          <button type="submit" className="btn-secondary" style={{ padding: '0 14px', height: 38 }}>
            Search
          </button>
          <button type="button" onClick={() => { setSearch(''); loadData(); }} className="btn-icon" title="Reset Search">
            <RefreshCw size={15} />
          </button>
        </form>
      </div>

      {/* Services Table */}
      <div
        style={{
          borderRadius: 'var(--r-lg)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px' }}>Service & Category</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px' }}>Contact Details</th>
                <th style={{ padding: '12px 16px' }}>Rating</th>
                <th style={{ padding: '12px 16px' }}>Operating Hours / Address</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Loader2 size={24} className="spin" style={{ margin: '0 auto 8px' }} />
                    Loading society services...
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Wrench size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>No services found</p>
                    <p style={{ fontSize: 12, marginTop: 4 }}>Add society vendors or clear filters to see listings.</p>
                  </td>
                </tr>
              ) : (
                services.map(service => (
                  <tr
                    key={service.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Service & Category */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 'var(--r-md)',
                            background: service.serviceType === 'VENDOR' ? 'var(--blue-bg)' : service.serviceType === 'UTILITY' ? 'var(--amber-bg)' : 'var(--green-bg)',
                            color: service.serviceType === 'VENDOR' ? 'var(--blue)' : service.serviceType === 'UTILITY' ? 'var(--amber)' : 'var(--green)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          {service.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{service.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {service.category} {service.providerName ? `· ${service.providerName}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        className={
                          service.serviceType === 'VENDOR' ? 'badge badge-primary' : service.serviceType === 'UTILITY' ? 'badge badge-warning' : 'badge badge-success'
                        }
                      >
                        {service.serviceType}
                      </span>
                    </td>

                    {/* Contact Details */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)', fontWeight: 500 }}>
                        <Phone size={13} color="var(--text-muted)" />
                        {service.phone}
                      </div>
                      {service.alternatePhone && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          Alt: {service.alternatePhone}
                        </div>
                      )}
                    </td>

                    {/* Rating */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, color: '#F59E0B' }}>
                        <Star size={14} fill="#F59E0B" />
                        <span>{service.rating || 4.5}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                          ({service.reviewCount || 0})
                        </span>
                      </div>
                    </td>

                    {/* Timing & Address */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: 12 }}>
                        <Clock size={12} color="var(--text-muted)" />
                        {service.timing || '9:00 AM - 8:00 PM'}
                      </div>
                      {service.address && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                          <MapPin size={11} />
                          <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {service.address}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      {service.isVerified ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--green)', fontSize: 12, fontWeight: 600 }}>
                          <ShieldCheck size={14} /> Verified
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Standard</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDelete(service.id, service.name)}
                        className="btn-icon"
                        title="Delete Service"
                        style={{ color: 'var(--red)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Service Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999,
              padding: 16,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: '100%',
                maxWidth: 540,
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--r-xl)',
                border: '1px solid var(--border)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '18px 24px',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Add Verified Society Service
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                    This vendor will be instantly accessible to residents in the mobile app.
                  </p>
                </div>
                <button className="btn-icon" onClick={() => setIsAddModalOpen(false)}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreate} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                      Service / Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Shri Ganesh Electricals"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                      Service Type *
                    </label>
                    <select
                      value={formData.serviceType}
                      onChange={e => setFormData({ ...formData, serviceType: e.target.value as any })}
                      className="input-field"
                    >
                      <option value="VENDOR">Vendor (General Repairs)</option>
                      <option value="UTILITY">Utility / Society AMC</option>
                      <option value="STAFF">Domestic Staff Hire</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="input-field"
                    >
                      <option value="Electrician">Electrician</option>
                      <option value="Plumber">Plumber</option>
                      <option value="AC Repair">AC Repair</option>
                      <option value="Carpenter">Carpenter</option>
                      <option value="Pest Control">Pest Control</option>
                      <option value="Housekeeping">Housekeeping</option>
                      <option value="Painter">Painter</option>
                      <option value="Appliance Repair">Appliance Repair</option>
                      <option value="Cook & Maid">Cook & Maid</option>
                      <option value="Security / AMC">Security / AMC</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                      Contact Person / Provider
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ganesh Sharma"
                      value={formData.providerName}
                      onChange={e => setFormData({ ...formData, providerName: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                      Primary Phone *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+91 98201 11223"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                      Alternate Phone
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98201 11224"
                      value={formData.alternatePhone}
                      onChange={e => setFormData({ ...formData, alternatePhone: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                      Operating Timing
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9:00 AM - 8:00 PM"
                      value={formData.timing}
                      onChange={e => setFormData({ ...formData, timing: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                      Default Star Rating
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="5.0"
                      value={formData.rating}
                      onChange={e => setFormData({ ...formData, rating: parseFloat(e.target.value) || 4.5 })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    Shop / Service Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shop 12, Chandivali Farm Road, Andheri East"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    Short Description / Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Specialized in domestic wiring, inverters and quick emergency calls."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="input-field"
                    style={{ resize: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <input
                    type="checkbox"
                    id="isVerifiedCheckbox"
                    checked={formData.isVerified}
                    onChange={e => setFormData({ ...formData, isVerified: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="isVerifiedCheckbox" style={{ fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}>
                    Mark as Verified Society Service (Recommended)
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                  <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isSubmitting ? <Loader2 size={15} className="spin" /> : <Plus size={15} />}
                    {isSubmitting ? 'Saving...' : 'Add Service'}
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

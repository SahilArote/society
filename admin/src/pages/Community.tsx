import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, Plus, Search, MapPin, Clock, Users,
  Trash2, X, Loader2, AlertCircle, RefreshCw, CheckCircle2,
  Calendar, Check, Image as ImageIcon, CheckCheck,
  Tag
} from 'lucide-react';
import StatCard from '../components/StatCard';
import {
  fetchAdminEvents,
  createAdminEvent,
  deleteAdminEvent,
  fetchAdminLostFound,
  updateAdminLostFoundStatus,
  deleteAdminLostFound,
  type AdminEventItem,
  type AdminLostFoundItem,
} from '../services/api';

export default function Community() {
  const [activeTab, setActiveTab] = useState<'EVENTS' | 'LOST_FOUND'>('EVENTS');
  const [events, setEvents] = useState<AdminEventItem[]>([]);
  const [lostFound, setLostFound] = useState<AdminLostFoundItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Events Filters & Modal
  const [eventFilter, setEventFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    category: 'Celebration',
    eventDate: '',
    timeStr: '6:00 PM - 10:00 PM',
    venue: '',
    organizer: 'Society Cultural Committee',
    capacity: 150,
    coverImage: '',
    description: '',
  });

  // Lost & Found Filters & Search
  const [lfType, setLfType] = useState<'ALL' | 'LOST' | 'FOUND'>('ALL');
  const [lfSearch, setLfSearch] = useState('');

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminEvents(eventFilter);
      setEvents(data);
    } catch (err: any) {
      console.error('Error fetching events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLostFound = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminLostFound({
        type: lfType !== 'ALL' ? lfType : undefined,
        search: lfSearch.trim() || undefined,
      });
      setLostFound(data);
    } catch (err: any) {
      console.error('Error fetching lost & found:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'EVENTS') {
      loadEvents();
    } else {
      loadLostFound();
    }
  }, [activeTab, eventFilter, lfType]);

  // Event Handlers
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title.trim() || !eventForm.eventDate || !eventForm.venue.trim()) {
      setFeedback({ type: 'error', text: 'Please fill required event details.' });
      return;
    }

    setIsSubmittingEvent(true);
    try {
      const created = await createAdminEvent({
        title: eventForm.title.trim(),
        category: eventForm.category.trim(),
        eventDate: new Date(eventForm.eventDate).toISOString(),
        timeStr: eventForm.timeStr.trim() || '10:00 AM',
        venue: eventForm.venue.trim(),
        organizer: eventForm.organizer.trim() || 'Society Committee',
        capacity: Number(eventForm.capacity) || 0,
        coverImage: eventForm.coverImage.trim() || undefined,
        description: eventForm.description.trim(),
      });

      setEvents(prev => [created, ...prev]);
      setIsCreateEventOpen(false);
      setFeedback({ type: 'success', text: `Event "${created.title}" created & published to resident app!` });
      setEventForm({
        title: '',
        category: 'Celebration',
        eventDate: '',
        timeStr: '6:00 PM - 10:00 PM',
        venue: '',
        organizer: 'Society Cultural Committee',
        capacity: 150,
        coverImage: '',
        description: '',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to create event.' });
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  const handleDeleteEvent = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete event "${title}"? All attendee RSVPs will be removed.`)) {
      return;
    }
    try {
      await deleteAdminEvent(id);
      setEvents(prev => prev.filter(e => e.id !== id));
      setFeedback({ type: 'success', text: `Event "${title}" deleted successfully.` });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to delete event.' });
    }
  };

  // Lost & Found Moderation Handlers
  const handleUpdateLfStatus = async (id: string, newStatus: 'RESOLVED') => {
    try {
      await updateAdminLostFoundStatus(id, newStatus);
      setLostFound(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
      setFeedback({ type: 'success', text: 'Post status marked as Resolved.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update post status.' });
    }
  };

  const handleDeleteLfPost = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete this resident post "${title}"?`)) {
      return;
    }
    try {
      await deleteAdminLostFound(id);
      setLostFound(prev => prev.filter(item => item.id !== id));
      setFeedback({ type: 'success', text: `Post "${title}" deleted successfully.` });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to delete post.' });
    }
  };

  // Metrics
  const upcomingEventsCount = events.filter(e => e.status === 'UPCOMING').length;
  const totalRsvpCount = events.reduce((sum, e) => sum + (e.registrationCount || 0), 0);
  const activeLfCount = lostFound.filter(l => l.status === 'ACTIVE').length;
  const resolvedLfCount = lostFound.filter(l => l.status === 'RESOLVED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', margin: 0 }}>
            Society Events & Community Hub
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Organize official society events, monitor RSVP attendance, and moderate resident lost & found reports.
          </p>
        </div>

        {activeTab === 'EVENTS' && (
          <button
            className="btn-primary"
            onClick={() => setIsCreateEventOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px' }}
          >
            <Plus size={16} />
            Create Event
          </button>
        )}
      </div>

      {/* Tab Selector */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 2,
        }}
      >
        <button
          onClick={() => setActiveTab('EVENTS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'EVENTS' ? '2px solid var(--accent-light)' : '2px solid transparent',
            color: activeTab === 'EVENTS' ? 'var(--accent-light)' : 'var(--text-secondary)',
            transition: 'all 0.15s ease',
          }}
        >
          <CalendarDays size={16} />
          Society Events ({events.length})
        </button>

        <button
          onClick={() => setActiveTab('LOST_FOUND')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'LOST_FOUND' ? '2px solid var(--accent-light)' : '2px solid transparent',
            color: activeTab === 'LOST_FOUND' ? 'var(--accent-light)' : 'var(--text-secondary)',
            transition: 'all 0.15s ease',
          }}
        >
          <Tag size={16} />
          Lost & Found Moderation ({lostFound.length})
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

      {/* ======================================================== */}
      {/* VIEW 1: SOCIETY EVENTS MODULE                            */}
      {/* ======================================================== */}
      {activeTab === 'EVENTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
            <StatCard
              icon={CalendarDays}
              label="Total Events"
              value={events.length}
              accentColor="var(--accent-light)" bgColor="var(--accent-bg)"
            />
            <StatCard
              icon={Calendar}
              label="Upcoming Events"
              value={upcomingEventsCount}
              accentColor="var(--blue)" bgColor="var(--blue-bg)"
            />
            <StatCard
              icon={Users}
              label="Total RSVP Attendees"
              value={totalRsvpCount}
              accentColor="var(--green)" bgColor="var(--green-bg)"
            />
          </div>

          {/* Filter Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderRadius: 'var(--r-lg)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'upcoming', label: 'Upcoming Events' },
                { id: 'past', label: 'Past Events' },
                { id: 'all', label: 'All Events' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setEventFilter(f.id as any)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--r-full)',
                    fontSize: 12,
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: eventFilter === f.id ? 'var(--accent-light)' : 'var(--border)',
                    background: eventFilter === f.id ? 'var(--accent-bg)' : 'transparent',
                    color: eventFilter === f.id ? 'var(--accent-light)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button onClick={loadEvents} className="btn-icon" title="Refresh Events">
              <RefreshCw size={15} />
            </button>
          </div>

          {/* Events Grid */}
          {isLoading ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={26} className="spin" style={{ margin: '0 auto 8px' }} />
              Loading society events...
            </div>
          ) : events.length === 0 ? (
            <div
              style={{
                padding: 48,
                textAlign: 'center',
                borderRadius: 'var(--r-lg)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              <CalendarDays size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>No society events found</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Click "+ Create Event" above to publish an event for residents.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {events.map(event => {
                const eventDateObj = new Date(event.eventDate);
                const dateStr = eventDateObj.toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                const capacity = event.capacity || 0;
                const regCount = event.registrationCount || 0;
                const percent = capacity > 0 ? Math.min(100, Math.round((regCount / capacity) * 100)) : 100;

                return (
                  <div
                    key={event.id}
                    style={{
                      borderRadius: 'var(--r-lg)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Cover Banner */}
                    <div style={{ height: 140, background: '#0F172A', position: 'relative', overflow: 'hidden' }}>
                      {event.coverImage ? (
                        <img
                          src={event.coverImage}
                          alt={event.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#F59E0B',
                          }}
                        >
                          <CalendarDays size={42} />
                        </div>
                      )}
                      <div
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          background: 'rgba(0,0,0,0.65)',
                          backdropFilter: 'blur(4px)',
                          padding: '4px 10px',
                          borderRadius: 'var(--r-full)',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#FBBF24',
                        }}
                      >
                        {event.category}
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          {event.title}
                        </h3>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {event.description || 'No description provided.'}
                        </p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={13} color="var(--text-muted)" />
                          <span>{dateStr} · {event.timeStr}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MapPin size={13} color="var(--text-muted)" />
                          <span>{event.venue}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Users size={13} color="var(--text-muted)" />
                          <span>Organizer: {event.organizer}</span>
                        </div>
                      </div>

                      {/* RSVP Capacity Progress Bar */}
                      <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Attendance RSVP</span>
                          <span style={{ color: 'var(--accent-light)' }}>
                            {regCount} / {capacity > 0 ? `${capacity} max` : 'Unlimited'}
                          </span>
                        </div>
                        {capacity > 0 && (
                          <div style={{ height: 6, width: '100%', background: 'var(--bg-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${percent}%`,
                                background: percent >= 90 ? 'var(--red)' : 'var(--green)',
                                borderRadius: 3,
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                        <span
                          className={
                            event.status === 'UPCOMING'
                              ? 'badge badge-primary'
                              : event.status === 'COMPLETED'
                              ? 'badge badge-success'
                              : 'badge badge-danger'
                          }
                        >
                          {event.status}
                        </span>

                        <button
                          onClick={() => handleDeleteEvent(event.id, event.title)}
                          className="btn-icon"
                          title="Delete Event"
                          style={{ color: 'var(--red)' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: LOST & FOUND MODERATION MODULE                   */}
      {/* ======================================================== */}
      {activeTab === 'LOST_FOUND' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
            <StatCard
              icon={Tag}
              label="Total Reported Posts"
              value={lostFound.length}
              accentColor="var(--accent-light)" bgColor="var(--accent-bg)"
            />
            <StatCard
              icon={AlertCircle}
              label="Active Unresolved Posts"
              value={activeLfCount}
              accentColor="var(--red)" bgColor="var(--red-bg)"
            />
            <StatCard
              icon={CheckCheck}
              label="Resolved / Recovered"
              value={resolvedLfCount}
              accentColor="var(--green)" bgColor="var(--green-bg)"
            />
          </div>

          {/* Filter & Search Bar */}
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
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'ALL', label: 'All Items' },
                { id: 'LOST', label: 'Lost Items' },
                { id: 'FOUND', label: 'Found Items' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setLfType(f.id as any)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--r-full)',
                    fontSize: 12,
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: lfType === f.id ? 'var(--accent-light)' : 'var(--border)',
                    background: lfType === f.id ? 'var(--accent-bg)' : 'transparent',
                    color: lfType === f.id ? 'var(--accent-light)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search item title or location..."
                  value={lfSearch}
                  onChange={e => setLfSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadLostFound()}
                  className="input-field"
                  style={{ paddingLeft: 30, fontSize: 13, height: 36, width: 220 }}
                />
              </div>
              <button onClick={loadLostFound} className="btn-icon" title="Refresh">
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {/* Lost & Found Table */}
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
                    <th style={{ padding: '12px 16px' }}>Item Title & Category</th>
                    <th style={{ padding: '12px 16px' }}>Type</th>
                    <th style={{ padding: '12px 16px' }}>Reported By</th>
                    <th style={{ padding: '12px 16px' }}>Location & Date</th>
                    <th style={{ padding: '12px 16px' }}>Photo</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Moderation</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Loader2 size={24} className="spin" style={{ margin: '0 auto 8px' }} />
                        Loading community reports...
                      </td>
                    </tr>
                  ) : lostFound.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Tag size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                        <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>No lost & found posts</p>
                        <p style={{ fontSize: 12, marginTop: 4 }}>Any belongings reported by residents will appear here for admin moderation.</p>
                      </td>
                    </tr>
                  ) : (
                    lostFound.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        {/* Title & Desc */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, maxWidth: 260 }}>
                            {item.description}
                          </div>
                        </td>

                        {/* Type */}
                        <td style={{ padding: '14px 16px' }}>
                          <span className={item.type === 'LOST' ? 'badge badge-danger' : 'badge badge-success'}>
                            {item.type}
                          </span>
                        </td>

                        {/* Resident */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.authorName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {item.authorFlat || 'Resident'} {item.authorPhone ? `· ${item.authorPhone}` : ''}
                          </div>
                        </td>

                        {/* Location & Date */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
                            <MapPin size={12} color="var(--text-muted)" />
                            <span>{item.location}</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {new Date(item.incidentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </td>

                        {/* Photo Thumbnail */}
                        <td style={{ padding: '14px 16px' }}>
                          {item.imageUrl ? (
                            <a href={item.imageUrl} target="_blank" rel="noreferrer" title="Open full photo">
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', objectFit: 'cover', border: '1px solid var(--border)' }}
                              />
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <ImageIcon size={13} /> None
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 16px' }}>
                          <span className={item.status === 'RESOLVED' ? 'badge badge-success' : 'badge badge-warning'}>
                            {item.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            {item.status !== 'RESOLVED' && (
                              <button
                                onClick={() => handleUpdateLfStatus(item.id, 'RESOLVED')}
                                className="btn-secondary"
                                style={{ padding: '4px 10px', fontSize: 11, height: 28, display: 'flex', alignItems: 'center', gap: 4 }}
                                title="Mark as Resolved"
                              >
                                <Check size={12} />
                                Resolve
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteLfPost(item.id, item.title)}
                              className="btn-icon"
                              title="Delete Inappropriate Post"
                              style={{ color: 'var(--red)' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE SOCIETY EVENT                              */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isCreateEventOpen && (
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
                maxWidth: 560,
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
                    Create Official Society Event
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                    Residents will receive notification & can RSVP directly through the app.
                  </p>
                </div>
                <button className="btn-icon" onClick={() => setIsCreateEventOpen(false)}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateEvent} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Annual Independence Day & Flag Hoisting"
                    value={eventForm.title}
                    onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                      Category *
                    </label>
                    <select
                      value={eventForm.category}
                      onChange={e => setEventForm({ ...eventForm, category: e.target.value })}
                      className="input-field"
                    >
                      <option value="Celebration">Celebration / Festival</option>
                      <option value="Cultural">Cultural Programme</option>
                      <option value="Sports">Sports / Fitness</option>
                      <option value="General Meeting">Society AGM / Meeting</option>
                      <option value="Workshop">Workshop & Kids Camp</option>
                      <option value="Charity">Charity / Health Drive</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                      Event Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={eventForm.eventDate}
                      onChange={e => setEventForm({ ...eventForm, eventDate: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                      Timing *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 6:00 PM - 10:00 PM"
                      value={eventForm.timeStr}
                      onChange={e => setEventForm({ ...eventForm, timeStr: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                      Max Attendee Capacity (0 for unlimited)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={eventForm.capacity}
                      onChange={e => setEventForm({ ...eventForm, capacity: parseInt(e.target.value, 10) || 0 })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                      Venue / Location in Society *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Society Central Amphitheatre"
                      value={eventForm.venue}
                      onChange={e => setEventForm({ ...eventForm, venue: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                      Organizing Committee
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cultural & Youth Committee"
                      value={eventForm.organizer}
                      onChange={e => setEventForm({ ...eventForm, organizer: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    Cover Banner Image URL (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={eventForm.coverImage}
                    onChange={e => setEventForm({ ...eventForm, coverImage: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    Description & Highlights
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe program schedule, chief guests, food arrangements, or what residents need to bring."
                    value={eventForm.description}
                    onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                    className="input-field"
                    style={{ resize: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                  <button type="button" className="btn-secondary" onClick={() => setIsCreateEventOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmittingEvent} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isSubmittingEvent ? <Loader2 size={15} className="spin" /> : <Plus size={15} />}
                    {isSubmittingEvent ? 'Publishing...' : 'Publish Event'}
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

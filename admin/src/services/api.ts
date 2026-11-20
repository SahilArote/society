function resolveApiBaseUrl(): string {
  // If running in browser on a production domain (not localhost/127.0.0.1)
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    if (!isLocalhost) {
      if (hostname.endsWith('nexgate.co.in')) {
        return 'https://nexgate.co.in/api';
      }
      return `${window.location.origin}/api`;
    }
  }

  const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL)
    || (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.VITE_API_URL)
    || 'https://nexgate.co.in/api';
  let url = String(envUrl).trim();
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    url = url.replace(/^http:\/\//, 'https://');
  }
  return url;
}

const API_BASE_URL = resolveApiBaseUrl();

export function getAdminToken(): string | null {
  return localStorage.getItem('gg_admin_token');
}

export function setAdminSession(token: string, adminUser: any) {
  localStorage.setItem('gg_admin_token', token);
  localStorage.setItem('gg_admin_user', JSON.stringify(adminUser));
  localStorage.setItem('gg_admin_auth', 'true');
}

export function getAdminUser(): any | null {
  const user = localStorage.getItem('gg_admin_user');
  if (!user) return null;
  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
}

export function clearAdminSession() {
  localStorage.removeItem('gg_admin_token');
  localStorage.removeItem('gg_admin_user');
  localStorage.removeItem('gg_admin_auth');
}

function getAuthHeaders(): Record<string, string> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function adminLogin(email: string, password: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${API_BASE_URL}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      signal: controller.signal,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success) {
      const errorMsg = json?.error?.message || json?.message || 'Invalid admin credentials.';
      throw new Error(errorMsg);
    }

    const token = json.data?.token || json.token;
    const user = json.data?.user || json.admin;

    if (!token) {
      throw new Error('Authentication token missing from server response.');
    }

    setAdminSession(token, user);
    return { success: true, token, user };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Login request timed out. Please check your network connection.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  let targetUrl = url;
  if (targetUrl.startsWith('http://') && !targetUrl.includes('localhost') && !targetUrl.includes('127.0.0.1')) {
    targetUrl = targetUrl.replace(/^http:\/\//, 'https://');
  }

  let headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...(options.headers as any),
  };
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  // Enforce 15-second strict timeout on all HTTP calls
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let res: Response;
  try {
    res = await fetch(targetUrl, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out after 15 seconds. Please check your network connection.');
    }
    throw err;
  }
  clearTimeout(timeoutId);

  // When token is rejected (401), immediately invalidate cached session and log out
  if (res.status === 401) {
    console.warn('[Admin API] 401 Unauthorized received. Clearing cached session and redirecting to login.');
    clearAdminSession();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login' && !window.location.pathname.endsWith('/login')) {
      window.location.href = '/login';
    }
  }

  return res;
}

export async function fetchAdminStats() {
  try {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/stats`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error('Failed to fetch admin stats:', err);
    return null;
  }
}

export async function fetchAdminActivity() {
  try {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/activity`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch admin activity:', err);
    return [];
  }
}

// =============================================================
// RESIDENT REGISTRATION REQUESTS
// =============================================================

export async function fetchAdminRegistrations(status: string = 'ALL') {
  try {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/registrations?status=${status}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch admin registrations:', err);
    return [];
  }
}

export async function approveAdminRegistration(id: string) {
  const res = await fetchWithAuth(`${API_BASE_URL}/admin/registrations/${id}/approve`, {
    method: 'POST',
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.message || 'Failed to approve registration');
  }
  return json;
}

export async function rejectAdminRegistration(id: string, reason?: string) {
  const res = await fetchWithAuth(`${API_BASE_URL}/admin/registrations/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason?.trim() }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.message || 'Failed to reject registration');
  }
  return json;
}

// =============================================================
// FLATS & DIRECTORY
// =============================================================

export async function fetchAdminFlats() {
  try {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/flats`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch admin flats:', err);
    return [];
  }
}

export async function createAdminFlat(data: {
  number: string;
  wing: string;
  floor?: number;
  type?: string;
  ownerName?: string;
  ownerPhone?: string;
}) {
  const res = await fetchWithAuth(`${API_BASE_URL}/admin/flats`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.message || 'Failed to create flat');
  }
  return json.data;
}

export async function downloadCsvTemplate(): Promise<void> {
  const token = getAdminToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/admin/flats/csv-template`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    throw new Error(`Failed to download template (HTTP ${res.status})`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nexgate_flats_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export interface BulkImportResponse {
  success: boolean;
  message: string;
  data: {
    totalRows: number;
    processed: number;
    created: number;
    updated: number;
    failed: number;
    errors: Array<{ row: number; flat?: string; reason: string }>;
    importedFlats: any[];
  };
}

export async function bulkImportFlats(file: File): Promise<BulkImportResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetchWithAuth(`${API_BASE_URL}/admin/flats/bulk-import`, {
    method: 'POST',
    body: formData,
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.message || 'Failed to bulk import flats');
  }

  return json;
}

export async function mergeDuplicateFlats() {
  const res = await fetchWithAuth(`${API_BASE_URL}/admin/flats/merge-duplicates`, {
    method: 'POST',
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.message || 'Failed to merge duplicate flats');
  }
  return json;
}

export async function updateAdminFlat(id: string, data: {
  wing?: string;
  floor?: number;
  type?: string;
  residentName?: string;
  residentMobile?: string;
  residentEmail?: string;
  vehicleNumbers?: string[];
  status?: string;
}) {
  const res = await fetchWithAuth(`${API_BASE_URL}/admin/flats/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.message || 'Failed to update flat details');
  }
  return json.data;
}

export async function deleteAdminFlat(id: string) {
  const res = await fetchWithAuth(`${API_BASE_URL}/admin/flats/${id}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.message || 'Failed to delete flat');
  }
  return json;
}

export async function deleteAdminResident(id: string) {
  const res = await fetchWithAuth(`${API_BASE_URL}/admin/residents/${id}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.message || 'Failed to delete resident');
  }
  return json;
}

// =============================================================
// VISITOR LOGS
// =============================================================

export async function fetchAdminVisitors(params?: {
  tab?: string;
  gate?: string;
  search?: string;
  limit?: number;
}) {
  try {
    const query = new URLSearchParams();
    if (params?.tab) query.set('tab', params.tab);
    if (params?.gate && params.gate !== 'all') query.set('gate', params.gate);
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', String(params.limit));

    const res = await fetchWithAuth(`${API_BASE_URL}/admin/visitors?${query.toString()}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch admin visitors:', err);
    return [];
  }
}

export async function approveAdminVisitor(id: string) {
  const res = await fetchWithAuth(`${API_BASE_URL}/admin/visitors/${id}/approve`, {
    method: 'POST',
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.message || 'Failed to grant visitor entry');
  }
  return json;
}

export async function denyAdminVisitor(id: string, reason?: string) {
  const res = await fetchWithAuth(`${API_BASE_URL}/admin/visitors/${id}/deny`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.message || 'Failed to deny visitor entry');
  }
  return json;
}

export async function exitAdminVisitor(id: string) {
  const res = await fetchWithAuth(`${API_BASE_URL}/admin/visitors/${id}/exit`, {
    method: 'POST',
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.message || 'Failed to mark visitor exited');
  }
  return json;
}

export async function deleteAdminVisitor(id: string) {
  const res = await fetchWithAuth(`${API_BASE_URL}/admin/visitors/${id}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.message || 'Failed to delete visitor record');
  }
  return json;
}

// =============================================================
// GATES & BARRIERS
// =============================================================

export async function fetchAdminGates() {
  try {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/gates`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch admin gates:', err);
    return [];
  }
}

export async function toggleAdminGate(id: string, status: string) {
  const res = await fetchWithAuth(`${API_BASE_URL}/admin/gates/${id}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.message || 'Failed to toggle gate status');
  }
  return json.data;
}

// =============================================================
// GUARDS & SHIFTS
// =============================================================

export async function fetchAdminGuards() {
  try {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/guards`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    const list: any = Array.isArray(json.data) ? json.data : [];
    list.meta = json.meta || null;
    return list;
  } catch (err) {
    console.error('Failed to fetch admin guards:', err);
    const empty: any = [];
    empty.meta = null;
    return empty;
  }
}

export async function createAdminGuard(data: {
  name: string;
  phone?: string;
  assignedGate?: string;
  shift?: string;
  pin?: string;
}) {
  const res = await fetchWithAuth(`${API_BASE_URL}/admin/guards`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.message || 'Failed to register guard');
  }
  return json.data;
}

export async function updateAdminGuard(guardId: string, data: {
  name?: string;
  phone?: string;
  mobile?: string;
  pin?: string;
  status?: string;
}) {
  const res = await fetchWithAuth(`${API_BASE_URL}/admin/guards/${guardId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.message || 'Failed to update guard');
  }
  return json.data;
}

export async function deleteAdminGuard(guardId: string) {
  const res = await fetchWithAuth(`${API_BASE_URL}/admin/guards/${guardId}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.message || 'Failed to remove guard device');
  }
  return json;
}

// =============================================================
// SECURE PHOTO RETRIEVAL
// =============================================================

export function getSecurePhotoUrl(photoPath?: string): string | undefined {
  if (!photoPath) return undefined;
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://') || photoPath.startsWith('data:')) {
    return photoPath;
  }
  const token = getAdminToken();
  const baseUrl = API_BASE_URL.replace(/\/api$/, '');
  const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
  return token ? `${baseUrl}${cleanPath}?token=${token}` : `${baseUrl}${cleanPath}`;
}

// =============================================================
// SOCIETY SETTINGS (ADMIN)
// =============================================================

export async function fetchAdminSettings() {
  try {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/settings`);
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        localStorage.setItem('gg_admin_society_settings', JSON.stringify(json.data));
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Network issue fetching admin settings, using cached values:', err);
  }

  try {
    const cached = localStorage.getItem('gg_admin_society_settings');
    if (cached) return JSON.parse(cached);
  } catch (_) {}

  return {
    name: 'NexGate Society',
    address: 'Main Gate Boulevard, Tower A-D',
    city: 'Mumbai, MH',
    totalFlats: 120,
  };
}

export async function updateAdminSettings(data: {
  name?: string;
  address?: string;
  city?: string;
  totalFlats?: number | string;
  upiId?: string;
  maintenanceAmount?: number;
  maintenanceDueDay?: number;
  contactEmail?: string;
  contactPhone?: string;
}) {
  try {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/settings`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        localStorage.setItem('gg_admin_society_settings', JSON.stringify(json.data));
        window.dispatchEvent(new CustomEvent('nexgate_society_updated', { detail: json.data }));
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Network issue saving settings to backend, persisting locally:', err);
  }

  // Local fallback storage
  const current = await fetchAdminSettings();
  const updated = { ...current, ...data };
  localStorage.setItem('gg_admin_society_settings', JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('nexgate_society_updated', { detail: updated }));
  return updated;
}




// =============================================================
// SERVICES (ADMIN)
// =============================================================

export interface AdminServiceItem {
  id: string;
  societyId: string;
  name: string;
  category: string;
  serviceType: 'VENDOR' | 'UTILITY' | 'STAFF';
  providerName?: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  description?: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  timing?: string;
  createdAt: string;
}

export async function fetchAdminServices(params: { type?: string; category?: string; search?: string } = {}) {
  const query = new URLSearchParams();
  if (params.type) query.append('type', params.type);
  if (params.category) query.append('category', params.category);
  if (params.search) query.append('search', params.search);

  const url = `${API_BASE_URL}/resident/services?${query.toString()}`;
  try {
    const res = await fetchWithAuth(url);
    if (res.ok) {
      const json = await res.json();
      return (json.data || []) as AdminServiceItem[];
    }
  } catch (err) {
    console.warn('Network issue fetching admin services:', err);
  }
  return [];
}

export async function createAdminService(serviceData: {
  name: string;
  category: string;
  serviceType: 'VENDOR' | 'UTILITY' | 'STAFF';
  providerName?: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  description?: string;
  timing?: string;
  rating?: number;
  isVerified?: boolean;
}) {
  const res = await fetchWithAuth(`${API_BASE_URL}/resident/services`, {
    method: 'POST',
    body: JSON.stringify(serviceData),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to create service');
  }
  return json.data as AdminServiceItem;
}

export async function deleteAdminService(id: string) {
  const res = await fetchWithAuth(`${API_BASE_URL}/resident/services/${id}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to delete service');
  }
  return true;
}

// =============================================================
// COMMUNITY: EVENTS (ADMIN)
// =============================================================

export interface AdminEventItem {
  id: string;
  societyId: string;
  createdBy: string;
  title: string;
  description: string;
  category: string;
  eventDate: string;
  endDate?: string;
  timeStr: string;
  venue: string;
  organizer: string;
  coverImage?: string;
  capacity: number;
  registrationCount: number;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export async function fetchAdminEvents(filter: 'upcoming' | 'past' | 'all' = 'all') {
  const url = `${API_BASE_URL}/resident/community/events?filter=${filter}`;
  try {
    const res = await fetchWithAuth(url);
    if (res.ok) {
      const json = await res.json();
      return (json.data || []) as AdminEventItem[];
    }
  } catch (err) {
    console.warn('Network issue fetching admin events:', err);
  }
  return [];
}

export async function createAdminEvent(eventData: {
  title: string;
  description: string;
  category: string;
  eventDate: string;
  endDate?: string;
  timeStr: string;
  venue: string;
  organizer: string;
  coverImage?: string;
  capacity?: number;
}) {
  const res = await fetchWithAuth(`${API_BASE_URL}/resident/community/events`, {
    method: 'POST',
    body: JSON.stringify(eventData),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to create event');
  }
  return json.data as AdminEventItem;
}

export async function deleteAdminEvent(id: string) {
  const res = await fetchWithAuth(`${API_BASE_URL}/resident/community/events/${id}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to delete event');
  }
  return true;
}

// =============================================================
// COMMUNITY: LOST & FOUND (ADMIN)
// =============================================================

export interface AdminLostFoundItem {
  id: string;
  societyId: string;
  authorId: string;
  authorName: string;
  authorFlat: string;
  authorPhone?: string;
  type: 'LOST' | 'FOUND';
  title: string;
  description: string;
  category: string;
  location: string;
  incidentDate: string;
  imageUrl?: string;
  status: 'ACTIVE' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
}

export async function fetchAdminLostFound(params: { type?: string; status?: string; search?: string } = {}) {
  const query = new URLSearchParams();
  if (params.type) query.append('type', params.type);
  if (params.status) query.append('status', params.status);
  if (params.search) query.append('search', params.search);

  const url = `${API_BASE_URL}/resident/community/lost-found?${query.toString()}`;
  try {
    const res = await fetchWithAuth(url);
    if (res.ok) {
      const json = await res.json();
      return (json.data || []) as AdminLostFoundItem[];
    }
  } catch (err) {
    console.warn('Network issue fetching admin lost & found:', err);
  }
  return [];
}

export async function updateAdminLostFoundStatus(id: string, status: 'ACTIVE' | 'RESOLVED' | 'CLOSED') {
  const res = await fetchWithAuth(`${API_BASE_URL}/resident/community/lost-found/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to update post status');
  }
  return true;
}

export async function deleteAdminLostFound(id: string) {
  const res = await fetchWithAuth(`${API_BASE_URL}/resident/community/lost-found/${id}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to delete post');
  }
  return true;
}

// ==========================================
// MAINTENANCE & DIRECT UPI PAYMENT APIS (₹0 FEE)
// ==========================================

export interface AdminMaintenanceOverview {
  collectedNov: number;
  collectedNovFormatted: string;
  pendingCheck: number;
  unpaidFlats: number;
  gatewayFees: number;
}

export interface VerificationQueueItem {
  paymentId: string;
  invoiceId: string;
  flatNumber: string;
  wing: string;
  residentName: string;
  residentMobile?: string;
  amount: number;
  utr: string;
  screenshotUrl?: string;
  bankMatchStatus: 'FOUND' | 'AMOUNT_SHORT' | 'NOT_YET';
  status: 'PENDING_CHECK' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  verifiedAt?: string;
  receiptNumber?: string;
}

export async function fetchMaintenanceOverview(): Promise<AdminMaintenanceOverview> {
  const res = await fetchWithAuth(`${API_BASE_URL}/maintenance/overview`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to fetch maintenance overview');
  }
  return json.data;
}

// =============================================================
// SUPER ADMIN API METHODS
// =============================================================

export async function fetchSuperAdminSocieties(): Promise<any[]> {
  try {
    const res = await fetchWithAuth(`${API_BASE_URL}/super-admin/societies`);
    if (res.ok) {
      const json = await res.json();
      return json.data || [];
    }
  } catch (err) {
    console.warn('Network issue fetching super admin societies directory:', err);
  }
  return [];
}

export async function fetchSuperAdminStats(): Promise<any> {
  try {
    const res = await fetchWithAuth(`${API_BASE_URL}/super-admin/stats`);
    if (res.ok) {
      const json = await res.json();
      return json.data;
    }
  } catch (err) {
    console.warn('Network issue fetching super admin stats:', err);
  }
  return null;
}

export async function onboardSociety(payload: any): Promise<any> {
  const res = await fetchWithAuth(`${API_BASE_URL}/super-admin/societies/onboard`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Failed to onboard society.');
  }
  return json.data;
}

export async function toggleSocietyStatus(societyId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<any> {
  const res = await fetchWithAuth(`${API_BASE_URL}/super-admin/societies/${societyId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Failed to update society status.');
  }
  return json.data;
}

export async function updateSuperAdminSociety(societyId: string, payload: any): Promise<any> {
  const res = await fetchWithAuth(`${API_BASE_URL}/super-admin/societies/${societyId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Failed to update society details.');
  }
  return json.data;
}

export async function updateSocietyAdminCredentials(
  societyId: string,
  credentials: { email?: string; password?: string; name?: string; mobile?: string }
): Promise<any> {
  const res = await fetchWithAuth(`${API_BASE_URL}/super-admin/societies/${societyId}/admin-credentials`, {
    method: 'PATCH',
    body: JSON.stringify(credentials),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Failed to update admin credentials.');
  }
  return json.data;
}

export async function renewSocietySubscription(societyId: string, payload: { months?: number; planName?: string; paymentMode?: string; referenceId?: string }): Promise<any> {
  const res = await fetchWithAuth(`${API_BASE_URL}/super-admin/societies/${societyId}/renew`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Failed to renew society subscription.');
  }
  return json.data;
}

export async function fetchAdminSubscription(): Promise<any> {
  try {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/subscription`);
    if (res.ok) {
      const json = await res.json();
      return json.data;
    }
  } catch (err) {
    console.warn('Network issue fetching subscription info:', err);
  }
  return null;
}

export async function fetchPublicSocietyBySubdomain(subdomain: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/subdomain/${encodeURIComponent(subdomain)}`);
    if (res.ok) {
      const json = await res.json();
      return json.data;
    }
  } catch (err) {
    console.warn('Network issue looking up society by subdomain:', err);
  }
  return null;
}

export async function fetchSocietyBackup(societyId: string): Promise<any> {
  const res = await fetchWithAuth(`${API_BASE_URL}/super-admin/societies/${societyId}/backup`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Failed to download society backup.');
  }
  return json.data;
}

export async function submitRechargeProof(payload: {
  utrNumber: string;
  screenshotUrl?: string;
  planName?: string;
  amount?: number;
  notes?: string;
}): Promise<any> {
  const res = await fetchWithAuth(`${API_BASE_URL}/admin/subscription/recharge-proof`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Failed to submit recharge verification proof.');
  }
  return json.data;
}

export async function fetchVerificationQueue(status?: string): Promise<VerificationQueueItem[]> {
  const query = status ? `?status=${status}` : '';
  const res = await fetchWithAuth(`${API_BASE_URL}/maintenance/verification-queue${query}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to fetch verification queue');
  }
  return json.data || [];
}

export async function approveMaintenancePayment(paymentId: string): Promise<{ success: boolean; receiptNumber: string; message: string }> {
  const res = await fetchWithAuth(`${API_BASE_URL}/maintenance/approve-payment/${paymentId}`, {
    method: 'POST',
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to approve payment');
  }
  return json.data;
}

export async function rejectMaintenancePayment(paymentId: string, reason: string): Promise<{ success: boolean; message: string }> {
  const res = await fetchWithAuth(`${API_BASE_URL}/maintenance/reject-payment/${paymentId}`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to reject payment');
  }
  return json.data;
}

export async function fetchSocietyUpiConfig(): Promise<{
  merchantVpa: string;
  merchantName: string;
  bankName: string;
  accountNumber: string;
  ifscCode?: string;
  isConfigured: boolean;
}> {
  const res = await fetchWithAuth(`${API_BASE_URL}/maintenance/upi-config`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to fetch UPI config');
  }
  return json.data;
}

export async function setSocietyUpiConfig(data: {
  merchantVpa: string;
  merchantName: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetchWithAuth(`${API_BASE_URL}/maintenance/set-upi`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to set UPI ID');
  }
  return json.data;
}

export async function remindUnpaidResidents(): Promise<{ sentCount: number }> {
  const res = await fetchWithAuth(`${API_BASE_URL}/maintenance/remind-unpaid`, {
    method: 'POST',
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to send reminders');
  }
  return json.data;
}

export async function uploadBankStatementFile(file: File): Promise<{ matchedCount: number; shortAmountCount: number; totalProcessed: number }> {
  const formData = new FormData();
  formData.append('statement', file);

  const res = await fetchWithAuth(`${API_BASE_URL}/maintenance/upload-statement`, {
    method: 'POST',
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to upload statement');
  }
  return json.data;
}

export async function downloadMaintenanceLedger(): Promise<void> {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE_URL}/maintenance/export-ledger`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error('Failed to download ledger');
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `maintenance_ledger_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function markAdminFlatPaid(flatId: string) {
  const res = await fetchWithAuth(`${API_BASE_URL}/maintenance/admin/mark-paid/${flatId}`, {
    method: 'POST',
  });
  return res.json();
}

export async function remindAdminFlatResident(flatId: string) {
  const res = await fetchWithAuth(`${API_BASE_URL}/maintenance/admin/remind-flat/${flatId}`, {
    method: 'POST',
  });
  return res.json();
}

export async function editAdminMaintenanceAmount(targetId: string, newAmount: number) {
  const res = await fetchWithAuth(`${API_BASE_URL}/maintenance/admin/edit-amount`, {
    method: 'POST',
    body: JSON.stringify({ targetId, newAmount }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Failed to update maintenance amount');
  return json;
}

export async function resetAdminPayment(targetId: string) {
  const res = await fetchWithAuth(`${API_BASE_URL}/maintenance/admin/reset-payment`, {
    method: 'POST',
    body: JSON.stringify({ targetId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Failed to reset payment');
  return json;
}

export async function fetchRechargeHistory(): Promise<any[]> {
  try {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/subscription/recharges`);
    if (res.ok) {
      const json = await res.json();
      return json.data || [];
    }
  } catch (err) {
    console.warn('Network issue fetching recharge history:', err);
  }
  return [];
}

import { getStoredToken } from './authSession';

function resolveApiBaseUrl(): string {
  let url = import.meta.env.VITE_API_URL || 'https://society-d521.onrender.com/api';
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
    url = url.replace(/^http:\/\//, 'https://');
  }
  if (url.includes('.onrender.com') && url.startsWith('http://')) {
    url = url.replace(/^http:\/\//, 'https://');
  }
  return url;
}

const API_BASE_URL = resolveApiBaseUrl();

export class ApiError extends Error {
  code?: string;
  status?: number;
  data?: any;
  constructor(message: string, code?: string, status?: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

async function handleResponse(res: Response) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const errorObj = json.error || {};
    const code = errorObj.code || (res.status === 404 ? 'NOT_FOUND' : res.status === 409 ? 'STATE_CONFLICT' : 'API_ERROR');
    const message = errorObj.message || json.message || `Request failed with status ${res.status}`;
    throw new ApiError(message, code, res.status, errorObj.data);
  }
  return json;
}

// =============================================================
// AUTH API METHODS
// =============================================================

export async function sendOtp(mobile: string) {
  const cleanMobile = mobile.replace(/\D/g, '');
  const res = await fetch(`${API_BASE_URL}/auth/resident/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: cleanMobile }),
  });
  return handleResponse(res);
}

export async function verifyOtp(mobile: string, otp: string) {
  const cleanMobile = mobile.replace(/\D/g, '');
  const res = await fetch(`${API_BASE_URL}/auth/resident/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: cleanMobile, otp }),
  });
  return handleResponse(res);
}

export async function fetchRegistrationFlats(societyId: string = 'soc_greengate') {
  const res = await fetch(`${API_BASE_URL}/auth/registration/flats?societyId=${societyId}`);
  const json = await handleResponse(res);
  return json.data;
}

export async function checkRegistrationStatus(mobile: string) {
  const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
  const res = await fetch(`${API_BASE_URL}/auth/registration/status?mobile=${cleanMobile}`);
  const json = await handleResponse(res);
  return json.data;
}

export async function submitRegistration(payload: {
  mobile: string;
  wing: string;
  floor: number;
  flatNumber: string;
  flatId?: string;
  name?: string;
  societyId?: string;
}) {
  const res = await fetch(`${API_BASE_URL}/auth/registration/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function fetchCurrentUser() {
  const token = getStoredToken();
  if (!token) return null;

  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await handleResponse(res);
  return json.data;
}

// =============================================================
// VISITOR REQUESTS API METHODS
// =============================================================

export async function fetchVisitorRequests() {
  const token = getStoredToken();
  if (!token) throw new ApiError('Authentication token missing', 'UNAUTHORIZED', 401);

  const res = await fetch(`${API_BASE_URL}/visitor-requests`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await handleResponse(res);
  return json.data || [];
}

export async function approveVisitorRequest(requestId: string) {
  const token = getStoredToken();
  if (!token) throw new ApiError('Authentication token missing', 'UNAUTHORIZED', 401);

  const res = await fetch(`${API_BASE_URL}/visitor-requests/${requestId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function rejectVisitorRequest(requestId: string, reason?: string) {
  const token = getStoredToken();
  if (!token) throw new ApiError('Authentication token missing', 'UNAUTHORIZED', 401);

  const res = await fetch(`${API_BASE_URL}/visitor-requests/${requestId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });
  const json = await handleResponse(res);
  return json.data;
}

export async function fetchVisitorRequestById(requestId: string) {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/visitor-requests/${requestId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (e) {
    return null;
  }
}

export function getSecurePhotoUrl(photoPath?: string): string | undefined {
  if (!photoPath) return undefined;
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://') || photoPath.startsWith('data:')) {
    return photoPath;
  }
  const token = getStoredToken();
  const baseUrl = API_BASE_URL.replace(/\/api$/, '');
  const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
  return token ? `${baseUrl}${cleanPath}?token=${token}` : `${baseUrl}${cleanPath}`;
}

// =============================================================
// NOTIFICATIONS API METHODS
// =============================================================

export async function fetchNotifications() {
  const token = getStoredToken();
  if (!token) return [];

  try {
    const res = await fetch(`${API_BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (e) {
    return [];
  }
}

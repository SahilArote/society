import { authSession } from './authSession';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

function getAuthHeaders(): Record<string, string> {
  const token = authSession.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function getSecurePhotoUrl(photoUrl?: string): string | undefined {
  if (!photoUrl) return undefined;
  let url = photoUrl;
  if (url.startsWith('/')) {
    url = `${BACKEND_BASE}${url}`;
  }
  const token = authSession.getToken();
  if (token && url.includes('/api/visitor-requests/')) {
    const separator = url.includes('?') ? '&' : '?';
    if (!url.includes('token=')) {
      url = `${url}${separator}token=${encodeURIComponent(token)}`;
    }
  }
  return url;
}

export async function sendResidentOtp(mobile: string) {
  const cleanMobile = mobile.replace(/\D/g, '');
  const res = await fetch(`${API_BASE_URL}/auth/resident/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: cleanMobile }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Failed to send OTP');
  }
  return json;
}

export async function verifyResidentOtp(mobile: string, otp: string) {
  const cleanMobile = mobile.replace(/\D/g, '');
  const res = await fetch(`${API_BASE_URL}/auth/resident/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: cleanMobile, otp: otp.trim() }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Invalid or expired OTP');
  }
  return json;
}

export async function fetchVisitorRequests() {
  try {
    const res = await fetch(`${API_BASE_URL}/visitor-requests`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch visitor requests from API:', err);
    return null;
  }
}

export async function fetchVisitorRequestById(requestId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/visitor-requests/${requestId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error(`Failed to fetch visitor request ${requestId}:`, err);
    return null;
  }
}

export async function approveVisitorRequest(requestId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/visitor-requests/${requestId}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `HTTP error ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error(`Failed to approve request ${requestId}:`, err);
    throw err;
  }
}

export async function rejectVisitorRequest(requestId: string, reason?: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/visitor-requests/${requestId}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `HTTP error ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error(`Failed to reject request ${requestId}:`, err);
    throw err;
  }
}


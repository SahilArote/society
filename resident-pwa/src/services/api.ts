import { authSession } from './authSession';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getAuthHeaders() {
  const token = authSession.getToken() || 'demo_resident_token';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function sendOtp(mobile: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile }),
    });
    const json = await res.json();
    return json;
  } catch (err) {
    console.error('Failed to send OTP:', err);
    return { success: false, error: { message: 'Network error sending OTP' } };
  }
}

export async function loginResident(mobile: string, otp: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, otp, role: 'RESIDENT' }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Login failed (${res.status})`);
    }
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error('Failed to login resident:', err);
    throw err;
  }
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

export async function createVisitorInvite(payload: {
  name: string;
  mobile?: string;
  purpose?: string;
  visitorType?: string;
  vehicleNumber?: string;
  expectedAt?: string;
}) {
  try {
    const res = await fetch(`${API_BASE_URL}/visitor-requests/invite`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error('Failed to create visitor invite:', err);
    throw err;
  }
}

export async function fetchAnnouncements() {
  try {
    const res = await fetch(`${API_BASE_URL}/announcements`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch announcements:', err);
    return [];
  }
}

export async function fetchNotifications() {
  try {
    const res = await fetch(`${API_BASE_URL}/notifications`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    return [];
  }
}

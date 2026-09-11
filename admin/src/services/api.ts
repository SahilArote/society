const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function getAdminToken(): string | null {
  return localStorage.getItem('gg_admin_token') || 'admin_token';
}

export function setAdminSession(token: string, user: any) {
  localStorage.setItem('gg_admin_token', token);
  localStorage.setItem('gg_admin_user', JSON.stringify(user));
  localStorage.setItem('gg_admin_auth', 'true');
}

export function clearAdminSession() {
  localStorage.removeItem('gg_admin_token');
  localStorage.removeItem('gg_admin_user');
  localStorage.removeItem('gg_admin_auth');
}

export function getAdminUser(): any | null {
  try {
    const raw = localStorage.getItem('gg_admin_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAuthHeaders(): HeadersInit {
  const token = getAdminToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function loginAdmin(email: string, password: string): Promise<{ success: boolean; token?: string; user?: any; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || 'Invalid email or password' };
    }
    const token = json.data?.token;
    const user = json.data?.user;
    if (token) {
      setAdminSession(token, user);
    }
    return { success: true, token, user };
  } catch (err: any) {
    console.error('Admin login error:', err);
    return { success: false, error: err.message || 'Connection failed to backend' };
  }
}

export async function fetchAdminStats() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/stats`, {
      headers: getAuthHeaders(),
    });
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
    const res = await fetch(`${API_BASE_URL}/admin/activity`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch admin activity:', err);
    return [];
  }
}

export async function fetchDirectoryFlats() {
  try {
    const res = await fetch(`${API_BASE_URL}/directory/flats`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch directory flats:', err);
    return null;
  }
}

export async function fetchDirectoryGates() {
  try {
    const res = await fetch(`${API_BASE_URL}/directory/gates`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch directory gates:', err);
    return null;
  }
}

export async function fetchDirectoryGuards() {
  try {
    const res = await fetch(`${API_BASE_URL}/directory/guards`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch directory guards:', err);
    return null;
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
    return null;
  }
}

export async function createAnnouncementApi(data: { title: string; body: string; priority?: string; target?: string }) {
  try {
    const res = await fetch(`${API_BASE_URL}/announcements`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error('Failed to create announcement:', err);
    return null;
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
    return null;
  }
}

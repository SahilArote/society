const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function getAdminToken(): string | null {
  return localStorage.getItem('gg_admin_token');
}

export function setAdminSession(token: string, adminUser: any) {
  localStorage.setItem('gg_admin_token', token);
  localStorage.setItem('gg_admin_user', JSON.stringify(adminUser));
  localStorage.setItem('gg_admin_auth', 'true');
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
  const res = await fetch(`${API_BASE_URL}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password: password.trim() }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Invalid admin credentials');
  }
  setAdminSession(json.token, json.admin);
  return json;
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


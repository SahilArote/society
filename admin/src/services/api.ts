const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const AUTH_TOKEN = 'admin_token';

export async function fetchAdminStats() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
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
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch admin activity:', err);
    return [];
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const AUTH_TOKEN = 'resident_token'; // Demo resident token

export async function fetchVisitorRequests() {
  try {
    const res = await fetch(`${API_BASE_URL}/visitor-requests`, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch visitor requests from API:', err);
    return null;
  }
}

export async function approveVisitorRequest(requestId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/visitor-requests/${requestId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error(`Failed to reject request ${requestId}:`, err);
    throw err;
  }
}

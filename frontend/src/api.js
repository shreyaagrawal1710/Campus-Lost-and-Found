// One place for every backend call. Expects the agreed response shape:
//   success: { success: true, data: ... }
//   error:   { success: false, message: "..." }
const BASE = '/api';

export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON response */ }
  if (!res.ok || !json || json.success === false) {
    throw new Error(json?.message || json?.error || `Request failed (${res.status})`);
  }
  return json.data;
}

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

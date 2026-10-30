/**
 * Auth API client for User Login & Logout
 */

export async function loginTeam(team_name, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ team_name, password }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.detail?.message || 'Login failed');
    error.code = data.detail?.code || 'UNKNOWN';
    error.detail = data.detail;
    throw error;
  }

  return data;
}

export async function logoutTeam() {
  const res = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
  return res.json().catch(() => ({ ok: true }));
}

export async function logoutAllDevices(team_name, password) {
  const res = await fetch('/api/auth/logout-all', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ team_name, password }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.detail?.message || 'Logout failed');
    error.code = data.detail?.code || 'UNKNOWN';
    error.detail = data.detail;
    throw error;
  }

  return data;
}

export async function checkAuthStatus() {
  const res = await fetch('/api/auth/me', {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) {
    return null;
  }
  return res.json().catch(() => null);
}

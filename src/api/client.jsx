export async function apiRequest(path, { method = "GET", body } = {}) {
  // Get auth token from localStorage
  const token = localStorage.getItem('auth_token');

  const headers = {};

  // Add auth header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add content-type for requests with body
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(path, {
    method,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // If unauthorized, redirect to login
    if (res.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    const text = await res.text();
    throw new Error(text || `Request failed with ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

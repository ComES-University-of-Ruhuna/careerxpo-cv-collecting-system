import { API_BASE_URL } from './constants';

/**
 * Thin fetch wrapper that:
 *  - prefixes the configured API base URL
 *  - attaches the bearer token when provided
 *  - throws Error with the server's `error` message on non-2xx responses
 *
 * Consumers pass the JWT explicitly (from useAuth) so this module has no
 * dependency on React context.
 */
export async function apiFetch(path, { token, method = 'GET', body, headers, ...rest } = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  const finalHeaders = { ...(headers || {}) };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  let payload = body;
  if (body && !(body instanceof FormData) && typeof body === 'object') {
    finalHeaders['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body: payload,
    ...rest,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

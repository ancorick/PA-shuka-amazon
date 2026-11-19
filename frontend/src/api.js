// The ONLY place the frontend talks to the network. Every call goes to /api/... —
// Netlify (prod) or Vite (dev) proxies it to the backend. No secrets, no database here.

export class ApiError extends Error {
  constructor(status, code, message, data = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
    this.fields = data.fields || {};
  }
}

const listeners = new Set();
/** Subscribe to "server is waking up" state changes (Render free tier cold start). */
export function onWaking(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const setWaking = (v) => listeners.forEach((fn) => fn(v));

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function api(path, { method = 'GET', body, form, signal } = {}) {
  const opts = { method, credentials: 'include', headers: { Accept: 'application/json' }, signal };
  if (form) opts.body = form;
  else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  // GETs are retried while the backend wakes up (502/503/504 from the proxy or a network error).
  const attempts = method === 'GET' ? 8 : 1;
  let res;
  for (let i = 0; i < attempts; i++) {
    try {
      res = await fetch(`/api${path}`, opts);
      if (![502, 503, 504].includes(res.status) || i === attempts - 1) break;
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      if (i === attempts - 1) {
        setWaking(false);
        throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and try again.');
      }
    }
    setWaking(true);
    await wait(4000);
  }
  setWaking(false);

  if (res.status === 204) return null;
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const e = data?.error || {};
    if (res.status === 401 && onUnauthorized && !path.startsWith('/auth/')) onUnauthorized();
    throw new ApiError(res.status, e.code || 'ERROR', e.message || `Request failed (${res.status}).`, e);
  }
  return data;
}

export const get = (path, opts) => api(path, opts);
export const post = (path, body) => api(path, { method: 'POST', body });
export const put = (path, body) => api(path, { method: 'PUT', body });
export const patch = (path, body) => api(path, { method: 'PATCH', body });
export const del = (path) => api(path, { method: 'DELETE' });
export const upload = (path, form) => api(path, { method: 'POST', form });

import { API_BASE } from './config.js';

const TOKEN_KEY = 'favorita:token';

/* ---------- Token storage ---------- */
export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* storage blocked */ }
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
}

/* ---------- A standard error shape ---------- */
// Every failed request throws an ApiError, so the rest of the app handles
// one kind of error. When the server names a field ("details"), we keep it,
// so the form can show the message next to the right input.
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;     // 0 means "never reached the server"
    this.details = details;
    const [field] = Object.keys(details ?? {});
    if (field) {
      this.field = field;
      this.message = details[field];
    }
  }
}

/* ---------- The one function that talks to the server ---------- */
// request('GET', '/users/me')
// request('POST', '/auth/login', { username, password }, { auth: false })
export async function request(method, path, body, { auth = true } = {}) {
  const headers = {};
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    // fetch only throws when the request never got an answer (server down, offline).
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }

  if (response.status === 204) return null;   // success with no body (e.g. DELETE)

  let payload = null;
  try { payload = await response.json(); } catch { /* not JSON */ }

  if (!response.ok) {
    // We SENT a token and the server says it's no good: the session is over.
    // Forget the token and tell the rest of the app.
    if (response.status === 401 && token) {
      clearToken();
      document.dispatchEvent(new CustomEvent('auth:expired'));
    }
    const error = payload?.error;
    throw new ApiError(response.status, error?.message ?? 'Something went wrong.', error?.details);
  }

  return payload;   // { data: ... }
}
import { request, getToken, setToken, clearToken } from './api.js';

let cachedUser = null;   // the logged-in user, remembered so other modules can read it synchronously

/* ---------- Register, log in, log out ---------- */
export async function register({ name, username, email, password }) {
  const { data } = await request('POST', '/auth/register',
    { name, username, email, password }, { auth: false });
  setToken(data.token);
  cachedUser = data.user;
  return data.user;
}

export async function login({ username, password }) {
  const { data } = await request('POST', '/auth/login', { username, password }, { auth: false });
  setToken(data.token);
  cachedUser = data.user;
  return data.user;
}

// "Logging out" is forgetting the token. The server keeps no session to end.
export async function logout() {
  clearToken();
  cachedUser = null;
}

// Ends every session on every device, then forgets this one too.
export async function logoutEverywhere() {
  await request('POST', '/auth/logout-all');
  await logout();
}

/* ---------- Who am I? ---------- */
// No token → nobody is logged in (no request needed).
// Token → ask the server. A 401 means it was expired or revoked.
export async function getCurrentUser() {
  if (!getToken()) {
    cachedUser = null;
    return null;
  }
  try {
    const { data } = await request('GET', '/users/me');
    cachedUser = data;
    return data;
  } catch (error) {
    if (error.status === 401) {
      cachedUser = null;
      return null;
    }
    throw error;   // server down etc.: let the caller decide
  }
}

/* ---------- Update my account ---------- */
export async function updateProfile({ name, email, bio = '', avatar = '' }) {
  const { data } = await request('PUT', '/users/me', { name, email, bio, avatar });
  cachedUser = data;
  return data;
}

export async function changeUsername({ username }) {
  const { data } = await request('PUT', '/users/me/username', { username });
  cachedUser = data;
  return data;
}

export async function changePassword({ currentPassword, newPassword }) {
  const { data } = await request('PUT', '/auth/password', { currentPassword, newPassword });
  setToken(data.token);   // the server revoked our OLD token, so we keep the fresh one
}

// Synchronous access to the logged-in user (set by login, getCurrentUser, and the update functions).
export const getCachedUser = () => cachedUser;
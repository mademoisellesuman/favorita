import { parseHttps } from './product.js';

// "me" would clash with the /users/me route. The others avoid impersonation.
const RESERVED_USERNAMES = ['me', 'admin', 'root', 'api', 'support', 'glow'];

const asObject = (body) =>
  body && typeof body === 'object' && !Array.isArray(body) ? body : {};

// Checks one username string. Returns an error message or null.
export function usernameError(value) {
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(value)) {
    return 'Username must be 3–20 characters: letters, numbers, or underscores.';
  }
  if (RESERVED_USERNAMES.includes(value.toLowerCase())) {
    return 'That username is reserved.';
  }
  return null;
}

// For PUT /api/users/me. Returns { value, errors }.
export function validateProfile(body) {
  const input = asObject(body);
  const errors = {};

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (name.length < 1 || name.length > 50) errors.name = 'Name must be 1–50 characters.';

  const email = typeof input.email === 'string' ? input.email.trim() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  const bio = typeof input.bio === 'string' ? input.bio.trim() : '';
  if (input.bio !== undefined && typeof input.bio !== 'string') errors.bio = 'Bio must be text.';
  else if (bio.length > 160) errors.bio = 'Bio must be 160 characters or fewer.';

  let avatar = '';
  if (input.avatar !== undefined && input.avatar !== '') {
    const url = parseHttps(input.avatar);
    if (url) avatar = url.href;
    else errors.avatar = 'Profile picture must be a full https:// link, or empty.';
  }

  return { errors, value: { name, email, bio, avatar } };
}

// For PUT /api/users/me/username.
export function validateUsername(body) {
  const input = asObject(body);
  const username = typeof input.username === 'string' ? input.username.trim() : '';
  const message = usernameError(username);
  return { errors: message ? { username: message } : {}, value: { username } };
}
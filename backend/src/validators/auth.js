import { validateProfile, usernameError } from './user.js';

const asObject = (body) =>
  body && typeof body === 'object' && !Array.isArray(body) ? body : {};

export function passwordError(value) {
  if (typeof value !== 'string') return 'Password is required.';
  if (value.length < 8) return 'Password must be at least 8 characters.';
  // bcrypt reads at most 72 BYTES, and emoji or accented letters take several bytes each.
  if (Buffer.byteLength(value, 'utf8') > 72) return 'Password is too long (72 bytes maximum).';
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return 'Password must include at least one letter and one number.';
  }
  return null;   // note: we do NOT trim passwords
}

// POST /api/auth/register
export function validateRegistration(body) {
  const input = asObject(body);

  // Reuse the profile rules for name and email.
  const { value: profile, errors } = validateProfile({ name: input.name, email: input.email });

  const username = typeof input.username === 'string' ? input.username.trim() : '';
  const usernameMessage = usernameError(username);
  if (usernameMessage) errors.username = usernameMessage;

  const passwordMessage = passwordError(input.password);
  if (passwordMessage) errors.password = passwordMessage;

  return {
    errors,
    // We pick exactly four fields. Anything else in the body (like "tokenVersion")
    // is ignored.
    value: { name: profile.name, email: profile.email, username, password: input.password }
  };
}

// POST /api/auth/login. Only checks "is it present"; it never reveals our password rules.
export function validateLogin(body) {
  const input = asObject(body);
  const username = typeof input.username === 'string' ? input.username.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';

  const errors = {};
  if (!username || username.length > 50) errors.username = 'Enter your username.';
  if (!password || password.length > 128) errors.password = 'Enter your password.';
  return { errors, value: { username, password } };
}

// PUT /api/auth/password
export function validatePasswordChange(body) {
  const input = asObject(body);
  const currentPassword = typeof input.currentPassword === 'string' ? input.currentPassword : '';
  const errors = {};

  if (!currentPassword || currentPassword.length > 128) {
    errors.currentPassword = 'Enter your current password.';
  }
  const message = passwordError(input.newPassword);
  if (message) errors.newPassword = message;
  else if (input.newPassword === currentPassword) {
    errors.newPassword = 'New password must be different from the current one.';
  }
  return { errors, value: { currentPassword, newPassword: input.newPassword } };
}
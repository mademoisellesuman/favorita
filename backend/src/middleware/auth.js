import { User } from '../models/User.js';
import { HttpError } from '../utils/httpError.js';
import { verifyToken } from '../utils/auth.js';

// Runs on every /api request. Sets req.user (or null). Never throws for a bad token.
export async function authenticate(req, res, next) {
  req.user = null;
  req.sessionExpired = false;

  const header = req.get('authorization');
  if (!header) return next();                       // anonymous visitor

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    req.sessionExpired = true;
    return next();
  }

  let payload;
  try {
    payload = verifyToken(token);                   // checks signature AND expiry
  } catch {
    req.sessionExpired = true;
    return next();
  }

  // The database lookup is outside the try/catch on purpose: if the database is
  // down we want a 500, not a silent "your session expired".
  const user = await User.findById(payload.sub);
  if (user && user.tokenVersion === payload.tv) req.user = user;
  else req.sessionExpired = true;                   // deleted user, or token revoked

  next();
}

// Put in front of any route that needs a logged-in user.
export function requireUser(req, res, next) {
  if (!req.user) {
    throw new HttpError(
      401,
      req.sessionExpired ? 'Your session has expired. Please log in again.' : 'Please log in first.'
    );
  }
  next();
}
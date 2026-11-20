import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Read settings when called (not at import time), so .env is always loaded first.
const cost = () => Number(process.env.BCRYPT_COST) || 12;

/* ---------- Passwords ---------- */
export const hashPassword = (plain) => bcrypt.hash(plain, cost());

// A real hash of a throwaway string, used when the username doesn't exist.
let dummyHash;

// Returns true only if `plain` matches `hash`.
// If there is no hash (unknown user) we still do a full comparison against the
// dummy, so a login takes the same time whether or not the username exists.
// Otherwise response time would reveal which usernames are real.
export async function checkPassword(plain, hash) {
  dummyHash ??= await bcrypt.hash('placeholder-password', cost());
  const matches = await bcrypt.compare(plain, hash ?? dummyHash);
  return Boolean(hash) && matches;
}

/* ---------- Tokens ---------- */
export function signToken(user) {
  return jwt.sign({ tv: user.tokenVersion }, process.env.JWT_SECRET, {
    subject: user.id,                                   // who the token is for
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    algorithm: 'HS256'
  });
}

// Throws if the signature is wrong, the token is malformed, or it has expired.
export function verifyToken(token) {
  // Pin the algorithm so a token can't pick its own (the old "alg: none" trick).
  return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
}

// Called once at startup so a missing secret fails loudly, not on the first login.
export function assertAuthConfig() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET is missing or too short (use 32+ characters). See .env.example.');
  }
}
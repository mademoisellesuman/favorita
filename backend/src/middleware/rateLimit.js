import { rateLimit } from 'express-rate-limit';

const make = (options) =>
  rateLimit({
    standardHeaders: 'draft-7',     // sends RateLimit-* headers so clients can see the limits
    legacyHeaders: false,
    message: { error: { message: 'Too many attempts. Please try again later.' } },
    ...options
  });

// 10 FAILED attempts per 15 minutes per IP. Successful logins aren't counted.
export const loginLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true
});

// 10 new accounts per hour per IP.
export const registerLimiter = make({ windowMs: 60 * 60 * 1000, limit: 10 });

// A broad safety net for the whole API: 300 requests per 15 minutes per IP.
export const apiLimiter = make({ windowMs: 15 * 60 * 1000, limit: 300 });
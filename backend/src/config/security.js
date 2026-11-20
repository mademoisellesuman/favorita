import helmet from 'helmet';
import cors from 'cors';

const isProd = process.env.NODE_ENV === 'production';

/* ---------- Security headers (Helmet) ---------- */
// The CSP lists where each kind of resource may come from.
// Anything not listed is blocked by the browser.
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],                                   // our own JS files only; no inline scripts
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],    // our CSS + Google Fonts CSS
      styleSrcAttr: ["'unsafe-inline'"],                       // our cards use style="background:…"
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],                   // users supply https image links
      connectSrc: ["'self'"],                                  // fetch() only to ourselves
      objectSrc: ["'none'"],                                   // no plugins
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],                              // nobody may put us in an iframe
      // Helmet turns this on by default; it breaks plain-http localhost in some browsers.
      ...(isProd ? {} : { upgradeInsecureRequests: null })
    }
  },
  // Lets your frontend (on another domain) use the API's responses.
  crossOriginResourcePolicy: { policy: 'cross-origin' }
});

/* ---------- CORS allow-list ---------- */
// CORS_ORIGINS="https://favorita.vercel.app,http://localhost:5500"
// Exact origins only: scheme + host + port, no path, no trailing slash.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

export const corsMiddleware = cors({
  origin(origin, callback) {
    // No Origin header = not a cross-site browser request (same-origin page,
    // curl, REST Client). CORS doesn't apply, so let it through.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, false);   // no CORS headers → the browser blocks the response
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600   // browsers may cache the preflight answer for 10 minutes
});
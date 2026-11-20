import { createHmac } from 'node:crypto';
import { Product } from '../models/Product.js';
import { Click, DEDUPE_MINUTES } from '../models/Click.js';
import { HttpError } from '../utils/httpError.js';
import { assertId } from '../utils/ids.js';
import { PLATFORM_HOSTS } from '../config/constants.js';
import { parseHttps, hostMatches } from '../validators/product.js';

// Crawlers and link-preview fetchers. Best-effort: a User-Agent can be faked.
const BOT_PATTERN = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|curl|wget|python-requests|httpclient/i;
const looksLikeBot = (userAgent) => !userAgent || BOT_PATTERN.test(userAgent);

// An anonymous fingerprint: a keyed hash of IP + browser, never the IP itself.
const visitorId = (req) =>
  createHmac('sha256', process.env.JWT_SECRET)
    .update(`${req.ip}|${req.get('user-agent') ?? ''}`)
    .digest('hex')
    .slice(0, 32);

// Re-check the stored link right before redirecting.
function safeDestination(url, platform) {
  const parsed = parseHttps(url);
  return parsed && hostMatches(parsed.hostname, PLATFORM_HOSTS[platform]) ? parsed.href : null;
}

async function recordClick(req, product, platform) {
  const bucket = Math.floor(Date.now() / (DEDUPE_MINUTES * 60 * 1000));
  try {
    await Click.create({
      product: product._id,
      owner: product.owner,
      platform,
      visitor: visitorId(req),
      bucket
    });
  } catch (error) {
    // 11000 = this visitor already clicked in this window. Don't count it twice.
    if (error.code !== 11000) throw error;
  }
}

/* ---------- GET /api/go/:productId/:platform ---------- */
export async function goToShop(req, res) {
  const { productId, platform } = req.params;

  assertId(productId, 'Link not found.');
  if (!Object.hasOwn(PLATFORM_HOSTS, platform)) throw new HttpError(404, 'Link not found.');

  const product = await Product.findById(productId).select('owner links');
  const link = product?.links.find((l) => l.platform === platform);
  const destination = link ? safeDestination(link.url, platform) : null;
  if (!destination) throw new HttpError(404, 'Link not found.');

  // Count it, but never let counting get in the way of the shopper.
  if (req.method === 'GET' && !looksLikeBot(req.get('user-agent'))) {
    try {
      await recordClick(req, product, platform);
    } catch (error) {
      console.error('Could not record click:', error);
    }
  }

  res.set('Cache-Control', 'no-store');
  res.redirect(302, destination);
}
import { CATEGORIES, ORIGINS, MAX_LINKS, PLATFORM_HOSTS } from '../config/constants.js';

export function parseHttps(value) {
  if (typeof value !== 'string' || value.length > 500) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

// Exact domain or a subdomain of it, so "shopee.ph.evil.com" is rejected.
export function hostMatches(hostname, domains) {
  const host = hostname.toLowerCase();
  return domains.some((d) => host === d || host.endsWith('.' + d));
}

export function checkLinks(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return { error: 'Add at least one shopping link.' };
  if (raw.length > MAX_LINKS) return { error: `You can add at most ${MAX_LINKS} links.` };

  const seen = new Set();
  const links = [];

  for (const item of raw) {
    const platform = item?.platform;
    // Object.hasOwn ignores inherited keys like "constructor".
    if (typeof platform !== 'string' || !Object.hasOwn(PLATFORM_HOSTS, platform)) {
      return { error: 'Each link needs a platform: shopee, lazada, or tiktok.' };
    }
    if (seen.has(platform)) return { error: `Only one ${platform} link is allowed.` };
    seen.add(platform);

    const url = parseHttps(item.url);
    if (!url) return { error: `The ${platform} link must be a full https:// URL.` };
    if (!hostMatches(url.hostname, PLATFORM_HOSTS[platform])) {
      return { error: `The ${platform} link doesn't look like a ${platform} URL.` };
    }
    links.push({ platform, url: url.href });
  }
  return { links };
}

// Takes the untrusted request body. Returns { value, errors }:
// `value` contains ONLY the fields we chose to keep; `errors` maps field → message.
export function validateProduct(body) {
  const input = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const errors = {};

  const text = (key, min, max, label) => {
    const value = typeof input[key] === 'string' ? input[key].trim() : '';
    if (value.length < min || value.length > max) {
      errors[key] = `${label} must be ${min}–${max} characters.`;
    }
    return value;
  };

  const name = text('name', 2, 80, 'Name');
  const brand = text('brand', 1, 40, 'Brand');
  const description = text('description', 10, 300, 'Description');

  if (!CATEGORIES.includes(input.category)) errors.category = `Category must be one of: ${CATEGORIES.join(', ')}.`;
  if (!ORIGINS.includes(input.origin)) errors.origin = `Origin must be one of: ${ORIGINS.join(', ')}.`;

  const price = input.price;
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || price > 1_000_000) {
    errors.price = 'Price must be a number greater than 0.';
  }

  let image = '';
  if (input.image !== undefined && input.image !== '') {
    const url = parseHttps(input.image);
    if (url) image = url.href;
    else errors.image = 'Image must be a full https:// link, or empty.';
  }

  const { links, error: linksError } = checkLinks(input.links);
  if (linksError) errors.links = linksError;

  return {
    errors,
    value: {
      name, brand, description,
      category: input.category,
      origin: input.origin,
      price: typeof price === 'number' ? Math.round(price * 100) / 100 : price,
      image,
      links
    }
  };
}
// Each rule receives the field's value (and all form values) and returns
// an error message string, or null if the value is fine.

function passwordRule(value) {
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (value.length > 72) return 'Password must be 72 characters or fewer.';
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return 'Password must include at least one letter and one number.';
  }
  return null;
}

const required = (message) => (value) => (value ? null : message);

/* ---------- Link helpers ---------- */

// A link is accepted if its host is one of these domains or a subdomain of one
// (for example "s.lazada.com.ph"). If a genuine affiliate link is rejected, its
// short-link domain probably needs adding here.
export const PLATFORM_HOSTS = {
  shopee: ['shopee.ph', 'shp.ee'],
  lazada: ['lazada.com.ph', 'lzd.co'],
  tiktok: ['tiktok.com']
};

function parseHttps(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function hostMatches(hostname, domains) {
  const host = hostname.toLowerCase();
  return domains.some((d) => host === d || host.endsWith('.' + d));
}

const optionalHttpsUrl = (message) => (v) =>
  v === '' || parseHttps(v) ? null : message;

const linkRule = (platform, label) => (v) => {
  if (v === '') return null; // each link is optional on its own
  const url = parseHttps(v);
  if (!url) return `Enter a full https:// link for ${label}.`;
  return hostMatches(url.hostname, PLATFORM_HOSTS[platform])
    ? null
    : `That doesn't look like a ${label} link.`;
};

/* ---------- Rules ---------- */
const rules = {
  name: (v) =>
    v.length >= 1 && v.length <= 50 ? null : 'Name must be 1–50 characters.',

  username: (v) =>
    /^[a-zA-Z0-9_]{3,20}$/.test(v)
      ? null
      : 'Username must be 3–20 characters: letters, numbers, or underscores.',

  email: (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Enter a valid email address.',

  bio: (v) => (v.length <= 160 ? null : 'Bio must be 160 characters or fewer.'),
  avatar: optionalHttpsUrl('Profile picture must be a full https:// link, or leave it empty.'),

  password: passwordRule,
  newPassword: passwordRule,

  confirmPassword: (v, all) =>
    v === (all.password ?? all.newPassword) ? null : 'Passwords do not match.',

  loginUsername: required('Enter your username.'),
  loginPassword: required('Enter your password.'),
  currentPassword: required('Enter your current password.'),

  // Recommendation form
  productName: (v) =>
    v.length >= 2 && v.length <= 80 ? null : 'Product name must be 2–80 characters.',
  brand: (v) =>
    v.length >= 1 && v.length <= 40 ? null : 'Brand must be 1–40 characters.',
  category: (v) =>
    ['skincare', 'makeup'].includes(v) ? null : 'Choose a category.',
  origin: (v) =>
    ['local', 'international'].includes(v) ? null : 'Choose local or international.',
  price: (v) => {
    const n = Number(v);
    return v !== '' && Number.isFinite(n) && n > 0 && n <= 1000000
      ? null
      : 'Enter a price greater than 0.';
  },
  image: optionalHttpsUrl('Image must be a full https:// link, or leave it empty.'),
  description: (v) =>
    v.length >= 10 && v.length <= 300 ? null : 'Description must be 10–300 characters.',

  linkShopee: linkRule('shopee', 'Shopee'),
  linkLazada: linkRule('lazada', 'Lazada'),
  linkTiktok: linkRule('tiktok', 'TikTok Shop'),

  // Cross-field rule: needs to look at ALL the values, not just one.
  links: (v, all) =>
    all.linkShopee || all.linkLazada || all.linkTiktok
      ? null
      : 'Add at least one shopping link.'
};

export function validate(values, fields) {
  const errors = {};
  for (const field of fields) {
    const message = rules[field]?.(values[field] ?? '', values);
    if (message) errors[field] = message;
  }
  return errors;
}
// Escapes text for safe use inside HTML, including inside attributes.
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ESCAPES[char]);

// Returns the URL only if it is a real https link; otherwise null.
// (A "javascript:" link would run code when clicked.)
export function safeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

export const formatPrice = (amount) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

export const formatMonth = (isoDate) =>
  new Date(isoDate).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });

// The API has no card color, so derive one from the id. The same id always
// gives the same color, so cards don't change color on every refresh.
const TONES = ['#d9c7b8', '#b8c9c2', '#c9d3dc', '#e6d5b8', '#e3b9c0', '#e0a1a1', '#c9d6b8', '#ead8c4'];

export function toneFor(id) {
  let hash = 0;
  for (const char of String(id)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}
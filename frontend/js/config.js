// Where the API lives. Same server during development, so a relative path works.
// At deployment (Stage 10) this becomes the backend's full URL.
export const API_BASE = '/api';

export const PLATFORMS = { shopee: 'Shopee', lazada: 'Lazada', tiktok: 'TikTok Shop' };
export const MAX_LINKS = 3;   // one per platform

// The tracked link for a buy button. The affiliate URL itself never appears
// in the page: the server looks it up and redirects.
export const goUrl = (productId, platform) =>
  `${API_BASE}/go/${encodeURIComponent(productId)}/${encodeURIComponent(platform)}`;
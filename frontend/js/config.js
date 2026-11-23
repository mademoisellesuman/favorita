// Your live API (Render). Replace with YOUR service URL. Keep the "/api" at the end.
const PRODUCTION_API = 'https://favorita-api.onrender.com/api';

// On your own computer (npm run dev, or Docker) Express serves both the site and the API,
// so a relative path works. Anywhere else, use the live API.
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);

export const API_BASE = isLocal ? '/api' : PRODUCTION_API;

// The tracked link for a buy button. The affiliate URL itself never appears
// in the page: the server looks it up and redirects.
export const goUrl = (productId, platform) =>
  `${API_BASE}/go/${encodeURIComponent(productId)}/${encodeURIComponent(platform)}`;
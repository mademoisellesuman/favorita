export const CATEGORIES = ['skincare', 'makeup'];
export const ORIGINS = ['local', 'international'];
export const MAX_LINKS = 3;

// A link is accepted only if its hostname is one of these domains or a subdomain.
// If a real affiliate link is rejected, its short-link domain probably belongs here.
export const PLATFORM_HOSTS = {
  shopee: ['shopee.ph', 'shp.ee'],
  lazada: ['lazada.com.ph', 'lzd.co'],
  tiktok: ['tiktok.com']
};

export const PLATFORM_NAMES = Object.keys(PLATFORM_HOSTS);
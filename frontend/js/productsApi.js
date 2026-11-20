import { request } from './api.js';

// { q: 'serum', category: 'all', page: 2 } → "?q=serum&page=2"
// Empty values and 'all' are left out, because "no filter" means "don't send it".
export function buildQuery(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      query.set(key, value);
    }
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

// Returns { data, page, limit, total }
export const fetchProducts = (params) => request('GET', `/products${buildQuery(params)}`);
export const fetchBrands = () => request('GET', '/products/brands').then((r) => r.data);
export const fetchUsers = (q) => request('GET', `/users${buildQuery({ q })}`).then((r) => r.data);

export const createProduct = (body) => request('POST', '/products', body).then((r) => r.data);
export const updateProduct = (id, body) => request('PUT', `/products/${id}`, body).then((r) => r.data);
export const deleteProduct = (id) => request('DELETE', `/products/${id}`);
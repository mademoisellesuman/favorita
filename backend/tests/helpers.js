import assert from 'node:assert/strict';
import { once } from 'node:events';
import dotenv from 'dotenv';

// Locally the URI comes from backend/.env.test. In CI it's a real environment variable.
dotenv.config({ path: '.env.test', quiet: true });

const uri = process.env.TEST_MONGODB_URI;
const dbName = uri?.match(/\/([^/?]+)(?:\?|$)/)?.[1];

// SAFETY: these tests DELETE everything in their database.
if (!dbName || !dbName.endsWith('_test')) {
  throw new Error(
    'Refusing to run tests: TEST_MONGODB_URI must be set and its database name must end in "_test".'
  );
}

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = uri;
process.env.JWT_SECRET ??= 'test-only-secret-that-is-at-least-32-characters-long';
process.env.BCRYPT_COST = '4';   // fast hashing for tests only (production enforces 12)

// Imported AFTER the environment is prepared.
const { default: app } = await import('../src/app.js');
const { connectDb, disconnectDb } = await import('../src/config/db.js');
const { User } = await import('../src/models/User.js');
const { Product } = await import('../src/models/Product.js');
const { Favorite, Cart } = await import('../src/models/SavedItem.js');
const { Click } = await import('../src/models/Click.js');

const models = [User, Product, Favorite, Cart, Click];
let server;
let base;

export async function setup() {
  await connectDb(uri);
  await Promise.all(models.map((m) => m.deleteMany({})));
  await Promise.all(models.map((m) => m.syncIndexes()));   // unique indexes must exist
  server = app.listen(0);                                  // port 0 = any free port
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api`;
}

export async function teardown() {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await disconnectDb();
}

// api('POST', '/auth/login', { body: {...}, token, headers, redirect })
export async function api(method, path, { token, body, headers = {}, redirect = 'follow' } = {}) {
  const response = await fetch(base + path, {
    method,
    redirect,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...headers
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* no body (204) or not JSON */ }
  return { status: response.status, body: json, headers: response.headers };
}

let counter = 0;
export async function registerUser(prefix = 'user') {
  counter += 1;
  const username = `${prefix}_${counter}`;
  const res = await api('POST', '/auth/register', {
    body: { name: 'Test User', username, email: `${username}@example.com`, password: 'Test1234' }
  });
  assert.equal(res.status, 201);
  return { token: res.body.data.token, user: res.body.data.user, username };
}

export const sampleProduct = (overrides = {}) => ({
  name: 'Test Serum',
  brand: 'Test Brand',
  category: 'skincare',
  origin: 'local',
  price: 250,
  description: 'A serum used for testing the API.',
  links: [{ platform: 'shopee', url: 'https://shopee.ph/test-serum' }],
  ...overrides
});
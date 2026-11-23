import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, api, registerUser, sampleProduct } from './helpers.js';

before(setup);
after(teardown);

test('creating a product requires login', async () => {
  const res = await api('POST', '/products', { body: sampleProduct() });
  assert.equal(res.status, 401);
});

test('the owner comes from the token, never from the request body', async () => {
  const ana = await registerUser('ana');
  const res = await api('POST', '/products', {
    token: ana.token,
    body: sampleProduct({ owner: 'someone-else', ownerId: 'someone-else' })
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.recommendedBy, ana.username);
});

test('links must be https and on the right platform domain', async () => {
  const { token } = await registerUser('links');

  const lookalike = await api('POST', '/products', {
    token, body: sampleProduct({ links: [{ platform: 'shopee', url: 'https://shopee.ph.evil.com/x' }] })
  });
  assert.equal(lookalike.status, 400);
  assert.ok(lookalike.body.error.details.links);

  const scripty = await api('POST', '/products', {
    token, body: sampleProduct({ links: [{ platform: 'shopee', url: 'javascript:alert(1)' }] })
  });
  assert.equal(scripty.status, 400);

  const wrongPlatform = await api('POST', '/products', {
    token, body: sampleProduct({ links: [{ platform: 'lazada', url: 'https://shopee.ph/x' }] })
  });
  assert.equal(wrongPlatform.status, 400);
});

test('only the owner can update or delete a product', async () => {
  const owner = await registerUser('owner');
  const other = await registerUser('other');
  const created = await api('POST', '/products', { token: owner.token, body: sampleProduct() });
  const id = created.body.data.id;

  assert.equal((await api('PUT', `/products/${id}`, { token: other.token, body: sampleProduct() })).status, 403);
  assert.equal((await api('DELETE', `/products/${id}`, { token: other.token })).status, 403);

  const updated = await api('PUT', `/products/${id}`, {
    token: owner.token, body: sampleProduct({ name: 'Renamed Serum', price: 300 })
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.name, 'Renamed Serum');

  assert.equal((await api('DELETE', `/products/${id}`, { token: owner.token })).status, 204);
  assert.equal((await api('GET', `/products/${id}`)).status, 404);
});

test('listing supports pagination and treats regex characters as plain text', async () => {
  const { token } = await registerUser('lister');
  for (let i = 1; i <= 3; i += 1) {
    await api('POST', '/products', { token, body: sampleProduct({ name: `Listing Product ${i}` }) });
  }

  const page = await api('GET', '/products?limit=2&page=1');
  assert.equal(page.status, 200);
  assert.equal(page.body.data.length, 2);
  assert.ok(page.body.total >= 3);

  const regex = await api('GET', `/products?q=${encodeURIComponent('(.*')}`);
  assert.equal(regex.status, 200);
  assert.equal(regex.body.total, 0);

  assert.equal((await api('GET', '/products?sort=banana')).status, 400);
  assert.equal((await api('GET', '/products/nope')).status, 404);
});

test('favorites are idempotent and private to each user', async () => {
  const owner = await registerUser('fav_owner');
  const fan = await registerUser('fan');
  const other = await registerUser('fav_other');
  const id = (await api('POST', '/products', { token: owner.token, body: sampleProduct() })).body.data.id;

  await api('PUT', `/favorites/${id}`, { token: fan.token });
  await api('PUT', `/favorites/${id}`, { token: fan.token });   // twice: still one entry

  assert.equal((await api('GET', '/favorites', { token: fan.token })).body.total, 1);
  assert.equal((await api('GET', '/favorites', { token: other.token })).body.total, 0);

  assert.equal((await api('DELETE', `/favorites/${id}`, { token: fan.token })).status, 204);
  assert.equal((await api('DELETE', `/favorites/${id}`, { token: fan.token })).status, 204);
});

test('the redirect counts real clicks once and cannot be pointed elsewhere', async () => {
  const creator = await registerUser('creator');
  const url = 'https://shopee.ph/redirect-test';
  const id = (await api('POST', '/products', {
    token: creator.token,
    body: sampleProduct({ links: [{ platform: 'shopee', url }] })
  })).body.data.id;

  const visitorA = { 'user-agent': 'Mozilla/5.0 Visitor A' };
  const visitorB = { 'user-agent': 'Mozilla/5.0 Visitor B' };

  const first = await api('GET', `/go/${id}/shopee`, { redirect: 'manual', headers: visitorA });
  assert.equal(first.status, 302);
  assert.equal(first.headers.get('location'), url);
  assert.equal(first.headers.get('cache-control'), 'no-store');

  await api('GET', `/go/${id}/shopee`, { redirect: 'manual', headers: visitorA });   // duplicate: not counted
  await api('GET', `/go/${id}/shopee`, { redirect: 'manual', headers: { 'user-agent': 'Googlebot/2.1' } });   // bot: not counted
  await api('GET', `/go/${id}/shopee`, { redirect: 'manual', headers: visitorB });   // new visitor: counted

  // Open-redirect attempt: a query string must not change the destination.
  const tricky = await api('GET', `/go/${id}/shopee?url=https://evil.example`, { redirect: 'manual', headers: visitorB });
  assert.equal(tricky.headers.get('location'), url);

  assert.equal((await api('GET', `/go/${id}/lazada`)).status, 404);   // no such link on this product
  assert.equal((await api('GET', `/go/${id}/ebay`)).status, 404);     // unknown platform

  const stats = await api('GET', '/stats/links', { token: creator.token });
  assert.equal(stats.status, 200);
  assert.equal(stats.body.data.totalClicks, 2);   // visitor A once + visitor B once

  const stranger = await registerUser('stranger');
  const strangerStats = await api('GET', '/stats/links', { token: stranger.token });
  assert.equal(strangerStats.body.data.totalClicks, 0);   // stats belong to the owner only
});
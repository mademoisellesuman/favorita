import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, api, registerUser } from './helpers.js';

before(setup);
after(teardown);

test('register returns a token and never exposes password data', async () => {
  const res = await api('POST', '/auth/register', {
    body: {
      name: 'Ana', username: 'ana_test', email: 'ana@example.com', password: 'Test1234',
      tokenVersion: 99, passwordHash: 'sneaky'   // must be ignored
    }
  });
  assert.equal(res.status, 201);
  assert.ok(res.body.data.token);
  assert.equal(res.body.data.user.username, 'ana_test');
  assert.equal('passwordHash' in res.body.data.user, false);
  assert.equal('tokenVersion' in res.body.data.user, false);
});

test('register rejects weak passwords with a field error', async () => {
  const res = await api('POST', '/auth/register', {
    body: { name: 'Weak', username: 'weak_user', email: 'weak@example.com', password: 'short' }
  });
  assert.equal(res.status, 400);
  assert.ok(res.body.error.details.password);
});

test('usernames and emails are unique, ignoring capitalization', async () => {
  await api('POST', '/auth/register', {
    body: { name: 'Dup', username: 'dup_user', email: 'dup@example.com', password: 'Test1234' }
  });

  const sameUsername = await api('POST', '/auth/register', {
    body: { name: 'Dup', username: 'DUP_USER', email: 'other@example.com', password: 'Test1234' }
  });
  assert.equal(sameUsername.status, 409);

  const sameEmail = await api('POST', '/auth/register', {
    body: { name: 'Dup', username: 'dup_two', email: 'DUP@example.com', password: 'Test1234' }
  });
  assert.equal(sameEmail.status, 409);
});

test('login gives the same error for a wrong password and an unknown user', async () => {
  const { username } = await registerUser('login');

  const wrongPassword = await api('POST', '/auth/login', { body: { username, password: 'WrongPass1' } });
  const unknownUser = await api('POST', '/auth/login', { body: { username: 'nobody_here', password: 'WrongPass1' } });

  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownUser.status, 401);
  assert.equal(wrongPassword.body.error.message, unknownUser.body.error.message);
});

test('login refuses NoSQL injection objects', async () => {
  const res = await api('POST', '/auth/login', {
    body: { username: { $ne: null }, password: { $ne: null } }
  });
  assert.equal(res.status, 400);
});

test('protected routes need a valid token; public routes ignore a bad one', async () => {
  assert.equal((await api('GET', '/users/me')).status, 401);

  const garbage = await api('GET', '/users/me', { token: 'not.a.token' });
  assert.equal(garbage.status, 401);
  assert.match(garbage.body.error.message, /expired/i);

  assert.equal((await api('GET', '/products', { token: 'not.a.token' })).status, 200);
});

test('changing the password revokes old tokens', async () => {
  const { token } = await registerUser('pw');

  const wrong = await api('PUT', '/auth/password', {
    token, body: { currentPassword: 'WrongPass1', newPassword: 'NewPass456' }
  });
  assert.equal(wrong.status, 400);   // 400, not 401: the session itself is still valid

  const changed = await api('PUT', '/auth/password', {
    token, body: { currentPassword: 'Test1234', newPassword: 'NewPass456' }
  });
  assert.equal(changed.status, 200);

  assert.equal((await api('GET', '/users/me', { token })).status, 401);                          // old token is dead
  assert.equal((await api('GET', '/users/me', { token: changed.body.data.token })).status, 200);  // new one works
});
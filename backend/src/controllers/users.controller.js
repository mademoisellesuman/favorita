import { User, COLLATION } from '../models/User.js';
import { Product } from '../models/Product.js';
import { HttpError } from '../utils/httpError.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { validateProfile, validateUsername } from '../validators/user.js';

function failIfInvalid(errors) {
  if (Object.keys(errors).length > 0) throw new HttpError(400, 'Validation failed.', errors);
}

// How many products each user has, in ONE query (a Map of userId → count).
async function countsFor(users) {
  const rows = await Product.aggregate([
    { $match: { owner: { $in: users.map((u) => u._id) } } },
    { $group: { _id: '$owner', count: { $sum: 1 } } }
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
}

/* ---------- Two shapes of a user ---------- */

// What ANYONE may see. Chosen field by field, so nothing sensitive can leak by accident.
const publicUser = (user, counts) => ({
  id: user.id,
  username: user.username,
  name: user.name,
  bio: user.bio ?? '',
  avatar: user.avatar ?? '',
  productCount: counts.get(user.id) ?? 0
});

// What YOU see about yourself.
const privateUser = (user, counts) => ({ ...publicUser(user, counts), email: user.email });

/* ---------- Public endpoints ---------- */

// GET /api/users?q=ana
export async function listUsers(req, res) {
  const q = typeof req.query.q === 'string'
    ? req.query.q.trim().toLowerCase().replace(/^@/, '').slice(0, 50)
    : '';
  const re = new RegExp(escapeRegex(q), 'i');   // empty q matches everyone

  const users = await User.find({ $or: [{ username: re }, { name: re }] })
    .sort({ username: 1 })
    .limit(20);

  const counts = await countsFor(users);
  res.json({ data: users.map((u) => publicUser(u, counts)), total: users.length });
}

// GET /api/users/:username
export async function getUser(req, res) {
  const user = await User.findOne({ username: req.params.username }).collation(COLLATION);
  if (!user) throw new HttpError(404, 'User not found.');
  res.json({ data: publicUser(user, await countsFor([user])) });
}

/* ---------- "Me" endpoints (login required) ---------- */

// GET /api/users/me
export async function getMe(req, res) {
  res.json({ data: privateUser(req.user, await countsFor([req.user])) });
}

// PUT /api/users/me: name, email, bio, avatar
export async function updateMe(req, res) {
  const { value, errors } = validateProfile(req.body);
  failIfInvalid(errors);

  Object.assign(req.user, value);
  await req.user.save();   // a taken email → the unique index rejects it → 409 (errorHandler)

  res.json({ data: privateUser(req.user, await countsFor([req.user])) });
}

// PUT /api/users/me/username
export async function changeUsername(req, res) {
  const { value, errors } = validateUsername(req.body);
  failIfInvalid(errors);

  req.user.username = value.username;
  await req.user.save();   // taken (any capitalization) → 409

  res.json({ data: privateUser(req.user, await countsFor([req.user])) });
}

// Used by the auth controller: the same private shape that GET /users/me returns.
export async function userPayload(user) {
  return privateUser(user, await countsFor([user]));
}
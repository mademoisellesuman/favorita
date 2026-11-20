import { User, COLLATION } from '../models/User.js';
import { HttpError } from '../utils/httpError.js';
import { hashPassword, checkPassword, signToken } from '../utils/auth.js';
import { validateRegistration, validateLogin, validatePasswordChange } from '../validators/auth.js';
import { userPayload } from './users.controller.js';

function failIfInvalid(errors) {
  if (Object.keys(errors).length > 0) throw new HttpError(400, 'Validation failed.', errors);
}

/* ---------- POST /api/auth/register ---------- */
export async function register(req, res) {
  const { value, errors } = validateRegistration(req.body);
  failIfInvalid(errors);

  const { password, ...profile } = value;

  // A taken username or email makes the unique index throw error 11000, which
  // the error handler turns into a 409. We don't check first.
  const user = await User.create({ ...profile, passwordHash: await hashPassword(password) });

  res.status(201).json({ data: { token: signToken(user), user: await userPayload(user) } });
}

/* ---------- POST /api/auth/login ---------- */
export async function login(req, res) {
  const { value, errors } = validateLogin(req.body);
  failIfInvalid(errors);

  // passwordHash is hidden by default, so we ask for it explicitly here.
  const user = await User.findOne({ username: value.username })
    .collation(COLLATION)
    .select('+passwordHash');

  const passwordOk = await checkPassword(value.password, user?.passwordHash);

  // ONE message for "no such user" and "wrong password" (user enumeration).
  if (!user || !passwordOk) throw new HttpError(401, 'Invalid username or password.');

  res.json({ data: { token: signToken(user), user: await userPayload(user) } });
}

/* ---------- PUT /api/auth/password ---------- */
export async function changePassword(req, res) {
  const { value, errors } = validatePasswordChange(req.body);
  failIfInvalid(errors);

  const user = await User.findById(req.user._id).select('+passwordHash');

  if (!(await checkPassword(value.currentPassword, user.passwordHash))) {
    // 400, not 401: a 401 would tell the frontend "your session is dead" and log you out.
    throw new HttpError(400, 'Current password is incorrect.', {
      currentPassword: 'Current password is incorrect.'
    });
  }

  user.passwordHash = await hashPassword(value.newPassword);
  user.tokenVersion += 1;          // every OLD token (every other device) dies now
  await user.save();

  // Hand back a fresh token so THIS device stays logged in.
  res.json({ data: { token: signToken(user) } });
}

/* ---------- POST /api/auth/logout-all ---------- */
export async function logoutEverywhere(req, res) {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  res.status(204).end();
}
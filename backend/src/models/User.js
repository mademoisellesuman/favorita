import { Schema, model } from 'mongoose';
import { toJSONOptions } from './shared.js';

export const COLLATION = { locale: 'en', strength: 2 };

const userSchema = new Schema(
  {
    username: { type: String, required: true, trim: true, minlength: 3, maxlength: 20 },
    name:     { type: String, required: true, trim: true, minlength: 1, maxlength: 50 },
    email:    { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
    bio:      { type: String, default: '', trim: true, maxlength: 160 },
    avatar:   { type: String, default: '', maxlength: 500 },
    // The bcrypt HASH, never the password. `select: false` means queries leave it
    // out unless we explicitly ask with .select('+passwordHash').
    passwordHash: { type: String, required: true, select: false },
    // Bumped to invalidate every existing token for this user.
    tokenVersion: { type: Number, default: 0 }
  },
  { timestamps: true, toJSON: toJSONOptions }   // adds createdAt and updatedAt automatically
);

// Case-insensitive unique usernames, enforced by the database itself.
userSchema.index({ username: 1 }, { unique: true, collation: COLLATION });

export const User = model('User', userSchema);
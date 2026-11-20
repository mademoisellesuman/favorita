import { Schema, model } from 'mongoose';
import { PLATFORM_NAMES } from '../config/constants.js';

export const DEDUPE_MINUTES = 30;
const RETENTION_DAYS = 90;

const clickSchema = new Schema({
  product:   { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  owner:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  platform:  { type: String, enum: PLATFORM_NAMES, required: true },
  visitor:   { type: String, required: true },
  bucket:    { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// One click per visitor, per product, per platform, per 30-minute window.
clickSchema.index({ product: 1, platform: 1, visitor: 1, bucket: 1 }, { unique: true });
clickSchema.index({ owner: 1, createdAt: -1 });
// Old clicks delete themselves after 90 days.
clickSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60 });

export const Click = model('Click', clickSchema);
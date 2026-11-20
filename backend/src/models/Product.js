import { Schema, model } from 'mongoose';
import { toJSONOptions } from './shared.js';
import { CATEGORIES, ORIGINS, PLATFORM_NAMES, MAX_LINKS } from '../config/constants.js';

// Embedded inside each product. `_id: false` skips giving every link its own id.
const linkSchema = new Schema(
  {
    platform: { type: String, enum: PLATFORM_NAMES, required: true },
    url:      { type: String, required: true, maxlength: 500 }
  },
  { _id: false }
);

const productSchema = new Schema(
  {
    owner:       { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name:        { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    brand:       { type: String, required: true, trim: true, minlength: 1, maxlength: 40 },
    category:    { type: String, enum: CATEGORIES, required: true },
    origin:      { type: String, enum: ORIGINS, required: true },
    price:       { type: Number, required: true, min: 0.01, max: 1_000_000 },
    priceUpdated:{ type: Date, default: Date.now },
    image:       { type: String, default: '', maxlength: 500 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 300 },
    links: {
      type: [linkSchema],
      validate: {
        validator: (links) => links.length >= 1 && links.length <= MAX_LINKS,
        message: `A product needs 1 to ${MAX_LINKS} links.`
      }
    }
  },
  { timestamps: true, toJSON: toJSONOptions }
);

// Speeds up the home page query: filter by category, newest first.
productSchema.index({ category: 1, createdAt: -1 });

export const Product = model('Product', productSchema);
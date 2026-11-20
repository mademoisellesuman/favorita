import { Schema, model } from 'mongoose';
import { toJSONOptions } from './shared.js';

function createSavedModel(name) {
  const schema = new Schema(
    {
      user:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
      product: { type: Schema.Types.ObjectId, ref: 'Product', required: true }
    },
    { timestamps: { createdAt: true, updatedAt: false }, toJSON: toJSONOptions }
  );

  // One entry per user+product. The database refuses duplicates, so
  // "favorite it twice" can never create two rows, even with a double-click race.
  schema.index({ user: 1, product: 1 }, { unique: true });

  return model(name, schema);
}

export const Favorite = createSavedModel('Favorite');   // collection: favorites
export const Cart = createSavedModel('Cart');           // collection: carts
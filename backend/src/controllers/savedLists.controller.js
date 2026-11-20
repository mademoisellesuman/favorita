import { Product } from '../models/Product.js';
import { HttpError } from '../utils/httpError.js';
import { assertId } from '../utils/ids.js';
import { presentProduct } from '../utils/present.js';

// `Model` is Favorite or Cart. Both have the same shape: { user, product }.
export function createSavedListController(Model) {

  // GET /api/<list>: your saved products, newest first
  async function list(req, res) {
    const entries = await Model.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      // Populate the product, and inside it the owner (a nested populate).
      .populate({ path: 'product', populate: { path: 'owner', select: 'username' } });

    const data = entries
      .filter((entry) => entry.product)   // skip anything whose product no longer exists
      .map((entry) => presentProduct(entry.product));

    res.json({ data, total: data.length });
  }

  // PUT /api/<list>/:productId: save a product (safe to repeat)
  async function add(req, res) {
    const { productId } = req.params;
    assertId(productId, 'Product not found.');
    if (!(await Product.exists({ _id: productId }))) {
      throw new HttpError(404, 'Product not found.');
    }

    try {
      await Model.create({ user: req.user._id, product: productId });
    } catch (error) {
      // 11000 = already saved. The unique index made the database refuse the duplicate,
      // and that's exactly the outcome we want, so it isn't an error.
      if (error.code !== 11000) throw error;
    }

    res.json({ data: { productId, saved: true } });
  }

  // DELETE /api/<list>/:productId: un-save it (safe to repeat)
  async function remove(req, res) {
    const { productId } = req.params;
    assertId(productId, 'Product not found.');
    await Model.deleteOne({ user: req.user._id, product: productId });
    res.status(204).end();
  }

  return { list, add, remove };
}
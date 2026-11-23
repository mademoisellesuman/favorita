import { Product } from '../models/Product.js';
import { User, COLLATION } from '../models/User.js';
import { Favorite, Cart } from '../models/SavedItem.js';
import { HttpError } from '../utils/httpError.js';
import { assertId } from '../utils/ids.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { presentProduct, OWNER_POPULATE } from '../utils/present.js';
import { validateProduct } from '../validators/product.js';
import { CATEGORIES, ORIGINS, PLATFORM_NAMES } from '../config/constants.js';


/* ---------- Helpers ---------- */
function failIfInvalid(errors) {
  if (Object.keys(errors).length > 0) throw new HttpError(400, 'Validation failed.', errors);
}

// Loads a product (WITHOUT populating the owner, so product.owner is still an id).
async function findProduct(id) {
  assertId(id, 'Product not found.');
  const product = await Product.findById(id);
  if (!product) throw new HttpError(404, 'Product not found.');
  return product;
}

function oneOf(value, allowed, name) {
  if (value === undefined || value === '') return undefined;
  if (!allowed.includes(value)) {
    throw new HttpError(400, `Invalid ${name}. Allowed: ${allowed.join(', ')}.`);
  }
  return value;
}

function toInt(value, fallback, min, max, name) {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new HttpError(400, `${name} must be a whole number from ${min} to ${max}.`);
  }
  return n;
}

// Query values can arrive as arrays (?q=a&q=b), so only accept strings.
const asText = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

/* ---------- Sorting ---------- */
// `_id` is a tie-breaker so pages never overlap or skip items when values are equal.
// Alphabetically 'international' < 'local', so descending origin puts local first.
const SORTS = {
  newest:        { createdAt: -1, _id: -1 },
  local:         { origin: -1, createdAt: -1, _id: -1 },
  international: { origin: 1,  createdAt: -1, _id: -1 },
  'price-asc':   { price: 1,  createdAt: -1, _id: -1 },
  'price-desc':  { price: -1, createdAt: -1, _id: -1 }
};

/* ---------- Text search ---------- */
// "@ana"  → products by usernames starting with "ana".
// Otherwise every word must appear in the name, brand, description, or username.
async function textCondition(query) {
  if (query.startsWith('@')) {
    const prefix = new RegExp(`^${escapeRegex(query.slice(1))}`, 'i');
    const users = await User.find({ username: prefix }).select('_id');
    return { owner: { $in: users.map((u) => u._id) } };
  }

  const words = query.split(/\s+/).filter(Boolean).slice(0, 5);   // cap the work per search
  const regexes = words.map((w) => new RegExp(escapeRegex(w), 'i'));

  // One query finds every user whose username matches ANY word.
  const users = await User.find({ $or: regexes.map((re) => ({ username: re })) }).select('_id username');

  return {
    $and: regexes.map((re) => ({
      $or: [
        { name: re }, { brand: re }, { description: re },
        { owner: { $in: users.filter((u) => re.test(u.username)).map((u) => u._id) } }
      ]
    }))
  };
}

/* ---------- READ many: GET /api/products ---------- */
export async function listProducts(req, res) {
  const q = req.query;

  const category = oneOf(q.category, CATEGORIES, 'category');
  const origin = oneOf(q.origin, ORIGINS, 'origin');
  const platform = oneOf(q.platform, PLATFORM_NAMES, 'platform');
  const sort = q.sort ?? 'newest';
  if (typeof sort !== 'string' || !Object.hasOwn(SORTS, sort)) {
    throw new HttpError(400, `Invalid sort. Allowed: ${Object.keys(SORTS).join(', ')}.`);
  }
  const page = toInt(q.page, 1, 1, 10000, 'page');
  const limit = toInt(q.limit, 20, 1, 50, 'limit');

  const query = asText(q.q).slice(0, 100);
  const brand = asText(q.brand);
  const ownerName = asText(q.owner);

  // Collect conditions in a list, then combine with $and, so two conditions
  // on the same field (like `owner`) can never overwrite each other.
  const conditions = [];
  if (category) conditions.push({ category });
  if (origin) conditions.push({ origin });
  if (platform) conditions.push({ 'links.platform': platform });
  if (brand) conditions.push({ brand: new RegExp(`^${escapeRegex(brand)}$`, 'i') });

  if (ownerName) {
    const owner = await User.findOne({ username: ownerName }).collation(COLLATION).select('_id');
    if (!owner) return res.json({ data: [], page, limit, total: 0 });
    conditions.push({ owner: owner._id });
  }
  if (query) conditions.push(await textCondition(query));

  const filter = conditions.length > 0 ? { $and: conditions } : {};

  // Fetch one page and the total count at the same time.
  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(OWNER_POPULATE),
    Product.countDocuments(filter)
  ]);

  res.json({ data: products.map(presentProduct), page, limit, total });
}

/* ---------- READ one: GET /api/products/:id ---------- */
export async function getProduct(req, res) {
  assertId(req.params.id, 'Product not found.');
  const product = await Product.findById(req.params.id).populate(OWNER_POPULATE);
  if (!product) throw new HttpError(404, 'Product not found.');
  res.json({ data: presentProduct(product) });
}

/* ---------- CREATE: POST /api/products ---------- */
export async function createProduct(req, res) {
  const { value, errors } = validateProduct(req.body);
  failIfInvalid(errors);

  // owner comes from the login, NEVER from the request body.
  const product = await Product.create({ ...value, owner: req.user._id });
  await product.populate(OWNER_POPULATE);

  res.status(201).json({ data: presentProduct(product) });
}

/* ---------- UPDATE: PUT /api/products/:id ---------- */
export async function updateProduct(req, res) {
  const product = await findProduct(req.params.id);                  // 404 if missing
  if (!product.owner.equals(req.user._id)) {                         // 403 if not yours
    throw new HttpError(403, 'You can only change your own recommendations.');
  }

  const { value, errors } = validateProduct(req.body);               // 400 if invalid
  failIfInvalid(errors);

  if (value.price !== product.price) product.priceUpdated = new Date();
  Object.assign(product, value);
  await product.save();                                              // schema checks run here too
  await product.populate(OWNER_POPULATE);

  res.json({ data: presentProduct(product) });
}

/* ---------- DELETE: DELETE /api/products/:id ---------- */
export async function deleteProduct(req, res) {
  const product = await findProduct(req.params.id);
  if (!product.owner.equals(req.user._id)) {
    throw new HttpError(403, 'You can only delete your own recommendations.');
  }

  await product.deleteOne();
  // Clean up everyone's saved references so nothing points at a missing product.
  await Promise.all([
    Favorite.deleteMany({ product: product._id }),
    Cart.deleteMany({ product: product._id })
  ]);

  res.status(204).end();
}

/* ---------- GET /api/products/brands ---------- */
export async function listBrands(req, res) {
  const brands = await Product.distinct('brand');
  brands.sort((a, b) => a.localeCompare(b));
  res.json({ data: brands });
}
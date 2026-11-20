import { Product } from '../models/Product.js';
import { Click } from '../models/Click.js';
import { PLATFORM_NAMES } from '../config/constants.js';

const DAYS = 30;

const emptyCounts = () => Object.fromEntries(PLATFORM_NAMES.map((p) => [p, 0]));

// GET /api/stats/links: click counts for MY products over the last 30 days
export async function linkStats(req, res) {
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);

  const [products, rows] = await Promise.all([
    Product.find({ owner: req.user._id }).select('name brand links'),
    Click.aggregate([
      { $match: { owner: req.user._id, createdAt: { $gte: since } } },
      { $group: { _id: { product: '$product', platform: '$platform' }, count: { $sum: 1 } } }
    ])
  ]);

  const counts = new Map(rows.map((r) => [`${r._id.product}:${r._id.platform}`, r.count]));

  const byPlatform = emptyCounts();
  const list = products.map((product) => {
    const perPlatform = emptyCounts();
    for (const platform of PLATFORM_NAMES) {
      perPlatform[platform] = counts.get(`${product.id}:${platform}`) ?? 0;
      byPlatform[platform] += perPlatform[platform];
    }
    return {
      id: product.id,
      name: product.name,
      brand: product.brand,
      platforms: product.links.map((l) => l.platform),
      byPlatform: perPlatform,
      total: Object.values(perPlatform).reduce((a, b) => a + b, 0)
    };
  });

  list.sort((a, b) => b.total - a.total);

  res.json({
    data: {
      days: DAYS,
      totalClicks: list.reduce((sum, p) => sum + p.total, 0),
      byPlatform,
      products: list
    }
  });
}
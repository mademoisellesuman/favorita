import 'dotenv/config';
import { connectDb, disconnectDb } from '../config/db.js';
import { seedUsers, seedProducts } from './seed.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Favorite, Cart } from '../models/SavedItem.js';
import { hashPassword } from '../utils/auth.js';
import { Click } from '../models/Click.js';

async function run() {
  // This script DELETES everything first, so it must never run against real data.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed when NODE_ENV=production.');
  }

  await connectDb(process.env.MONGODB_URI);

  const models = [User, Product, Favorite, Cart, Click];
  await Promise.all(models.map((m) => m.deleteMany({})));   // start clean

  // Create users, then remember which seed id ('u1') became which real _id.
  const passwordHash = await hashPassword('Password123');
  const created = await User.insertMany(seedUsers.map(({ id, ...fields }) => ({...fields, passwordHash}))
);
  const ownerIds = {};
  seedUsers.forEach((seedUser, i) => { ownerIds[seedUser.id] = created[i]._id; });

  await Product.insertMany(
    seedProducts.map(({ id, ownerId, priceUpdated, createdAt, ...fields }) => ({
      ...fields,
      owner: ownerIds[ownerId],
      priceUpdated: new Date(priceUpdated),
      createdAt: new Date(createdAt)
    }))
  );

  // Make sure every index (including the unique ones) exists.
  await Promise.all(models.map((m) => m.syncIndexes()));

  const counts = await Promise.all(models.map(async (m) => `${m.collection.name}: ${await m.countDocuments()}`));
  console.log('Seeded →', counts.join(', '));
}

try {
  await run();
} catch (error) {
  console.error('Seeding failed:', error.message);
  process.exitCode = 1;
} finally {
  await disconnectDb();   // otherwise the script never exits
}
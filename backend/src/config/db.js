import mongoose from 'mongoose';

export async function connectDb(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is missing. Add it to backend/.env (see .env.example).');
  }
  // Give up after 8 seconds instead of hanging forever on a bad URI or blocked network.
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log(`MongoDB connected (database: ${mongoose.connection.name})`);
}

export const disconnectDb = () => mongoose.disconnect();
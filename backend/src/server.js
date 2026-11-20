import 'dotenv/config';
import app from './app.js';
import { connectDb } from './config/db.js';
import { assertAuthConfig } from './utils/auth.js';
import { assertProductionConfig } from './config/env.js';

const PORT = process.env.PORT || 5000;

try {
  await connectDb(process.env.MONGODB_URI);   // top-level await works in ES modules
} catch (error) {
  console.error('Startup failed:', error.message);
  process.exit(1);   // stop: running without a database would only cause confusing errors
}

try {
  assertProductionConfig();
  assertAuthConfig();                        
  await connectDb(process.env.MONGODB_URI);
} catch (error) {
  console.error('Startup failed:', error.message);
  process.exit(1);
}


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
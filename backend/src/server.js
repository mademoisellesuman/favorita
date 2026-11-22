import 'dotenv/config';
import app from './app.js';
import { connectDb, disconnectDb } from './config/db.js';
import { assertAuthConfig } from './utils/auth.js';
import { assertProductionConfig } from './config/env.js';

const PORT = process.env.PORT || 5000;

try {
  assertProductionConfig();
  assertAuthConfig();
  await connectDb(process.env.MONGODB_URI);
} catch (error) {
  console.error('Startup failed:', error.message);
  process.exit(1);
}

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Docker and hosting platforms ask a program to stop with SIGTERM. Ctrl+C sends SIGINT.
function shutdown(signal) {
  console.log(`${signal} received: shutting down…`);

  // Stop accepting connections; finish the requests already in progress.
  server.close(async () => {
    await disconnectDb();
    process.exit(0);
  });

  // If something hangs, don't wait forever. (unref: this timer alone won't keep the process alive.)
  setTimeout(() => process.exit(1), 8000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
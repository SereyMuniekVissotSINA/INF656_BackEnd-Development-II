const fs = require('node:fs');
const path = require('node:path');
const { MongoMemoryServer } = require('mongodb-memory-server-core');
const binary = require('../config/localMongo');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

async function run() {
  const port = Number(process.env.LOCAL_MONGODB_PORT || 27017);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('LOCAL_MONGODB_PORT must be between 1 and 65535');
  }
  const dbPath = path.join(__dirname, '..', '.local-mongodb');
  fs.mkdirSync(dbPath, { recursive: true });

  // Runs a real mongod executable with durable WiredTiger files, not a mock.
  const mongodb = await MongoMemoryServer.create({
    binary,
    instance: { ip: '127.0.0.1', port, portGeneration: false, dbPath, storageEngine: 'wiredTiger' },
    spawn: { windowsHide: true }
  });
  console.log(`Local MongoDB running at mongodb://127.0.0.1:${port}`);
  console.log('Data is saved in .local-mongodb. Keep this terminal open; Ctrl+C stops MongoDB.');

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    // Preserve all WiredTiger files for the next launch.
    await mongodb.stop({ doCleanup: false, force: false });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

run().catch((error) => {
  console.error('Local MongoDB could not start:', error.message);
  process.exitCode = 1;
});

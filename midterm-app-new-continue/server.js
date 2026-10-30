const app = require('./app');
const { connectDatabase, closeDatabase } = require('./config/database');

async function startServer() {
  // The HTTP listener is created only after MongoDB connects and responds to ping.
  await connectDatabase();
  const port = process.env.PORT || 3000;
  const server = app.listen(port);

  // Only read the bound address after the server has actually started listening.
  server.once('listening', () => {
    console.log(`Mine App running at http://localhost:${server.address().port}`);
  });

  server.once('error', async (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Unable to start HTTP server (EADDRINUSE): port ${port} is already in use. Stop the existing server or change PORT in .env.`);
    } else {
      console.error(`Unable to start HTTP server (${error.code || 'listen error'})`);
    }
    try {
      await closeDatabase();
    } finally {
      process.exitCode = 1;
    }
  });

  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(async () => {
      try {
        await closeDatabase();
        clearTimeout(timeout);
        process.exitCode = 0;
      } catch {
        process.exitCode = 1;
      }
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

startServer().catch(async (error) => {
  // Only print our own safe messages, never a URI, password or raw driver error.
  let guidance = 'Check MONGODB_URI, MONGODB_DB and that your database server is running.';
  if (error.code === 'MONGODB_CONFIG') {
    guidance = error.message;
  } else if (error.code === 18 || error.code === 8000) {
    guidance = 'Authentication failed. Check the database-user username and password in .env; these are separate from your Atlas account login.';
  } else if (error.name === 'MongoParseError') {
    guidance = 'MONGODB_URI is invalid. Copy the Atlas driver connection string and URL-encode special characters in the database-user credentials.';
  }
  console.error('MongoDB connection failed. ' + guidance);
  await closeDatabase();
  process.exitCode = 1;
});

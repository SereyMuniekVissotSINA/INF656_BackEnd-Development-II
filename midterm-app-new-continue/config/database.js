const path = require('node:path');
const { MongoClient } = require('mongodb');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

let client;
let database;

function configurationError(message) {
  const error = new Error(message);
  error.code = 'MONGODB_CONFIG';
  return error;
}

async function connectDatabase({
  uri = process.env.MONGODB_URI,
  dbName = process.env.MONGODB_DB
} = {}) {
  if (database) return database;
  if (!uri || !dbName) {
    throw configurationError('Set MONGODB_URI and MONGODB_DB in your environment or .env file.');
  }

  // Catch copied Atlas template credentials before making a network request.
  let decodedUri = uri;
  try { decodedUri = decodeURIComponent(uri); } catch { /* The driver validates URI encoding. */ }
  if (/<(?:db_)?(?:password|username)>|YOUR_DB_(?:USER|PASSWORD)|YOUR_ATLAS_CONNECTION_STRING/i.test(decodedUri)) {
    throw configurationError('Replace the Atlas username/password placeholders in .env with your database-user credentials, without the placeholder < > brackets.');
  }

  const connection = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await connection.connect();
    const selectedDatabase = connection.db(dbName);
    await selectedDatabase.command({ ping: 1 });
    client = connection;
    database = selectedDatabase;
    return database;
  } catch (error) {
    await connection.close();
    throw error;
  }
}

function getItemsCollection() {
  if (!database) throw new Error('MongoDB is not connected');
  return database.collection('items');
}

async function closeDatabase() {
  const connection = client;
  client = undefined;
  database = undefined;
  if (connection) await connection.close();
}

module.exports = { connectDatabase, getItemsCollection, closeDatabase };

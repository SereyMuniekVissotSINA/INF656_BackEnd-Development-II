const { connectDatabase, getItemsCollection, closeDatabase } = require('../config/database');
const seedCollection = require('../data/seedCollection');

async function seed() {
  try {
    await connectDatabase();
    const inserted = await seedCollection(getItemsCollection());
    console.log(inserted
      ? `Inserted ${inserted} documents into the items collection.`
      : 'The items collection already contains documents; no changes made.');
  } finally {
    await closeDatabase();
  }
}

seed().catch(() => {
  console.error('Unable to seed MongoDB. Check your environment settings and database connection.');
  process.exitCode = 1;
});

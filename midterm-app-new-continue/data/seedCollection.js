const seedItems = require('./seedItems');

async function seedCollection(collection) {
  // Never erase existing documents or add duplicates on repeated seed runs.
  if (await collection.countDocuments({}) > 0) return 0;
  const result = await collection.insertMany(seedItems.map((item) => ({ ...item })));
  return result.insertedCount;
}

module.exports = seedCollection;

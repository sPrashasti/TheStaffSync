// Creates any missing indexes, removes stale ones, and prints what each collection now has.
// Usage: npm run db:indexes
require('dotenv').config({ quiet: true });

const { connectDB, disconnectDB } = require('../config/db');
const models = require('../models');

const run = async () => {
  await connectDB();

  for (const Model of Object.values(models)) {
    await Model.syncIndexes();
    const indexes = await Model.collection.indexes();
    console.log(`\n${Model.collection.collectionName}`);
    for (const { name, key, unique } of indexes) {
      console.log(`  ${name.padEnd(40)} ${JSON.stringify(key)}${unique ? '  unique' : ''}`);
    }
  }
};

run()
  .catch((err) => {
    console.error(`Index sync failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(disconnectDB);

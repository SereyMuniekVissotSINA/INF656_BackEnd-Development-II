const path = require('node:path');

// Shared by local development and isolated integration tests.
module.exports = {
  version: '8.2.6',
  downloadDir: path.join(__dirname, '..', '.cache', 'mongodb')
};

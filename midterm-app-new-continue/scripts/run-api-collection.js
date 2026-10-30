const path = require('node:path');
const newman = require('newman');

// Use the Node API so Windows paths containing "&" do not break a CLI shim.
newman.run({
  collection: path.join(__dirname, '..', 'postman', 'mine-app-mongodb.postman_collection.json'),
  reporters: ['cli'],
  bail: true
}, (error, summary) => {
  if (error) {
    console.error('Unable to run the Postman collection:', error.message);
    process.exitCode = 1;
    return;
  }
  if (summary.run.failures.length > 0) process.exitCode = 1;
});

const fs = require('node:fs');
const path = require('node:path');

const logDirectory = path.join(__dirname, '..', 'logs');
fs.mkdirSync(logDirectory, { recursive: true });
const logFile = path.join(logDirectory, 'requests.txt');

function requestLogger(req, res, next) {
  const entry = `${new Date().toISOString()} ${req.method} ${req.originalUrl}\n`;
  // Continue after recording the request; forward write errors.
  fs.appendFile(logFile, entry, (err) => next(err));
}

module.exports = requestLogger;

const fs = require('node:fs');
const path = require('node:path');

const logDirectory = path.join(__dirname, '..', 'logs');
fs.mkdirSync(logDirectory, { recursive: true });
const logFile = path.join(logDirectory, 'error.txt');

function errorHandler(err, req, res, next) {
  const requestedStatus = err.status || err.statusCode;
  const status = Number.isInteger(requestedStatus) &&
    requestedStatus >= 400 && requestedStatus <= 599 ? requestedStatus : 500;
  const entry = `${new Date().toISOString()} ${req.method} ${req.originalUrl} ` +
    `${status} ${err.stack || err.message}\n`;

  fs.appendFile(logFile, entry, (writeErr) => {
    if (writeErr) console.error('Could not write error log:', writeErr.message);
    if (res.headersSent) return next(err);
    let message = status >= 500 ? 'Internal Server Error' : err.message;
    if (err.type === 'entity.parse.failed') message = 'Invalid JSON in request body';
    res.status(status).json({ success: false, message });
  });
}

module.exports = errorHandler;

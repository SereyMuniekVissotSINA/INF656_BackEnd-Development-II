const express = require('express');
const path = require('node:path');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const itemRoutes = require('./routes/itemRoutes');

const app = express();

// Log every request, including static assets and malformed JSON.
app.use(requestLogger);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/items', itemRoutes);

// This handles unmatched routes, rather than unexpected application errors.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Error middleware has four parameters and must be registered last.
app.use(errorHandler);

module.exports = app;

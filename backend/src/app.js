const express = require('express');
const requestLogger = require('./middleware/requestLogger');
const notificationRoutes = require('./routes/notificationRoutes');
const logger = require('./utils/logger');

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(requestLogger);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    requestId: req.requestId
  });
});

app.use('/api/v1/notifications', notificationRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestId: req.requestId
  });
});

app.use((err, req, res, next) => {
  logger.error('Unhandled application error', {
    requestId: req.requestId,
    message: err.message,
    stack: err.stack
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    requestId: req.requestId
  });
});

module.exports = app;

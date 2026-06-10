const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

const server = app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    baseUrl: BASE_URL,
    healthCheck: `${BASE_URL}/health`,
    environment: process.env.NODE_ENV || 'development'
  });
});

server.on('error', (error) => {
  logger.error('Server failed to start', {
    message: error.message,
    stack: error.stack
  });

  process.exit(1);
});

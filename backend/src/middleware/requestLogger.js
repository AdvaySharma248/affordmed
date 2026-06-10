const crypto = require('crypto');
const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  const requestId = crypto.randomUUID();
  const startedAt = process.hrtime.bigint();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  logger.info('HTTP request received', {
    requestId,
    method: req.method,
    url: req.originalUrl,
  });

  res.on('finish', () => {
    const finishedAt = process.hrtime.bigint();
    const responseTimeMs = Number(finishedAt - startedAt) / 1_000_000;

    logger.info('HTTP request completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTimeMs.toFixed(2)}ms`,
    });
  });

  next();
}

module.exports = requestLogger;

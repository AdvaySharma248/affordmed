function formatEntry(level, message, metadata = {}) {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...metadata,
  };
}

const logger = {
  info(message, metadata) {
    console.log('[INFO]', message, formatEntry('info', message, metadata));
  },
  warn(message, metadata) {
    console.warn('[WARN]', message, formatEntry('warn', message, metadata));
  },
  error(message, metadata) {
    console.error('[ERROR]', message, formatEntry('error', message, metadata));
  },
};

export default logger;

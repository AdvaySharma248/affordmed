const fs = require('fs');
const path = require('path');

const logDirectory = path.join(__dirname, '../../logs');
const logFilePath = path.join(logDirectory, 'app.log');

fs.mkdirSync(logDirectory, { recursive: true });

const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

function formatLogEntry(level, message, metadata = {}) {
  return JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

function writeLog(level, message, metadata) {
  const logEntry = `${formatLogEntry(level, message, metadata)}\n`;
  const terminalStream = level === 'error' ? process.stderr : process.stdout;

  terminalStream.write(formatTerminalEntry(level, message, metadata));

  logStream.write(logEntry, (error) => {
    if (error) {
      process.stderr.write(`Failed to write log: ${error.message}\n`);
    }
  });
}

function formatTerminalEntry(level, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const details = Object.entries(metadata)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');

  return `[${timestamp}] ${level.toUpperCase()} ${message}${details ? ` | ${details}` : ''}\n`;
}

const logger = {
  info(message, metadata) {
    writeLog('info', message, metadata);
  },

  error(message, metadata) {
    writeLog('error', message, metadata);
  }
};

module.exports = logger;

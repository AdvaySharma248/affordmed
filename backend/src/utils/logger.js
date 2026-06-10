const fs = require('fs');
const path = require('path');

const logDirectory = path.join(__dirname, '../../logs');
const logFilePath = path.join(logDirectory, 'app.log');
fs.mkdirSync(logDirectory, { recursive: true });
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

let cachedToken = null;
let tokenExpiry = 0;

async function getLogAuthToken() {
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }
  try {
    const response = await fetch('http://4.224.186.213/evaluation-service/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'advay.sharma@example.com',
        name: 'Advay Sharma',
        rollNo: 'AS-999123',
        accessCode: 'RPsgYt',
        clientID: '57dea0e6-db83-40ae-9957-8108001a961b',
        clientSecret: 'kfVCXAhprbNAEhgB'
      })
    });
    if (response.ok) {
      const data = await response.json();
      cachedToken = data.access_token;
      tokenExpiry = data.expires_in * 1000;
      return cachedToken;
    }
  } catch (err) {
    process.stderr.write(`Logger auth failed: ${err.message}\n`);
  }
  return null;
}

function sendToApi(level, message, metadata = {}) {
  getLogAuthToken().then((token) => {
    if (!token) return;
    
    const cleanMsg = typeof message === 'string' ? message : JSON.stringify(message);
    const logMsg = cleanMsg.length >= 5 ? cleanMsg : `${cleanMsg} (log)`;

    fetch('http://4.224.186.213/evaluation-service/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        stack: 'backend',
        level: level,
        package: 'backend',
        message: `${logMsg} | ${JSON.stringify(metadata)}`
      })
    }).catch((err) => {
      process.stderr.write(`API Log delivery failed: ${err.message}\n`);
    });
  }).catch((err) => {
    process.stderr.write(`API Log token error: ${err.message}\n`);
  });
}

function writeLog(level, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = JSON.stringify({
    level,
    message,
    timestamp,
    ...metadata
  });

  const details = Object.entries(metadata)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');
  const terminalMsg = `[${timestamp}] ${level.toUpperCase()} ${message}${details ? ` | ${details}` : ''}\n`;
  
  const terminalStream = level === 'error' || level === 'fatal' ? process.stderr : process.stdout;
  terminalStream.write(terminalMsg);

  logStream.write(`${logEntry}\n`, (error) => {
    if (error) {
      process.stderr.write(`Failed to write local log: ${error.message}\n`);
    }
  });

  sendToApi(level, message, metadata);
}

const logger = {
  debug(message, metadata) {
    writeLog('debug', message, metadata);
  },
  info(message, metadata) {
    writeLog('info', message, metadata);
  },
  warn(message, metadata) {
    writeLog('warn', message, metadata);
  },
  error(message, metadata) {
    writeLog('error', message, metadata);
  },
  fatal(message, metadata) {
    writeLog('fatal', message, metadata);
  }
};

module.exports = logger;

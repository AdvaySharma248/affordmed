async function getLogAuthToken() {
  let token = window.localStorage.getItem('notificationApiToken');
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && Date.now() / 1000 < payload.exp - 60) {
          return token;
        }
      }
    } catch (error) {
      console.warn('[WARN] Unable to parse stored log token', error);
    }
  }

  try {
    const res = await fetch('http://4.224.186.213/evaluation-service/auth', {
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
    if (res.ok) {
      const data = await res.json();
      token = data.access_token;
      window.localStorage.setItem('notificationApiToken', token);
      return token;
    }
  } catch (error) {
    console.warn('[WARN] Unable to send frontend log to evaluation service', error);
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
        stack: 'frontend',
        level: level,
        package: 'api',
        message: `${logMsg} | ${JSON.stringify(metadata)}`
      })
    }).catch(() => {});
  }).catch(() => {});
}

const logger = {
  debug(message, metadata) {
    console.debug('[DEBUG]', message, metadata);
    sendToApi('debug', message, metadata);
  },
  info(message, metadata) {
    console.log('[INFO]', message, metadata);
    sendToApi('info', message, metadata);
  },
  warn(message, metadata) {
    console.warn('[WARN]', message, metadata);
    sendToApi('warn', message, metadata);
  },
  error(message, metadata) {
    console.error('[ERROR]', message, metadata);
    sendToApi('error', message, metadata);
  },
  fatal(message, metadata) {
    console.error('[FATAL]', message, metadata);
    sendToApi('fatal', message, metadata);
  }
};

export default logger;

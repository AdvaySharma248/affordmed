const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const allowedTypes = ['Placement', 'Event', 'Result'];
const notificationsFilePath = path.join(__dirname, 'notifications.json');
const LIST_CACHE_TTL_MS = 30 * 1000;

const listCache = new Map();
const unreadCountCache = new Map();

let cachedToken = null;
let tokenExpiry = 0;
let lastFetchedAt = 0;
const CACHE_DURATION_MS = 10 * 1000;
let isFetching = false;

function ensureNotificationsFileExists() {
  if (!fs.existsSync(notificationsFilePath)) {
    saveNotifications([]);
  }
}

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  logger.info('Authenticating with evaluation service to get token');

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

  if (!response.ok) {
    const errText = await response.text();
    logger.error('Authentication failed', { status: response.status, body: errText });
    throw new Error(`Auth failed with status ${response.status}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = data.expires_in * 1000;
  
  logger.info('Token acquired successfully', { expires_in: data.expires_in });
  return cachedToken;
}

async function syncWithAssessmentApi() {
  if (isFetching) return;
  isFetching = true;

  try {
    const token = await getAccessToken();
    logger.info('Fetching notifications from evaluation service');
    
    const response = await fetch('http://4.224.186.213/evaluation-service/notifications', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error('Failed to fetch notifications from evaluation service', { status: response.status, body: errText });
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    const data = await response.json();
    const apiNotifs = data.notifications || [];
    
    logger.info('Received notifications from evaluation service', { count: apiNotifs.length });

    const existing = loadNotificationsFromFile();
    const existingMap = new Map(existing.map(n => [n.id, n]));

    const mappedList = apiNotifs.map(item => {
      const existingItem = existingMap.get(item.ID);
      if (existingItem) {
        return {
          ...existingItem,
          type: item.Type,
          message: item.Message
        };
      }
      return {
        id: item.ID,
        studentId: 'stu_501',
        type: item.Type,
        title: `${item.Type} Alert`,
        message: item.Message,
        isRead: false,
        createdAt: new Date(item.Timestamp.replace(' ', 'T') + 'Z').toISOString(),
        readAt: null
      };
    });

    const apiIds = new Set(apiNotifs.map(item => item.ID));
    const localOnly = existing.filter(n => !apiIds.has(n.id));
    const merged = [...mappedList, ...localOnly];

    saveNotifications(merged);
    invalidateNotificationCaches();
    
    logger.info('Merged and saved notifications to local store');
  } catch (err) {
    logger.error('Error in syncWithAssessmentApi', { error: err.message });
  } finally {
    isFetching = false;
  }
}

function mapEvaluationNotification(item) {
  return {
    id: item.ID || item.id,
    studentId: item.studentId || 'evaluation-api',
    type: item.Type || item.type,
    title: `${item.Type || item.type || 'Notification'} Alert`,
    message: item.Message || item.message || '',
    isRead: Boolean(item.isRead),
    createdAt: item.Timestamp
      ? new Date(item.Timestamp.replace(' ', 'T')).toISOString()
      : item.createdAt || item.created_at || new Date().toISOString(),
    readAt: item.readAt || null
  };
}

function buildEvaluationListUrl({ page = 1, limit = 20, type } = {}) {
  const url = new URL('http://4.224.186.213/evaluation-service/notifications');
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));

  if (type) {
    url.searchParams.set('notification_type', type);
  }

  return url;
}

async function fetchEvaluationNotifications({ page = 1, limit = 20, type } = {}) {
  const token = await getAccessToken();

  if (limit <= 10) {
    const url = buildEvaluationListUrl({ page, limit, type });
    logger.info('Fetching notifications from evaluation service', {
      page,
      limit,
      notification_type: type || 'All'
    });

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      logger.error('Failed to fetch notifications from evaluation service', {
        status: response.status,
        body: JSON.stringify(payload)
      });
      throw new Error(payload?.message || `Fetch failed with status ${response.status}`);
    }

    const rawNotifications = Array.isArray(payload)
      ? payload
      : payload?.notifications || payload?.data?.notifications || payload?.data || [];
    const data = rawNotifications.map(mapEvaluationNotification);
    const totalItems = payload?.pagination?.totalItems || payload?.total || page * limit + (data.length === limit ? 1 : 0);
    const totalPages = payload?.pagination?.totalPages || Math.max(page, Math.ceil(totalItems / limit));

    logger.info('Received notifications from evaluation service', {
      count: data.length,
      page,
      limit,
      notification_type: type || 'All'
    });

    return {
      data,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: payload?.pagination?.hasNextPage ?? data.length === limit,
        hasPreviousPage: page > 1
      }
    };
  } else {
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const startEvalPage = Math.floor(startIndex / 10) + 1;
    const endEvalPage = Math.floor((endIndex - 1) / 10) + 1;

    logger.info('Fetching notifications in batches from evaluation service', {
      page,
      limit,
      startEvalPage,
      endEvalPage,
      notification_type: type || 'All'
    });

    let allRawNotifications = [];
    let reachedEnd = false;
    let totalItems = 0;

    for (let evalPage = startEvalPage; evalPage <= endEvalPage; evalPage++) {
      const url = buildEvaluationListUrl({ page: evalPage, limit: 10, type });
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        logger.error('Failed to fetch notification batch from evaluation service', {
          evalPage,
          status: response.status,
          body: JSON.stringify(payload)
        });
        throw new Error(payload?.message || `Fetch batch failed with status ${response.status}`);
      }

      const rawNotifications = Array.isArray(payload)
        ? payload
        : payload?.notifications || payload?.data?.notifications || payload?.data || [];

      allRawNotifications = allRawNotifications.concat(rawNotifications);
      
      const payloadTotal = payload?.pagination?.totalItems || payload?.total;
      if (payloadTotal !== undefined) {
        totalItems = payloadTotal;
      }

      if (rawNotifications.length < 10) {
        reachedEnd = true;
        break;
      }
    }

    const data = allRawNotifications.map(mapEvaluationNotification);
    const sliceStart = startIndex - (startEvalPage - 1) * 10;
    const sliceEnd = sliceStart + limit;
    const slicedData = data.slice(sliceStart, sliceEnd);

    if (totalItems === 0) {
      totalItems = reachedEnd 
        ? (startEvalPage - 1) * 10 + data.length 
        : page * limit + (slicedData.length === limit ? 1 : 0);
    }
    const totalPages = Math.max(page, Math.ceil(totalItems / limit));

    return {
      data: slicedData,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: !reachedEnd && slicedData.length === limit,
        hasPreviousPage: page > 1
      }
    };
  }
}

function loadNotificationsFromFile() {
  ensureNotificationsFileExists();
  try {
    logger.info('Reading notifications from local file store');
    const fileContents = fs.readFileSync(notificationsFilePath, 'utf8');
    const notifications = JSON.parse(fileContents);
    return Array.isArray(notifications) ? notifications : [];
  } catch (error) {
    logger.error('Failed to read notifications from file store', { error: error.message });
    return [];
  }
}

function loadNotifications() {
  const now = Date.now();
  if (now - lastFetchedAt > CACHE_DURATION_MS) {
    lastFetchedAt = now;
    syncWithAssessmentApi().catch(err => {
      logger.error('Failed to sync with API', { error: err.message });
    });
  }
  return loadNotificationsFromFile();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getCachedValue(cache, key) {
  const cached = cache.get(key);

  if (!cached || cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return clone(cached.value);
}

function setCachedValue(cache, key, value, ttlMs) {
  cache.set(key, {
    value: clone(value),
    expiresAt: Date.now() + ttlMs
  });
}

function invalidateNotificationCaches(studentId) {
  listCache.clear();

  if (studentId) {
    unreadCountCache.delete(studentId);
    return;
  }

  unreadCountCache.clear();
}

function saveNotifications(notifications) {
  logger.info('Writing notifications to local file store', { count: notifications.length });
  fs.writeFileSync(
    notificationsFilePath,
    `${JSON.stringify(notifications, null, 2)}\n`,
    'utf8'
  );
}

function getAllowedTypes() {
  return allowedTypes;
}

function getNotifications({
  studentId,
  type,
  isRead,
  page = 1,
  limit = 20,
  cursor
}) {
  logger.info('Executing service getNotifications', { studentId, type, isRead, page, limit });
  const cacheKey = JSON.stringify({
    studentId,
    type,
    isRead,
    page,
    limit,
    cursor
  });
  const cachedResult = getCachedValue(listCache, cacheKey);

  if (cachedResult) {
    return cachedResult;
  }

  let filteredNotifications = loadNotifications();

  if (studentId) {
    filteredNotifications = filteredNotifications.filter(
      (notification) => notification.studentId === studentId
    );
  }

  if (type) {
    filteredNotifications = filteredNotifications.filter(
      (notification) => notification.type === type
    );
  }

  if (typeof isRead === 'boolean') {
    filteredNotifications = filteredNotifications.filter(
      (notification) => notification.isRead === isRead
    );
  }

  filteredNotifications.sort(
    (first, second) => new Date(second.createdAt) - new Date(first.createdAt)
  );

  if (cursor) {
    filteredNotifications = filteredNotifications.filter(
      (notification) => new Date(notification.createdAt) < new Date(cursor)
    );
  }

  const totalItems = filteredNotifications.length;
  const totalPages = Math.ceil(totalItems / limit);
  const startIndex = (page - 1) * limit;
  const data = cursor
    ? filteredNotifications.slice(0, limit)
    : filteredNotifications.slice(startIndex, startIndex + limit);
  const lastNotification = data[data.length - 1];
  const nextCursor =
    data.length === limit && lastNotification ? lastNotification.createdAt : null;

  const result = {
    data,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      nextCursor
    }
  };

  setCachedValue(listCache, cacheKey, result, LIST_CACHE_TTL_MS);

  return result;
}

function getNotificationById(notificationId) {
  const notifications = loadNotifications();

  return notifications.find((notification) => notification.id === notificationId);
}

function createNotification({ studentId, type, title, message }) {
  logger.info('Executing service createNotification', { studentId, type });
  const notifications = loadNotifications();
  const notification = {
    id: `notif_${crypto.randomUUID()}`,
    studentId,
    type,
    title,
    message,
    isRead: false,
    createdAt: new Date().toISOString(),
    readAt: null
  };

  notifications.push(notification);
  saveNotifications(notifications);
  invalidateNotificationCaches(studentId);

  return notification;
}

function createNotificationsForStudents({ studentIds, type, title, message }) {
  logger.info('Executing service createNotificationsForStudents', { type, count: studentIds.length });
  const notifications = loadNotifications();
  const createdAt = new Date().toISOString();
  const createdNotifications = studentIds.map((studentId) => ({
    id: `notif_${crypto.randomUUID()}`,
    studentId,
    type,
    title,
    message,
    isRead: false,
    createdAt,
    readAt: null
  }));

  notifications.push(...createdNotifications);
  saveNotifications(notifications);
  invalidateNotificationCaches();

  return createdNotifications;
}

function markNotificationAsRead(notificationId) {
  logger.info('Executing service markNotificationAsRead', { notificationId });
  const notifications = loadNotifications();
  const notification = notifications.find(
    (storedNotification) => storedNotification.id === notificationId
  );

  if (!notification) {
    logger.warn('Notification not found to mark as read', { notificationId });
    return null;
  }

  notification.isRead = true;
  notification.readAt = new Date().toISOString();
  saveNotifications(notifications);
  invalidateNotificationCaches(notification.studentId);

  return notification;
}

function markAllNotificationsAsRead() {
  logger.info('Executing service markAllNotificationsAsRead');
  const notifications = loadNotifications();
  let updatedCount = 0;
  const readAt = new Date().toISOString();

  notifications.forEach((notification) => {
    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = readAt;
      updatedCount += 1;
    }
  });

  if (updatedCount > 0) {
    saveNotifications(notifications);
    invalidateNotificationCaches();
  }

  return updatedCount;
}

function deleteNotification(notificationId) {
  logger.info('Executing service deleteNotification', { notificationId });
  const notifications = loadNotifications();
  const notificationIndex = notifications.findIndex(
    (notification) => notification.id === notificationId
  );

  if (notificationIndex === -1) {
    logger.warn('Notification not found to delete', { notificationId });
    return false;
  }

  const [deletedNotification] = notifications.splice(notificationIndex, 1);
  saveNotifications(notifications);
  invalidateNotificationCaches(deletedNotification.studentId);

  return true;
}

function getUnreadCount(studentId) {
  const cacheKey = studentId || 'all';
  const cachedCount = getCachedValue(unreadCountCache, cacheKey);

  if (cachedCount !== null) {
    return cachedCount;
  }

  const notifications = loadNotifications();
  const unreadCount = notifications.filter((notification) => {
    if (notification.isRead) {
      return false;
    }

    return studentId ? notification.studentId === studentId : true;
  }).length;

  setCachedValue(unreadCountCache, cacheKey, unreadCount, LIST_CACHE_TTL_MS);

  return unreadCount;
}

function getRecentNotifications({ studentId, limit = 10 }) {
  return getNotifications({
    studentId,
    limit,
    page: 1
  }).data;
}

module.exports = {
  getAllowedTypes,
  getNotifications,
  getNotificationById,
  createNotification,
  createNotificationsForStudents,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount,
  getRecentNotifications,
  fetchEvaluationNotifications
};

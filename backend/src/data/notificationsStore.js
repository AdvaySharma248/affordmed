const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const allowedTypes = ['Placement', 'Event', 'Result'];
const notificationsFilePath = path.join(__dirname, 'notifications.json');
const LIST_CACHE_TTL_MS = 30 * 1000;

const listCache = new Map();
const unreadCountCache = new Map();

const defaultNotifications = [
  {
    id: 'notif_101',
    studentId: 'stu_501',
    type: 'Placement',
    title: 'Placement Update',
    message: 'You have been shortlisted for the next interview round.',
    isRead: false,
    createdAt: '2026-06-10T10:30:00.000Z',
    readAt: null
  },
  {
    id: 'notif_102',
    studentId: 'stu_501',
    type: 'Event',
    title: 'Campus Event Reminder',
    message: 'The technical workshop starts today at 3 PM in Seminar Hall 2.',
    isRead: false,
    createdAt: '2026-06-10T11:00:00.000Z',
    readAt: null
  },
  {
    id: 'notif_103',
    studentId: 'stu_501',
    type: 'Result',
    title: 'Result Published',
    message: 'Your semester result has been published.',
    isRead: true,
    createdAt: '2026-06-10T12:00:00.000Z',
    readAt: '2026-06-10T12:30:00.000Z'
  }
];

function ensureNotificationsFileExists() {
  if (!fs.existsSync(notificationsFilePath)) {
    saveNotifications(defaultNotifications);
  }
}

function loadNotifications() {
  ensureNotificationsFileExists();

  try {
    const fileContents = fs.readFileSync(notificationsFilePath, 'utf8');
    const notifications = JSON.parse(fileContents);

    return Array.isArray(notifications) ? notifications : [];
  } catch (error) {
    return [];
  }
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
  const notifications = loadNotifications();
  const notification = notifications.find(
    (storedNotification) => storedNotification.id === notificationId
  );

  if (!notification) {
    return null;
  }

  notification.isRead = true;
  notification.readAt = new Date().toISOString();
  saveNotifications(notifications);
  invalidateNotificationCaches(notification.studentId);

  return notification;
}

function markAllNotificationsAsRead() {
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
  const notifications = loadNotifications();
  const notificationIndex = notifications.findIndex(
    (notification) => notification.id === notificationId
  );

  if (notificationIndex === -1) {
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
  getRecentNotifications
};

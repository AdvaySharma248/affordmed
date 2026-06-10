const crypto = require('crypto');

const allowedTypes = ['Placement', 'Event', 'Result'];

const notifications = [
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

function getAllowedTypes() {
  return allowedTypes;
}

function getNotifications({ type, isRead, page = 1, limit = 20 }) {
  let filteredNotifications = [...notifications];

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

  const totalItems = filteredNotifications.length;
  const totalPages = Math.ceil(totalItems / limit);
  const startIndex = (page - 1) * limit;
  const data = filteredNotifications.slice(startIndex, startIndex + limit);

  return {
    data,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  };
}

function getNotificationById(notificationId) {
  return notifications.find((notification) => notification.id === notificationId);
}

function createNotification({ studentId, type, title, message }) {
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
  return notification;
}

function markNotificationAsRead(notificationId) {
  const notification = getNotificationById(notificationId);

  if (!notification) {
    return null;
  }

  notification.isRead = true;
  notification.readAt = new Date().toISOString();

  return notification;
}

function markAllNotificationsAsRead() {
  let updatedCount = 0;
  const readAt = new Date().toISOString();

  notifications.forEach((notification) => {
    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = readAt;
      updatedCount += 1;
    }
  });

  return updatedCount;
}

function deleteNotification(notificationId) {
  const notificationIndex = notifications.findIndex(
    (notification) => notification.id === notificationId
  );

  if (notificationIndex === -1) {
    return false;
  }

  notifications.splice(notificationIndex, 1);
  return true;
}

module.exports = {
  getAllowedTypes,
  getNotifications,
  getNotificationById,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
};

const express = require('express');
const {
  getAllowedTypes,
  getNotifications,
  getNotificationById,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} = require('../data/notificationsStore');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.write('event: connected\n');
  res.write(`data: ${JSON.stringify({ success: true, message: 'SSE connected' })}\n\n`);
});

router.get('/', (req, res) => {
  const validationError = validateListQuery(req.query);

  if (validationError) {
    return sendBadRequest(res, validationError, req.requestId);
  }

  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const isRead = parseBoolean(req.query.isRead);
  const type = req.query.type || req.query.notification_type;
  const { data, pagination } = getNotifications({
    type,
    isRead,
    page,
    limit
  });

  res.status(200).json({
    success: true,
    message: 'Notifications fetched successfully',
    data,
    pagination,
    requestId: req.requestId
  });
});

router.get('/:notificationId', (req, res) => {
  const notification = getNotificationById(req.params.notificationId);

  if (!notification) {
    return sendNotFound(res, req.requestId);
  }

  res.status(200).json({
    success: true,
    message: 'Notification fetched successfully',
    data: notification,
    requestId: req.requestId
  });
});

router.post('/', (req, res) => {
  const validationError = validateCreateBody(req.body);

  if (validationError) {
    return sendBadRequest(res, validationError, req.requestId);
  }

  const notification = createNotification(req.body);

  res.status(201).json({
    success: true,
    message: 'Notification created successfully',
    data: notification,
    requestId: req.requestId
  });
});

router.patch('/read-all', (req, res) => {
  const updatedCount = markAllNotificationsAsRead();

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
    data: {
      updatedCount
    },
    requestId: req.requestId
  });
});

router.patch('/:notificationId/read', (req, res) => {
  const notification = markNotificationAsRead(req.params.notificationId);

  if (!notification) {
    return sendNotFound(res, req.requestId);
  }

  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
    data: {
      id: notification.id,
      isRead: notification.isRead,
      readAt: notification.readAt
    },
    requestId: req.requestId
  });
});

router.delete('/:notificationId', (req, res) => {
  const wasDeleted = deleteNotification(req.params.notificationId);

  if (!wasDeleted) {
    return sendNotFound(res, req.requestId);
  }

  res.status(200).json({
    success: true,
    message: 'Notification deleted successfully',
    requestId: req.requestId
  });
});

function validateListQuery(query) {
  const allowedTypes = getAllowedTypes();
  const type = query.type || query.notification_type;

  if (query.type && query.notification_type && query.type !== query.notification_type) {
    return 'Use either type or notification_type, not both with different values.';
  }

  if (type && !allowedTypes.includes(type)) {
    return 'The notification type must be Placement, Event, or Result.';
  }

  if (query.isRead !== undefined && parseBoolean(query.isRead) === null) {
    return 'The isRead filter must be true or false.';
  }

  if (query.page !== undefined && !isPositiveInteger(query.page)) {
    return 'The page value must be a positive number.';
  }

  if (query.limit !== undefined && !isPositiveInteger(query.limit)) {
    return 'The limit value must be a positive number.';
  }

  if (Number(query.limit) > 100) {
    return 'The limit value cannot be greater than 100.';
  }

  return null;
}

function validateCreateBody(body) {
  const allowedTypes = getAllowedTypes();

  if (!body.studentId || !body.type || !body.title || !body.message) {
    return 'studentId, type, title, and message are required.';
  }

  if (!allowedTypes.includes(body.type)) {
    return 'The notification type must be Placement, Event, or Result.';
  }

  return null;
}

function parseBoolean(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === 'true' || value === true) {
    return true;
  }

  if (value === 'false' || value === false) {
    return false;
  }

  return null;
}

function isPositiveInteger(value) {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0;
}

function sendBadRequest(res, details, requestId) {
  return res.status(400).json({
    success: false,
    message: 'Invalid request data',
    error: {
      code: 'VALIDATION_ERROR',
      details
    },
    requestId
  });
}

function sendNotFound(res, requestId) {
  return res.status(404).json({
    success: false,
    message: 'Notification not found',
    error: {
      code: 'NOTIFICATION_NOT_FOUND',
      details: 'No notification exists for the provided notification ID.'
    },
    requestId
  });
}

module.exports = router;

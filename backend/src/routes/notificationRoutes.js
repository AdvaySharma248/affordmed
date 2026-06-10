const express = require('express');
const {
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
} = require('../data/notificationsStore');
const requireAuth = require('../middleware/requireAuth');
const logger = require('../utils/logger');

const router = express.Router();
const streamClients = new Set();

router.use(requireAuth);

router.get('/stream', (req, res) => {
  logger.info('Route execution: GET /api/v1/notifications/stream', { requestId: req.requestId });
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const client = {
    res,
    studentId: req.query.studentId
  };

  streamClients.add(client);
  sendStreamEvent(res, 'connected', {
    success: true,
    message: 'SSE connected'
  });

  req.on('close', () => {
    streamClients.delete(client);
  });
});

router.get('/', async (req, res, next) => {
  logger.info('Route execution: GET /api/v1/notifications', { requestId: req.requestId, query: req.query });
  const validationError = validateListQuery(req.query);

  if (validationError) {
    logger.warn('Validation failed in route execution', { requestId: req.requestId, error: validationError });
    return sendBadRequest(res, validationError, req.requestId);
  }

  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const type = req.query.type || req.query.notification_type;

  try {
    const { data, pagination } = await fetchEvaluationNotifications({
      type,
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
  } catch (error) {
    next(error);
  }
});

router.get('/unread-count', (req, res) => {
  logger.info('Route execution: GET /api/v1/notifications/unread-count', { requestId: req.requestId, query: req.query });
  res.status(200).json({
    success: true,
    message: 'Unread notification count fetched successfully',
    data: {
      studentId: req.query.studentId || null,
      unreadCount: getUnreadCount(req.query.studentId)
    },
    requestId: req.requestId
  });
});

router.get('/recent', (req, res) => {
  logger.info('Route execution: GET /api/v1/notifications/recent', { requestId: req.requestId, query: req.query });
  const validationError = validateRecentQuery(req.query);

  if (validationError) {
    logger.warn('Validation failed in route execution', { requestId: req.requestId, error: validationError });
    return sendBadRequest(res, validationError, req.requestId);
  }

  const limit = Number(req.query.limit || 10);

  res.status(200).json({
    success: true,
    message: 'Recent notifications fetched successfully',
    data: getRecentNotifications({
      studentId: req.query.studentId,
      limit
    }),
    requestId: req.requestId
  });
});

router.get('/:notificationId', (req, res) => {
  logger.info('Route execution: GET /api/v1/notifications/:notificationId', { requestId: req.requestId, notificationId: req.params.notificationId });
  const notification = getNotificationById(req.params.notificationId);

  if (!notification) {
    logger.warn('Notification not found in route execution', { requestId: req.requestId, notificationId: req.params.notificationId });
    return sendNotFound(res, req.requestId);
  }

  res.status(200).json({
    success: true,
    message: 'Notification fetched successfully',
    data: notification,
    requestId: req.requestId
  });
});

router.post('/batch', (req, res) => {
  logger.info('Route execution: POST /api/v1/notifications/batch', { requestId: req.requestId, body: req.body });
  const validationError = validateBatchCreateBody(req.body);

  if (validationError) {
    logger.warn('Validation failed in route execution', { requestId: req.requestId, error: validationError });
    return sendBadRequest(res, validationError, req.requestId);
  }

  const notifications = createNotificationsForStudents(req.body);

  notifications.forEach((notification) => {
    broadcastNotificationEvent('notification.created', {
      notification,
      studentId: notification.studentId
    });
  });

  res.status(201).json({
    success: true,
    message: 'Notifications created successfully',
    data: {
      createdCount: notifications.length,
      notifications
    },
    requestId: req.requestId
  });
});

router.post('/', (req, res) => {
  logger.info('Route execution: POST /api/v1/notifications', { requestId: req.requestId, body: req.body });
  const validationError = validateCreateBody(req.body);

  if (validationError) {
    logger.warn('Validation failed in route execution', { requestId: req.requestId, error: validationError });
    return sendBadRequest(res, validationError, req.requestId);
  }

  const notification = createNotification(req.body);
  broadcastNotificationEvent('notification.created', {
    notification,
    studentId: notification.studentId
  });

  res.status(201).json({
    success: true,
    message: 'Notification created successfully',
    data: notification,
    requestId: req.requestId
  });
});

router.patch('/read-all', (req, res) => {
  logger.info('Route execution: PATCH /api/v1/notifications/read-all', { requestId: req.requestId });
  const updatedCount = markAllNotificationsAsRead();
  broadcastNotificationEvent('notifications.read_all', {
    updatedCount,
    studentId: null
  });

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
  logger.info('Route execution: PATCH /api/v1/notifications/:notificationId/read', { requestId: req.requestId, notificationId: req.params.notificationId });
  const notification = markNotificationAsRead(req.params.notificationId);

  if (!notification) {
    logger.warn('Notification not found in route execution', { requestId: req.requestId, notificationId: req.params.notificationId });
    return sendNotFound(res, req.requestId);
  }

  broadcastNotificationEvent('notification.read', {
    notification,
    studentId: notification.studentId
  });

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
  logger.info('Route execution: DELETE /api/v1/notifications/:notificationId', { requestId: req.requestId, notificationId: req.params.notificationId });
  const notification = getNotificationById(req.params.notificationId);
  const wasDeleted = deleteNotification(req.params.notificationId);

  if (!wasDeleted) {
    logger.warn('Notification not found in route execution', { requestId: req.requestId, notificationId: req.params.notificationId });
    return sendNotFound(res, req.requestId);
  }

  broadcastNotificationEvent('notification.deleted', {
    notificationId: req.params.notificationId,
    studentId: notification ? notification.studentId : null
  });

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

  if (query.cursor !== undefined && Number.isNaN(Date.parse(query.cursor))) {
    return 'The cursor value must be a valid date string.';
  }

  return null;
}

function validateRecentQuery(query) {
  if (query.limit !== undefined && !isPositiveInteger(query.limit)) {
    return 'The limit value must be a positive number.';
  }

  if (Number(query.limit) > 50) {
    return 'The recent notifications limit cannot be greater than 50.';
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

function validateBatchCreateBody(body) {
  const allowedTypes = getAllowedTypes();

  if (!Array.isArray(body.studentIds) || body.studentIds.length === 0) {
    return 'studentIds must be a non-empty array.';
  }

  if (body.studentIds.length > 500) {
    return 'A batch request cannot include more than 500 students.';
  }

  if (!body.type || !body.title || !body.message) {
    return 'type, title, and message are required.';
  }

  if (!allowedTypes.includes(body.type)) {
    return 'The notification type must be Placement, Event, or Result.';
  }

  if (body.studentIds.some((studentId) => typeof studentId !== 'string' || !studentId.trim())) {
    return 'Every studentId must be a non-empty string.';
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

function sendStreamEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcastNotificationEvent(event, data) {
  streamClients.forEach((client) => {
    if (client.studentId && data.studentId && client.studentId !== data.studentId) {
      return;
    }

    sendStreamEvent(client.res, event, data);
  });
}

module.exports = router;

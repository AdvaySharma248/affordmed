import logger from '../utils/logger';

const API_BASE = import.meta.env.VITE_NOTIFICATION_API_BASE || 'http://127.0.0.1:5000/api/v1/notifications';
const DEFAULT_LIMIT = 10;
const TOP_FETCH_LIMIT = 10;
const SEEDED_ACCESS_TOKEN =
  import.meta.env.VITE_NOTIFICATION_ACCESS_TOKEN ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJhZHZheS5zaGFybWFfY3MyM0BnbWFpbC5jb20iLCJleHAiOjE3ODEwNzgyMDEsImlhdCI6MTc4MTA3NzMwMSwiaXNzIjoiQWZmb3JkIE1lZGljYWwgVGVjaG5vbG9naWVzIFByaXZhdGUgTGltaXRlZCIsImp0aSI6ImJlMjMxNTVkLWYyY2UtNDMzYi1iMWMwLTNmYTYzZTc3NWQ5NyIsImxvY2FsZSI6ImVuLUlOIiwibmFtZSI6ImFkdmF5IHNoYXJtYSIsInN1YiI6ImRkOGUxZTU3LWI1ZGQtNDVkMi1iNDk4LWNlMWU0M2FlY2E3NCJ9LCJlbWFpbCI6ImFkdmF5LnNoYXJtYV9jczIzQGdtYWlsLmNvbSIsIm5hbWUiOiJhZHZheSBzaGFybWEiLCJyb2xsTm8iOiIyMzE1MDAwMTYwIiwiYWNjZXNzQ29kZSI6IlJQc2dZdCIsImNsaWVudElEIjoiZGQ4ZTFlNTctYjVkZC00NWQyLWI0OTgtY2UxZTQzYWVjYTc0IiwiY2xpZW50U2VjcmV0IjoidEpRTmFHaEtxWHBmeW1TTiJ9.CZTcb190EGLo8-sbHqWwlMfHQypODVuTWp7M0yd60KU';

function isUsableJwt(token) {
  if (!token) {
    return false;
  }

  try {
    const [, payload] = token.split('.');
    const decoded = JSON.parse(atob(payload));
    return !decoded.exp || Date.now() / 1000 < decoded.exp - 60;
  } catch {
    return false;
  }
}

function getAuthToken({ forceSeed = false } = {}) {
  if (forceSeed) {
    window.localStorage.setItem('notificationApiToken', SEEDED_ACCESS_TOKEN);
    return SEEDED_ACCESS_TOKEN;
  }

  const storedToken = window.localStorage.getItem('notificationApiToken');

  if (isUsableJwt(storedToken)) {
    return storedToken;
  }

  window.localStorage.setItem('notificationApiToken', SEEDED_ACCESS_TOKEN);
  return SEEDED_ACCESS_TOKEN;
}

function createUrl({ page = 1, limit = DEFAULT_LIMIT, notificationType } = {}) {
  const url = new URL(API_BASE);
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));
  if (notificationType && notificationType !== 'All') {
    url.searchParams.set('notification_type', notificationType);
  }
  return url;
}

function getHeaders(options) {
  const token = getAuthToken(options);
  return {
    Authorization: `Bearer ${token}`,
  };
}

function extractNotifications(payload) {
  const rawItems = Array.isArray(payload)
    ? payload
    : payload?.notifications ||
      payload?.data?.notifications ||
      payload?.data ||
      payload?.items ||
      [];
  
  return rawItems.map((item) => ({
    id: item.ID || item.id,
    type: item.Type || item.type,
    message: item.Message || item.message,
    createdAt: item.Timestamp || item.createdAt || item.created_at,
    isRead: item.isRead || false,
  }));
}

function extractPagination(payload, page, limit, count) {
  const pagination = payload?.pagination || payload?.data?.pagination || {};
  const totalItems =
    pagination.totalItems ||
    pagination.total ||
    pagination.total_items ||
    payload?.total ||
    (pagination.totalPages || pagination.total_pages ? count : page * limit + (count === limit ? 1 : 0));
  const totalPages =
    pagination.totalPages ||
    pagination.total_pages ||
    Math.max(page, Math.ceil(totalItems / limit));

  return {
    page: pagination.page || page,
    limit: pagination.limit || limit,
    totalItems,
    totalPages,
    hasNextPage:
      pagination.hasNextPage ??
      pagination.has_next_page ??
      count === limit,
    hasPreviousPage:
      pagination.hasPreviousPage ??
      pagination.has_previous_page ??
      page > 1,
  };
}

export async function fetchNotifications({
  page = 1,
  limit = DEFAULT_LIMIT,
  notificationType,
} = {}) {
  const url = createUrl({ page, limit, notificationType });
  logger.info('Fetching notifications', { page, limit, notificationType: notificationType || 'All' });

  let headers = getHeaders();
  let res = await fetch(url.toString(), { headers });
  const payload = await res.json().catch(() => null);

  if (res.status === 401 || payload?.message === 'invalid authorization token') {
    logger.info('Stored token rejected by notification API, retrying with seeded access token');
    headers = getHeaders({ forceSeed: true });
    res = await fetch(url.toString(), { headers });
    const retryPayload = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = retryPayload?.message || `Notification API failed with HTTP ${res.status}`;
      logger.error('Failed to fetch notifications after token retry', { status: res.status, message: msg });
      throw new Error(msg);
    }

    const notifications = extractNotifications(retryPayload);
    return {
      notifications,
      pagination: extractPagination(retryPayload, page, limit, notifications.length),
    };
  }

  if (!res.ok) {
    const msg = payload?.message || `Notification API failed with HTTP ${res.status}`;
    logger.error('Failed to fetch notifications', { status: res.status, message: msg });
    throw new Error(msg);
  }

  const notifications = extractNotifications(payload);
  return {
    notifications,
    pagination: extractPagination(payload, page, limit, notifications.length),
  };
}

export async function fetchTopNotificationPages({
  onPage,
  notificationType,
  limit = TOP_FETCH_LIMIT,
  maxPages = 20,
} = {}) {
  let page = 1;
  let lastPagination = null;
  const seenNotificationKeys = new Set();

  while (page <= maxPages) {
    const result = await fetchNotifications({ page, limit, notificationType });
    const uniqueNotifications = result.notifications.filter((notification) => {
      const key =
        notification.id ||
        notification.ID ||
        `${notification.type || notification.Type}-${notification.createdAt || notification.Timestamp}-${notification.message || notification.Message}`;

      if (seenNotificationKeys.has(key)) {
        return false;
      }

      seenNotificationKeys.add(key);
      return true;
    });

    if (uniqueNotifications.length === 0) {
      break;
    }

    onPage(uniqueNotifications);
    lastPagination = result.pagination;
    if (!result.pagination.hasNextPage || result.notifications.length === 0) {
      break;
    }
    page += 1;
  }
  return lastPagination;
}

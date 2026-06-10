import logger from '../utils/logger';

const API_BASE = '/api/v1/notifications';

export async function fetchNotifications({ page = 1, limit = 20, type } = {}) {
  const url = new URL(API_BASE, window.location.origin);
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));
  if (type) url.searchParams.set('type', type);

  logger.info('Fetching notifications', { page, limit, type: type || 'All' });

  const res = await fetch(url.toString(), {
    headers: { Authorization: 'Bearer campus-token' },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.message || `HTTP ${res.status}`;
    logger.error('Failed to fetch notifications', { status: res.status, message: msg });
    throw new Error(msg);
  }

  const json = await res.json();
  logger.info('Notifications fetched', { count: json.data?.length || 0, total: json.pagination?.totalItems });

  return {
    data: json.data || [],
    pagination: json.pagination || {},
  };
}

export async function fetchAllNotifications() {
  const url = new URL(API_BASE, window.location.origin);
  url.searchParams.set('page', '1');
  url.searchParams.set('limit', '100');

  logger.info('Fetching all notifications for priority calc');

  const res = await fetch(url.toString(), {
    headers: { Authorization: 'Bearer campus-token' },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.message || `HTTP ${res.status}`;
    logger.error('Failed to fetch all notifications', { status: res.status, message: msg });
    throw new Error(msg);
  }

  const json = await res.json();
  logger.info('All notifications fetched', { count: json.data?.length || 0 });
  return json.data || [];
}

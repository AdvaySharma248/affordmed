import { useEffect, useState } from 'react';
import {
  fetchNotifications,
  fetchTopNotificationPages,
} from '../services/notificationApi';
import {
  createTopNotificationsHeap,
  pushTopNotification,
} from '../utils/topNotificationsHelper';
import { compareNotificationsDesc } from '../utils/priorityHelper';
import logger from '../utils/logger';

const PAGE_SIZE = 10;
const TOP_LIMIT = 10;
const FILTERS = new Set(['All', 'Placement', 'Result', 'Event']);

function getInitialFilter() {
  const params = new URLSearchParams(window.location.search);
  const type = params.get('notification_type') || params.get('type') || 'All';
  return FILTERS.has(type) ? type : 'All';
}

function getInitialPage() {
  const params = new URLSearchParams(window.location.search);
  const page = Number(params.get('page') || 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function useNotifications() {
  const [filter, setFilter] = useState(getInitialFilter);
  const [page, setPage] = useState(getInitialPage);
  const [notifications, setNotifications] = useState([]);
  const [topNotifications, setTopNotifications] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [topLoading, setTopLoading] = useState(true);
  const [error, setError] = useState('');
  const [topError, setTopError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();

    if (page > 1) {
      params.set('page', String(page));
    }

    if (filter !== 'All') {
      params.set('notification_type', filter);
    }

    const queryString = params.toString();
    const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}`;
    window.history.replaceState(null, '', nextUrl);
  }, [filter, page]);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      setLoading(true);
      setError('');

      try {
        const result = await fetchNotifications({
          page,
          limit: PAGE_SIZE,
          notificationType: filter,
        });

        if (!isMounted) {
          return;
        }

        setNotifications(result.notifications);
        setPagination(result.pagination);
        
        if (result.notifications.length === 0) {
          logger.warn('Notification fetch returned empty array', { filter, page });
        }

        const allowedTypes = ['Placement', 'Event', 'Result'];
        const hasUnexpectedType = result.notifications.some(n => !allowedTypes.includes(n.type));
        if (hasUnexpectedType) {
          logger.warn('Received unexpected notification type from API', {
            types: result.notifications.map(n => n.type)
          });
        }

        if (page > result.pagination.totalPages && result.pagination.totalPages > 0) {
          logger.warn('Active page out of bounds', { page, totalPages: result.pagination.totalPages });
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        logger.error('Failed to load notifications in useNotifications', { error: loadError.message, filter, page });
        setNotifications([]);
        setPagination((current) => ({ ...current, totalItems: 0, totalPages: 1 }));
        setError(loadError.message || 'Unable to fetch notifications.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [filter, page]);

  useEffect(() => {
    let isMounted = true;

    async function loadTopNotifications() {
      setTopLoading(true);
      setTopError('');

      try {
        const heap = createTopNotificationsHeap();

        await fetchTopNotificationPages({
          notificationType: filter,
          onPage: (pageNotifications) => {
            pageNotifications.forEach((notification) => {
              pushTopNotification(heap, notification, TOP_LIMIT);
            });
          },
        });

        if (isMounted) {
          const list = heap.toArray().sort(compareNotificationsDesc);
          setTopNotifications(list);
          if (list.length === 0) {
            logger.warn('Top notifications list empty');
          }
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        logger.error('Failed to load top notifications in useNotifications', { error: loadError.message });
        setTopNotifications([]);
        setTopError(loadError.message || 'Unable to calculate top notifications.');
      } finally {
        if (isMounted) {
          setTopLoading(false);
        }
      }
    }

    loadTopNotifications();

    return () => {
      isMounted = false;
    };
  }, [filter]);

  function handleFilterChange(nextFilter) {
    setFilter(nextFilter);
    setPage(1);
  }

  return {
    error,
    filter,
    handleFilterChange,
    loading,
    notifications,
    page,
    pagination,
    setPage,
    topError,
    topLoading,
    topNotifications,
  };
}

export const PRIORITY_WEIGHTS = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

export function getNotificationType(notification) {
  return (
    notification?.notification_type ||
    notification?.notificationType ||
    notification?.type ||
    notification?.Type ||
    'Unknown'
  );
}

export function getNotificationTimestamp(notification) {
  return (
    notification?.createdAt ||
    notification?.created_at ||
    notification?.timestamp ||
    notification?.Timestamp ||
    notification?.date ||
    notification?.createdOn ||
    ''
  );
}

function parseTimestamp(value) {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();

  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  return new Date(String(value).replace(' ', 'T')).getTime() || 0;
}

export function getPriorityWeight(typeOrNotification) {
  const type =
    typeof typeOrNotification === 'string'
      ? typeOrNotification
      : getNotificationType(typeOrNotification);

  return PRIORITY_WEIGHTS[type] || 0;
}

export function compareNotifications(first, second) {
  const priorityDifference =
    getPriorityWeight(first) - getPriorityWeight(second);

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  return (
    parseTimestamp(getNotificationTimestamp(first)) -
    parseTimestamp(getNotificationTimestamp(second))
  );
}

export function compareNotificationsDesc(first, second) {
  return compareNotifications(second, first);
}

export function sortByPriority(notifications) {
  return [...notifications].sort(compareNotificationsDesc);
}

export function getTopPriorityNotifications(notifications, count = 10) {
  return sortByPriority(notifications).slice(0, count);
}

export function insertSorted(notifications, newNotif) {
  const list = [...notifications];
  let low = 0;
  let high = list.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (compareNotificationsDesc(newNotif, list[mid]) < 0) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  list.splice(low, 0, newNotif);
  return list;
}

const PRIORITY_WEIGHTS = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

export function getPriorityWeight(type) {
  return PRIORITY_WEIGHTS[type] || 0;
}

export function sortByPriority(notifications) {
  return [...notifications].sort((a, b) => {
    const diff = getPriorityWeight(b.type) - getPriorityWeight(a.type);
    if (diff !== 0) return diff;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

export function getTopPriorityNotifications(notifications, count = 10) {
  return sortByPriority(notifications).slice(0, count);
}

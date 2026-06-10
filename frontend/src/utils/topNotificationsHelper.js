import { compareNotifications, compareNotificationsDesc } from './priorityHelper';

class MinHeap {
  constructor(compare) {
    this.compare = compare;
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  peek() {
    return this.items[0];
  }

  push(item) {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  replaceRoot(item) {
    this.items[0] = item;
    this.bubbleDown(0);
  }

  toArray() {
    return [...this.items];
  }

  bubbleUp(index) {
    let currentIndex = index;

    while (currentIndex > 0) {
      const parentIndex = Math.floor((currentIndex - 1) / 2);

      if (this.compare(this.items[currentIndex], this.items[parentIndex]) >= 0) {
        break;
      }

      [this.items[currentIndex], this.items[parentIndex]] = [
        this.items[parentIndex],
        this.items[currentIndex],
      ];
      currentIndex = parentIndex;
    }
  }

  bubbleDown(index) {
    let currentIndex = index;

    while (true) {
      const leftIndex = currentIndex * 2 + 1;
      const rightIndex = currentIndex * 2 + 2;
      let smallestIndex = currentIndex;

      if (
        leftIndex < this.items.length &&
        this.compare(this.items[leftIndex], this.items[smallestIndex]) < 0
      ) {
        smallestIndex = leftIndex;
      }

      if (
        rightIndex < this.items.length &&
        this.compare(this.items[rightIndex], this.items[smallestIndex]) < 0
      ) {
        smallestIndex = rightIndex;
      }

      if (smallestIndex === currentIndex) {
        break;
      }

      [this.items[currentIndex], this.items[smallestIndex]] = [
        this.items[smallestIndex],
        this.items[currentIndex],
      ];
      currentIndex = smallestIndex;
    }
  }
}

export function createTopNotificationsHeap() {
  return new MinHeap((first, second) => compareNotifications(first, second));
}

export function pushTopNotification(heap, notification, limit = 10) {
  if (!notification) {
    return heap;
  }

  if (heap.size < limit) {
    heap.push(notification);
    return heap;
  }

  if (compareNotifications(notification, heap.peek()) > 0) {
    heap.replaceRoot(notification);
  }

  return heap;
}

export function getTopNotifications(notifications, limit = 10) {
  const heap = createTopNotificationsHeap();

  // Keep only the current best 10 notifications in memory. Each insert costs
  // O(log 10), so this avoids repeatedly sorting the full dataset.
  notifications.forEach((notification) => {
    pushTopNotification(heap, notification, limit);
  });

  return heap.toArray().sort(compareNotificationsDesc);
}

export function updateTopNotifications(currentTop, newNotification, limit = 10) {
  const heap = createTopNotificationsHeap();

  currentTop.forEach((notification) => {
    pushTopNotification(heap, notification, limit);
  });
  pushTopNotification(heap, newNotification, limit);

  return heap.toArray().sort(compareNotificationsDesc);
}

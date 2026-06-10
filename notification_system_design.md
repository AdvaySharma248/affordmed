# Stage 2

## Storage Choice

This project uses a local JSON file as the persistent storage layer for the Campus Notification System.

The notification data is stored in:

```text
backend/src/data/notifications.json
```

The backend reads and writes this file through:

```text
backend/src/data/notificationsStore.js
```

This keeps the project simple and avoids PostgreSQL setup while still allowing notifications to survive server restarts.

## Data Model

Each notification is stored as one JSON object.

```json
{
  "id": "notif_101",
  "studentId": "stu_501",
  "type": "Placement",
  "title": "Placement Update",
  "message": "You have been shortlisted for the next interview round.",
  "isRead": false,
  "createdAt": "2026-06-10T10:30:00.000Z",
  "readAt": null
}
```

## Fields

| Field | Type | Description |
| --- | --- | --- |
| `id` | String | Unique notification ID |
| `studentId` | String | Student who receives the notification |
| `type` | String | Notification category: `Placement`, `Event`, or `Result` |
| `title` | String | Short notification title |
| `message` | String | Full notification message |
| `isRead` | Boolean | Whether the notification has been read |
| `createdAt` | String | ISO timestamp for creation time |
| `readAt` | String or null | ISO timestamp for read time, or null if unread |

## Store Behavior

- If `notifications.json` is missing, the backend creates it with default sample notifications.
- Listing notifications reads from the JSON file and supports filtering by type and read status.
- Creating a notification appends it to the JSON file.
- Marking one notification as read updates `isRead` and `readAt` in the JSON file.
- Marking all notifications as read updates all unread records in the JSON file.
- Deleting a notification removes it from the JSON file.

## API Fit

The JSON structure matches the Stage 1 API response fields directly:

- `studentId`
- `type`
- `title`
- `message`
- `isRead`
- `createdAt`
- `readAt`

Because the API and storage both use camelCase names, the backend does not need a database mapping layer.

## Scaling Notes

This file-based approach is suitable for assessment, demo, and local development use.

Limitations:

- It is not designed for many simultaneous writes.
- It does not support relational joins.
- Very large notification files will become slower to read and write.
- It does not provide database-level constraints, indexing, or transactions.

Future improvements:

- Move to a real database if the project needs multi-user production traffic.
- Add per-student authorization checks before returning notifications.
- Add backup or export support for the JSON file.
- Add cursor-based pagination if notification volume grows.

## Assumptions

- PostgreSQL is not used in this implementation.
- `backend/src/data/notifications.json` is the source of truth.
- Notification types are limited to `Placement`, `Event`, and `Result`.
- Timestamps are stored as UTC ISO strings.
- The current backend uses a simple authorization-header check before allowing notification access.

# Stage 4

## Performance Bottlenecks

The system works for a small number of students, but the same design can slow down when the data grows.

Major bottlenecks:

- Every request directly queries the database.
- Unread counts are recalculated repeatedly.
- Large notification lists are returned in one response.
- Clients poll the server continuously.
- Notification delivery may happen synchronously during the request flow.

These are manageable at small scale, but with tens of thousands of students and millions of notifications they increase database load, network usage, and backend response time.

## Caching

Redis should be used as a cache for data that is requested often and does not need to be recalculated from the database every time.

Good cache candidates:

- Unread notification count per student.
- Recent notifications for a student.
- Latest notification timestamp per student.
- Short-lived notification list pages for active users.

Unread count is the strongest caching use case because it is shown frequently in the UI and is expensive if calculated repeatedly with `COUNT(*)`.

Example Redis keys:

```text
student:1042:notifications:unread_count
student:1042:notifications:recent
```

When a new notification is delivered to a student, increment the unread count:

```text
INCR student:1042:notifications:unread_count
```

When the student marks one notification as read, decrement the count:

```text
DECR student:1042:notifications:unread_count
```

When all notifications are marked as read, reset the count:

```text
SET student:1042:notifications:unread_count 0
```

Recent notifications can be cached with a short TTL, for example 30 to 120 seconds. This reduces repeated database reads without making stale data live for too long.

Cache invalidation should happen whenever notification state changes:

- New notification delivered: update unread count and clear recent notification cache.
- Notification marked as read: update unread count and clear cached list pages.
- Notification deleted: clear cached list pages and recalculate or adjust unread count.

The cache should improve performance, but the database remains the source of truth. If Redis is unavailable, the backend should still be able to query the database directly.

## Pagination

Returning all notifications is bad because response size grows with user history. A student with thousands of notifications would cause large database reads, large JSON responses, slower network transfer, and more memory usage in the backend and client.

Page-based pagination is simple:

```sql
SELECT
  n.id,
  n.notification_type,
  n.title,
  n.message,
  rs.is_read,
  n.created_at,
  rs.read_at
FROM notification_read_status rs
JOIN notifications n
  ON n.id = rs.notification_id
WHERE rs.student_id = '1042'
ORDER BY rs.delivered_at DESC
LIMIT 20 OFFSET 40;
```

This is easy to implement, but `OFFSET` becomes slower for deep pages because the database still has to walk past skipped rows.

Cursor-based pagination is better for large notification feeds:

```sql
SELECT
  n.id,
  n.notification_type,
  n.title,
  n.message,
  rs.is_read,
  n.created_at,
  rs.read_at,
  rs.delivered_at
FROM notification_read_status rs
JOIN notifications n
  ON n.id = rs.notification_id
WHERE rs.student_id = '1042'
  AND rs.delivered_at < '2026-06-10T12:00:00Z'
ORDER BY rs.delivered_at DESC
LIMIT 20;
```

The recommended approach is:

- Use page-based pagination for the first simple version.
- Move notification feed APIs to cursor-based pagination as data grows.
- Keep the default page size small, such as 20 or 50.
- Never return an unlimited notification list.

Cursor pagination fits this system because notification feeds are naturally ordered by delivery time.

## Real-Time Updates

Polling is the simplest option. The client repeatedly calls the API every few seconds.

Polling problems:

- Many requests return no new data.
- Database and backend load increase with every connected client.
- Short polling intervals waste resources.
- Long polling intervals make notifications feel delayed.

Server Sent Events are a good fit when the server only needs to push updates to the client.

SSE advantages:

- Uses a normal HTTP connection.
- Simpler than WebSockets.
- Good for one-way updates such as "new notification received".
- Works well for notification badges and feed refresh events.

WebSockets support two-way communication. They are useful for chat, collaboration, games, and other features where client and server both send frequent messages.

For this notification system, SSE is the recommended default. Notifications mostly flow from server to client, so WebSockets would add complexity without much benefit.

A practical design is:

- Use REST APIs for listing, reading, and deleting notifications.
- Use SSE to tell the client that a new notification or unread count update exists.
- Let the client fetch the updated notification page after receiving the SSE event.

This keeps real-time delivery lightweight while preserving the existing API design.

## Database Performance

Indexes should match the real query patterns.

Important indexes:

```sql
CREATE INDEX idx_notification_read_status_student_read_delivered
ON notification_read_status (student_id, is_read, delivered_at DESC);
```

This supports fetching unread notifications for one student in delivery order.

```sql
CREATE INDEX idx_notification_read_status_student_delivered
ON notification_read_status (student_id, delivered_at DESC);
```

This supports the main notification feed for one student.

```sql
CREATE INDEX idx_notifications_type_created_at
ON notifications (notification_type, created_at DESC);
```

This supports queries such as finding recent `Placement` notifications.

Query optimization should focus on:

- Avoiding `SELECT *`.
- Returning only required columns.
- Filtering by indexed columns.
- Using `LIMIT`.
- Avoiding deep `OFFSET` for large feeds.
- Checking query plans with `EXPLAIN ANALYZE`.

Read replicas can help when read traffic becomes much larger than write traffic. Notification list queries and reporting queries can go to replicas, while writes continue going to the primary database.

Connection pooling should be used so the backend does not open a new database connection for every request. A pool keeps a controlled number of reusable connections and prevents the database from being overloaded by too many concurrent clients.

## Notification Delivery

Notification delivery should not happen as a large synchronous operation inside an API request.

For example, if an admin sends one notification to 50,000 students, the API should not insert 50,000 delivery rows before responding.

A better flow:

1. Admin creates the notification.
2. Backend stores the notification record.
3. Backend adds a delivery job to a queue.
4. Background workers create `notification_read_status` rows in batches.
5. Workers update unread counts and publish SSE events where needed.

Batch processing keeps the API responsive and makes large delivery jobs easier to retry.

Example batch insert shape:

```sql
INSERT INTO notification_read_status (
  notification_id,
  student_id,
  is_read,
  delivered_at
)
SELECT
  'notification-id',
  s.id,
  false,
  NOW()
FROM students s
WHERE s.department = 'Computer Science';
```

Background workers should process delivery in chunks so one large notification does not block every other job.

## Monitoring

Application logs should capture important events:

- Notification created.
- Notification delivery job started.
- Notification delivery job completed.
- Delivery job failed.
- Slow API response.
- SSE connection opened or closed.

Slow query detection should be enabled in the database. Queries that repeatedly exceed a threshold, such as 500 ms or 1 second, should be reviewed.

Useful metrics:

- API response time.
- Request rate.
- Error rate.
- Database query duration.
- Database connection pool usage.
- Redis hit rate.
- Queue length.
- Notification delivery job duration.
- SSE active connection count.

Alerting should focus on symptoms that affect users:

- High API error rate.
- Slow notification list API.
- Delivery queue growing continuously.
- Database CPU or connection usage too high.
- Redis unavailable.
- SSE connection failure rate increasing.

Monitoring is important because performance problems usually appear gradually before they become outages.

## Future Scaling

At around 10,000 students, the system can run with:

- One primary database.
- Proper indexes.
- Small page sizes.
- Redis unread count cache.
- Basic background workers.
- SSE for active users.

At hundreds of thousands of students, the system should add:

- More background workers.
- Batch delivery.
- Read replicas for notification feed reads.
- Better cache invalidation.
- Cursor-based pagination by default.
- Queue monitoring and retry handling.

At around 1,000,000 students, the system can still keep the same core design, but it needs stronger operational controls:

- Partition large delivery or read-status tables by time or student range.
- Use read replicas for high-volume reads.
- Scale workers horizontally.
- Keep notification delivery asynchronous.
- Cache unread counts aggressively.
- Archive old notifications after a retention period.

This avoids a major redesign because the main boundaries stay the same:

- Database stores durable notification data.
- Redis handles hot read data such as unread counts.
- Queue and workers handle large delivery jobs.
- REST APIs handle normal actions.
- SSE handles real-time update signals.

## Recommended Direction

The realistic next step is not to over-engineer the system immediately.

Recommended order:

1. Add proper indexes for the main notification queries.
2. Enforce pagination on list APIs.
3. Cache unread counts in Redis.
4. Move bulk delivery to background workers.
5. Use SSE for real-time update signals.
6. Add read replicas only when database read load proves it is needed.

This path improves performance without making the system unnecessarily complex too early.

## Assumptions

- The production version uses the Stage 2 database schema with `students`, `notifications`, and `notification_read_status`.
- Redis is used as a cache, not as the source of truth.
- The database remains the durable source for notification records and read status.
- Notification feeds are normally shown newest-first.
- The API should limit notification list responses by default.
- Background jobs are acceptable for bulk notification delivery.

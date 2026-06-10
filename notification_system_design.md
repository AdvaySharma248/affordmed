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

# Stage 3

## Query Analysis

Provided query:

```sql
SELECT *
FROM notifications
WHERE studentID = 1042
AND isRead = false
ORDER BY createdAt ASC;
```

The query expresses the right business need: fetch unread notifications for one student. However, it has several practical problems.

The main issues are:

- It uses camelCase column names such as `studentID`, `isRead`, and `createdAt`.
- In a database schema, these should usually be normalized to snake_case names such as `student_id`, `is_read`, and `created_at`.
- It uses `SELECT *`, which returns more data than the API usually needs.
- It sorts oldest-first, while notification feeds usually need newest-first.
- It does not show pagination, so it may return too many rows.
- It depends on indexes that may not exist.

If the production schema is normalized into separate notification and delivery/read-status tables, the query should use joins. If the assessment keeps a single `notifications` table, the same optimization ideas still apply.

## Bottlenecks

The query can become slow when the system has many students and millions of notifications.

With 50,000 students and 5,000,000 notifications, a single student may have hundreds or thousands of records. If many students are active at the same time, small inefficiencies become expensive quickly.

Main bottlenecks:

- Filtering by `studentID` without an index.
- Filtering by `isRead` without a useful composite index.
- Sorting by `createdAt` after filtering.
- Returning all columns with `SELECT *`.
- Returning an unlimited result set.

## Full Table Scan

If there is no index on the student and read-status fields, the database may scan the entire `notifications` table.

That means the database checks many rows that do not belong to the requested student. With 5,000,000 rows, this wastes CPU, memory, and disk I/O.

The database should be able to jump directly to unread notifications for one student instead of scanning unrelated notifications.

## `SELECT *` Problem

`SELECT *` is convenient during development, but it is not ideal for production APIs.

Problems:

- It returns columns the client may not need.
- It increases response size.
- It can expose internal fields accidentally.
- It makes the API depend too closely on the table structure.
- It becomes slower if the table later gets large text or metadata columns.

The query should return only the fields needed by the notification API.

## Index Recommendations

The query filters by student and read status, then sorts by creation time. The index should match that access pattern.

For a single-table design:

```sql
CREATE INDEX idx_notifications_student_read_created
ON notifications (student_id, is_read, created_at DESC);
```

Reasoning:

- `student_id` narrows the search to one student.
- `is_read` narrows the result to unread notifications.
- `created_at DESC` supports newest-first ordering without a separate expensive sort.

If notification type filtering is common, add a separate index:

```sql
CREATE INDEX idx_notifications_type_created
ON notifications (notification_type, created_at DESC);
```

Reasoning:

- `notification_type` helps queries for `Placement`, `Event`, or `Result`.
- `created_at DESC` helps recent-notification queries.

## Composite Index Design

A composite index is better here than separate indexes on each column.

Separate indexes:

```sql
CREATE INDEX idx_notifications_student_id
ON notifications (student_id);

CREATE INDEX idx_notifications_is_read
ON notifications (is_read);

CREATE INDEX idx_notifications_created_at
ON notifications (created_at);
```

These may help some queries, but they do not fully match the main access pattern.

Better composite index:

```sql
CREATE INDEX idx_notifications_student_read_created
ON notifications (student_id, is_read, created_at DESC);
```

This index matches the query shape: first find the student's rows, then unread rows, then return them in the correct order.

The order matters. `student_id` should come first because it is highly selective. `is_read` comes next because it filters unread rows. `created_at` comes last because it supports ordering.

## Optimized Query

Optimized single-table version:

```sql
SELECT
  id,
  student_id,
  notification_type,
  title,
  message,
  is_read,
  created_at,
  read_at
FROM notifications
WHERE student_id = 1042
  AND is_read = false
ORDER BY created_at DESC
LIMIT 20;
```

This version:

- Uses database-style column names.
- Avoids `SELECT *`.
- Sorts newest-first.
- Limits the result size.
- Works well with the composite index on `(student_id, is_read, created_at DESC)`.

If cursor pagination is used:

```sql
SELECT
  id,
  student_id,
  notification_type,
  title,
  message,
  is_read,
  created_at,
  read_at
FROM notifications
WHERE student_id = 1042
  AND is_read = false
  AND created_at < '2026-06-10T12:00:00Z'
ORDER BY created_at DESC
LIMIT 20;
```

Cursor pagination avoids deep `OFFSET` scans and is better for large notification feeds.

## Excessive Indexing Tradeoffs

Creating indexes on every column is not a good idea.

Indexes speed up some reads, but they also have costs:

- Every insert must update more indexes.
- Every update may need index maintenance.
- Deletes become more expensive.
- Indexes use disk space.
- More indexes increase memory pressure.
- The query planner has more options to evaluate.

For notifications, excessive indexing can slow down the exact operations that happen frequently: creating notifications and marking them as read.

The practical approach is to index the queries that are actually important:

- Student notification feed.
- Unread notification feed.
- Recent notification lookup.
- Notification type filtering.

Indexes should be reviewed with real query plans and real traffic patterns, not added blindly.

## Placement Notifications In The Last 7 Days

Query to find students who received `Placement` notifications during the last 7 days:

```sql
SELECT DISTINCT
  student_id
FROM notifications
WHERE notification_type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days';
```

If a `students` table exists and student details are needed:

```sql
SELECT DISTINCT
  s.id,
  s.name,
  s.email
FROM students s
JOIN notifications n
  ON n.student_id = s.id
WHERE n.notification_type = 'Placement'
  AND n.created_at >= NOW() - INTERVAL '7 days'
ORDER BY s.name ASC;
```

Recommended index for this query:

```sql
CREATE INDEX idx_notifications_type_created_student
ON notifications (notification_type, created_at DESC, student_id);
```

Reasoning:

- `notification_type` filters to `Placement`.
- `created_at` filters recent records.
- `student_id` helps return the affected students.

## Assumptions

- The SQL examples use a production-style relational table named `notifications`.
- Column names are shown in snake_case for database consistency.
- The current JSON-file implementation can still follow the same query design ideas if moved to a database later.
- Notification feeds should usually show newest notifications first.
- List APIs should always use pagination.

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

# Stage 5

## Problem With The Current Approach

Current flow:

1. Save notification.
2. Send email.
3. Send push notification.
4. Repeat for every student.

This works for a small number of students, but it becomes slow and unreliable when an administrator sends one notification to thousands of students.

Main problems:

- The admin request takes too long because it waits for every delivery action.
- One slow email or push provider can delay the whole operation.
- A temporary provider failure can cause partial delivery.
- If the backend crashes halfway through, some students may receive the notification and others may not.
- Retrying the whole request can create duplicate notifications.
- The system has no clean way to track which deliveries succeeded, failed, or are still pending.

The core issue is that notification creation and notification delivery are coupled together. They should be separated.

## Why It Fails At Scale

If one notification is sent to 50,000 students, the synchronous approach may perform 50,000 database writes, 50,000 email calls, and 50,000 push notification calls inside one request flow.

That fails at scale because:

- HTTP requests have timeout limits.
- External email and push services have rate limits.
- Network calls fail randomly and need retries.
- Large loops consume backend memory and CPU.
- A single backend instance becomes a bottleneck.
- There is no reliable recovery point after a crash.

The admin should receive a fast response after the notification job is accepted. Delivery should continue in the background.

## Reliable Delivery Architecture

Recommended architecture:

- API server accepts the admin request.
- Database stores the notification and delivery records.
- Message queue stores delivery jobs.
- Background workers process jobs.
- Email and push providers are called by workers.
- Failed jobs are retried.
- Permanently failed jobs are moved to a dead letter queue.
- Monitoring tracks queue size, failures, and delivery time.

RabbitMQ or Kafka can be used as the message queue.

RabbitMQ is a good fit when the system needs task queues, acknowledgements, retries, and dead letter queues with simple operational behavior.

Kafka is a good fit when the system needs very high event throughput, event replay, and long-term event streaming.

For this assessment, RabbitMQ is the simpler and more practical default. Kafka can be considered later if notification events become part of a larger event platform.

## Data Flow

Admin creates a notification:

```text
Admin API request
  -> Save notification record
  -> Create delivery records with status pending
  -> Publish delivery jobs to queue
  -> Return response to admin
```

Workers process delivery:

```text
Worker consumes job
  -> Load delivery record
  -> Send email
  -> Send push notification
  -> Mark delivery as delivered
  -> Acknowledge queue message
```

If delivery fails:

```text
Worker consumes job
  -> Provider call fails
  -> Increment attempt count
  -> Retry later with backoff
  -> Move to dead letter queue after max attempts
```

This keeps the API responsive and makes delivery recoverable.

## Message Queues

A message queue stores delivery work until a worker is ready to process it.

Each queue message should contain only the information needed to find and process the delivery:

```json
{
  "notificationId": "notif_123",
  "deliveryId": "delivery_456",
  "studentId": "stu_501",
  "attempt": 1
}
```

The message should not contain the full notification body as the source of truth. The worker should load the latest durable data from the database using `notificationId` and `deliveryId`.

Benefits:

- The API does not wait for thousands of provider calls.
- Workers can process jobs at a controlled rate.
- Failed jobs can be retried.
- More workers can be added when the queue grows.
- Queue acknowledgements reduce the chance of lost work.

## Background Workers

Background workers are separate services that consume queue messages and perform delivery.

Worker responsibilities:

- Read delivery jobs from the queue.
- Send email and push notifications.
- Update delivery status.
- Retry safe failures.
- Log provider errors.
- Acknowledge messages only after processing succeeds.

Workers should process jobs in batches where useful, but each delivery should still have its own tracking status. This makes failures visible and prevents one bad recipient from blocking an entire notification.

Workers should also respect provider rate limits. For example, if the email provider allows 1,000 messages per minute, workers should throttle delivery instead of overwhelming the provider.

## Retry Mechanisms

Failures should be retried only when they are likely to be temporary.

Retryable failures:

- Email provider timeout.
- Push provider timeout.
- Temporary network error.
- Rate limit response.
- 5xx response from provider.

Non-retryable failures:

- Invalid email address.
- Invalid push token.
- Student account disabled.
- Notification record no longer exists.

Retries should use exponential backoff:

```text
Attempt 1: immediate
Attempt 2: retry after 30 seconds
Attempt 3: retry after 2 minutes
Attempt 4: retry after 10 minutes
```

The system should store attempt count and last error so administrators and developers can understand what happened.

## Dead Letter Queues

A dead letter queue stores jobs that could not be processed after the maximum number of retry attempts.

Example reasons:

- Provider keeps failing.
- Message payload is invalid.
- Delivery record is missing.
- The same job repeatedly crashes a worker.

Dead letter queues are important because failed messages should not disappear silently. They give the team a place to inspect failures, fix the root cause, and optionally replay the jobs.

Practical rule:

- Retry temporary failures a small number of times.
- Move the job to the dead letter queue after the retry limit.
- Mark the delivery record as `failed`.
- Keep the failure reason for debugging.

## Fault Tolerance

The system should assume that workers, providers, and network calls can fail.

Fault-tolerant behavior:

- Save notification and delivery records before publishing jobs.
- Acknowledge queue messages only after the delivery status is updated.
- Use idempotent delivery logic so the same job can be safely retried.
- Store delivery status in the database.
- Keep failed jobs in a dead letter queue.
- Run multiple worker instances.

Idempotency is important. If the same queue message is processed twice, the worker should check the delivery status first.

Example:

```sql
SELECT status
FROM notification_deliveries
WHERE id = 'delivery_456';
```

If the status is already `delivered`, the worker should acknowledge the message and skip sending again.

## Delivery Tracking

Notification delivery should be tracked separately from the notification content.

Example delivery fields:

| Field | Purpose |
| --- | --- |
| `id` | Unique delivery record |
| `notification_id` | Notification being delivered |
| `student_id` | Student receiving it |
| `status` | `pending`, `processing`, `delivered`, `failed` |
| `email_status` | Email-specific delivery status |
| `push_status` | Push-specific delivery status |
| `attempt_count` | Number of processing attempts |
| `last_error` | Most recent failure reason |
| `created_at` | Delivery record creation time |
| `delivered_at` | Successful delivery time |
| `failed_at` | Final failure time |

This makes the system auditable. An administrator can see whether a notification was delivered to all intended students or whether some failed.

## Failure Handling

Failures should be handled at the delivery level, not by failing the entire notification.

Example:

- 49,900 students receive the notification successfully.
- 100 deliveries fail because of invalid push tokens.
- The notification job should still be considered mostly successful.
- Failed delivery records should show the exact reason.

The admin UI or reporting API can show:

```text
Total recipients: 50,000
Delivered: 49,900
Failed: 100
Pending: 0
```

Failures should be grouped by reason so the team can fix common issues, such as expired push tokens or invalid email addresses.

## Horizontal Scaling

Workers can be scaled horizontally by running more worker service instances.

For example:

```text
Queue
  -> Worker 1
  -> Worker 2
  -> Worker 3
  -> Worker 4
```

This improves throughput without changing the API server.

Scaling rules:

- Add workers when queue depth grows.
- Reduce workers if external providers start rate limiting.
- Keep each worker stateless.
- Store delivery state in the database, not in worker memory.
- Use queue acknowledgements so another worker can retry a job if one worker crashes.

Horizontal scaling should be controlled. Adding too many workers can overload the database or external email and push services.

## Ensuring Notifications Are Not Lost

To avoid losing notifications:

- Store the notification record first.
- Store delivery records for intended recipients.
- Publish queue messages after durable records exist.
- Use durable queues.
- Use message acknowledgements.
- Retry unacknowledged messages.
- Keep failed messages in a dead letter queue.
- Reconcile pending delivery records with queue state.

A reconciliation job can periodically find delivery records stuck in `pending` or `processing` and requeue them.

Example:

```sql
SELECT id
FROM notification_deliveries
WHERE status IN ('pending', 'processing')
  AND created_at < NOW() - INTERVAL '10 minutes';
```

This protects against cases where a database write succeeds but queue publishing or worker processing fails.

## Monitoring And Observability

The system should be monitored from API request to final delivery.

Important logs:

- Notification created.
- Delivery records created.
- Queue message published.
- Worker started delivery.
- Provider call succeeded.
- Provider call failed.
- Job retried.
- Job moved to dead letter queue.

Important metrics:

- Queue depth.
- Jobs processed per minute.
- Delivery success rate.
- Delivery failure rate.
- Retry count.
- Dead letter queue count.
- Worker processing time.
- Email provider latency.
- Push provider latency.
- Database write latency.

Useful alerts:

- Queue depth keeps growing.
- Dead letter queue count is above zero for too long.
- Delivery failure rate spikes.
- Worker service is down.
- Provider latency is too high.
- Notifications remain pending for too long.

Tracing is also useful. A single `notificationId` should be traceable across API logs, queue messages, worker logs, provider calls, and delivery status records.

## Tradeoffs

This architecture is more reliable than synchronous delivery, but it adds moving parts.

Benefits:

- Admin requests return quickly.
- Delivery can continue after temporary failures.
- Workers can scale independently.
- Failed deliveries are visible.
- Queue-based processing protects the API from provider slowness.

Costs:

- More infrastructure to run.
- More operational monitoring needed.
- Delivery becomes eventually consistent.
- Admins may see `pending` status before all students receive the notification.

The tradeoff is worth it once notifications are sent to thousands of students. For very small deployments, a simpler background job setup may be enough before adding RabbitMQ or Kafka.

## Recommended Direction

For this system, the practical production path is:

1. Save notification and delivery records in the database.
2. Publish one delivery job per student or per small batch.
3. Process jobs with background workers.
4. Retry temporary failures with backoff.
5. Move permanently failed jobs to a dead letter queue.
6. Track delivery status per student.
7. Monitor queue depth, delivery failures, and worker health.

RabbitMQ is the recommended queue for the first production version because it fits task-based delivery well and supports acknowledgements, retries, and dead letter queues without requiring a larger event-streaming platform.

## Assumptions

- The production system uses the Stage 2 database schema, plus a delivery tracking table.
- Email and push notification providers are external services and may fail.
- Redis may be used for caching counts, but it is not the durable delivery source.
- Queue messages are durable and acknowledged only after processing.
- Delivery is eventually consistent, not instant for every student.
- Duplicate queue messages are possible, so workers must be idempotent.

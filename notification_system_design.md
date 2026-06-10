# Stage 1

## Campus Notification System API Design

Students receive notifications related to placements, events, and results. This REST API contract is designed for a production-ready notification platform where authenticated students can view and manage their notifications, while authorized staff or system services can create notifications.

Base URL:

```text
/api/v1
```

## Supported User Actions

| Action | Description |
| --- | --- |
| Get notifications | Fetch a paginated list of notifications for the authenticated student |
| Get single notification | Fetch details of one notification |
| Mark notification as read | Mark one notification as read |
| Mark all notifications as read | Mark every unread notification for the student as read |
| Create notification | Create a notification for a student |
| Delete notification | Remove a notification when it is no longer needed |

## Required Request Headers

```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

Notes:

- `Authorization` is required for all endpoints.
- `Content-Type` is required for requests that include a JSON body.
- The authenticated user should only access notifications that belong to them, unless the user has an admin or system role.

## Notification Object Schema

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

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | Yes | Unique notification identifier |
| `studentId` | string | Yes | Student who owns the notification |
| `type` | string | Yes | Notification category: `Placement`, `Event`, or `Result` |
| `title` | string | Yes | Short notification title |
| `message` | string | Yes | Full notification message |
| `isRead` | boolean | Yes | Whether the notification has been read |
| `createdAt` | string | Yes | ISO timestamp when the notification was created |
| `readAt` | string or null | No | ISO timestamp when the notification was read |

## API Endpoints

### Get Notifications

```http
GET /api/v1/notifications
```

Query parameters:

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `page` | number | No | Page number, defaults to `1` |
| `limit` | number | No | Number of records per page, defaults to `20` |
| `type` | string | No | Filters by notification type: `Placement`, `Event`, or `Result` |
| `isRead` | boolean | No | Filters read or unread notifications |

Example request:

```http
GET /api/v1/notifications?type=Placement&isRead=false&page=1&limit=20
Authorization: Bearer <access_token>
```

Sample success response:

```json
{
  "success": true,
  "message": "Notifications fetched successfully",
  "data": [
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
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 45,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Get Single Notification

```http
GET /api/v1/notifications/:notificationId
```

Example request:

```http
GET /api/v1/notifications/notif_101
Authorization: Bearer <access_token>
```

Sample success response:

```json
{
  "success": true,
  "message": "Notification fetched successfully",
  "data": {
    "id": "notif_101",
    "studentId": "stu_501",
    "type": "Placement",
    "title": "Placement Update",
    "message": "You have been shortlisted for the next interview round.",
    "isRead": false,
    "createdAt": "2026-06-10T10:30:00.000Z",
    "readAt": null
  }
}
```

### Create Notification

```http
POST /api/v1/notifications
```

This endpoint should be restricted to authorized admin users or internal system services.

Sample request body:

```json
{
  "studentId": "stu_501",
  "type": "Event",
  "title": "Campus Event Reminder",
  "message": "The technical workshop starts today at 3 PM in Seminar Hall 2."
}
```

Sample success response:

```json
{
  "success": true,
  "message": "Notification created successfully",
  "data": {
    "id": "notif_102",
    "studentId": "stu_501",
    "type": "Event",
    "title": "Campus Event Reminder",
    "message": "The technical workshop starts today at 3 PM in Seminar Hall 2.",
    "isRead": false,
    "createdAt": "2026-06-10T11:00:00.000Z",
    "readAt": null
  }
}
```

### Mark Notification As Read

```http
PATCH /api/v1/notifications/:notificationId/read
```

Example request:

```http
PATCH /api/v1/notifications/notif_101/read
Authorization: Bearer <access_token>
```

Sample success response:

```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "id": "notif_101",
    "isRead": true,
    "readAt": "2026-06-10T11:15:00.000Z"
  }
}
```

### Mark All Notifications As Read

```http
PATCH /api/v1/notifications/read-all
```

Example request:

```http
PATCH /api/v1/notifications/read-all
Authorization: Bearer <access_token>
```

Sample success response:

```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": {
    "updatedCount": 12
  }
}
```

### Delete Notification

```http
DELETE /api/v1/notifications/:notificationId
```

This endpoint is useful when a student wants to remove a notification from their list. In production, this can be implemented as a soft delete to keep audit history.

Example request:

```http
DELETE /api/v1/notifications/notif_101
Authorization: Bearer <access_token>
```

Sample success response:

```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

## Pagination Design

Pagination is supported on the notification list endpoint.

```http
GET /api/v1/notifications?page=1&limit=20
```

Default values:

```json
{
  "page": 1,
  "limit": 20
}
```

Production rules:

- `page` must be greater than `0`.
- `limit` must be greater than `0`.
- Maximum `limit` should be capped at `100`.
- Results should be sorted by `createdAt` in descending order by default.

## Filtering Design

### Filter By Notification Type

```http
GET /api/v1/notifications?type=Placement
GET /api/v1/notifications?type=Event
GET /api/v1/notifications?type=Result
```

The `type` filter allows students to view only placement, event, or result-related notifications.

### Filter Unread Notifications

```http
GET /api/v1/notifications?isRead=false
```

This returns only unread notifications.

Filters can be combined:

```http
GET /api/v1/notifications?type=Placement&isRead=false&page=1&limit=20
```

## Error Response Format

All error responses should follow the same structure.

```json
{
  "success": false,
  "message": "Notification not found",
  "error": {
    "code": "NOTIFICATION_NOT_FOUND",
    "details": "No notification exists for the provided notification ID."
  }
}
```

### 400 Bad Request

```json
{
  "success": false,
  "message": "Invalid request data",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": "The notification type must be Placement, Event, or Result."
  }
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Authentication required",
  "error": {
    "code": "UNAUTHORIZED",
    "details": "A valid authorization token is required."
  }
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "Access denied",
  "error": {
    "code": "FORBIDDEN",
    "details": "You do not have permission to access this notification."
  }
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Notification not found",
  "error": {
    "code": "NOTIFICATION_NOT_FOUND",
    "details": "No notification exists for the provided notification ID."
  }
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error",
  "error": {
    "code": "SERVER_ERROR",
    "details": "Something went wrong while processing the request."
  }
}
```

## Real-Time Notification Architecture

Selected approach: Server-Sent Events (SSE).

Suggested endpoint:

```http
GET /api/v1/notifications/stream
Authorization: Bearer <access_token>
```

Sample event:

```text
event: notification
data: {"id":"notif_103","studentId":"stu_501","type":"Result","title":"Result Published","message":"Your semester result has been published.","isRead":false,"createdAt":"2026-06-10T12:00:00.000Z","readAt":null}
```

Justification:

SSE is a practical choice because campus notifications are mostly one-way updates from the server to students. It is simpler to implement and operate than WebSocket, works over standard HTTP, supports automatic browser reconnection, and is suitable for events like placement updates, event reminders, and result announcements. WebSocket would be more useful if the system required frequent two-way communication, such as live chat.

Production considerations:

- Keep each student's stream scoped to their authenticated user ID.
- Send heartbeat events to keep long-lived connections healthy.
- Reconnect clients automatically if the connection drops.
- Store notifications in the database before pushing real-time events.
- Use normal REST endpoints as the source of truth if a student reconnects and misses an event.

## Assumptions

- Authentication is already handled before notification routes are processed.
- Students can only access their own notifications.
- Admin users or internal system services can create notifications.
- Notification types are limited to `Placement`, `Event`, and `Result` for Stage 1.
- Notifications are sorted newest first.
- Deleting a notification can be implemented as a soft delete in production.
- The API uses JSON for all request and response bodies.
- Timestamps use ISO 8601 format in UTC.
- Pagination and filtering should be performed at the database query level for scalability.

# Stage 2

## Database Choice

PostgreSQL is selected for the Campus Notification System.

PostgreSQL is suitable because notifications are structured data with clear relationships between students and notifications. It supports strong consistency, foreign keys, indexing, pagination, filtering, and reliable transactions. These are useful for a production system where a notification should not point to a missing student and read status updates must be stored correctly.

PostgreSQL is a better fit than MongoDB for this stage because the data model is relational and predictable. It is also easier to query notifications by `studentId`, `notificationType`, `isRead`, and `createdAt` using indexes. Compared with an in-memory store like Redis, PostgreSQL is better as the main database because notifications must be stored permanently. Redis can still be added later for caching unread counts or recent notifications.

## Schema Design

The design uses three tables:

- `students`
- `notifications`
- `notification_read_status`

The `notification_read_status` table is useful because it keeps notification content separate from per-student delivery and read tracking. This supports both direct notifications for one student and future shared notifications sent to many students.

### Students

Stores basic student records.

| Column | Data Type | Key | Description |
| --- | --- | --- | --- |
| `id` | `UUID` | Primary key | Unique student ID |
| `name` | `VARCHAR(100)` |  | Student name |
| `email` | `VARCHAR(150)` | Unique | Student email |
| `department` | `VARCHAR(100)` |  | Student department |
| `created_at` | `TIMESTAMPTZ` |  | Student record creation time |

### Notifications

Stores notification content.

| Column | Data Type | Key | Description |
| --- | --- | --- | --- |
| `id` | `UUID` | Primary key | Unique notification ID |
| `notification_type` | `VARCHAR(30)` |  | Type such as `Placement`, `Event`, or `Result` |
| `title` | `VARCHAR(150)` |  | Short notification title |
| `message` | `TEXT` |  | Full notification message |
| `created_by` | `VARCHAR(100)` |  | Admin or system service that created the notification |
| `created_at` | `TIMESTAMPTZ` |  | Notification creation time |

### NotificationReadStatus

Tracks delivery and read state for each student.

| Column | Data Type | Key | Description |
| --- | --- | --- | --- |
| `id` | `UUID` | Primary key | Unique tracking record ID |
| `notification_id` | `UUID` | Foreign key | References `notifications(id)` |
| `student_id` | `UUID` | Foreign key | References `students(id)` |
| `is_read` | `BOOLEAN` |  | Whether the student has read the notification |
| `read_at` | `TIMESTAMPTZ` |  | Time when the student read the notification |
| `delivered_at` | `TIMESTAMPTZ` |  | Time when the notification was assigned to the student |

## Relationships

- One student can have many notification read status records.
- One notification can be delivered to many students.
- `notification_read_status` connects students and notifications.
- The combination of `student_id` and `notification_id` should be unique so the same notification is not delivered twice to the same student.

This design supports the Stage 1 API response by joining `students`, `notifications`, and `notification_read_status`. The API can return `studentId`, `type`, `title`, `message`, `isRead`, `createdAt`, and `readAt`.

## SQL Schema

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  department VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type VARCHAR(30) NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notifications_type_check
    CHECK (notification_type IN ('Placement', 'Event', 'Result'))
);

CREATE TABLE notification_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL,
  student_id UUID NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_notification_read_status_notification
    FOREIGN KEY (notification_id)
    REFERENCES notifications(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_notification_read_status_student
    FOREIGN KEY (student_id)
    REFERENCES students(id)
    ON DELETE CASCADE,

  CONSTRAINT unique_student_notification
    UNIQUE (student_id, notification_id)
);
```

## Indexing Strategy

Indexes should match the main API access patterns.

```sql
CREATE INDEX idx_notification_read_status_student_id
ON notification_read_status (student_id);

CREATE INDEX idx_notification_read_status_student_read
ON notification_read_status (student_id, is_read);

CREATE INDEX idx_notifications_type
ON notifications (notification_type);

CREATE INDEX idx_notifications_created_at
ON notifications (created_at DESC);

CREATE INDEX idx_notification_list_lookup
ON notification_read_status (student_id, is_read, delivered_at DESC);
```

Why these indexes are useful:

- `student_id` helps fetch notifications for one student quickly.
- `(student_id, is_read)` helps filter unread notifications.
- `notification_type` helps filter placement, event, or result notifications.
- `created_at DESC` helps return newest notifications first.
- `(student_id, is_read, delivered_at DESC)` supports the common list page query with unread filtering and pagination.

For filtering by notification type and unread status together, the API would join `notification_read_status` with `notifications` and use indexes from both tables.

## Scaling Discussion

### Large Number of Students

The `students` table uses a UUID primary key, so student records can be created without depending on sequential IDs from a single server. The notification tracking table stores one row per student per delivered notification, which keeps each student's read state separate and easy to query.

For very large campuses or multiple institutions, the system can later add an `institution_id` column and include it in indexes.

### Large Number of Notifications

Notifications can grow quickly because one announcement may be delivered to thousands of students. Keeping notification content in `notifications` and student-specific status in `notification_read_status` avoids duplicating the full message for every student.

Old notifications can be archived after a fixed retention period, such as 6 or 12 months. This keeps the active tables smaller and improves query performance.

### Fast Notification Retrieval

The main API query is expected to fetch notifications for one student, sorted newest first. The index on `(student_id, is_read, delivered_at DESC)` helps this query stay fast.

Pagination should use `page` and `limit` for the Stage 1 API. For larger datasets, cursor-based pagination using `delivered_at` and `id` would be more efficient because it avoids slow high-offset queries.

### Possible Scaling Problems

- A notification sent to every student can create many rows in `notification_read_status`.
- Offset pagination can become slow for students with a very large notification history.
- Counting total notifications on every request can become expensive.
- Real-time SSE connections can put pressure on the backend if many students stay connected at once.
- Indexes improve reads but add extra work during large insert operations.

### Improvements For Future Growth

- Use background jobs to create delivery tracking records for bulk notifications.
- Add table partitioning on `notification_read_status` by month or by institution when data becomes large.
- Use read replicas for heavy notification list traffic.
- Cache unread notification counts in Redis.
- Cache the first page of recent notifications for active students.
- Move older notifications to archive tables.
- Use cursor-based pagination for better performance at scale.
- Add monitoring for slow queries, database connections, and SSE connection counts.

## Assumptions

- PostgreSQL is the main persistent database.
- Redis is optional and used only for caching or counters, not as the source of truth.
- Each notification belongs to one of three types: `Placement`, `Event`, or `Result`.
- Students can only read their own notifications.
- Admin users or system services create notifications.
- The API returns camelCase fields, while the database uses snake_case columns.
- Notification deletion can be handled by deleting the tracking row for a student or by soft delete in a future version.
- Timestamps are stored in UTC using `TIMESTAMPTZ`.
- The first implementation can use page-based pagination, with cursor pagination added later if needed.

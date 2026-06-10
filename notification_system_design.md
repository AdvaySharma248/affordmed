# Stage 2

## Database Choice

PostgreSQL is selected as the primary database for the Campus Notification System.

PostgreSQL is a good choice because the notification data is structured and relational. A student can have many notifications, and every notification needs reliable tracking for read and unread status. PostgreSQL supports primary keys, foreign keys, constraints, indexing, transactions, and pagination, which are important for a production-style notification system.

PostgreSQL is preferred over MongoDB here because the relationships are clear and predictable. It is also better than Redis as the main database because notifications must be stored permanently. Redis can still be used later for caching unread counts or recently fetched notifications.

## Schema Design

The schema uses three tables:

- `students`
- `notifications`
- `notification_read_status`

The `notifications` table stores the actual notification content. The `notification_read_status` table stores which student received which notification and whether it has been read.

### students

| Column | Data Type | Constraint | Description |
| --- | --- | --- | --- |
| `id` | `UUID` | Primary key | Unique student ID |
| `name` | `VARCHAR(100)` | Not null | Student name |
| `email` | `VARCHAR(150)` | Not null, unique | Student email |
| `department` | `VARCHAR(100)` | Nullable | Student department |
| `created_at` | `TIMESTAMPTZ` | Not null, default current time | Record creation time |

### notifications

| Column | Data Type | Constraint | Description |
| --- | --- | --- | --- |
| `id` | `UUID` | Primary key | Unique notification ID |
| `notification_type` | `VARCHAR(30)` | Not null | Type of notification |
| `title` | `VARCHAR(150)` | Not null | Short title |
| `message` | `TEXT` | Not null | Full notification message |
| `created_by` | `VARCHAR(100)` | Nullable | Admin or system that created it |
| `created_at` | `TIMESTAMPTZ` | Not null, default current time | Notification creation time |

### notification_read_status

| Column | Data Type | Constraint | Description |
| --- | --- | --- | --- |
| `id` | `UUID` | Primary key | Unique delivery tracking ID |
| `notification_id` | `UUID` | Foreign key | References `notifications(id)` |
| `student_id` | `UUID` | Foreign key | References `students(id)` |
| `is_read` | `BOOLEAN` | Not null, default false | Read/unread status |
| `read_at` | `TIMESTAMPTZ` | Nullable | Time when notification was read |
| `delivered_at` | `TIMESTAMPTZ` | Not null, default current time | Time when notification was delivered |

## Relationships

- One student can have many notification read status records.
- One notification can be delivered to many students.
- `notification_read_status` acts as the link between `students` and `notifications`.
- The pair of `student_id` and `notification_id` must be unique so the same notification is not delivered twice to the same student.

This design is consistent with the Stage 1 API because the API can return `studentId`, `type`, `title`, `message`, `isRead`, `createdAt`, and `readAt` by joining these tables.

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
  CONSTRAINT chk_notification_type
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

  CONSTRAINT uq_student_notification
    UNIQUE (student_id, notification_id)
);
```

## Indexing Strategy

Indexes should support the most common notification queries: getting a student's notifications, filtering unread notifications, filtering by type, and sorting newest first.

```sql
CREATE INDEX idx_notification_read_status_student_id
ON notification_read_status (student_id);

CREATE INDEX idx_notification_read_status_student_unread
ON notification_read_status (student_id, is_read);

CREATE INDEX idx_notifications_type
ON notifications (notification_type);

CREATE INDEX idx_notifications_created_at
ON notifications (created_at DESC);

CREATE INDEX idx_notification_read_status_list
ON notification_read_status (student_id, is_read, delivered_at DESC);
```

Index usage:

- `student_id` helps fetch notifications for one student quickly.
- `(student_id, is_read)` helps fetch unread notifications.
- `notification_type` helps filter notifications by `Placement`, `Event`, or `Result`.
- `created_at DESC` helps sort notifications from newest to oldest.
- `(student_id, is_read, delivered_at DESC)` supports the main list API with unread filtering and pagination.

## Scaling Discussion

### Large Number of Students

The design stores each student once in the `students` table. Notification delivery is tracked separately in `notification_read_status`, so the system can handle many students without duplicating student details.

### Large Number of Notifications

The actual notification message is stored once in the `notifications` table. The read status table only stores delivery and read information for each student. This avoids copying the same title and message thousands of times for bulk notifications.

### Fast Notification Retrieval

The main API query will usually fetch notifications for one student, sorted by newest first. Indexes on `student_id`, `is_read`, and date fields make this query faster.

Pagination should be used for all list APIs. The first version can use `page` and `limit`, matching Stage 1. If the data becomes very large, cursor-based pagination using `delivered_at` and `id` would be more efficient.

### Scaling Challenges

- Bulk notifications can create many rows in `notification_read_status`.
- Offset pagination can become slow for very deep pages.
- Counting total notifications on every request can become expensive.
- Too many indexes can slow down inserts.
- A large number of real-time notification connections can increase backend load.

### Future Improvements

- Use background jobs for sending bulk notifications.
- Partition `notification_read_status` by month or academic year when the table becomes large.
- Use read replicas for heavy read traffic.
- Cache unread notification counts in Redis.
- Cache recent notifications for active students.
- Archive old notifications after a retention period.
- Move from offset pagination to cursor-based pagination for large datasets.

## Assumptions

- PostgreSQL is the main persistent database.
- Redis is optional and used only for caching, not as the source of truth.
- Notification types are limited to `Placement`, `Event`, and `Result`.
- Students can only access notifications delivered to them.
- Admin users or internal services create notifications.
- The API uses camelCase fields, while the database uses snake_case columns.
- Timestamps are stored in UTC using `TIMESTAMPTZ`.
- Deleting a notification can be handled with cascade delete for this design, while soft delete can be added later if audit history is required.

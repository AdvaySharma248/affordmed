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

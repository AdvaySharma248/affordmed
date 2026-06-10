# Afford Medical Backend

Express backend for the campus notification API.

## Run

```bash
npm install
npm start
```

The server starts on `http://127.0.0.1:5000` by default.

## Notification Storage

Notifications are persisted in a local JSON file:

```text
src/data/notifications.json
```

The project does not require PostgreSQL. Created, read, and deleted notifications are written back to `notifications.json`, so they survive server restarts.

## Stage 4 Performance Features

The backend includes lightweight Stage 4 behavior without adding PostgreSQL or Redis:

- `GET /api/v1/notifications?cursor=<createdAt>` supports cursor pagination.
- `GET /api/v1/notifications/unread-count?studentId=<id>` returns cached unread counts.
- `GET /api/v1/notifications/recent?studentId=<id>&limit=10` returns cached recent notifications.
- `GET /api/v1/notifications/stream?studentId=<id>` opens an SSE stream for notification events.
- `POST /api/v1/notifications/batch` creates the same notification for multiple students in one request.

The cache is in memory and is invalidated when notifications are created, marked as read, marked all read, or deleted.

## Authentication

Notification routes require an `Authorization` header. The current middleware only checks that the header exists, which is enough for the assessment API flow.

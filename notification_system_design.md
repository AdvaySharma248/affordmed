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

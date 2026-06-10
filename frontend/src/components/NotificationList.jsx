import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import NotificationCard from './NotificationCard';

function getNotificationKey(notification, index) {
  return (
    notification.id ||
    notification.ID ||
    notification.notification_id ||
    notification._id ||
    `${notification.Type || notification.type || 'notification'}-${notification.Timestamp || index}`
  );
}

function NotificationList({ notifications, loading, error }) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: 1, m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No notifications in this category.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {notifications.map((n, index) => (
        <NotificationCard key={getNotificationKey(n, index)} notification={n} />
      ))}
    </Box>
  );
}

export default NotificationList;

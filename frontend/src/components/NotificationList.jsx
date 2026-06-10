import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import NotificationCard from './NotificationCard';

function NotificationList({ notifications, loading, error }) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;
  }

  if (!notifications || notifications.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
        No notifications found.
      </Typography>
    );
  }

  return (
    <Box>
      {notifications.map((n) => (
        <NotificationCard key={n.id || Math.random()} notification={n} />
      ))}
    </Box>
  );
}

export default NotificationList;

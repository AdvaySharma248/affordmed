import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import StarIcon from '@mui/icons-material/Star';
import NotificationCard from './NotificationCard';

function TopNotifications({ notifications, loading, error }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <StarIcon color="warning" sx={{ mr: 1, fontSize: 20 }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Top 10 Priority Notifications
        </Typography>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && !error && (!notifications || notifications.length === 0) && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          No priority notifications available.
        </Typography>
      )}

      {!loading && !error && notifications && notifications.length > 0 && (
        <Box>
          {notifications.map((n, i) => (
            <NotificationCard key={n.id || i} notification={n} />
          ))}
        </Box>
      )}
    </Box>
  );
}

export default TopNotifications;

import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import StarIcon from '@mui/icons-material/Star';
import {
  getNotificationTimestamp,
  getNotificationType,
  getPriorityWeight,
} from '../utils/priorityHelper';

function timeAgo(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const formatted = dateString.includes(' ') && !dateString.includes('T')
    ? dateString.replace(' ', 'T') + 'Z'
    : dateString;
  const date = new Date(formatted);
  const diffMs = now.getTime() - date.getTime();
  
  if (Number.isNaN(diffMs) || diffMs < 0) {
    return 'just now';
  }
  
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return '1d ago';
  if (diffDays < 30) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

const TYPE_COLORS = {
  Placement: '#2563eb',
  Event: '#16a34a',
  Result: '#d97706',
};

function getNotificationKey(notification, index) {
  return (
    notification.id ||
    notification.ID ||
    notification.notification_id ||
    notification._id ||
    `${getNotificationType(notification)}-${getNotificationTimestamp(notification) || index}`
  );
}

function TopNotifications({ notifications, loading, error }) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 2, borderRadius: 1 }}>{error}</Alert>;
  }

  const items = notifications ? notifications.slice(0, 10) : [];

  if (items.length === 0) {
    return null;
  }

  return (
    <Box sx={{ borderBottom: '2px solid', borderColor: 'grey.200', pb: 1, mb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: 'grey.50' }}>
        <StarIcon color="warning" sx={{ fontSize: 16 }} />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: 'text.secondary',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          Priority Inbox
        </Typography>
      </Box>

      {items.map((n, index) => {
        const type = getNotificationType(n);
        const msg = n.message || n.Message || '';
        const priority = getPriorityWeight(type);
        const typeColor = TYPE_COLORS[type] || '#475569';

        return (
          <Box
            key={getNotificationKey(n, index)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1.2,
              px: 2,
              borderBottom: '1px solid',
              borderColor: 'grey.100',
              bgcolor: 'warning.lighter',
              transition: 'background-color 0.15s',
              gap: 2,
              cursor: 'pointer',
              '&:hover': {
                bgcolor: 'grey.100',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color: typeColor,
                  fontFamily: 'monospace',
                  flexShrink: 0,
                  minWidth: 90,
                }}
              >
                [{type}]
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1,
                }}
              >
                {msg}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <Typography
                variant="caption"
                sx={{
                  color: 'warning.dark',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                }}
              >
                P{priority}
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  minWidth: 60,
                  textAlign: 'right',
                }}
              >
                {timeAgo(getNotificationTimestamp(n))}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

export default TopNotifications;

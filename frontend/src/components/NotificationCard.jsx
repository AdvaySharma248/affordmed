import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { getPriorityWeight } from '../utils/priorityHelper';

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

function NotificationCard({ notification }) {
  const {
    message = '',
    type = 'Unknown',
    createdAt,
    isRead,
  } = notification || {};

  const typeColor = TYPE_COLORS[type] || '#475569';
  const priority = getPriorityWeight(type);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 1.2,
        px: 2,
        borderBottom: '1px solid',
        borderColor: 'grey.100',
        bgcolor: isRead ? 'transparent' : 'action.hover',
        transition: 'background-color 0.15s',
        gap: 2,
        cursor: 'pointer',
        '&:hover': {
          bgcolor: 'action.selected',
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
            fontWeight: isRead ? 400 : 600,
            color: isRead ? 'text.secondary' : 'text.primary',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
          }}
        >
          {message}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.disabled',
            fontSize: '0.7rem',
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
          {timeAgo(createdAt)}
        </Typography>
      </Box>
    </Box>
  );
}

export default NotificationCard;

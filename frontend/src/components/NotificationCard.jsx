import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import { getPriorityWeight } from '../utils/priorityHelper';

const TYPE_COLORS = {
  Placement: 'primary',
  Event: 'success',
  Result: 'warning',
};

function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

function NotificationCard({ notification }) {
  const {
    title = 'Untitled',
    message = '',
    type = 'Unknown',
    createdAt,
    isRead,
  } = notification || {};

  const chipColor = TYPE_COLORS[type] || 'default';
  const priority = getPriorityWeight(type);

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 1.5,
        borderLeft: 4,
        borderLeftColor: isRead ? 'grey.300' : `${chipColor}.main`,
        bgcolor: isRead ? 'grey.50' : 'white',
      }}
    >
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
            {title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, ml: 1, flexShrink: 0 }}>
            <Chip label={type} color={chipColor} size="small" />
            <Chip label={`P${priority}`} size="small" variant="outlined" />
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {message}
        </Typography>

        <Typography variant="caption" color="text.disabled">
          {formatDate(createdAt)}
          {isRead ? '  •  Read' : '  •  Unread'}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default NotificationCard;

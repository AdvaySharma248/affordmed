import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Box from '@mui/material/Box';

function Header() {
  return (
    <AppBar position="static" color="primary" elevation={1}>
      <Toolbar>
        <NotificationsIcon sx={{ mr: 1.5 }} />
        <Box>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            Campus Notification System
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.85 }}>
            AffordMed Assessment
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Header;

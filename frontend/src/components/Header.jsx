import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

function Header({ totalItems, searchQuery, onSearchChange }) {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: 'white',
        borderBottom: '1px solid',
        borderColor: 'grey.200',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: 2, minHeight: { xs: 56, sm: 64 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              color: 'text.primary',
              fontSize: '1.25rem',
              letterSpacing: '-0.02em',
            }}
          >
            Inbox
          </Typography>
          <Typography
            variant="caption"
            sx={{
              bgcolor: 'grey.100',
              color: 'text.secondary',
              fontWeight: 700,
              px: 1,
              py: 0.2,
              borderRadius: 1,
              fontSize: '0.75rem',
            }}
          >
            {totalItems}
          </Typography>
        </Box>

        <TextField
          size="small"
          variant="outlined"
          placeholder="Search inbox..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          sx={{
            width: { xs: 180, sm: 280, md: 360 },
            '& .MuiOutlinedInput-root': {
              bgcolor: 'grey.50',
              borderRadius: 1.5,
              fontSize: '0.85rem',
              '& fieldset': {
                borderColor: 'grey.200',
              },
              '&:hover fieldset': {
                borderColor: 'grey.300',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
        />
      </Toolbar>
    </AppBar>
  );
}

export default Header;

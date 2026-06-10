import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';

function FilterBar({
  activeCategory,
  onCategoryChange,
  readFilter,
  onReadFilterChange,
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderBottom: '1px solid',
        borderColor: 'grey.200',
        bgcolor: 'white',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          flexWrap: 'wrap',
        }}
      >
        <Tabs
          value={activeCategory}
          onChange={(_, val) => onCategoryChange(val)}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              px: 2,
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'primary.main',
              },
            },
          }}
        >
          <Tab label="All" value="All" />
          <Tab label="Placement" value="Placement" />
          <Tab label="Results" value="Result" />
          <Tab label="Events" value="Event" />
        </Tabs>

        <ToggleButtonGroup
          size="small"
          value={readFilter}
          exclusive
          onChange={(_, val) => val && onReadFilterChange(val)}
          sx={{
            py: 0.5,
            '& .MuiToggleButton-root': {
              px: 1.5,
              py: 0.3,
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'none',
              border: 'none',
              borderRadius: 1,
              color: 'text.secondary',
              '&.Mui-selected': {
                bgcolor: 'grey.100',
                color: 'text.primary',
                '&:hover': {
                  bgcolor: 'grey.200',
                },
              },
            },
          }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="unread">Unread</ToggleButton>
          <ToggleButton value="read">Read</ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Box>
  );
}

export default FilterBar;

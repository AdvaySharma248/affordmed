import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

const FILTER_OPTIONS = ['All', 'Placement', 'Event', 'Result'];

function FilterBar({ activeFilter, onFilterChange }) {
  return (
    <Box sx={{ mb: 3 }}>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="filter-type-label">Filter by Type</InputLabel>
        <Select
          labelId="filter-type-label"
          id="filter-type-select"
          value={activeFilter}
          label="Filter by Type"
          onChange={(e) => onFilterChange(e.target.value)}
        >
          {FILTER_OPTIONS.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}

export default FilterBar;

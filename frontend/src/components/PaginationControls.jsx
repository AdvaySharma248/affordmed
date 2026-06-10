import Box from '@mui/material/Box';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';

function PaginationControls({ page, totalPages, totalItems, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mt: 3,
        flexWrap: 'wrap',
        gap: 1,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Page {page} of {totalPages} — {totalItems} total
      </Typography>

      <Pagination
        count={totalPages}
        page={page}
        onChange={(_, val) => onPageChange(val)}
        color="primary"
        shape="rounded"
        size="small"
      />
    </Box>
  );
}

export default PaginationControls;

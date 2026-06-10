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
        pt: 2,
        borderTop: '1px solid',
        borderColor: 'grey.100',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
        Showing {totalItems > 0 ? (page - 1) * 10 + 1 : 0} - {Math.min(page * 10, totalItems)} of {totalItems} total
      </Typography>

      <Pagination
        count={totalPages}
        page={page}
        onChange={(_, val) => onPageChange(val)}
        color="primary"
        shape="rounded"
        size="small"
        sx={{
          '& .MuiPaginationItem-root': {
            fontWeight: 600,
            borderRadius: 2,
          },
        }}
      />
    </Box>
  );
}

export default PaginationControls;

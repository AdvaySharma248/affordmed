import { useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import TopNotifications from './components/TopNotifications';
import NotificationList from './components/NotificationList';
import PaginationControls from './components/PaginationControls';
import { useNotifications } from './hooks/useNotifications';

function App() {
  const {
    error,
    filter,
    handleFilterChange,
    loading,
    notifications,
    page,
    pagination,
    setPage,
    topError,
    topLoading,
    topNotifications,
  } = useNotifications();

  const [searchQuery, setSearchQuery] = useState('');
  const [readFilter, setReadFilter] = useState('all');

  const handleCategoryChange = (val) => {
    handleFilterChange(val);
    setSearchQuery('');
    setPage(1);
  };

  const filteredNotifications = notifications.filter((n) => {
    const msg = (n.message || n.Message || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = msg.includes(query);

    const isReadVal = n.isRead ?? false;
    if (readFilter === 'unread') {
      return matchesSearch && !isReadVal;
    } else if (readFilter === 'read') {
      return matchesSearch && isReadVal;
    }
    return matchesSearch;
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, sm: 4 } }}>
      <Container maxWidth="md" disableGutters sx={{ px: { xs: 1, sm: 2 } }}>
        <Paper
          variant="outlined"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
            overflow: 'hidden',
            borderColor: 'grey.200',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            bgcolor: 'white',
          }}
        >
          <Header
            totalItems={pagination.totalItems || notifications.length}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          <FilterBar
            activeCategory={filter}
            onCategoryChange={handleCategoryChange}
            readFilter={readFilter}
            onReadFilterChange={setReadFilter}
          />

          <TopNotifications
            notifications={topNotifications}
            loading={topLoading}
            error={topError}
          />

          <NotificationList
            notifications={filteredNotifications}
            loading={loading}
            error={error}
          />

          <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
            <PaginationControls
              page={page}
              totalPages={pagination.totalPages || 1}
              totalItems={pagination.totalItems || 0}
              onPageChange={setPage}
            />
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default App;

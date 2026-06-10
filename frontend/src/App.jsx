import { useState, useEffect, useCallback } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import TopNotifications from './components/TopNotifications';
import NotificationList from './components/NotificationList';
import PaginationControls from './components/PaginationControls';
import { fetchNotifications, fetchAllNotifications } from './services/notificationApi';
import { getTopPriorityNotifications } from './utils/priorityHelper';
import logger from './utils/logger';

const PER_PAGE = 5;

function App() {
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [topNotifications, setTopNotifications] = useState([]);
  const [topLoading, setTopLoading] = useState(true);
  const [topError, setTopError] = useState(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const type = filter === 'All' ? undefined : filter;
      const result = await fetchNotifications({ page, limit: PER_PAGE, type });
      setNotifications(result.data);
      setPagination(result.pagination);
    } catch (err) {
      logger.error('Failed to load notifications', { message: err.message });
      setError(err.message || 'Something went wrong. Try again.');
      setNotifications([]);
      setPagination({});
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  const loadTopNotifications = useCallback(async () => {
    setTopLoading(true);
    setTopError(null);
    try {
      const all = await fetchAllNotifications();
      setTopNotifications(getTopPriorityNotifications(all, 10));
    } catch (err) {
      logger.error('Failed to load top notifications', { message: err.message });
      setTopError(err.message || 'Could not load priority notifications.');
      setTopNotifications([]);
    } finally {
      setTopLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    loadTopNotifications();
  }, [loadTopNotifications]);

  function handleFilterChange(val) {
    setFilter(val);
    setPage(1);
  }

  return (
    <Box sx={{ bgcolor: '#fafafa', minHeight: '100vh' }}>
      <Header />

      <Container maxWidth="md" sx={{ py: 3 }}>
        <FilterBar activeFilter={filter} onFilterChange={handleFilterChange} />

        <TopNotifications
          notifications={topNotifications}
          loading={topLoading}
          error={topError}
        />

        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            All Notifications{filter !== 'All' ? ` — ${filter}` : ''}
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <NotificationList
            notifications={notifications}
            loading={loading}
            error={error}
          />

          <PaginationControls
            page={page}
            totalPages={pagination.totalPages || 1}
            totalItems={pagination.totalItems || 0}
            onPageChange={setPage}
          />
        </Box>
      </Container>
    </Box>
  );
}

export default App;

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb',
      light: '#60a5fa',
      dark: '#1d4ed8',
      lighter: '#eff6ff',
    },
    success: {
      main: '#16a34a',
      light: '#4ade80',
      dark: '#15803d',
      lighter: '#f0fdf4',
    },
    warning: {
      main: '#d97706',
      light: '#fbbf24',
      dark: '#b45309',
      lighter: '#fefbeb',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b',
      secondary: '#475569',
      disabled: '#94a3b8',
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);

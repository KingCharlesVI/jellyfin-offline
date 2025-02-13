import React, { useState, useEffect } from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme, CircularProgress } from '@mui/material';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import Onboarding from './components/Onboarding';
import jellyfinApi from './services/jellyfinApi';

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  const [selectedView, setSelectedView] = useState('library');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    const savedServer = localStorage.getItem('serverUrl');
    const savedToken = localStorage.getItem('accessToken');

    if (savedServer && savedToken) {
      try {
        jellyfinApi.setServerUrl(savedServer);
        jellyfinApi.setAccessToken(savedToken);
        
        // Verify token is still valid
        await jellyfinApi.getCurrentUser();
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auto-login failed:', error);
        // Clear invalid credentials
        localStorage.removeItem('accessToken');
      }
    }
    
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ 
          height: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {!isAuthenticated ? (
        <Onboarding onAuthenticated={() => setIsAuthenticated(true)} />
      ) : (
        <Box sx={{ display: 'flex', height: '100vh' }}>
          <Sidebar selectedView={selectedView} onViewChange={setSelectedView} />
          <MainContent currentView={selectedView} />
        </Box>
      )}
    </ThemeProvider>
  );
}

export default App;
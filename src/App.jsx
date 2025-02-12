import React, { useState } from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
    const [selectedView, setSelectedView] = useState('library');
    console.log('App rendering, selectedView:', selectedView);
  
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', height: '100vh' }}>
          <Sidebar selectedView={selectedView} onViewChange={setSelectedView} />
          <MainContent currentView={selectedView} />
        </Box>
      </ThemeProvider>
    );
}

export default App;
import React, { useState } from 'react';
import { Box } from '@mui/material';
import Library from './views/Library';
import Downloads from './views/Downloads';
import Settings from './views/Settings';
import MovieDetails from './views/MovieDetails';

function MainContent({ currentView }) {
    console.log('MainContent rendering, currentView:', currentView);
    const [selectedMovieId, setSelectedMovieId] = useState(null);
  
    const handleMovieSelect = (movieId) => {
      setSelectedMovieId(movieId);
    };
  
    const handleBackToLibrary = () => {
      setSelectedMovieId(null);
    };
  
    const renderView = () => {
      console.log('renderView called with:', currentView);
      switch (currentView) {
        case 'library':
          return selectedMovieId ? (
            <MovieDetails 
              movieId={selectedMovieId} 
              onBack={handleBackToLibrary}
            />
          ) : (
            <Library onMovieSelect={handleMovieSelect} />
          );
        case 'downloads':
          return <Downloads />;
        case 'settings':
          return <Settings />;
        default:
          return <Library onMovieSelect={handleMovieSelect} />;
      }
    };
  
    return (
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          backgroundColor: 'background.default',
        }}
      >
        {renderView()}
      </Box>
    );
}

export default MainContent;
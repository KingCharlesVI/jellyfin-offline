import React, { useState } from 'react';
import { Box } from '@mui/material';
import Library from './views/Library';
import Downloads from './views/Downloads';
import Settings from './views/Settings';
import MovieDetails from './views/MovieDetails';
import VideoPlayer from './views/VideoPlayer';

function MainContent({ currentView }) {
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [playingMovie, setPlayingMovie] = useState(null);

  const handleMovieSelect = (movieId) => {
    setSelectedMovieId(movieId);
  };

  const handleBackToLibrary = () => {
    setSelectedMovieId(null);
  };

  const handlePlayMovie = (movie) => {
    setPlayingMovie(movie);
  };

  const handleClosePlayer = () => {
    setPlayingMovie(null);
  };

  const renderView = () => {
    if (playingMovie) {
      return <VideoPlayer movie={playingMovie} onClose={handleClosePlayer} />;
    }

    switch (currentView) {
      case 'library':
        return selectedMovieId ? (
          <MovieDetails 
            movieId={selectedMovieId} 
            onBack={handleBackToLibrary}
            onPlay={handlePlayMovie}
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
      sx={{
        flexGrow: 1,
        overflow: 'auto',
        width: '100%',
        paddingBottom: 3 // Add some bottom padding for scrolling
      }}
    >
      {renderView()}
    </Box>
  );
}

export default MainContent;
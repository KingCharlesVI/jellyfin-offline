import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  Button,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';
import { Play, Download, Heart, CheckCircle } from 'lucide-react';
import jellyfinApi from '../../services/jellyfinApi';

function MovieDetails({ movieId, onBack, onPlay }) {
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isWatched, setIsWatched] = useState(false);

  useEffect(() => {
    loadMovieDetails();
  }, [movieId]);

  const loadMovieDetails = async () => {
    try {
      setLoading(true);
      const result = await jellyfinApi.getItemInfo(movieId);
      setMovie(result);
      setIsFavorite(result.UserData?.IsFavorite || false);
      setIsWatched(result.UserData?.Played || false);
    } catch (error) {
      console.error('Failed to load movie:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteClick = async () => {
    try {
      await jellyfinApi.markAsFavorite(movieId, !isFavorite);
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Failed to update favorite status:', error);
    }
  };

  const formatRuntime = (ticks) => {
    const minutes = Math.floor((ticks || 0) / 10000000 / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}hr ${remainingMinutes}min`;
  };

  const handleWatchedClick = async () => {
    try {
      await jellyfinApi.markAsWatched(movieId, !isWatched);
      setIsWatched(!isWatched);
    } catch (error) {
      console.error('Failed to update watched status:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!movie) return null;

  return (
    <Box
      sx={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'background.default',
        overflow: 'auto'
      }}
    >
      <Box sx={{ 
        position: 'relative', 
        width: '100%',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Background Image */}
        <Box
          component="img"
          src={jellyfinApi.getImageUrl(movie.Id, 'Backdrop', 1920)}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.5)',
            zIndex: 0
          }}
        />
  
        {/* Content */}
        <Box sx={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          p: 4,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.8) 100%)',
        }}>
          {/* Poster and Info Section */}
          <Box sx={{ 
            display: 'flex', 
            gap: 4,
            mt: 8
          }}>
            {/* Left Side - Poster */}
            <Box
              component="img"
              src={jellyfinApi.getImageUrl(movie.Id, 'Primary', 400)}
              sx={{
                width: 300,
                height: 450,
                objectFit: 'cover',
                borderRadius: 1,
                boxShadow: 3
              }}
            />
  
            {/* Right Side - Info */}
            <Box sx={{ flex: 1 }}>
              <Stack spacing={2}>
                <Typography variant="h3" color="white" fontWeight="bold">
                  {movie.Name}
                </Typography>
  
                {/* Metadata Row */}
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label="4K" size="small" />
                  <Chip label="HDR 10" size="small" />
                  <Typography color="grey.300" sx={{ mx: 1 }}>
                    {movie.ProductionYear}
                  </Typography>
                  <Typography color="grey.300" sx={{ mx: 1 }}>
                    {movie.OfficialRating}
                  </Typography>
                  <Typography color="grey.300">
                    {formatRuntime(movie.RunTimeTicks)}
                  </Typography>
                  <Typography color="grey.300" sx={{ mx: 1 }}>
                    {movie.Genres?.join(' / ')}
                  </Typography>
                </Stack>
  
                {/* Rating */}
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip 
                    label={`★ ${movie.CommunityRating?.toFixed(1) || 'N/A'}`}
                    sx={{ bgcolor: 'primary.main' }}
                  />
                  <Typography color="grey.300">
                    {movie.VoteCount} votes
                  </Typography>
                </Stack>
  
                {/* Overview */}
                <Typography 
                  color="grey.100" 
                  sx={{ 
                    maxWidth: '80%',
                    mt: 2 
                  }}
                >
                  {movie.Overview}
                </Typography>
  
                {/* Action Buttons */}
                <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Play />}
                    sx={{ px: 4 }}
                    onClick={() => onPlay(movie)}
                  >
                    WATCH NOW
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Download />}
                    sx={{ px: 4 }}
                  >
                    DOWNLOAD
                  </Button>
                  <IconButton 
                    onClick={handleFavoriteClick}
                    sx={{ 
                      color: 'white',
                      bgcolor: isFavorite ? 'rgba(255, 0, 0, 0.2)' : 'transparent',
                      '&:hover': { 
                        bgcolor: 'rgba(255, 0, 0, 0.2)',
                        color: 'red' 
                      }
                    }}
                  >
                    <Heart fill={isFavorite ? 'red' : 'none'} />
                  </IconButton>
                  <IconButton 
                    onClick={handleWatchedClick}
                    sx={{ 
                      color: 'white',
                      bgcolor: isWatched ? 'rgba(0, 255, 0, 0.2)' : 'transparent',
                      '&:hover': { 
                        bgcolor: 'rgba(0, 255, 0, 0.2)',
                        color: 'green' 
                      }
                    }}
                  >
                    <CheckCircle fill={isWatched ? 'green' : 'none'} />
                  </IconButton>
                </Stack>
  
                {/* Media Selection */}
                <Box sx={{ mt: 4, maxWidth: 400 }}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <Select
                      value="default"
                      sx={{ 
                        bgcolor: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        '.MuiSelect-icon': { color: 'white' }
                      }}
                    >
                      <MenuItem value="default">
                        Joker 2019 UHD 4K BluRay 2160p DoVi HDR10 TrueHD 7.1 Atmos H.265-MgB
                      </MenuItem>
                    </Select>
                  </FormControl>
  
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <Select
                      value="default"
                      sx={{ 
                        bgcolor: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        '.MuiSelect-icon': { color: 'white' }
                      }}
                    >
                      <MenuItem value="default">
                        English TrueHD Atmos 7.1 @ 3819 Kbps - Original - Dolby TrueHD + Dolby Atmos
                      </MenuItem>
                    </Select>
                  </FormControl>
  
                  <FormControl fullWidth>
                    <Select
                      value="default"
                      sx={{ 
                        bgcolor: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        '.MuiSelect-icon': { color: 'white' }
                      }}
                    >
                      <MenuItem value="default">No Subtitle</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Stack>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default MovieDetails;
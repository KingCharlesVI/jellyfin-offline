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
import { Play, Download, Heart, CheckCircle, ArrowLeft } from 'lucide-react';
import jellyfinApi from '../../services/jellyfinApi';

const { ipcRenderer } = window.require('electron');

console.log('Testing IPC availability:', !!ipcRenderer);
if (ipcRenderer) {
  ipcRenderer.send('test-ipc', 'test message');
}

function MovieDetails({ movieId, onBack, onPlay }) {
  console.log('MovieDetails rendering', { movieId });
  
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [selectedVideoStream, setSelectedVideoStream] = useState('');
  const [selectedAudioStream, setSelectedAudioStream] = useState('');
  const [selectedSubtitleStream, setSelectedSubtitleStream] = useState('');
  const [selectedMediaSource, setSelectedMediaSource] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadPath, setDownloadPath] = useState('');
  const [isDownloaded, setIsDownloaded] = useState(false);

  useEffect(() => {
    loadMovieDetails();
  
    // Set up listeners
    ipcRenderer.on('download-progress', (_, progress) => {
      console.log('Download progress:', progress);
      setDownloadProgress(progress.percent);
    });
  
    ipcRenderer.on('download-complete', () => {
      console.log('Download complete');
      setIsDownloading(false);
      setDownloadProgress(0);
      setIsDownloaded(true);  // Add this line
    });
  
    ipcRenderer.on('download-error', (_, error) => {
      console.error('Download error:', error);
      setError('Download failed: ' + error);
      setIsDownloading(false);
      setDownloadProgress(0);
    });
  
    // Check if movie is already downloaded
    if (movie?.Id) {
      ipcRenderer.invoke('check-if-downloaded', movie.Id).then(downloaded => {
        setIsDownloaded(downloaded);
      });
    }

    const loadMovieData = async () => {
      try {
        setLoading(true);
        const result = await jellyfinApi.getItemInfo(movieId);
        setMovie(result);
        setIsFavorite(result.UserData?.IsFavorite || false);
        setIsWatched(result.UserData?.Played || false);
  
        // Check if movie is already downloaded
        const isDownloaded = await ipcRenderer.invoke('check-if-downloaded', result.Id);
        setIsDownloaded(isDownloaded);
  
      } catch (error) {
        console.error('Failed to load movie:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadMovieData();
  
    // Cleanup
    return () => {
      ipcRenderer.removeAllListeners('download-progress');
      ipcRenderer.removeAllListeners('download-complete');
      ipcRenderer.removeAllListeners('download-error');
    };
  }, [movie?.Id]);

  useEffect(() => {
    if (movie?.MediaSources) {
      const source = movie.MediaSources.find(s => s.Id === selectedVideoStream);
      setSelectedMediaSource(source || movie.MediaSources[0]);
      
      if (source) {
        const bestAudioStream = getHighestQualityAudioStream(source);
        setSelectedAudioStream(bestAudioStream);
      }
      
      setSelectedSubtitleStream('');
    }
  }, [selectedVideoStream, movie]);

  useEffect(() => {
    if (movie?.MediaSources?.length > 0) {
      setSelectedVideoStream(movie.MediaSources[0].Id);
    }
  }, [movie]);

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

  const getHighestQualityAudioStream = (mediaSource) => {
    if (!mediaSource?.MediaStreams) return null;
    
    const audioStreams = mediaSource.MediaStreams.filter(stream => stream.Type === 'Audio');
    
    return audioStreams.sort((a, b) => {
      if (a.Profile === 'Atmos' && b.Profile !== 'Atmos') return -1;
      if (b.Profile === 'Atmos' && a.Profile !== 'Atmos') return 1;
      
      if (a.Channels !== b.Channels) {
        return (b.Channels || 0) - (a.Channels || 0);
      }
      
      return (b.BitRate || 0) - (a.BitRate || 0);
    })[0]?.Index || '';
  };

  const handleDownload = async () => {
    try {
      // Show directory selection dialog
      const selectedPath = await ipcRenderer.invoke('get-download-path');
      if (!selectedPath) return;
      
      console.log('Starting download...');
      setIsDownloading(true);
      setError(null);
      
      const downloadUrl = await jellyfinApi.getDownloadUrl(
        movieId,
        selectedMediaSource.Id,
        selectedAudioStream,
        selectedSubtitleStream
      );
      
      console.log('Download URL:', downloadUrl);
      const headers = await jellyfinApi.getAuthHeaders();
  
      ipcRenderer.send('download-media', {
        url: downloadUrl,
        filename: `${movie.Name} (${movie.ProductionYear}).mp4`,
        headers: headers,
        movieId: movie.Id // Add this to identify the movie
      });
  
    } catch (error) {
      console.error('Failed to start download:', error);
      setError('Failed to start download: ' + error.message);
      setIsDownloading(false);
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
    <Box sx={{ p: 3 }}>
      {/* Background Image with Overlay */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0
        }}
      >
        <Box
          component="img"
          src={jellyfinApi.getImageUrl(movie.Id, 'Backdrop', 1920)}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.5)'
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.8) 100%)'
          }}
        />
      </Box>
  
      {/* Content */}
      <Stack spacing={3} sx={{ position: 'relative', zIndex: 1 }}>
        {/* Back Button */}
        <Button
          startIcon={<ArrowLeft />}
          onClick={onBack}
          sx={{
            alignSelf: 'flex-start',
            color: 'white',
            bgcolor: 'rgba(0, 0, 0, 0.3)',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
            px: 2,
            py: 1
          }}
        >
          Back to Library
        </Button>
  
        {/* Main Content */}
        <Box sx={{ display: 'flex', gap: 4 }}>
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
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                {jellyfinApi.getStreamInfo(movie.MediaSources?.[0])?.badges.map((badge, index) => (
                  <Chip 
                    key={index} 
                    label={badge} 
                    size="small"
                    sx={{
                      bgcolor: badge.includes('HDR') || badge.includes('Vision') ? 
                        'rgba(255, 215, 0, 0.2)' : undefined,
                      color: badge.includes('HDR') || badge.includes('Vision') ? 
                        'rgb(255, 215, 0)' : undefined,
                      '& .MuiChip-label': {
                        fontWeight: badge.includes('HDR') || badge.includes('Vision') ? 
                          'bold' : undefined
                      }
                    }}
                  />
                ))}
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
                  startIcon={isDownloaded ? <CheckCircle /> : <Download />}
                  sx={{ 
                    px: 4,
                    bgcolor: isDownloaded ? 'success.main' : 'primary.main',
                    '&:hover': {
                      bgcolor: isDownloaded ? 'success.dark' : 'primary.dark',
                    }
                  }}
                  disabled={isDownloading}
                  onClick={isDownloaded ? () => window.open(downloadPath, 'explorer') : handleDownload}
                >
                  {isDownloading 
                    ? `DOWNLOADING ${downloadProgress.toFixed(1)}%`
                    : isDownloaded 
                      ? 'DOWNLOADED'
                      : 'DOWNLOAD'}
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
                    value={selectedVideoStream || ''}
                    onChange={(e) => setSelectedVideoStream(e.target.value)}
                    sx={{ 
                      bgcolor: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      '.MuiSelect-icon': { color: 'white' }
                    }}
                  >
                    {movie.MediaSources?.map((source) => {
                      const videoInfo = jellyfinApi.getStreamInfo(source);
                      return (
                        <MenuItem key={source.Id} value={source.Id}>
                          {videoInfo.width}x{videoInfo.height} {videoInfo.codec} 
                          {videoInfo.bitRate ? ` @ ${Math.round(videoInfo.bitRate / 1000000)}Mbps` : ''}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
  
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <Select
                    value={selectedAudioStream || ''}
                    onChange={(e) => setSelectedAudioStream(e.target.value)}
                    sx={{ 
                      bgcolor: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      '.MuiSelect-icon': { color: 'white' }
                    }}
                  >
                    {selectedMediaSource?.MediaStreams
                      ?.filter(stream => stream.Type === 'Audio')
                      .map((stream) => (
                        <MenuItem key={`${stream.Index}`} value={stream.Index}>
                          {jellyfinApi.formatAudioInfo(stream)}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
  
                <FormControl fullWidth>
                  <Select
                    value={selectedSubtitleStream || ''}
                    onChange={(e) => setSelectedSubtitleStream(e.target.value)}
                    sx={{ 
                      bgcolor: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      '.MuiSelect-icon': { color: 'white' }
                    }}
                  >
                    <MenuItem value="">No Subtitle</MenuItem>
                    {selectedMediaSource?.MediaStreams
                      ?.filter(stream => stream.Type === 'Subtitle')
                      .map((stream) => (
                        <MenuItem key={`${stream.Index}`} value={stream.Index}>
                          {jellyfinApi.formatSubtitleInfo(stream)}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}

export default MovieDetails;
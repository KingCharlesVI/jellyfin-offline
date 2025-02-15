import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip
} from '@mui/material';
import { Play, Trash2 } from 'lucide-react';
import VideoPlayer from './VideoPlayer';
const { ipcRenderer } = window.require('electron');

function Downloads() {
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentVideo, setCurrentVideo] = useState(null);

  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    try {
      setLoading(true);
      const downloadedMedia = await ipcRenderer.invoke('get-downloaded-media');
      
      const downloadsWithProgress = await Promise.all(
        downloadedMedia.map(async (media) => {
          const progress = await ipcRenderer.invoke('get-progress', { mediaId: media.id });
          return {
            ...media,
            progress: progress ? (progress.position / progress.duration) * 100 : 0,
            position: progress?.position || 0
          };
        })
      );

      setDownloads(downloadsWithProgress);
    } catch (error) {
      console.error('Failed to load downloads:', error);
      setError('Failed to load downloads');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (download) => {
    setCurrentVideo({
      Id: download.id, // Match Jellyfin's property name for consistency
      title: download.title,
      localPath: download.path,
      position: download.position,
      isLocal: true
    });
  };

  const handleClosePlayer = () => {
    setCurrentVideo(null);
    loadDownloads(); // Refresh the list to show updated progress
  };

  const handleDelete = async (download) => {
    try {
      await ipcRenderer.invoke('delete-download', download.id);
      console.log('Successfully deleted download:', download.title);
      loadDownloads(); // Refresh the list after deletion
    } catch (error) {
      console.error('Failed to delete download:', error);
      setError('Failed to delete download');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Downloads</Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Downloads</Typography>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {currentVideo ? (
        <VideoPlayer
          movie={currentVideo}
          onClose={handleClosePlayer}
        />
      ) : (
        <>
          <Typography variant="h4" gutterBottom>
            Downloads
          </Typography>

          {downloads.length === 0 ? (
            <Typography color="text.secondary">
              No downloaded movies yet.
            </Typography>
          ) : (
            <Grid container spacing={3}>
              {downloads.map((download) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={download.id}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      '&:hover .media-controls': {
                        opacity: 1
                      }
                    }}
                  >
                    <Box sx={{ position: 'relative' }}>
                      <CardMedia
                        component="div"
                        sx={{
                          height: 0,
                          paddingTop: '150%',
                          backgroundColor: 'grey.800'
                        }}
                      />
                      
                      <Box
                        className="media-controls"
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          bgcolor: 'rgba(0, 0, 0, 0.5)',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                        }}
                      >
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="Play">
                            <IconButton
                              onClick={() => handlePlay(download)}
                              sx={{ 
                                color: 'white',
                                '&:hover': { color: 'primary.main' }
                              }}
                            >
                              <Play />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              onClick={() => handleDelete(download)}
                              sx={{ 
                                color: 'white',
                                '&:hover': { color: 'error.main' }
                              }}
                            >
                              <Trash2 />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>

                      {download.progress > 0 && (
                        <LinearProgress
                          variant="determinate"
                          value={download.progress}
                          sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 3,
                            '& .MuiLinearProgress-bar': {
                              bgcolor: 'primary.main'
                            }
                          }}
                        />
                      )}
                    </Box>

                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" noWrap>
                        {download.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(download.downloadedAt).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
}

export default Downloads;
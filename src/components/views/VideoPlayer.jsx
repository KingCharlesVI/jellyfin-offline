import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import jellyfinApi from '../../services/jellyfinApi';
const { ipcRenderer } = require('electron');

function VideoPlayer({ movie, onClose }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const progressInterval = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;

    // Initialize video.js
    const videoUrl = `${jellyfinApi.serverUrl}/Videos/${movie.Id}/stream?static=true&mediaSourceId=${movie.MediaSources[0].Id}`;
    
    playerRef.current = videojs(videoRef.current, {
      controls: true,
      autoplay: true,
      fluid: true,
      playbackRates: [0.5, 1, 1.25, 1.5, 2],
      sources: [{
        src: videoUrl,
        type: 'video/mp4'
      }]
    });
    
    // Load saved progress
    const loadProgress = async () => {
      try {
        const progress = await ipcRenderer.invoke('get-progress', { mediaId: movie.Id });
        if (progress && progress.position) {
          playerRef.current.currentTime(progress.position);
        }
      } catch (error) {
        console.error('Failed to load progress:', error);
      }
    };

    // Save progress
    const saveProgress = async () => {
      if (!playerRef.current) return;

      const currentTime = playerRef.current.currentTime();
      const duration = playerRef.current.duration();

      // Don't save if we're at the very beginning or end
      if (currentTime < 1 || currentTime >= duration - 1) return;

      try {
        await ipcRenderer.invoke('update-progress', {
          mediaId: movie.Id,
          position: currentTime,
          duration: duration
        });
      } catch (error) {
        console.error('Failed to save progress:', error);
      }
    };

    // Hide menu and enter fullscreen when player is ready
    playerRef.current.ready(() => {
      ipcRenderer.invoke('hide-menu').then(() => {
        playerRef.current.requestFullscreen();
        loadProgress(); // Load progress after player is ready
      });
    });

    // Start progress saving interval
    progressInterval.current = setInterval(saveProgress, 5000); // Save every 5 seconds

    // Handle player events
    const handleTimeUpdate = () => {
      const currentTime = playerRef.current.currentTime();
      const duration = playerRef.current.duration();
      
      // If we're near the end, mark as watched
      if (currentTime >= duration * 0.9) {
        ipcRenderer.invoke('update-progress', {
          mediaId: movie.Id,
          position: duration,
          duration: duration,
          completed: true
        });
      }
    };

    playerRef.current.on('timeupdate', handleTimeUpdate);

    // Handle player fullscreen change
    const handleFullscreenChange = () => {
      if (!playerRef.current.isFullscreen()) {
        saveProgress(); // Save progress when exiting fullscreen
        ipcRenderer.invoke('show-menu');
        onClose();
      }
    };

    playerRef.current.on('fullscreenchange', handleFullscreenChange);

    // Cleanup
    return () => {
      clearInterval(progressInterval.current);
      
      if (playerRef.current) {
        saveProgress(); // Save progress one last time
        playerRef.current.off('fullscreenchange', handleFullscreenChange);
        playerRef.current.off('timeupdate', handleTimeUpdate);
        playerRef.current.dispose();
      }
      
      ipcRenderer.invoke('show-menu');
    };
  }, [movie, onClose]);

  return (
    <Box sx={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      bgcolor: 'black',
      zIndex: 1300
    }}>
      <video
        ref={videoRef}
        className="video-js vjs-default-skin"
      />
    </Box>
  );
}

export default VideoPlayer;
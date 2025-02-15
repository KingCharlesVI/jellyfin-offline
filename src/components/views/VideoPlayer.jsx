import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import jellyfinApi from '../../services/jellyfinApi';
const { ipcRenderer } = window.require('electron');

function VideoPlayer({ movie, onClose }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const progressInterval = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;

    // Determine video source based on whether it's a local file or streaming
    const videoSource = movie.isLocal
      ? `file://${movie.localPath}`
      : `${jellyfinApi.serverUrl}/Videos/${movie.Id}/stream?static=true&mediaSourceId=${movie.MediaSources[0].Id}`;
    
    // Log the video source type and path
    console.log('Video Source Type:', movie.isLocal ? 'Local File' : 'Jellyfin Stream');
    console.log('Video Path:', videoSource);

    // Initialize video.js
    playerRef.current = videojs(videoRef.current, {
      controls: true,
      autoplay: true,
      fluid: true,
      playbackRates: [0.5, 1, 1.25, 1.5, 2],
      sources: [{
        src: videoSource,
        type: 'video/mp4'
      }]
    });
    
    // Load saved progress
    const loadProgress = async () => {
      try {
        // Always fetch the latest progress from storage
        const progress = await ipcRenderer.invoke('get-progress', { mediaId: movie.Id });
        
        console.log('Loaded progress:', progress);
        
        if (progress && progress.position) {
          // For resuming, start a few seconds before the saved position
          const resumePosition = Math.max(0, progress.position - 3);
          console.log('Resuming at position:', resumePosition);
          playerRef.current.currentTime(resumePosition);
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
        console.log('Saving progress:', {
          mediaId: movie.Id,
          position: currentTime,
          duration: duration,
          lastUpdated: new Date().toISOString()
        });

        await ipcRenderer.invoke('update-progress', {
          mediaId: movie.Id,
          position: currentTime,
          duration: duration,
          lastUpdated: new Date().toISOString() // Add timestamp for tracking
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
    progressInterval.current = setInterval(saveProgress, 5000);

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
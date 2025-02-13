import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import jellyfinApi from '../../services/jellyfinApi';

function VideoPlayer({ movie, onClose }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

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

    // Enter fullscreen on start
    const enterFullscreen = () => {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    };

    playerRef.current.ready(() => {
      enterFullscreen();
    });

    // Handle fullscreen change
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        onClose();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // Cleanup
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
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
// src/components/views/VideoPlayer.jsx
import React from 'react';
import { Box, IconButton, Stack } from '@mui/material';
import { X } from 'lucide-react';

function VideoPlayer({ movie, onClose }) {
  const videoUrl = `${jellyfinApi.serverUrl}/Videos/${movie.Id}/stream.mp4?static=true&mediaSourceId=${movie.MediaSources[0].Id}`;

  return (
    <Box sx={{ 
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      bgcolor: 'black',
      zIndex: 1300
    }}>
      <IconButton
        onClick={onClose}
        sx={{ 
          position: 'absolute',
          top: 16,
          right: 16,
          color: 'white',
          zIndex: 1
        }}
      >
        <X />
      </IconButton>
      <video
        autoPlay
        controls
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
        src={videoUrl}
      />
    </Box>
  );
}

export default VideoPlayer;
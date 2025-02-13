import React from 'react';
import { Box, IconButton } from '@mui/material';
import { Minus, Square, X, Maximize2 } from 'lucide-react';
const { getCurrentWindow } = require('electron').remote;

function TitleBar() {
  const window = getCurrentWindow();
  const [isMaximized, setIsMaximized] = React.useState(window.isMaximized());

  const handleMinimize = () => {
    window.minimize();
  };

  const handleMaximize = () => {
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
    setIsMaximized(window.isMaximized());
  };

  const handleClose = () => {
    window.close();
  };

  return (
    <Box
      sx={{
        height: '32px',
        bgcolor: 'background.paper',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        WebkitAppRegion: 'drag', // Makes the title bar draggable
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      {/* Window Controls */}
      <Box sx={{ 
        display: 'flex', 
        WebkitAppRegion: 'no-drag' // Makes the buttons clickable
      }}>
        <IconButton 
          size="small" 
          onClick={handleMinimize}
          sx={{ 
            borderRadius: 0,
            width: 46,
            height: '100%',
            '&:hover': { bgcolor: 'action.hover' }
          }}
        >
          <Minus size={16} />
        </IconButton>
        <IconButton 
          size="small" 
          onClick={handleMaximize}
          sx={{ 
            borderRadius: 0,
            width: 46,
            height: '100%',
            '&:hover': { bgcolor: 'action.hover' }
          }}
        >
          {isMaximized ? <Square size={14} /> : <Maximize2 size={14} />}
        </IconButton>
        <IconButton 
          size="small" 
          onClick={handleClose}
          sx={{ 
            borderRadius: 0,
            width: 46,
            height: '100%',
            '&:hover': { 
              bgcolor: 'error.main',
              color: 'error.contrastText'
            }
          }}
        >
          <X size={16} />
        </IconButton>
      </Box>
    </Box>
  );
}

export default TitleBar;
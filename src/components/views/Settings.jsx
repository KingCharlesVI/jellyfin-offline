import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Button, 
  Box, 
  Paper,
  Alert,
  CircularProgress,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { LogOut, ServerCog, User, Download, Trash2, RefreshCw } from 'lucide-react';
import jellyfinApi from '../../services/jellyfinApi';
const { ipcRenderer } = require('electron');

function Settings() {
  const [changeServer, setChangeServer] = useState(false);
  const [newServerUrl, setNewServerUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverInfo, setServerInfo] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [downloadPath, setDownloadPath] = useState('');
  const [clearDownloadsDialog, setClearDownloadsDialog] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const [downloadStats, setDownloadStats] = useState({ size: '0 GB', count: 0 });

  useEffect(() => {
    const loadSettings = async () => {
      // Load app version
      const version = await ipcRenderer.invoke('get-app-version');
      setAppVersion(version);

      // Load server and user info
      const savedServer = localStorage.getItem('serverUrl');
      const savedToken = localStorage.getItem('accessToken');
      const savedPath = localStorage.getItem('downloadPath');
      
      if (savedPath) {
        setDownloadPath(savedPath);
      }
      
      if (savedServer) {
        jellyfinApi.setServerUrl(savedServer);
        
        try {
          const info = await jellyfinApi.getPublicSystemInfo();
          setServerInfo(info);
        } catch (error) {
          console.error('Failed to get server info:', error);
        }
        
        if (savedToken) {
          jellyfinApi.setAccessToken(savedToken);
          checkCurrentUser();
        }
      }

      // Load download stats
      const stats = await ipcRenderer.invoke('get-downloads-size');
      setDownloadStats(stats);
    };
    
    loadSettings();
  }, []);

  const handleSelectDownloadPath = async () => {
    const path = await ipcRenderer.invoke('select-directory');
    if (path) {
      setDownloadPath(path);
      localStorage.setItem('downloadPath', path);
    }
  };

  const handleClearDownloads = async () => {
    setLoading(true);
    try {
      await ipcRenderer.invoke('clear-downloads');
      const stats = await ipcRenderer.invoke('get-downloads-size');
      setDownloadStats(stats);
      setClearDownloadsDialog(false);
    } catch (error) {
      setError('Failed to clear downloads');
    } finally {
      setLoading(false);
    }
  };

  const checkCurrentUser = async () => {
    try {
      const user = await jellyfinApi.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to get current user:', error);
      localStorage.removeItem('accessToken');
    }
  };

  const handleChangeServer = async () => {
    setError('');
    setLoading(true);

    try {
      jellyfinApi.setServerUrl(newServerUrl);
      const info = await jellyfinApi.getPublicSystemInfo();
      setServerInfo(info);
      localStorage.setItem('serverUrl', newServerUrl);
      setChangeServer(false);
      handleLogout(); // Logout when changing servers
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setCurrentUser(null);
    jellyfinApi.setAccessToken('');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Stack spacing={3}>
        {/* Server Section */}
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <ServerCog size={24} />
            <Typography variant="h6">Server</Typography>
          </Stack>
          
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Current Server
              </Typography>
              <Typography>
                {serverInfo?.ServerName || 'Not connected'} ({localStorage.getItem('serverUrl')})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Server Version: {serverInfo?.Version || 'Unknown'}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              onClick={() => setChangeServer(true)}
            >
              Change Server
            </Button>
          </Stack>
        </Paper>

        {/* User Section */}
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <User size={24} />
            <Typography variant="h6">User Account</Typography>
          </Stack>
          
          {currentUser ? (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Logged in as
                </Typography>
                <Typography>{currentUser.Name}</Typography>
              </Box>

              <Button
                variant="outlined"
                startIcon={<LogOut />}
                onClick={handleLogout}
                color="error"
              >
                Log Out
              </Button>
            </Stack>
          ) : (
            <Typography color="text.secondary">
              Not logged in
            </Typography>
          )}
        </Paper>

        {/* Downloads Section */}
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <Download size={24} />
            <Typography variant="h6">Downloads</Typography>
          </Stack>
          
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Download Location
              </Typography>
              <Typography>
                {downloadPath || 'Default location'}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              onClick={handleSelectDownloadPath}
            >
              Change Download Location
            </Button>

            <Button
              variant="outlined"
              color="error"
              startIcon={<Trash2 />}
              onClick={() => setClearDownloadsDialog(true)}
            >
              Clear All Downloads
            </Button>
          </Stack>
        </Paper>

        {/* App Info Section */}
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <RefreshCw size={24} />
            <Typography variant="h6">App Information</Typography>
          </Stack>
          
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Version
              </Typography>
              <Typography>
                {appVersion}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              startIcon={<RefreshCw />}
            >
              Check for Updates
            </Button>
          </Stack>
        </Paper>
      </Stack>

      {/* Change Server Dialog */}
      <Dialog open={changeServer} onClose={() => setChangeServer(false)}>
        <DialogTitle>Change Server</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Server URL"
            fullWidth
            variant="outlined"
            value={newServerUrl}
            onChange={(e) => setNewServerUrl(e.target.value)}
            placeholder="http://your-server:8096"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangeServer(false)}>Cancel</Button>
          <Button onClick={handleChangeServer} disabled={!newServerUrl || loading}>
            {loading ? <CircularProgress size={24} /> : 'Connect'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear Downloads Confirmation Dialog */}
      <Dialog open={clearDownloadsDialog} onClose={() => setClearDownloadsDialog(false)}>
        <DialogTitle>Clear Downloads</DialogTitle>
        <DialogContent>
          Are you sure you want to delete all downloaded media? This cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDownloadsDialog(false)}>Cancel</Button>
          <Button onClick={handleClearDownloads} color="error">
            Clear Downloads
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}

export default Settings;
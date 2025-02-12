import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  TextField, 
  Button, 
  Box, 
  Paper,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { LogIn } from 'lucide-react';
import jellyfinApi from '../../services/jellyfinApi';

function Settings() {
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverInfo, setServerInfo] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Load saved settings on component mount
  useEffect(() => {
    const savedServer = localStorage.getItem('serverUrl');
    const savedToken = localStorage.getItem('accessToken');
    
    if (savedServer) {
      setServerUrl(savedServer);
      jellyfinApi.setServerUrl(savedServer);
      
      if (savedToken) {
        jellyfinApi.setAccessToken(savedToken);
        checkCurrentUser();
      }
    }
  }, []);

  const checkCurrentUser = async () => {
    try {
      const user = await jellyfinApi.getCurrentUser();
      setCurrentUser(user);
      setLoggedIn(true);
    } catch (error) {
      console.error('Failed to get current user:', error);
      localStorage.removeItem('accessToken');
    }
  };

  const handleConnect = async () => {
    setError('');
    setLoading(true);

    try {
      jellyfinApi.setServerUrl(serverUrl);
      const info = await jellyfinApi.getPublicSystemInfo();
      setServerInfo(info);
      setConnected(true);
      localStorage.setItem('serverUrl', serverUrl);
    } catch (error) {
      setError(error.message);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const { user, accessToken } = await jellyfinApi.authenticateByName(username, password);
      setCurrentUser(user);
      setLoggedIn(true);
      localStorage.setItem('accessToken', accessToken);
      // Clear password from state after successful login
      setPassword('');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setLoggedIn(false);
    setCurrentUser(null);
    jellyfinApi.setAccessToken('');
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 600 }}>
        {/* Server Connection Section */}
        <Typography variant="h6" gutterBottom>
          Server Connection
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          <TextField
            label="Jellyfin Server URL"
            variant="outlined"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="http://your-server:8096"
            disabled={loading}
            fullWidth
          />
          <Button
            variant="contained"
            onClick={handleConnect}
            disabled={loading || !serverUrl}
          >
            {loading ? <CircularProgress size={24} /> : 'Connect to Server'}
          </Button>
        </Box>

        {/* Server Info Display */}
        {serverInfo && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Connected to: {serverInfo.ServerName} (Version: {serverInfo.Version})
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Login Section */}
        {connected && !loggedIn && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" gutterBottom>
              Login
            </Typography>
            <TextField
              label="Username"
              variant="outlined"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              fullWidth
            />
            <TextField
              label="Password"
              variant="outlined"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              fullWidth
            />
            <Button
              variant="contained"
              onClick={handleLogin}
              disabled={loading || !username || !password}
              startIcon={<LogIn />}
            >
              {loading ? <CircularProgress size={24} /> : 'Login'}
            </Button>
          </Box>
        )}

        {/* Current User Display */}
        {currentUser && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1">
              Logged in as: {currentUser.Name}
            </Typography>
            <Button
              variant="outlined"
              onClick={handleLogout}
              sx={{ mt: 2 }}
            >
              Logout
            </Button>
          </Box>
        )}

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>
    </div>
  );
}

export default Settings;
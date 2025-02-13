import React, { useState } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { Search, WifiOff, Server, ArrowLeft, User } from 'lucide-react';
import jellyfinApi from '../services/jellyfinApi';

const steps = ['Server Connection', 'User Selection', 'Authentication'];

function Onboarding({ onAuthenticated }) {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [discoveredServers, setDiscoveredServers] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [password, setPassword] = useState('');
  const [showOfflineDialog, setShowOfflineDialog] = useState(false);

  // Handle server discovery
  const handleDiscover = async () => {
    setDiscovering(true);
    setError('');
    try {
      const servers = await jellyfinApi.discoverServers();
      setDiscoveredServers(servers);
      if (servers.length === 0) {
        setError('No servers found on your network');
      }
    } catch (error) {
      setError('Server discovery failed');
    } finally {
      setDiscovering(false);
    }
  };

  // Handle server connection
  const handleConnect = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await jellyfinApi.testConnection(serverUrl);
      jellyfinApi.setServerUrl(serverUrl);
      const users = await jellyfinApi.getPublicUsers();
      setUsers(users);
      setActiveStep(1);
    } catch (error) {
      setError('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Handle going back a step
  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setError('');
  };

  // Handle user selection
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setActiveStep(2);
  };

  // Handle login
  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await jellyfinApi.authenticateByName(selectedUser.Name, password);
      onAuthenticated();
    } catch (error) {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  // Handle offline mode
  const handleOfflineMode = () => {
    jellyfinApi.setOfflineMode(true);
    onAuthenticated();
    setShowOfflineDialog(false);
  };

  // Server Connection Step
  const renderServerStep = () => (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Connect to your Jellyfin server
      </Typography>

      {/* Server Discovery Section */}
      <Button
        variant="outlined"
        fullWidth
        onClick={handleDiscover}
        disabled={discovering}
        startIcon={discovering ? <CircularProgress size={20} /> : <Search />}
        sx={{ mb: 2 }}
      >
        Discover Local Servers
      </Button>

      {discoveredServers.length > 0 && (
        <List sx={{ mb: 2 }}>
          {discoveredServers.map((server, index) => (
            <ListItem key={index} disablePadding>
              <ListItemButton onClick={() => setServerUrl(server.url)}>
                <ListItemAvatar>
                  <Avatar>
                    <Server />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={server.info?.ServerName || server.url}
                  secondary={server.url}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      <Divider sx={{ my: 2 }}>or</Divider>

      {/* Manual Server Entry */}
      <TextField
        fullWidth
        label="Server URL"
        placeholder="http://your-server:8096"
        value={serverUrl}
        onChange={(e) => setServerUrl(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleConnect}
          disabled={!serverUrl || loading}
          sx={{ flex: 1 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Connect'}
        </Button>
        <Button
          variant="outlined"
          onClick={() => setShowOfflineDialog(true)}
          startIcon={<WifiOff />}
        >
          Offline Mode
        </Button>
      </Box>
    </Box>
  );

  // User Selection Step
  const renderUserStep = () => (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Select User
      </Typography>
      <List sx={{ width: '100%' }}>
        {users.map((user) => (
          <ListItem key={user.Id} disablePadding>
            <ListItemButton onClick={() => handleUserSelect(user)}>
              <ListItemAvatar>
                <Avatar>
                  <User />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={user.Name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Button
        startIcon={<ArrowLeft />}
        onClick={handleBack}
        sx={{ mt: 2 }}
      >
        Back
      </Button>
    </Box>
  );

  // Authentication Step
  const renderAuthStep = () => (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Log in as {selectedUser?.Name}
      </Typography>
      <TextField
        fullWidth
        type="password"
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        sx={{ mb: 2 }}
      />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleLogin}
          disabled={!password || loading}
          sx={{ flex: 1 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Login'}
        </Button>
        <Button
          startIcon={<ArrowLeft />}
          onClick={handleBack}
        >
          Back
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3
      }}
    >
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {activeStep === 0 && renderServerStep()}
          {activeStep === 1 && renderUserStep()}
          {activeStep === 2 && renderAuthStep()}
        </CardContent>
      </Card>

      {/* Offline Mode Dialog */}
      <Dialog
        open={showOfflineDialog}
        onClose={() => setShowOfflineDialog(false)}
      >
        <DialogTitle>Use Offline Mode?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Would you like to use the app in offline mode? You'll have access to previously downloaded content.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowOfflineDialog(false)}>Cancel</Button>
          <Button onClick={handleOfflineMode} variant="contained">
            Continue Offline
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Onboarding;
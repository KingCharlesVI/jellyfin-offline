const { app, BrowserWindow, ipcMain } = require('electron');
const Store = require('electron-store');
const path = require('path');
const fs = require('fs');

// Initialize stores for different types of data
const mediaStore = new Store({ name: 'downloaded-media' });
const progressStore = new Store({ name: 'progress' });

let mainWindow;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));
}

app.whenReady().then(() => {
  // Create media directory if it doesn't exist
  const mediaDir = path.join(app.getPath('userData'), 'media');
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }
  createWindow();
});

// Handle media download request
ipcMain.handle('download-media', async (event, { mediaId, title, url }) => {
  try {
    const mediaPath = path.join(app.getPath('userData'), 'media', mediaId);
    
    // Save media information
    mediaStore.set(mediaId, {
      id: mediaId,
      title,
      path: mediaPath,
      downloadedAt: Date.now()
    });
    
    return { success: true, path: mediaPath };
  } catch (error) {
    console.error('Download failed:', error);
    return { success: false, error: error.message };
  }
});

// Get all downloaded media
ipcMain.handle('get-downloaded-media', () => {
  return Object.values(mediaStore.store);
});

// Handle progress updates
ipcMain.handle('update-progress', async (event, { mediaId, position, duration }) => {
  try {
    progressStore.set(mediaId, {
      position,
      duration,
      lastUpdated: Date.now(),
      synced: false
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to update progress:', error);
    return { success: false, error: error.message };
  }
});

// Get progress for a specific media
ipcMain.handle('get-progress', (event, { mediaId }) => {
  return progressStore.get(mediaId);
});

// Sync progress with server when online
ipcMain.handle('sync-progress', async (event, { serverUrl, apiKey }) => {
  try {
    const allProgress = progressStore.store;
    const unsyncedProgress = Object.entries(allProgress)
      .filter(([_, data]) => !data.synced)
      .map(([mediaId, data]) => ({ mediaId, ...data }));
    
    // Sync each unsynced progress with server
    for (const progress of unsyncedProgress) {
      // Here you would make the API call to sync with Jellyfin server
      // After successful sync:
      const currentProgress = progressStore.get(progress.mediaId);
      progressStore.set(progress.mediaId, {
        ...currentProgress,
        synced: true
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Sync failed:', error);
    return { success: false, error: error.message };
  }
});
const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const Store = require('electron-store');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const settingsStore = new Store({ name: 'settings' });

// Initialize stores for different types of data
const mediaStore = new Store({ name: 'downloaded-media' });
const progressStore = new Store({ name: 'progress' });

let mainWindow;
let menu = null;  // Store menu reference

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1800,
    height: 1200,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false,
      webSecurity: false // for development only
    }
  });

  // Store the default menu
  menu = Menu.getApplicationMenu();

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

ipcMain.on('test-message', (event, arg) => {
  console.log('Received test message:', arg);
  event.reply('test-reply', 'Hello from main process');
});

// Handle media download
ipcMain.on('download-media', async (event, { url: downloadUrl, filename, headers, movieId }) => {
  try {
    // Get download path from settings store
    const targetDir = settingsStore.get('downloadPath') || path.join(app.getPath('userData'), 'media');
    console.log('Using download path:', targetDir);

    // Ensure the target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, filename);
    console.log('Full file path:', filePath);

    const file = fs.createWriteStream(filePath);

    // Parse the URL to determine which protocol to use
    const parsedUrl = new URL(downloadUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    console.log('Using protocol:', parsedUrl.protocol);
    console.log('Headers:', headers);

    const request = client.get(downloadUrl, { headers }, response => {
      console.log('Response status:', response.statusCode);
      console.log('Response headers:', response.headers);

      if (response.statusCode !== 200) {
        fs.unlink(filePath, () => {
          const error = `Server returned status code: ${response.statusCode}`;
          console.error(error);
          event.reply('download-error', error);
        });
        return;
      }

      const totalLength = parseInt(response.headers['content-length'], 10);
      console.log('Total file size:', totalLength);
      let downloaded = 0;

      response.pipe(file);

      response.on('data', chunk => {
        downloaded += chunk.length;
        const percent = (downloaded / totalLength) * 100;
        console.log(`Downloaded: ${downloaded} / ${totalLength} (${percent.toFixed(2)}%)`);
        event.reply('download-progress', {
          percent,
          transferred: downloaded,
          total: totalLength
        });
      });

      file.on('finish', () => {
        console.log('Download finished');
        file.close();
        
        // Store using the actual movieId
        mediaStore.set(movieId, {
          id: movieId,
          title: filename,
          path: filePath,
          downloadedAt: Date.now(),
          size: totalLength
        });
        
        event.reply('download-complete', {
          id: movieId,
          path: filePath
        });
      });
    });

    request.on('error', (error) => {
      console.error('Download request error:', error);
      fs.unlink(filePath, () => {
        event.reply('download-error', error.message);
      });
    });

  } catch (error) {
    console.error('Download failed:', error);
    event.reply('download-error', error.message);
  }
});

ipcMain.handle('set-download-path', (event, path) => {
  settingsStore.set('downloadPath', path);
  return true;
});

ipcMain.handle('get-download-path', () => {
  return settingsStore.get('downloadPath') || path.join(app.getPath('userData'), 'media');
});

// Get all downloaded media
ipcMain.handle('get-downloaded-media', () => {
  return Object.values(mediaStore.store);
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Download Location',
    buttonLabel: 'Select Folder'
  });

  if (!result.canceled) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('check-if-downloaded', async (event, movieId) => {
  try {
    console.log('Checking if movie is downloaded:', movieId);
    const downloadData = mediaStore.get(movieId);
    console.log('Download data:', downloadData);
    
    if (!downloadData) {
      return false;
    }

    // Also check if the file actually exists
    if (!fs.existsSync(downloadData.path)) {
      console.log('File not found at path:', downloadData.path);
      mediaStore.delete(movieId);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking download status:', error);
    return false;
  }
});

ipcMain.handle('delete-download', async (event, mediaId) => {
  try {
    console.log('Attempting to delete download:', mediaId);
    const downloadData = mediaStore.get(mediaId);
    
    if (!downloadData) {
      console.log('No download data found for:', mediaId);
      return false;
    }

    console.log('Found download data:', downloadData);

    if (downloadData.path && fs.existsSync(downloadData.path)) {
      // Delete the file
      await fs.promises.unlink(downloadData.path);
      console.log('Deleted file:', downloadData.path);
    }

    // Remove from stores
    mediaStore.delete(mediaId);
    progressStore.delete(mediaId);
    
    console.log('Removed from stores');
    return true;
  } catch (error) {
    console.error('Failed to delete download:', error);
    throw error;
  }
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
    
    for (const progress of unsyncedProgress) {
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

// Get downloads size
ipcMain.handle('get-downloads-size', async () => {
  const mediaDir = path.join(app.getPath('userData'), 'media');
  let totalSize = 0;
  let count = 0;

  try {
    const files = await fs.promises.readdir(mediaDir);
    
    for (const file of files) {
      const stats = await fs.promises.stat(path.join(mediaDir, file));
      if (stats.isFile()) {
        totalSize += stats.size;
        count++;
      }
    }

    const sizeInGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);
    return { size: `${sizeInGB} GB`, count };
  } catch (error) {
    console.error('Failed to get downloads size:', error);
    return { size: '0 GB', count: 0 };
  }
});

// Clear downloads
ipcMain.handle('clear-downloads', async () => {
  const mediaDir = path.join(app.getPath('userData'), 'media');
  
  try {
    const files = await fs.promises.readdir(mediaDir);
    
    for (const file of files) {
      await fs.promises.unlink(path.join(mediaDir, file));
    }
    
    // Clear the media store
    mediaStore.clear();
    
    return true;
  } catch (error) {
    console.error('Failed to clear downloads:', error);
    return false;
  }
});

ipcMain.handle('hide-menu', () => {
  Menu.setApplicationMenu(null);
  mainWindow.setFullScreen(true);
});

ipcMain.handle('show-menu', () => {
  Menu.setApplicationMenu(menu);
  mainWindow.setFullScreen(false);
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// App lifecycle events
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on('test-ipc', (event, message) => {
  console.log('IPC test received:', message);
  event.reply('test-ipc-reply', 'reply from main');
});
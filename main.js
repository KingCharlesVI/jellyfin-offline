const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const Store = require('electron-store');
const path = require('path');
const fs = require('fs');
const https = require('https');

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

  mainWindow.webContents.openDevTools();

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
ipcMain.on('download-media', async (event, { url, filename, headers }) => {
  console.log('Received download request:', { url, filename });
  console.log('Headers:', headers);
  
  try {
    const mediaDir = path.join(app.getPath('userData'), 'media');
    console.log('Saving to directory:', mediaDir);
    
    const filePath = path.join(mediaDir, filename);
    console.log('Full file path:', filePath);
    
    const file = fs.createWriteStream(filePath);

    console.log('Making HTTPS request...');
    const request = https.get(url, { headers }, response => {
      console.log('Response status:', response.statusCode);
      console.log('Response headers:', response.headers);

      if (response.statusCode !== 200) {
        fs.unlink(filePath, () => {
          console.error(`Server returned status code: ${response.statusCode}`);
          event.reply('download-error', `Server returned status code: ${response.statusCode}`);
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
        const mediaId = path.basename(filePath, path.extname(filePath));
        
        mediaStore.set(mediaId, {
          id: mediaId,
          title: filename,
          path: filePath,
          downloadedAt: Date.now(),
          size: totalLength
        });
        
        event.reply('download-complete', {
          id: mediaId,
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
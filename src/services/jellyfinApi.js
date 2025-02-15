const { Client } = require('node-ssdp');
import axios from 'axios';

class JellyfinApi {
  constructor() {
    this.deviceId = this.generateDeviceId();
    this.clientName = 'Jellyfin Offline';
    this.deviceName = 'Desktop';
    this.version = '1.0.0';
    
    this.axios = axios.create({
      headers: {
        'X-Emby-Authorization': this.getAuthHeader(),
      }
    });
    
    this.serverUrl = '';
    this.accessToken = '';
    this.currentUser = null;
    this.isOffline = false;
    this.lastSyncTime = localStorage.getItem('lastSyncTime');
  }

  generateDeviceId() {
    const savedDeviceId = localStorage.getItem('deviceId');
    if (savedDeviceId) return savedDeviceId;

    const newDeviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    localStorage.setItem('deviceId', newDeviceId);
    return newDeviceId;
  }

  getAuthHeader(token = '') {
    const auth = [
      `MediaBrowser Client="${this.clientName}"`,
      `Device="${this.deviceName}"`,
      `DeviceId="${this.deviceId}"`,
      `Version="${this.version}"`
    ];

    if (token) {
      auth.push(`Token="${token}"`);
    }

    return auth.join(', ');
  }

  setServerUrl(url) {
    // Normalize URL (remove trailing slashes, ensure protocol)
    let normalizedUrl = url.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `http://${normalizedUrl}`;
    }
    
    this.serverUrl = normalizedUrl;
    this.axios.defaults.baseURL = this.serverUrl;
    localStorage.setItem('serverUrl', this.serverUrl);
  }

  setAccessToken(token) {
    this.accessToken = token;
    this.axios.defaults.headers['X-Emby-Authorization'] = this.getAuthHeader(token);
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  async discoverServers() {
    const servers = [];

    // SSDP Discovery
    async function ssdpDiscovery() {
        return new Promise((resolve) => {
            const client = new Client();
            const discovered = [];

            client.on('response', (headers, statusCode, rinfo) => {
                if (headers.LOCATION && headers.SERVER && headers.SERVER.includes('Jellyfin')) {
                    discovered.push({ url: headers.LOCATION, address: rinfo.address });
                    console.log(`Found Jellyfin server: ${headers.LOCATION} at ${rinfo.address}`);
                }
            });

            // Search for Jellyfin servers via SSDP
            client.search('urn:schemas-upnp-org:device:MediaServer:1');

            // Stop SSDP search after 5 seconds
            setTimeout(() => {
                client.stop();
                resolve(discovered);
            }, 5000);
        });
    }

    try {
        const ssdpServers = await ssdpDiscovery();
        servers.push(...ssdpServers);
    } catch (e) {
        console.error('SSDP discovery failed:', e);
    }

    // Common Local Addresses
    const localPorts = ['8096', '8920'];
    const localAddresses = ['localhost', '127.0.0.1'];

    for (const address of localAddresses) {
        for (const port of localPorts) {
            try {
                const url = `http://${address}:${port}`;
                const response = await axios.get(`${url}/System/Info/Public`, { timeout: 1000 });

                if (response.data) {
                    servers.push({ url, info: response.data });
                    console.log(`Found local Jellyfin server: ${url}`);
                }
            } catch (e) {
                // Skip failed attempts
            }
        }
    }

    return servers;
  }

  async testConnection(url) {
    try {
      const testUrl = url.trim().replace(/\/+$/, '');
      const response = await axios.get(`${testUrl}/System/Info/Public`, {
        headers: {
          'X-Emby-Authorization': this.getAuthHeader()
        },
        timeout: 5000
      });
  
      // Store these for future use
      this.serverInfo = response.data;
      return {
        success: true,
        serverInfo: response.data,
        offline: false
      };
    } catch (error) {
      console.error('Connection test failed:', error);
      
      // Check if we have offline data available
      const hasOfflineData = localStorage.getItem('offlineData');
      if (hasOfflineData && this.lastSyncTime) {
        return {
          success: true,
          offline: true,
          lastSync: this.lastSyncTime,
          serverInfo: null
        };
      }
      
      throw new Error('Unable to connect to server');
    }
  }
  
  // Add this getter method
  getServerInfo() {
    return this.serverInfo;
  }

  async getPublicUsers() {
    try {
      const response = await this.axios.get('/Users/Public');
      return response.data;
    } catch (error) {
      console.error('Failed to get public users:', error);
      throw new Error('Unable to retrieve users');
    }
  }

  async authenticateByName(username, password) {
    try {
      const response = await this.axios.post('/Users/AuthenticateByName', {
        Username: username,
        Pw: password
      });
      
      this.setAccessToken(response.data.AccessToken);
      this.currentUser = response.data.User;
      
      return {
        user: response.data.User,
        accessToken: response.data.AccessToken
      };
    } catch (error) {
      console.error('Authentication error:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        throw new Error('Invalid username or password');
      }
      throw new Error('Authentication failed');
    }
  }

  async authenticateByQuickConnect(secret) {
    try {
      const response = await this.axios.post('/QuickConnect/Connect', {
        Secret: secret
      });
      
      if (response.data.Authenticated) {
        const authResult = await this.axios.get('/QuickConnect/Token', {
          params: { Secret: secret }
        });
        
        this.setAccessToken(authResult.data.AccessToken);
        this.currentUser = authResult.data.User;
        
        return {
          user: authResult.data.User,
          accessToken: authResult.data.AccessToken
        };
      }
      
      throw new Error('Quick Connect authentication failed');
    } catch (error) {
      console.error('Quick Connect error:', error);
      throw new Error('Quick Connect failed');
    }
  }

  async getCurrentUser() {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.axios.get('/Users/Me');
      this.currentUser = response.data;
      return response.data;
    } catch (error) {
      console.error('Get user error:', error);
      throw new Error('Failed to get user info');
    }
  }

  setOfflineMode(enabled) {
    this.isOffline = enabled;
    localStorage.setItem('offlineMode', enabled ? 'true' : 'false');
  }

  async syncOfflineData() {
    if (this.isOffline) return;

    try {
      // Sync viewed status and progress
      const offlineProgress = JSON.parse(localStorage.getItem('offlineProgress') || '{}');
      for (const [itemId, progress] of Object.entries(offlineProgress)) {
        if (!progress.synced) {
          await this.axios.post(`/Items/${itemId}/PlayingProgress`, progress);
          offlineProgress[itemId].synced = true;
        }
      }
      localStorage.setItem('offlineProgress', JSON.stringify(offlineProgress));

      // Update last sync time
      this.lastSyncTime = new Date().toISOString();
      localStorage.setItem('lastSyncTime', this.lastSyncTime);
    } catch (error) {
      console.error('Failed to sync offline data:', error);
      throw error;
    }
  }

  async getItems(params = {}) {
    if (!this.accessToken && !this.isOffline) {
      throw new Error('Not authenticated');
    }

    try {
      if (this.isOffline) {
        // Return cached items in offline mode
        const cachedItems = JSON.parse(localStorage.getItem('offlineItems') || '[]');
        let items = [...cachedItems];

        // Apply filters
        if (params.searchTerm) {
          const searchLower = params.searchTerm.toLowerCase();
          items = items.filter(item => 
            item.Name.toLowerCase().includes(searchLower)
          );
        }

        // Apply sorting
        if (params.sortBy) {
          items.sort((a, b) => {
            const aVal = a[params.sortBy] || '';
            const bVal = b[params.sortBy] || '';
            return params.sortOrder === 'Descending' 
              ? String(bVal).localeCompare(String(aVal))
              : String(aVal).localeCompare(String(bVal));
          });
        }

        // Apply pagination
        if (params.startIndex !== undefined && params.limit) {
          items = items.slice(params.startIndex, params.startIndex + params.limit);
        }

        return {
          Items: items,
          TotalRecordCount: cachedItems.length
        };
      }

      // Online mode - API request
      const response = await this.axios.get('/Items', {
        params: {
          SortBy: params.sortBy || 'SortName',
          SortOrder: params.sortOrder || 'Ascending',
          IncludeItemTypes: params.includeItemTypes || 'Movie',
          Recursive: true,
          Fields: 'Overview,CommunityRating,CriticRating,DateCreated,PremiereDate,ProductionYear,Path,MediaSources',
          StartIndex: params.startIndex || 0,
          Limit: params.limit || 50,
          SearchTerm: params.searchTerm || '',
          ...params
        }
      });

      // Cache items for offline use if they don't exist yet
      if (response.data.Items?.length > 0) {
        const cachedItems = JSON.parse(localStorage.getItem('offlineItems') || '[]');
        const newItems = response.data.Items.filter(item => 
          !cachedItems.some(cached => cached.Id === item.Id)
        );
        if (newItems.length > 0) {
          localStorage.setItem('offlineItems', JSON.stringify([...cachedItems, ...newItems]));
        }
      }

      return response.data;
    } catch (error) {
      console.error('Get items error:', error);
      throw new Error('Failed to fetch media items');
    }
  }

  async getItemInfo(itemId) {
    try {
      const response = await this.axios.get(`/Items/${itemId}`, {
        params: {
          Fields: 'Overview,Genres,Studios,People,MediaStreams,MediaSources,UserData'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get item info:', error);
      throw new Error('Failed to load item details');
    }
  }

  async markAsFavorite(itemId, isFavorite) {
    try {
      const endpoint = isFavorite ? 'Favorites' : 'Favorites/Delete';
      await this.axios.post(`/Users/Me/${endpoint}`, {
        Id: itemId
      });
      return true;
    } catch (error) {
      console.error('Failed to update favorite status:', error);
      throw error;
    }
  }
  
  async markAsWatched(itemId, isWatched) {
    try {
      const endpoint = isWatched ? 'PlayedItems' : 'PlayedItems/Delete';
      await this.axios.post(`/Users/Me/${endpoint}`, {
        Id: itemId
      });
      return true;
    } catch (error) {
      console.error('Failed to update watched status:', error);
      throw error;
    }
  }

  logout() {
    this.accessToken = '';
    this.currentUser = null;
    localStorage.removeItem('accessToken');
    this.axios.defaults.headers['X-Emby-Authorization'] = this.getAuthHeader();
  }

  getImageUrl(itemId, imageType = 'Primary', maxHeight = 300) {
    return `${this.serverUrl}/Items/${itemId}/Images/${imageType}?maxHeight=${maxHeight}&quality=90`;
  }

  getStreamInfo(mediaSource) {
    if (!mediaSource?.MediaStreams) return { badges: [] };
  
    const videoStream = mediaSource.MediaStreams.find(s => s.Type === 'Video');
    if (!videoStream) return { badges: [] };
  
    const badges = [];
    
    // Resolution badge
    if (videoStream.Width >= 3840) badges.push('4K');
    else if (videoStream.Width >= 1920) badges.push('1080p');
    else if (videoStream.Width >= 1280) badges.push('720p');
  
    // HDR detection
    if (videoStream.VideoRangeType === 'HDR' || 
        videoStream.ColorPrimaries === 'bt2020' || 
        videoStream.ColorTransfer === 'smpte2084') {
      if (videoStream.VideoDoViTitle || videoStream.DolbyVision) {
        badges.push('Dolby Vision');
      } else if (videoStream.Hdr10Plus) {
        badges.push('HDR10+');
      } else if (videoStream.Hdr10) {
        badges.push('HDR10');
      } else {
        badges.push('HDR');
      }
    }
  
    return {
      badges,
      width: videoStream.Width,
      height: videoStream.Height,
      codec: videoStream.Codec,
      bitRate: videoStream.BitRate,
      frameRate: videoStream.RealFrameRate,
      isHDR: videoStream.VideoRangeType === 'HDR' || 
             videoStream.ColorPrimaries === 'bt2020' || 
             videoStream.ColorTransfer === 'smpte2084'
    };
  }
  
  formatAudioInfo(stream) {
    const parts = [];
    
    if (stream.Language) parts.push(stream.Language);
    if (stream.Codec) {
      let codec = stream.Codec.toUpperCase();
      if (codec === 'DTS' && stream.Profile) {
        codec = `DTS-${stream.Profile}`;
      }
      parts.push(codec);
    }
    if (stream.Channels) parts.push(`${stream.Channels}.1`);
    if (stream.Profile === 'Atmos') parts.push('Atmos');
    if (stream.BitRate) {
      const bitrateMbps = Math.round(stream.BitRate / 1000);
      parts.push(`@ ${bitrateMbps} Kbps`);
    }
  
    return parts.join(' ');
  }
  
  formatSubtitleInfo(stream) {
    const parts = [];
    
    if (stream.Language) parts.push(stream.Language);
    if (stream.Codec) parts.push(`(${stream.Codec.toUpperCase()})`);
    if (stream.IsForced) parts.push('[Forced]');
    if (stream.IsDefault) parts.push('[Default]');
  
    return parts.join(' ');
  }
}

// Create a singleton instance
const jellyfinApi = new JellyfinApi();
export default jellyfinApi;
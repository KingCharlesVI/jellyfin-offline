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
  }

  generateDeviceId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
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
    this.serverUrl = url.replace(/\/+$/, '');
    this.axios.defaults.baseURL = this.serverUrl;
  }

  setAccessToken(token) {
    this.accessToken = token;
    this.axios.defaults.headers['X-Emby-Authorization'] = this.getAuthHeader(token);
  }

  async getPublicSystemInfo() {
    try {
      const response = await this.axios.get('/System/Info/Public');
      return response.data;
    } catch (error) {
      console.error('System info error:', error);
      throw new Error('Unable to connect to server');
    }
  }

  async authenticateByName(username, password) {
    try {
      const response = await this.axios.post('/Users/AuthenticateByName', {
        Username: username,
        Pw: password
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Emby-Authorization': this.getAuthHeader()
        }
      });
      
      this.setAccessToken(response.data.AccessToken);
      
      return {
        user: response.data.User,
        accessToken: response.data.AccessToken
      };
    } catch (error) {
      console.error('Authentication error:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        throw new Error('Invalid username or password');
      }
      throw new Error('Authentication failed: ' + (error.response?.data?.message || error.message));
    }
  }

  async getCurrentUser() {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.axios.get('/Users/Me');
      return response.data;
    } catch (error) {
      console.error('Get user error:', error);
      throw new Error('Failed to get user info');
    }
  }

  async getItems({
    includeItemTypes = 'Movie',
    sortBy = 'SortName',
    sortOrder = 'Ascending',
    filters = [],
    searchTerm = '',
    startIndex = 0,
    limit = 50,
    isPlayed,
    minWidth
  } = {}) {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const params = {
        SortBy: sortBy,
        SortOrder: sortOrder,
        IncludeItemTypes: includeItemTypes,
        Recursive: true,
        Fields: 'Overview,CommunityRating,CriticRating,DateCreated,DatePlayed,Width,Height,MediaSources',
        StartIndex: startIndex,
        Limit: limit,
        SearchTerm: searchTerm
      };

      // Add optional filters
      if (filters.length > 0) {
        params.Filters = filters.join(',');
      }

      if (isPlayed !== undefined) {
        params.IsPlayed = isPlayed;
      }

      if (minWidth) {
        params.MinWidth = minWidth;
      }

      const response = await this.axios.get('/Items', { params });
      return response.data;
    } catch (error) {
      console.error('Get items error:', error);
      throw new Error('Failed to fetch media items');
    }
  }

  getImageUrl(itemId, imageType = 'Primary', maxHeight = 300) {
    return `${this.serverUrl}/Items/${itemId}/Images/${imageType}?maxHeight=${maxHeight}&quality=90`;
  }
}

// Create a singleton instance
const jellyfinApi = new JellyfinApi();
export default jellyfinApi;
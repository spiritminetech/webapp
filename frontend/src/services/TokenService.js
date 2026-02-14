import appConfig from '../config/app.config.js';

/**
 * JWT Token Management Service
 * Handles token storage, validation, refresh, and security
 */
class TokenService {
  constructor() {
    this.tokenKey = appConfig.storage.token;
    this.userKey = appConfig.storage.user;
    this.refreshTokenKey = 'refreshToken';
    this.tokenExpiryKey = 'tokenExpiry';
    
    // Token refresh configuration
    this.refreshThreshold = 5 * 60 * 1000; // 5 minutes before expiry
    this.refreshPromise = null;
    
    // Initialize token monitoring only in browser environment
    if (typeof window !== 'undefined') {
      this.initializeTokenMonitoring();
    }
  }

  /**
   * Check if running in browser environment
   * @returns {boolean} True if in browser
   */
  isBrowser() {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  /**
   * Safe localStorage getter
   * @param {string} key - Storage key
   * @returns {string|null} Stored value or null
   */
  getStorageItem(key) {
    if (!this.isBrowser()) {
      return null;
    }
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return null;
    }
  }

  /**
   * Safe localStorage setter
   * @param {string} key - Storage key
   * @param {string} value - Value to store
   */
  setStorageItem(key, value) {
    if (!this.isBrowser()) {
      return;
    }
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting localStorage:', error);
    }
  }

  /**
   * Safe localStorage remover
   * @param {string} key - Storage key
   */
  removeStorageItem(key) {
    if (!this.isBrowser()) {
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }

  /**
   * Store JWT token securely
   * @param {string} token - JWT token
   * @param {string} refreshToken - Refresh token (optional)
   * @param {number} expiresIn - Token expiry time in seconds
   */
  setToken(token, refreshToken = null, expiresIn = null) {
    try {
      if (!token) {
        throw new Error('Token is required');
      }

      // Store token
      this.setStorageItem(this.tokenKey, token);
      
      // Store refresh token if provided
      if (refreshToken) {
        this.setStorageItem(this.refreshTokenKey, refreshToken);
      }
      
      // Calculate and store expiry time
      if (expiresIn) {
        const expiryTime = Date.now() + (expiresIn * 1000);
        this.setStorageItem(this.tokenExpiryKey, expiryTime.toString());
      } else {
        // Try to extract expiry from JWT payload
        const payload = this.decodeToken(token);
        if (payload && payload.exp) {
          this.setStorageItem(this.tokenExpiryKey, (payload.exp * 1000).toString());
        }
      }
      
      appConfig.log('Token stored successfully');
      this.scheduleTokenRefresh();
      
    } catch (error) {
      appConfig.error('Failed to store token:', error);
      throw error;
    }
  }

  /**
   * Get stored JWT token
   * @returns {string|null} JWT token
   */
  getToken() {
    try {
      const token = this.getStorageItem(this.tokenKey);
      
      if (!token) {
        return null;
      }
      
      // Check if token is expired
      if (this.isTokenExpired()) {
        appConfig.log('Token is expired, clearing storage');
        this.clearTokens();
        return null;
      }
      
      return token;
    } catch (error) {
      appConfig.error('Failed to get token:', error);
      return null;
    }
  }

  /**
   * Get refresh token
   * @returns {string|null} Refresh token
   */
  getRefreshToken() {
    return this.getStorageItem(this.refreshTokenKey);
  }

  /**
   * Check if token exists and is valid
   * @returns {boolean} True if token is valid
   */
  isAuthenticated() {
    const token = this.getToken();
    return !!token && !this.isTokenExpired();
  }

  /**
   * Check if token is expired
   * @returns {boolean} True if token is expired
   */
  isTokenExpired() {
    try {
      const expiryTime = this.getStorageItem(this.tokenExpiryKey);
      
      if (!expiryTime) {
        // If no expiry time stored, try to decode from token
        const token = this.getStorageItem(this.tokenKey);
        if (token) {
          const payload = this.decodeToken(token);
          if (payload && payload.exp) {
            return Date.now() >= (payload.exp * 1000);
          }
        }
        return true; // Assume expired if no expiry info
      }
      
      return Date.now() >= parseInt(expiryTime);
    } catch (error) {
      appConfig.error('Failed to check token expiry:', error);
      return true; // Assume expired on error
    }
  }

  /**
   * Check if token needs refresh
   * @returns {boolean} True if token should be refreshed
   */
  shouldRefreshToken() {
    try {
      const expiryTime = this.getStorageItem(this.tokenExpiryKey);
      
      if (!expiryTime) {
        return false;
      }
      
      const timeUntilExpiry = parseInt(expiryTime) - Date.now();
      return timeUntilExpiry <= this.refreshThreshold && timeUntilExpiry > 0;
    } catch (error) {
      appConfig.error('Failed to check if token needs refresh:', error);
      return false;
    }
  }

  /**
   * Decode JWT token payload
   * @param {string} token - JWT token
   * @returns {object|null} Decoded payload
   */
  decodeToken(token) {
    try {
      if (!token) {
        return null;
      }
      
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      const payload = parts[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      
      return decoded;
    } catch (error) {
      appConfig.error('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Get user information from token
   * @returns {object|null} User information
   */
  getUserFromToken() {
    try {
      const token = this.getToken();
      if (!token) {
        return null;
      }
      
      const payload = this.decodeToken(token);
      if (!payload) {
        return null;
      }
      
      return {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        companyId: payload.companyId,
        employeeId: payload.employeeId,
        permissions: payload.permissions || [], // Add permissions from token
        exp: payload.exp,
        iat: payload.iat
      };
    } catch (error) {
      appConfig.error('Failed to get user from token:', error);
      return null;
    }
  }

  /**
   * Clear all stored tokens
   */
  clearTokens() {
    try {
      this.removeStorageItem(this.tokenKey);
      this.removeStorageItem(this.refreshTokenKey);
      this.removeStorageItem(this.tokenExpiryKey);
      this.removeStorageItem(this.userKey);
      
      // Clear any scheduled refresh
      if (this.refreshTimeout) {
        clearTimeout(this.refreshTimeout);
        this.refreshTimeout = null;
      }
      
      appConfig.log('All tokens cleared');
    } catch (error) {
      appConfig.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Refresh JWT token
   * @returns {Promise<string>} New JWT token
   */
  async refreshToken() {
    try {
      // Prevent multiple simultaneous refresh attempts
      if (this.refreshPromise) {
        return await this.refreshPromise;
      }
      
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      appConfig.log('Refreshing JWT token...');
      
      this.refreshPromise = this.performTokenRefresh(refreshToken);
      const result = await this.refreshPromise;
      
      this.refreshPromise = null;
      return result;
      
    } catch (error) {
      this.refreshPromise = null;
      appConfig.error('Token refresh failed:', error);
      
      // Clear tokens on refresh failure
      this.clearTokens();
      throw error;
    }
  }

  /**
   * Perform the actual token refresh API call
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<string>} New JWT token
   */
  async performTokenRefresh(refreshToken) {
    const response = await fetch(`${appConfig.api.baseURL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Token refresh failed');
    }
    
    const data = await response.json();
    
    if (!data.token) {
      throw new Error('No token received from refresh endpoint');
    }
    
    // Store the new token
    this.setToken(data.token, data.refreshToken, data.expiresIn);
    
    appConfig.log('Token refreshed successfully');
    return data.token;
  }

  /**
   * Schedule automatic token refresh
   */
  scheduleTokenRefresh() {
    try {
      // Clear any existing timeout
      if (this.refreshTimeout) {
        clearTimeout(this.refreshTimeout);
      }
      
      const expiryTime = this.getStorageItem(this.tokenExpiryKey);
      if (!expiryTime) {
        return;
      }
      
      const timeUntilRefresh = parseInt(expiryTime) - Date.now() - this.refreshThreshold;
      
      if (timeUntilRefresh > 0) {
        this.refreshTimeout = setTimeout(() => {
          this.refreshToken().catch(error => {
            appConfig.error('Scheduled token refresh failed:', error);
          });
        }, timeUntilRefresh);
        
        appConfig.log(`Token refresh scheduled in ${Math.round(timeUntilRefresh / 1000)} seconds`);
      }
    } catch (error) {
      appConfig.error('Failed to schedule token refresh:', error);
    }
  }

  /**
   * Initialize token monitoring
   */
  initializeTokenMonitoring() {
    // Only initialize in browser environment
    if (typeof window === 'undefined') {
      return;
    }
    
    // Check token status on page load
    if (this.isAuthenticated()) {
      this.scheduleTokenRefresh();
    }
    
    // Monitor storage changes (for multi-tab scenarios)
    window.addEventListener('storage', (event) => {
      if (event.key === this.tokenKey) {
        if (event.newValue) {
          this.scheduleTokenRefresh();
        } else {
          // Token was cleared in another tab
          this.clearTokens();
        }
      }
    });
    
    // Monitor page visibility for token refresh
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.shouldRefreshToken()) {
        this.refreshToken().catch(error => {
          appConfig.error('Token refresh on visibility change failed:', error);
        });
      }
    });
  }

  /**
   * Get token expiry information
   * @returns {object} Token expiry details
   */
  getTokenExpiryInfo() {
    try {
      const expiryTime = this.getStorageItem(this.tokenExpiryKey);
      
      if (!expiryTime) {
        return {
          hasExpiry: false,
          expiryTime: null,
          timeUntilExpiry: null,
          isExpired: true,
          shouldRefresh: false
        };
      }
      
      const expiry = parseInt(expiryTime);
      const now = Date.now();
      const timeUntilExpiry = expiry - now;
      
      return {
        hasExpiry: true,
        expiryTime: new Date(expiry),
        timeUntilExpiry: Math.max(0, timeUntilExpiry),
        isExpired: timeUntilExpiry <= 0,
        shouldRefresh: timeUntilExpiry <= this.refreshThreshold && timeUntilExpiry > 0
      };
    } catch (error) {
      appConfig.error('Failed to get token expiry info:', error);
      return {
        hasExpiry: false,
        expiryTime: null,
        timeUntilExpiry: null,
        isExpired: true,
        shouldRefresh: false
      };
    }
  }
}

// Export singleton instance
const tokenService = new TokenService();
export default tokenService;
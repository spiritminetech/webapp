import ApiService from './ApiService.js';
import tokenService from './TokenService.js';
import appConfig from '../config/app.config.js';

/**
 * Authentication Service
 * Handles all authentication-related API calls with enhanced JWT token management
 */
class AuthService extends ApiService {
  constructor() {
    super(appConfig.api.endpoints.auth);
  }

  async login(credentials) {
    try {
      const response = await this.client.post(`${this.endpoint}/login`, credentials);
      const { token, refreshToken, user, expiresIn } = response.data;
      
      // Store authentication data using TokenService
      if (token) {
        tokenService.setToken(token, refreshToken, expiresIn);
      }
      if (user) {
        localStorage.setItem(appConfig.storage.user, JSON.stringify(user));
      }
      
      appConfig.log('User logged in successfully:', user?.email);
      return response.data;
    } catch (error) {
      this.handleError('login', error);
      throw error;
    }
  }

  async logout() {
    try {
      // Get token before clearing for API call
      const token = tokenService.getToken();
      
      if (token) {
        await this.client.post(`${this.endpoint}/logout`);
      }
    } catch (error) {
      appConfig.error('Logout API call failed:', error);
    } finally {
      // Clear all authentication data using TokenService
      this.clearAuthData();
      appConfig.log('User logged out');
    }
  }

  async refreshToken() {
    try {
      const newToken = await tokenService.refreshToken();
      appConfig.log('Token refreshed successfully');
      return { token: newToken };
    } catch (error) {
      this.handleError('refreshToken', error);
      this.clearAuthData();
      throw error;
    }
  }

  async forgotPassword(email) {
    try {
      const response = await this.client.post(`${this.endpoint}/forgot-password`, { email });
      return response.data;
    } catch (error) {
      this.handleError('forgotPassword', error);
      throw error;
    }
  }

  async resetPassword(token, password) {
    try {
      const response = await this.client.post(`${this.endpoint}/reset-password`, {
        token,
        password
      });
      return response.data;
    } catch (error) {
      this.handleError('resetPassword', error);
      throw error;
    }
  }

  // Utility methods
  clearAuthData() {
    tokenService.clearTokens();
    localStorage.removeItem(appConfig.storage.selectedCompany);
  }

  getToken() {
    return tokenService.getToken();
  }

  getUser() {
    const userStr = localStorage.getItem(appConfig.storage.user);
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated() {
    return tokenService.isAuthenticated();
  }

  /**
   * Get user information from JWT token
   * @returns {object|null} User information from token
   */
  getUserFromToken() {
    return tokenService.getUserFromToken();
  }

  /**
   * Check if token needs refresh
   * @returns {boolean} True if token should be refreshed
   */
  shouldRefreshToken() {
    return tokenService.shouldRefreshToken();
  }

  /**
   * Get token expiry information
   * @returns {object} Token expiry details
   */
  getTokenExpiryInfo() {
    return tokenService.getTokenExpiryInfo();
  }

  /**
   * Handle authentication errors
   * @param {Error} error - Authentication error
   * @returns {object} Error details
   */
  handleAuthError(error) {
    const response = error.response;
    
    if (!response) {
      return {
        type: 'NETWORK_ERROR',
        message: 'Network connection failed. Please check your internet connection.',
        shouldRetry: true
      };
    }
    
    switch (response.status) {
      case 401:
        // Token expired or invalid
        this.clearAuthData();
        return {
          type: 'UNAUTHORIZED',
          message: 'Your session has expired. Please log in again.',
          shouldRedirect: true,
          redirectTo: '/login'
        };
        
      case 403:
        return {
          type: 'FORBIDDEN',
          message: 'You do not have permission to access this resource.',
          shouldRetry: false
        };
        
      case 429:
        return {
          type: 'RATE_LIMITED',
          message: 'Too many requests. Please wait a moment and try again.',
          shouldRetry: true,
          retryAfter: response.headers['retry-after'] || 60
        };
        
      case 500:
        return {
          type: 'SERVER_ERROR',
          message: 'Server error occurred. Please try again later.',
          shouldRetry: true
        };
        
      default:
        return {
          type: 'UNKNOWN_ERROR',
          message: response.data?.message || 'An unexpected error occurred.',
          shouldRetry: false
        };
    }
  }
}

// Export singleton instance
const authService = new AuthService();
export default authService;
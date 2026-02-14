import AuthService from '../AuthService.js';
import tokenService from '../TokenService.js';
import appConfig from '../../config/app.config.js';

// Mock dependencies
jest.mock('../TokenService.js');
jest.mock('../../config/app.config.js', () => ({
  api: {
    endpoints: {
      auth: '/api/auth'
    }
  },
  storage: {
    user: 'user',
    selectedCompany: 'selectedCompany'
  },
  log: jest.fn(),
  error: jest.fn()
}));

// Mock ApiService
jest.mock('../ApiService.js', () => {
  return jest.fn().mockImplementation(() => ({
    client: {
      post: jest.fn()
    },
    handleError: jest.fn()
  }));
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
global.localStorage = localStorageMock;

describe('AuthService', () => {
  let authService;
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
    mockClient = authService.client;
  });

  describe('Login', () => {
    test('should login successfully with token and refresh token', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      const mockResponse = {
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 3600,
          user: { id: 1, email: 'test@example.com', name: 'Test User' }
        }
      };

      mockClient.post.mockResolvedValue(mockResponse);
      tokenService.setToken = jest.fn();

      const result = await authService.login(credentials);

      expect(mockClient.post).toHaveBeenCalledWith('/api/auth/login', credentials);
      expect(tokenService.setToken).toHaveBeenCalledWith(
        'access-token',
        'refresh-token',
        3600
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(mockResponse.data.user)
      );
      expect(result).toEqual(mockResponse.data);
    });

    test('should handle login failure', async () => {
      const credentials = { email: 'test@example.com', password: 'wrong-password' };
      const error = new Error('Invalid credentials');

      mockClient.post.mockRejectedValue(error);
      authService.handleError = jest.fn();

      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
      expect(authService.handleError).toHaveBeenCalledWith('login', error);
    });
  });

  describe('Logout', () => {
    test('should logout successfully', async () => {
      tokenService.getToken = jest.fn().mockReturnValue('valid-token');
      tokenService.clearTokens = jest.fn();
      mockClient.post.mockResolvedValue({ data: { success: true } });

      await authService.logout();

      expect(mockClient.post).toHaveBeenCalledWith('/api/auth/logout');
      expect(tokenService.clearTokens).toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('selectedCompany');
    });

    test('should clear tokens even if API call fails', async () => {
      tokenService.getToken = jest.fn().mockReturnValue('valid-token');
      tokenService.clearTokens = jest.fn();
      mockClient.post.mockRejectedValue(new Error('Network error'));

      await authService.logout();

      expect(tokenService.clearTokens).toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('selectedCompany');
    });
  });

  describe('Token Refresh', () => {
    test('should refresh token successfully', async () => {
      const newToken = 'new-access-token';
      tokenService.refreshToken = jest.fn().mockResolvedValue(newToken);

      const result = await authService.refreshToken();

      expect(tokenService.refreshToken).toHaveBeenCalled();
      expect(result).toEqual({ token: newToken });
    });

    test('should handle refresh token failure', async () => {
      const error = new Error('Refresh token expired');
      tokenService.refreshToken = jest.fn().mockRejectedValue(error);
      tokenService.clearTokens = jest.fn();
      authService.handleError = jest.fn();

      await expect(authService.refreshToken()).rejects.toThrow('Refresh token expired');
      expect(authService.handleError).toHaveBeenCalledWith('refreshToken', error);
      expect(tokenService.clearTokens).toHaveBeenCalled();
    });
  });

  describe('Authentication Status', () => {
    test('should check if user is authenticated', () => {
      tokenService.isAuthenticated = jest.fn().mockReturnValue(true);

      const result = authService.isAuthenticated();

      expect(tokenService.isAuthenticated).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should get token', () => {
      const token = 'valid-token';
      tokenService.getToken = jest.fn().mockReturnValue(token);

      const result = authService.getToken();

      expect(tokenService.getToken).toHaveBeenCalled();
      expect(result).toBe(token);
    });

    test('should get user from token', () => {
      const userInfo = { userId: 1, email: 'test@example.com', role: 'worker' };
      tokenService.getUserFromToken = jest.fn().mockReturnValue(userInfo);

      const result = authService.getUserFromToken();

      expect(tokenService.getUserFromToken).toHaveBeenCalled();
      expect(result).toEqual(userInfo);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', () => {
      const error = { response: null };

      const result = authService.handleAuthError(error);

      expect(result).toEqual({
        type: 'NETWORK_ERROR',
        message: 'Network connection failed. Please check your internet connection.',
        shouldRetry: true
      });
    });

    test('should handle 401 unauthorized errors', () => {
      const error = { response: { status: 401 } };
      tokenService.clearTokens = jest.fn();

      const result = authService.handleAuthError(error);

      expect(tokenService.clearTokens).toHaveBeenCalled();
      expect(result).toEqual({
        type: 'UNAUTHORIZED',
        message: 'Your session has expired. Please log in again.',
        shouldRedirect: true,
        redirectTo: '/login'
      });
    });

    test('should handle 403 forbidden errors', () => {
      const error = { response: { status: 403 } };

      const result = authService.handleAuthError(error);

      expect(result).toEqual({
        type: 'FORBIDDEN',
        message: 'You do not have permission to access this resource.',
        shouldRetry: false
      });
    });

    test('should handle 429 rate limit errors', () => {
      const error = { 
        response: { 
          status: 429,
          headers: { 'retry-after': '120' }
        } 
      };

      const result = authService.handleAuthError(error);

      expect(result).toEqual({
        type: 'RATE_LIMITED',
        message: 'Too many requests. Please wait a moment and try again.',
        shouldRetry: true,
        retryAfter: '120'
      });
    });

    test('should handle 500 server errors', () => {
      const error = { response: { status: 500 } };

      const result = authService.handleAuthError(error);

      expect(result).toEqual({
        type: 'SERVER_ERROR',
        message: 'Server error occurred. Please try again later.',
        shouldRetry: true
      });
    });

    test('should handle unknown errors', () => {
      const error = { 
        response: { 
          status: 418,
          data: { message: 'I am a teapot' }
        } 
      };

      const result = authService.handleAuthError(error);

      expect(result).toEqual({
        type: 'UNKNOWN_ERROR',
        message: 'I am a teapot',
        shouldRetry: false
      });
    });
  });

  describe('Token Management', () => {
    test('should check if token should refresh', () => {
      tokenService.shouldRefreshToken = jest.fn().mockReturnValue(true);

      const result = authService.shouldRefreshToken();

      expect(tokenService.shouldRefreshToken).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should get token expiry info', () => {
      const expiryInfo = {
        hasExpiry: true,
        expiryTime: new Date(),
        timeUntilExpiry: 3600000,
        isExpired: false,
        shouldRefresh: false
      };
      tokenService.getTokenExpiryInfo = jest.fn().mockReturnValue(expiryInfo);

      const result = authService.getTokenExpiryInfo();

      expect(tokenService.getTokenExpiryInfo).toHaveBeenCalled();
      expect(result).toEqual(expiryInfo);
    });
  });

  describe('User Management', () => {
    test('should get user from localStorage', () => {
      const user = { id: 1, email: 'test@example.com', name: 'Test User' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(user));

      const result = authService.getUser();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('user');
      expect(result).toEqual(user);
    });

    test('should return null when no user in localStorage', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = authService.getUser();

      expect(result).toBeNull();
    });

    test('should clear all auth data', () => {
      tokenService.clearTokens = jest.fn();

      authService.clearAuthData();

      expect(tokenService.clearTokens).toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('selectedCompany');
    });
  });
});
/**
 * JWT Token Management Integration Test
 * Tests the complete JWT token management workflow
 */

import TokenService from '../TokenService.js';
import AuthService from '../AuthService.js';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock fetch for token refresh
global.fetch = jest.fn();

// Mock appConfig
jest.mock('../../config/app.config.js', () => ({
  storage: {
    token: 'token',
    user: 'user',
    selectedCompany: 'selectedCompany'
  },
  api: {
    baseURL: 'http://localhost:5001',
    endpoints: {
      auth: '/api/auth'
    }
  },
  log: jest.fn(),
  error: jest.fn(),
  features: {
    enableDebug: false
  }
}));

describe('JWT Token Management Integration', () => {
  let tokenService;
  let authService;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    
    tokenService = new TokenService();
    authService = new AuthService();
  });

  describe('Complete Authentication Flow', () => {
    test('should handle complete login and token management flow', async () => {
      // Mock successful login response
      const loginResponse = {
        data: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJ3b3JrZXIiLCJjb21wYW55SWQiOjEsImV4cCI6MTcwNjM1NjIwMCwiaWF0IjoxNzA2MzUyNjAwfQ.test',
          refreshToken: 'refresh-token-123',
          expiresIn: 3600,
          user: {
            id: 1,
            email: 'test@example.com',
            name: 'Test Worker'
          }
        }
      };

      // Mock the API client
      authService.client = {
        post: jest.fn().mockResolvedValue(loginResponse)
      };

      // Perform login
      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123'
      });

      // Verify login response
      expect(result).toEqual(loginResponse.data);

      // Verify token storage
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', loginResponse.data.token);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', loginResponse.data.refreshToken);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(loginResponse.data.user));

      // Verify authentication status
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return loginResponse.data.token;
        if (key === 'refreshToken') return loginResponse.data.refreshToken;
        if (key === 'tokenExpiry') return (Date.now() + 3600000).toString();
        if (key === 'user') return JSON.stringify(loginResponse.data.user);
        return null;
      });

      expect(authService.isAuthenticated()).toBe(true);
      expect(authService.getToken()).toBe(loginResponse.data.token);

      // Verify user info extraction from token
      const userInfo = authService.getUserFromToken();
      expect(userInfo).toEqual({
        userId: 1,
        email: 'test@example.com',
        role: 'worker',
        companyId: 1,
        employeeId: undefined,
        exp: 1706356200,
        iat: 1706352600
      });
    });

    test('should handle token refresh workflow', async () => {
      // Setup existing token that needs refresh
      const currentToken = 'current-token';
      const refreshToken = 'refresh-token-123';
      const newToken = 'new-access-token';
      const newRefreshToken = 'new-refresh-token';

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return currentToken;
        if (key === 'refreshToken') return refreshToken;
        if (key === 'tokenExpiry') return (Date.now() + 4 * 60 * 1000).toString(); // 4 minutes (needs refresh)
        return null;
      });

      // Mock successful refresh response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: newToken,
          refreshToken: newRefreshToken,
          expiresIn: 3600
        })
      });

      // Check if token should refresh
      expect(tokenService.shouldRefreshToken()).toBe(true);

      // Perform token refresh
      const result = await authService.refreshToken();

      // Verify refresh API call
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5001/api/auth/refresh',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        })
      );

      // Verify new token storage
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', newToken);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', newRefreshToken);

      expect(result).toEqual({ token: newToken });
    });

    test('should handle logout and token cleanup', async () => {
      // Setup authenticated state
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'valid-token';
        if (key === 'refreshToken') return 'refresh-token';
        return null;
      });

      // Mock logout API
      authService.client = {
        post: jest.fn().mockResolvedValue({ data: { success: true } })
      };

      // Perform logout
      await authService.logout();

      // Verify logout API call
      expect(authService.client.post).toHaveBeenCalledWith('/api/auth/logout');

      // Verify token cleanup
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('tokenExpiry');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('selectedCompany');
    });

    test('should handle authentication errors properly', () => {
      const networkError = { response: null };
      const unauthorizedError = { response: { status: 401 } };
      const serverError = { response: { status: 500 } };

      // Test network error
      const networkResult = authService.handleAuthError(networkError);
      expect(networkResult.type).toBe('NETWORK_ERROR');
      expect(networkResult.shouldRetry).toBe(true);

      // Test unauthorized error
      const unauthorizedResult = authService.handleAuthError(unauthorizedError);
      expect(unauthorizedResult.type).toBe('UNAUTHORIZED');
      expect(unauthorizedResult.shouldRedirect).toBe(true);
      expect(unauthorizedResult.redirectTo).toBe('/login');

      // Test server error
      const serverResult = authService.handleAuthError(serverError);
      expect(serverResult.type).toBe('SERVER_ERROR');
      expect(serverResult.shouldRetry).toBe(true);
    });

    test('should handle token expiry and cleanup', () => {
      // Setup expired token
      const expiredToken = 'expired-token';
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return expiredToken;
        if (key === 'tokenExpiry') return (Date.now() - 1000).toString(); // 1 second ago
        return null;
      });

      // Check authentication status
      expect(authService.isAuthenticated()).toBe(false);

      // Verify token cleanup was called
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });

    test('should prevent multiple simultaneous refresh attempts', async () => {
      const refreshToken = 'refresh-token-123';
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'refreshToken') return refreshToken;
        return null;
      });

      // Mock delayed refresh response
      fetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ token: 'new-token', expiresIn: 3600 })
          }), 50)
        )
      );

      // Start multiple refresh attempts
      const promise1 = tokenService.refreshToken();
      const promise2 = tokenService.refreshToken();
      const promise3 = tokenService.refreshToken();

      const results = await Promise.all([promise1, promise2, promise3]);

      // All should return the same result
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);

      // Only one API call should be made
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Token Security Features', () => {
    test('should validate token format', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImV4cCI6MTcwNjM1NjIwMH0.test';
      const invalidToken = 'invalid.token';

      const validDecoded = tokenService.decodeToken(validToken);
      const invalidDecoded = tokenService.decodeToken(invalidToken);

      expect(validDecoded).toBeTruthy();
      expect(validDecoded.userId).toBe(1);
      expect(invalidDecoded).toBeNull();
    });

    test('should handle token storage errors gracefully', () => {
      // Mock localStorage error
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => {
        tokenService.setToken('valid-token');
      }).toThrow('Storage quota exceeded');
    });

    test('should provide comprehensive token expiry information', () => {
      const futureExpiry = Date.now() + 3600000; // 1 hour from now
      const nearExpiry = Date.now() + 4 * 60 * 1000; // 4 minutes (needs refresh)
      const pastExpiry = Date.now() - 1000; // 1 second ago

      // Test future expiry
      localStorageMock.getItem.mockReturnValue(futureExpiry.toString());
      let info = tokenService.getTokenExpiryInfo();
      expect(info.isExpired).toBe(false);
      expect(info.shouldRefresh).toBe(false);

      // Test near expiry (should refresh)
      localStorageMock.getItem.mockReturnValue(nearExpiry.toString());
      info = tokenService.getTokenExpiryInfo();
      expect(info.isExpired).toBe(false);
      expect(info.shouldRefresh).toBe(true);

      // Test past expiry
      localStorageMock.getItem.mockReturnValue(pastExpiry.toString());
      info = tokenService.getTokenExpiryInfo();
      expect(info.isExpired).toBe(true);
      expect(info.shouldRefresh).toBe(false);
    });
  });
});
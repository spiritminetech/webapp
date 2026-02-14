import TokenService from '../TokenService.js';
import appConfig from '../../config/app.config.js';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock appConfig
jest.mock('../../config/app.config.js', () => ({
  storage: {
    token: 'token',
    user: 'user'
  },
  api: {
    baseURL: 'http://localhost:5001'
  },
  log: jest.fn(),
  error: jest.fn(),
  features: {
    enableDebug: true
  }
}));

// Mock fetch
global.fetch = jest.fn();

describe('TokenService', () => {
  let tokenService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    
    // Create new instance for each test
    tokenService = new TokenService();
  });

  describe('Token Storage', () => {
    test('should store token with expiry', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImV4cCI6MTcwNjM1NjIwMH0.test';
      const refreshToken = 'refresh123';
      const expiresIn = 3600; // 1 hour

      tokenService.setToken(token, refreshToken, expiresIn);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', token);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', refreshToken);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('tokenExpiry', expect.any(String));
    });

    test('should throw error when storing invalid token', () => {
      expect(() => {
        tokenService.setToken(null);
      }).toThrow('Token is required');
    });

    test('should retrieve stored token', () => {
      const token = 'valid-token';
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return token;
        if (key === 'tokenExpiry') return (Date.now() + 3600000).toString(); // 1 hour from now
        return null;
      });

      const result = tokenService.getToken();
      expect(result).toBe(token);
    });

    test('should return null for expired token', () => {
      const token = 'expired-token';
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return token;
        if (key === 'tokenExpiry') return (Date.now() - 3600000).toString(); // 1 hour ago
        return null;
      });

      const result = tokenService.getToken();
      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });
  });

  describe('Token Validation', () => {
    test('should validate authenticated user with valid token', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'valid-token';
        if (key === 'tokenExpiry') return (Date.now() + 3600000).toString();
        return null;
      });

      expect(tokenService.isAuthenticated()).toBe(true);
    });

    test('should reject expired token', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'expired-token';
        if (key === 'tokenExpiry') return (Date.now() - 1000).toString(); // 1 second ago
        return null;
      });

      expect(tokenService.isAuthenticated()).toBe(false);
    });

    test('should check if token needs refresh', () => {
      const fiveMinutesFromNow = Date.now() + (4 * 60 * 1000); // 4 minutes (less than 5 minute threshold)
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'tokenExpiry') return fiveMinutesFromNow.toString();
        return null;
      });

      expect(tokenService.shouldRefreshToken()).toBe(true);
    });
  });

  describe('Token Decoding', () => {
    test('should decode valid JWT token', () => {
      // Valid JWT token with payload: {"userId": 1, "email": "test@example.com", "exp": 1706356200}
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImV4cCI6MTcwNjM1NjIwMH0.test';
      
      const decoded = tokenService.decodeToken(token);
      
      expect(decoded).toEqual({
        userId: 1,
        email: 'test@example.com',
        exp: 1706356200
      });
    });

    test('should return null for invalid token', () => {
      const invalidToken = 'invalid.token';
      const decoded = tokenService.decodeToken(invalidToken);
      expect(decoded).toBeNull();
    });

    test('should extract user info from token', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJ3b3JrZXIiLCJjb21wYW55SWQiOjEsImV4cCI6MTcwNjM1NjIwMCwiaWF0IjoxNzA2MzUyNjAwfQ.test';
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return token;
        if (key === 'tokenExpiry') return (Date.now() + 3600000).toString();
        return null;
      });

      const userInfo = tokenService.getUserFromToken();
      
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
  });

  describe('Token Refresh', () => {
    test('should refresh token successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const newToken = 'new-access-token';
      const newRefreshToken = 'new-refresh-token';

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'refreshToken') return refreshToken;
        return null;
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: newToken,
          refreshToken: newRefreshToken,
          expiresIn: 3600
        })
      });

      const result = await tokenService.refreshToken();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5001/api/auth/refresh',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        })
      );

      expect(result).toBe(newToken);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', newToken);
    });

    test('should handle refresh token failure', async () => {
      const refreshToken = 'invalid-refresh-token';

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'refreshToken') return refreshToken;
        return null;
      });

      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Invalid refresh token' })
      });

      await expect(tokenService.refreshToken()).rejects.toThrow('Invalid refresh token');
      expect(localStorageMock.removeItem).toHaveBeenCalled(); // Should clear tokens on failure
    });

    test('should prevent multiple simultaneous refresh attempts', async () => {
      const refreshToken = 'valid-refresh-token';

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'refreshToken') return refreshToken;
        return null;
      });

      fetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ token: 'new-token', expiresIn: 3600 })
          }), 100)
        )
      );

      // Start two refresh attempts simultaneously
      const promise1 = tokenService.refreshToken();
      const promise2 = tokenService.refreshToken();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Both should return the same result
      expect(result1).toBe(result2);
      expect(fetch).toHaveBeenCalledTimes(1); // Only one API call should be made
    });
  });

  describe('Token Cleanup', () => {
    test('should clear all tokens', () => {
      tokenService.clearTokens();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('tokenExpiry');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
    });
  });

  describe('Token Expiry Information', () => {
    test('should return correct expiry information', () => {
      const expiryTime = Date.now() + 3600000; // 1 hour from now
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'tokenExpiry') return expiryTime.toString();
        return null;
      });

      const info = tokenService.getTokenExpiryInfo();

      expect(info.hasExpiry).toBe(true);
      expect(info.expiryTime).toEqual(new Date(expiryTime));
      expect(info.isExpired).toBe(false);
      expect(info.timeUntilExpiry).toBeGreaterThan(0);
    });

    test('should handle missing expiry information', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const info = tokenService.getTokenExpiryInfo();

      expect(info.hasExpiry).toBe(false);
      expect(info.expiryTime).toBeNull();
      expect(info.isExpired).toBe(true);
      expect(info.shouldRefresh).toBe(false);
    });
  });
});
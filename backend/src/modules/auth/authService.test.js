/**
 * AuthService Test - JWT Token Management
 * Tests enhanced authentication service with refresh token support
 */

import * as AuthService from './authService.js';
import { generateToken, generateRefreshToken } from '../../../utils/jwtUtil.js';
import RefreshToken from './RefreshToken.js';
import User from '../user/User.js';
import CompanyUser from '../companyUser/CompanyUser.js';
import Company from '../company/Company.js';
import Role from '../role/Role.js';

// Mock dependencies
jest.mock('../../../utils/jwtUtil.js');
jest.mock('./RefreshToken.js');
jest.mock('../user/User.js');
jest.mock('../companyUser/CompanyUser.js');
jest.mock('../company/Company.js');
jest.mock('../role/Role.js');
jest.mock('bcrypt');

describe('AuthService - JWT Token Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Generation', () => {
    test('should generate access and refresh tokens on login', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isActive: true
      };

      const mockCompanyUser = {
        userId: 1,
        companyId: 1,
        roleId: 1,
        isActive: true
      };

      const mockCompany = {
        id: 1,
        name: 'Test Company',
        isActive: true
      };

      const mockRole = {
        id: 1,
        name: 'worker'
      };

      const mockRefreshToken = 'refresh-token-123';
      const mockAccessToken = 'access-token-123';

      // Mock database calls
      User.findOne.mockResolvedValue(mockUser);
      CompanyUser.find.mockResolvedValue([mockCompanyUser]);
      Company.findOne.mockResolvedValue(mockCompany);
      Role.findOne.mockResolvedValue(mockRole);

      // Mock token generation
      generateToken.mockReturnValue(mockAccessToken);
      generateRefreshToken.mockReturnValue(mockRefreshToken);

      // Mock RefreshToken save
      const mockRefreshTokenDoc = {
        save: jest.fn().mockResolvedValue(true)
      };
      RefreshToken.mockImplementation(() => mockRefreshTokenDoc);

      // Mock bcrypt
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(true);

      const result = await AuthService.login('test@example.com', 'password123', {
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1'
      });

      expect(result.token).toBe(mockAccessToken);
      expect(result.refreshToken).toBe(mockRefreshToken);
      expect(result.expiresIn).toBe(8 * 60 * 60); // 8 hours
      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name
      });

      // Verify refresh token was saved
      expect(RefreshToken).toHaveBeenCalledWith(expect.objectContaining({
        token: mockRefreshToken,
        userId: mockUser.id,
        companyId: mockCompany.id,
        deviceInfo: {
          userAgent: 'test-agent',
          ipAddress: '127.0.0.1'
        }
      }));
      expect(mockRefreshTokenDoc.save).toHaveBeenCalled();
    });
  });

  describe('Token Refresh', () => {
    test('should refresh token successfully', async () => {
      const mockRefreshTokenDoc = {
        userId: 1,
        companyId: 1,
        isExpired: jest.fn().mockReturnValue(false),
        revoke: jest.fn().mockResolvedValue(true)
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isActive: true
      };

      const mockCompanyUser = {
        userId: 1,
        companyId: 1,
        roleId: 1,
        isActive: true
      };

      const mockCompany = {
        id: 1,
        name: 'Test Company',
        isActive: true
      };

      const mockRole = {
        id: 1,
        name: 'worker'
      };

      const newAccessToken = 'new-access-token';
      const newRefreshToken = 'new-refresh-token';

      // Mock database calls
      RefreshToken.findByToken.mockResolvedValue(mockRefreshTokenDoc);
      User.findOne.mockResolvedValue(mockUser);
      CompanyUser.findOne.mockResolvedValue(mockCompanyUser);
      Company.findOne.mockResolvedValue(mockCompany);
      Role.findOne.mockResolvedValue(mockRole);

      // Mock token generation
      generateToken.mockReturnValue(newAccessToken);
      generateRefreshToken.mockReturnValue(newRefreshToken);

      // Mock new refresh token save
      const mockNewRefreshTokenDoc = {
        save: jest.fn().mockResolvedValue(true)
      };
      RefreshToken.mockImplementation(() => mockNewRefreshTokenDoc);

      const result = await AuthService.refreshToken('old-refresh-token', {
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1'
      });

      expect(result.token).toBe(newAccessToken);
      expect(result.refreshToken).toBe(newRefreshToken);
      expect(result.expiresIn).toBe(8 * 60 * 60);

      // Verify old refresh token was revoked
      expect(mockRefreshTokenDoc.revoke).toHaveBeenCalled();

      // Verify new refresh token was saved
      expect(mockNewRefreshTokenDoc.save).toHaveBeenCalled();
    });

    test('should reject expired refresh token', async () => {
      const mockRefreshTokenDoc = {
        isExpired: jest.fn().mockReturnValue(true),
        revoke: jest.fn().mockResolvedValue(true)
      };

      RefreshToken.findByToken.mockResolvedValue(mockRefreshTokenDoc);

      await expect(
        AuthService.refreshToken('expired-refresh-token')
      ).rejects.toThrow('Refresh token has expired');

      expect(mockRefreshTokenDoc.revoke).toHaveBeenCalled();
    });

    test('should reject invalid refresh token', async () => {
      RefreshToken.findByToken.mockResolvedValue(null);

      await expect(
        AuthService.refreshToken('invalid-refresh-token')
      ).rejects.toThrow('Invalid or expired refresh token');
    });

    test('should revoke refresh token if user is inactive', async () => {
      const mockRefreshTokenDoc = {
        userId: 1,
        isExpired: jest.fn().mockReturnValue(false),
        revoke: jest.fn().mockResolvedValue(true)
      };

      RefreshToken.findByToken.mockResolvedValue(mockRefreshTokenDoc);
      User.findOne.mockResolvedValue(null); // User not found or inactive

      await expect(
        AuthService.refreshToken('valid-refresh-token')
      ).rejects.toThrow('User not found or inactive');

      expect(mockRefreshTokenDoc.revoke).toHaveBeenCalled();
    });

    test('should revoke refresh token if company access is revoked', async () => {
      const mockRefreshTokenDoc = {
        userId: 1,
        companyId: 1,
        isExpired: jest.fn().mockReturnValue(false),
        revoke: jest.fn().mockResolvedValue(true)
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        isActive: true
      };

      RefreshToken.findByToken.mockResolvedValue(mockRefreshTokenDoc);
      User.findOne.mockResolvedValue(mockUser);
      CompanyUser.findOne.mockResolvedValue(null); // Company access revoked

      await expect(
        AuthService.refreshToken('valid-refresh-token')
      ).rejects.toThrow('Company access revoked');

      expect(mockRefreshTokenDoc.revoke).toHaveBeenCalled();
    });
  });

  describe('Logout', () => {
    test('should revoke refresh token on logout', async () => {
      const mockRefreshTokenDoc = {
        revoke: jest.fn().mockResolvedValue(true)
      };

      RefreshToken.findOne.mockResolvedValue(mockRefreshTokenDoc);

      const result = await AuthService.logout('valid-refresh-token');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out successfully');
      expect(mockRefreshTokenDoc.revoke).toHaveBeenCalled();
    });

    test('should handle logout gracefully when refresh token not found', async () => {
      RefreshToken.findOne.mockResolvedValue(null);

      const result = await AuthService.logout('invalid-refresh-token');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out successfully');
    });

    test('should always return success for logout even on error', async () => {
      RefreshToken.findOne.mockRejectedValue(new Error('Database error'));

      const result = await AuthService.logout('valid-refresh-token');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out successfully');
    });
  });

  describe('Revoke All User Tokens', () => {
    test('should revoke all tokens for a user', async () => {
      RefreshToken.revokeAllForUser.mockResolvedValue({ modifiedCount: 3 });

      const result = await AuthService.revokeAllUserTokens(1);

      expect(result.success).toBe(true);
      expect(result.message).toBe('All tokens revoked successfully');
      expect(RefreshToken.revokeAllForUser).toHaveBeenCalledWith(1);
    });

    test('should handle errors when revoking all tokens', async () => {
      RefreshToken.revokeAllForUser.mockRejectedValue(new Error('Database error'));

      await expect(
        AuthService.revokeAllUserTokens(1)
      ).rejects.toThrow('Database error');
    });
  });

  describe('Company Selection', () => {
    test('should generate tokens when selecting company', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isActive: true
      };

      const mockCompanyUser = {
        userId: 1,
        companyId: 2,
        roleId: 2,
        isActive: true
      };

      const mockCompany = {
        id: 2,
        name: 'Another Company',
        isActive: true
      };

      const mockRole = {
        id: 2,
        name: 'supervisor'
      };

      const mockAccessToken = 'company-access-token';
      const mockRefreshToken = 'company-refresh-token';

      User.findOne.mockResolvedValue(mockUser);
      CompanyUser.findOne.mockResolvedValue(mockCompanyUser);
      Company.findOne.mockResolvedValue(mockCompany);
      Role.findOne.mockResolvedValue(mockRole);

      generateToken.mockReturnValue(mockAccessToken);
      generateRefreshToken.mockReturnValue(mockRefreshToken);

      const mockRefreshTokenDoc = {
        save: jest.fn().mockResolvedValue(true)
      };
      RefreshToken.mockImplementation(() => mockRefreshTokenDoc);

      const result = await AuthService.selectCompany(1, 2, {
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1'
      });

      expect(result.token).toBe(mockAccessToken);
      expect(result.refreshToken).toBe(mockRefreshToken);
      expect(result.company.name).toBe('Another Company');
      expect(result.autoSelected).toBe(false);
    });
  });
});
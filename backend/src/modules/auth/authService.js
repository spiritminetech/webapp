import bcrypt from 'bcrypt';
import { generateToken, generateRefreshToken, verifyToken } from '../../../utils/jwtUtil.js';

import User from '../user/User.js';
import CompanyUser from '../companyUser/CompanyUser.js';
import Company from '../company/Company.js';
import Role from '../role/Role.js';
import RolePermission from '../rolePermission/RolePermission.js';
import Permission from '../permission/Permission.js';
import RefreshToken from './RefreshToken.js';

/**
 * LOGIN
 */
export const login = async (email, password, deviceInfo = {}) => {
  const user = await User.findOne({ email, isActive: true });
  if (!user) throw new Error('Invalid credentials');

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw new Error('Invalid credentials');

  console.log("user",user);
  const mappings = await CompanyUser.find({
    userId: user.id,
    isActive: true
  });

  if (!mappings.length) throw new Error('No company access');

  if (mappings.length === 1) {
    return issueToken(user, mappings[0], true, deviceInfo);
  }

  const companies = [];

  for (const m of mappings) {
    const company = await Company.findOne({ id: m.companyId, isActive: true });
    const role = await Role.findOne({ id: m.roleId });

    console.log("role",role);

    if (!company || !role) continue;

    companies.push({
      companyId: company.id,
      companyName: company.name,
      role: role.name
    });
  }

  if (!companies.length) throw new Error('No active company access');

  return {
    autoSelected: false,
    companies,
    userId: user.id // Store userId for company selection
  };
};

/**
 * SELECT COMPANY
 */
export const selectCompany = async (userId, companyId, deviceInfo = {}) => {
  const mapping = await CompanyUser.findOne({
    userId,
    companyId,
    isActive: true
  });

  if (!mapping) throw new Error('Unauthorized company');

  const user = await User.findOne({ id: userId, isActive: true });
  if (!user) throw new Error('User not found');

  return issueToken(user, mapping, false, deviceInfo);
};

/**
 * ISSUE TOKEN WITH REFRESH TOKEN
 */
const issueToken = async (user, mapping, autoSelected, deviceInfo = {}) => {
  const company = await Company.findOne({
    id: mapping.companyId,
    isActive: true
  });
  if (!company) throw new Error('Company inactive');

  const role = await Role.findOne({ id: mapping.roleId });
  if (!role) throw new Error('Invalid role');

  // 1️⃣ Get role → permission mappings
  const rolePerms = await RolePermission.find({ roleId: role.id });
  if (!rolePerms.length) {
    return await buildResponse(user, company, role, [], autoSelected, deviceInfo);
  }

  // 2️⃣ Fetch actual permissions
  const permissionIds = rolePerms.map(rp => rp.permissionId);
  console.log("permissionIds",permissionIds)

  const permissions = await Permission.find({
    id: { $in: permissionIds },
    isActive: true
  }).select('code');
   console.log("permissions",permissions)
  const permissionCodes = permissions.map(p => p.code);

  // 3️⃣ Generate tokens
  const tokenPayload = {
    userId: user.id,
    companyId: company.id,
    roleId: role.id,
    role: role.name,
    email: user.email,
    permissions: permissionCodes
  };

  const token = generateToken(tokenPayload, '8h');
  const refreshToken = generateRefreshToken();

  // 4️⃣ Store refresh token
  // Get next ID for RefreshToken
  const lastRefreshToken = await RefreshToken.findOne({}, {}, { sort: { id: -1 } });
  const nextId = lastRefreshToken ? lastRefreshToken.id + 1 : 1;
  
  const refreshTokenDoc = new RefreshToken({
    id: nextId,
    token: refreshToken,
    userId: user.id,
    companyId: company.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    deviceInfo
  });

  try {
    await refreshTokenDoc.save();
  } catch (error) {
    console.error('Failed to save refresh token:', error);
    throw new Error('Failed to create refresh token');
  }

  return {
    autoSelected,
    token,
    refreshToken,
    expiresIn: 8 * 60 * 60, // 8 hours in seconds
    employeeId: user.id,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    },
    company: {
      id: company.id,
      name: company.name,
      role: role.name
    },
    permissions: permissionCodes
  };
};

/**
 * RESPONSE BUILDER
 */
const buildResponse = async (user, company, role, permissions, autoSelected, deviceInfo = {}) => {
  const tokenPayload = {
    userId: user.id,
    companyId: company.id,
    roleId: role.id,
    role: role.name,
    email: user.email,
    permissions
  };

  const token = generateToken(tokenPayload, '8h');
  const refreshToken = generateRefreshToken();

  // Store refresh token
  // Get next ID for RefreshToken
  const lastRefreshToken = await RefreshToken.findOne({}, {}, { sort: { id: -1 } });
  const nextId = lastRefreshToken ? lastRefreshToken.id + 1 : 1;
  
  const refreshTokenDoc = new RefreshToken({
    id: nextId,
    token: refreshToken,
    userId: user.id,
    companyId: company.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    deviceInfo
  });

  try {
    await refreshTokenDoc.save();
  } catch (error) {
    console.error('Failed to save refresh token:', error);
    // Don't throw here as this is in a non-critical path
  }

  return {
    autoSelected,
    token,
    refreshToken,
    expiresIn: 8 * 60 * 60, // 8 hours in seconds
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    },
    company: {
      id: company.id,
      name: company.name,
      role: role.name
    },
    permissions
  };
};

/**
 * REFRESH TOKEN
 */
export const refreshToken = async (refreshTokenString, deviceInfo = {}) => {
  try {
    // Find and validate refresh token
    const refreshTokenDoc = await RefreshToken.findByToken(refreshTokenString);
    
    if (!refreshTokenDoc) {
      throw new Error('Invalid or expired refresh token');
    }

    if (refreshTokenDoc.isExpired()) {
      await refreshTokenDoc.revoke();
      throw new Error('Refresh token has expired');
    }

    // Get user and company mapping
    const user = await User.findOne({ 
      id: refreshTokenDoc.userId, 
      isActive: true 
    });
    
    if (!user) {
      await refreshTokenDoc.revoke();
      throw new Error('User not found or inactive');
    }

    const mapping = await CompanyUser.findOne({
      userId: refreshTokenDoc.userId,
      companyId: refreshTokenDoc.companyId,
      isActive: true
    });

    if (!mapping) {
      await refreshTokenDoc.revoke();
      throw new Error('Company access revoked');
    }

    // Mark old refresh token as used and revoke it
    await refreshTokenDoc.revoke();

    // Issue new tokens
    const result = await issueToken(user, mapping, true, deviceInfo);

    return result;

  } catch (error) {
    throw error;
  }
};

/**
 * LOGOUT - Revoke refresh token
 */
export const logout = async (refreshTokenString) => {
  try {
    if (refreshTokenString) {
      const refreshTokenDoc = await RefreshToken.findOne({ 
        token: refreshTokenString 
      });
      
      if (refreshTokenDoc) {
        await refreshTokenDoc.revoke();
      }
    }
    
    return { success: true, message: 'Logged out successfully' };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: true, message: 'Logged out successfully' }; // Always return success for logout
  }
};

/**
 * REVOKE ALL USER TOKENS
 */
export const revokeAllUserTokens = async (userId) => {
  try {
    await RefreshToken.revokeAllForUser(userId);
    return { success: true, message: 'All tokens revoked successfully' };
  } catch (error) {
    throw error;
  }
};

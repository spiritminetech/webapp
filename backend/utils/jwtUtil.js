import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * JWT Token Utilities
 * Enhanced with refresh token support
 */

export const generateToken = (payload, expiresIn = '8h') =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

export const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw error;
  }
};

export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

export const getTokenExpiry = (token) => {
  try {
    const decoded = jwt.decode(token);
    return decoded ? decoded.exp * 1000 : null; // Convert to milliseconds
  } catch (error) {
    return null;
  }
};

export const isTokenExpired = (token) => {
  try {
    const expiry = getTokenExpiry(token);
    return expiry ? Date.now() >= expiry : true;
  } catch (error) {
    return true;
  }
};

export const getTokenTimeRemaining = (token) => {
  try {
    const expiry = getTokenExpiry(token);
    return expiry ? Math.max(0, expiry - Date.now()) : 0;
  } catch (error) {
    return 0;
  }
};

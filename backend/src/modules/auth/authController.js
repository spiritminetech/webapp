import * as AuthService from './authService.js';

/**
 * Extract device info from request
 */
const getDeviceInfo = (req) => {
  return {
    userAgent: req.headers['user-agent'] || '',
    ipAddress: req.ip || req.connection.remoteAddress || '',
    deviceId: req.headers['x-device-id'] || ''
  };
};

export const login = async (req, res) => {
  try {
    const deviceInfo = getDeviceInfo(req);
    const result = await AuthService.login(req.body.email, req.body.password, deviceInfo);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
};

/**
 * REFRESH TOKEN CONTROLLER
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const deviceInfo = getDeviceInfo(req);
    const result = await AuthService.refreshToken(refreshToken, deviceInfo);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * LOGOUT CONTROLLER
 */
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await AuthService.logout(refreshToken);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * SELECT COMPANY CONTROLLER
 */
export const selectCompany = async (req, res) => {
  try {
    const { userId, companyId } = req.body;
    
    if (!userId || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'userId and companyId are required'
      });
    }

    const deviceInfo = getDeviceInfo(req);
    const result = await AuthService.selectCompany(userId, companyId, deviceInfo);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * PROFILE CONTROLLER
 */
export const getProfile = (req, res) => {
  return res.json({
    success: true,
    message: "Profile endpoint is working",
    user: req.user,
  });
};

/**
 * VERIFY TOKEN CONTROLLER
 */
export const verifyToken = (req, res) => {
  return res.json({
    success: true,
    message: "Token is valid",
    user: req.user,
  });
};

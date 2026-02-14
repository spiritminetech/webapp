import jwt from "jsonwebtoken";
import User from "../modules/user/User.js";
import CompanyUser from "../modules/companyUser/CompanyUser.js";
import Employee from "../modules/employee/Employee.js";


/**
 * Verify JWT Token Middleware
 * Ensures a valid JWT token exists and user is active.
 */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        success: false,
        message: "No token provided" 
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Use the same field names as your auth controller
    const user = await User.findOne({ id: decoded.userId });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "User not found" 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        success: false,
        message: "User account is inactive" 
      });
    }

    // ✅ Get the actual role from CompanyUser (no hardcoded role check)
    const companyUser = await CompanyUser.findOne({ 
      userId: decoded.userId
    });

    if (!companyUser) {
      return res.status(403).json({ 
        success: false,
        message: "Access denied. User is not registered in any company." 
      });
    }
 
    const employee = await Employee.findOne({ userId: decoded.userId });



    // ✅ Attach user info to request (matching your auth controller structure)
    req.user = {
      userId: decoded.userId,
      companyId: decoded.companyId,
      role: decoded.role, // Use from token (already validated in login)
      email: decoded.email,
      name: user.name,
        employeeId: employee?.id
    };

    next();

  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    return res.status(500).json({ success: false, message: "Token verification failed", error: err.message });
  }
};

/**
 * Role-based Authorization Middleware
 * Ensures the user has one of the allowed roles.
 */
export const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  // Convert both user role and allowed roles to lowercase for case-insensitive comparison
  const userRole = req.user.role?.toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());

  if (!normalizedAllowedRoles.includes(userRole)) {
    return res.status(403).json({ 
      success: false, 
      message: `Access denied. Required roles: ${allowedRoles.join(", ")}` 
    });
  }

  next();
};

/**
 * Optional token verification (doesn't require user check)
 */
export const verifyTokenOptional = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
    next();
  } catch (error) {
    // Ignore invalid token
    next();
  }
};

export default (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};
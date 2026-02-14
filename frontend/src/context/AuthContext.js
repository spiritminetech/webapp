// context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import tokenService from "../services/TokenService.js";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("user"))
  );

  const [currentProject, setCurrentProject] = useState(() =>
    JSON.parse(localStorage.getItem("currentProject"))
  );

  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    tokenService.isAuthenticated()
  );

  const [tokenInfo, setTokenInfo] = useState(() =>
    tokenService.getTokenExpiryInfo()
  );

  // Get permissions from token or stored user
  const [permissions, setPermissions] = useState(() => {
    const tokenUser = tokenService.getUserFromToken();
    const storedUser = JSON.parse(localStorage.getItem("user"));
    return tokenUser?.permissions || storedUser?.permissions || [];
  });

  useEffect(() => {
    const sync = () => {
      setUser(JSON.parse(localStorage.getItem("user")));
      setCurrentProject(JSON.parse(localStorage.getItem("currentProject")));
      setIsAuthenticated(tokenService.isAuthenticated());
      setTokenInfo(tokenService.getTokenExpiryInfo());
      
      // Update permissions from token or stored user
      const tokenUser = tokenService.getUserFromToken();
      const storedUser = JSON.parse(localStorage.getItem("user"));
      setPermissions(tokenUser?.permissions || storedUser?.permissions || []);
    };
    
    // Listen for storage changes
    window.addEventListener("userDataUpdated", sync);
    
    // Listen for authentication events
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    window.addEventListener("auth:tokenRefreshed", handleTokenRefresh);
    
    // Set up token monitoring interval
    const tokenCheckInterval = setInterval(() => {
      const newTokenInfo = tokenService.getTokenExpiryInfo();
      const newIsAuthenticated = tokenService.isAuthenticated();
      
      if (newIsAuthenticated !== isAuthenticated || 
          newTokenInfo.isExpired !== tokenInfo.isExpired) {
        setIsAuthenticated(newIsAuthenticated);
        setTokenInfo(newTokenInfo);
      }
    }, 30000); // Check every 30 seconds
    
    return () => {
      window.removeEventListener("userDataUpdated", sync);
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
      window.removeEventListener("auth:tokenRefreshed", handleTokenRefresh);
      clearInterval(tokenCheckInterval);
    };
  }, [isAuthenticated, tokenInfo]);

  const handleUnauthorized = () => {
    setUser(null);
    setCurrentProject(null);
    setIsAuthenticated(false);
    setTokenInfo({ isExpired: true, shouldRefresh: false });
  };

  const handleTokenRefresh = () => {
    setIsAuthenticated(tokenService.isAuthenticated());
    setTokenInfo(tokenService.getTokenExpiryInfo());
    
    // Update permissions from refreshed token or stored user
    const tokenUser = tokenService.getUserFromToken();
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setPermissions(tokenUser?.permissions || storedUser?.permissions || []);
  };

  const login = (userData) => {
    const { token, refreshToken, user, expiresIn, permissions, employeeId, company } = userData;
    
    // Store token using TokenService
    if (token) {
      tokenService.setToken(token, refreshToken, expiresIn);
    }
    
    // Store user data with permissions and employeeId
    const userToStore = user || userData;
    if (permissions) {
      userToStore.permissions = permissions;
    }
    // Add employeeId to user object for easy access
    if (employeeId) {
      userToStore.employeeId = employeeId;
    }
    // Add company info to user object
    if (company) {
      userToStore.company = company;
    }
    
    if (userToStore) {
      localStorage.setItem("user", JSON.stringify(userToStore));
    }
    
    setUser(userToStore);
    setIsAuthenticated(true);
    setTokenInfo(tokenService.getTokenExpiryInfo());
    
    // Update permissions from token or userData
    const tokenUser = tokenService.getUserFromToken();
    const finalPermissions = tokenUser?.permissions || permissions || [];
    setPermissions(finalPermissions);
    
    window.dispatchEvent(new Event("userDataUpdated"));
  };

  const logout = () => {
    tokenService.clearTokens();
    localStorage.clear();
    setUser(null);
    setCurrentProject(null);
    setIsAuthenticated(false);
    setTokenInfo({ isExpired: true, shouldRefresh: false });
    setPermissions([]);
    window.dispatchEvent(new Event("userDataUpdated"));
  };

  const selectProject = (project) => {
    
 
    localStorage.setItem("currentProject", JSON.stringify(project));
    setCurrentProject(project);
    window.dispatchEvent(new Event("userDataUpdated"));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentProject,
        isAuthenticated,
        tokenInfo,
        permissions, // Add permissions to context
        login,
        logout,
        selectProject,
        // Token management methods
        getToken: () => tokenService.getToken(),
        getUserFromToken: () => tokenService.getUserFromToken(),
        shouldRefreshToken: () => tokenService.shouldRefreshToken(),
        getTokenExpiryInfo: () => tokenService.getTokenExpiryInfo(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);



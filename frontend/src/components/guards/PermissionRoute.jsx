import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const PermissionRoute = ({ permission, children }) => {
  const { user, permissions = [] } = useAuth();
  
  console.log("PermissionRoute Debug:", {
    user: user,
    permissions: permissions,
    requiredPermission: permission,
    hasPermission: permissions.includes(permission)
  });
  
  if (!user) {
    console.log("PermissionRoute: No user, redirecting to login");
    return <Navigate to="/login" replace />;
  }
  
  // Use permissions from useAuth() instead of user.permissions
  if (permissions.includes(permission)) {
    console.log("PermissionRoute: Permission granted, rendering children");
    return children;
  }

  console.log("PermissionRoute: Permission denied, redirecting to unauthorized");
  return <Navigate to="/unauthorized" replace />;
};

export default PermissionRoute;

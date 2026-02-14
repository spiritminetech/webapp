// src/guards/AuthGuard.jsx
import React from "react";
import { Navigate } from "react-router-dom";

// Checks if user is logged in (token in localStorage)
export default function AuthGuard({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}



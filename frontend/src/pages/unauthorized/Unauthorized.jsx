// src/pages/Unauthorized.jsx
import React from "react";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-4xl font-bold mb-4">🚫 Unauthorized</h1>
      <p className="text-gray-700 mb-6">You do not have permission to access this page.</p>
      <Button type="primary" onClick={() => navigate(-1)}>
        Go Back
      </Button>
    </div>
  );
}



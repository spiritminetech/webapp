// pages/auth/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login as loginAPI } from "../../api/auth/authApi";
import { useAuth } from "../../context/AuthContext";
import axios from 'axios';
import appConfig from '../../config/app.config.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [userId, setUserId] = useState(null);
  const [showCompanySelection, setShowCompanySelection] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError("Fill in all fields");

    setLoading(true);
    try {
      const { data } = await loginAPI({ email, password });
      
      // Check if company selection is needed
      if (!data.autoSelected && data.companies && data.companies.length > 1) {
        // Multiple companies - show selection
        setCompanies(data.companies);
        setUserId(data.userId);
        setShowCompanySelection(true);
        setLoading(false);
        return;
      } else if (!data.autoSelected && data.companies && data.companies.length === 1) {
        // Single company - auto-select it
        await selectCompany(data.userId, data.companies[0].companyId);
        return;
      } else if (data.autoSelected) {
        // Company was auto-selected, proceed with login
        login(data);
        redirectBasedOnRole(data.company.role);
      } else {
        setError("No company access available");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const selectCompany = async (userId, companyId) => {
    setLoading(true);
    try {
      const response = await axios.post(`${appConfig.api.baseURL}/api/auth/select-company`, {
        userId,
        companyId
      });

      if (response.data.success) {
        login(response.data);
        redirectBasedOnRole(response.data.company.role);
      } else {
        setError("Failed to select company");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to select company");
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySelection = async () => {
    if (!selectedCompany) return setError("Please select a company");
    await selectCompany(userId, selectedCompany);
  };

  const redirectBasedOnRole = (role) => {
    // ✅ ERP Role routing
    if (role === "WORKER") {
      navigate("/worker/dashboard");
    } else if (role === "DRIVER") {
      navigate("/driver/tasks");
    } else if (role === "SUPERVISOR") {
      navigate("/supervisor/dashboard");
    } else {
      navigate("/login");
    }
  };

  if (showCompanySelection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-100">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center">Select Company</h2>
          
          <div className="mb-4">
            <p className="text-gray-600 mb-4">You have access to multiple companies. Please select one:</p>
            
            {companies.map((company) => (
              <label key={company.companyId} className="flex items-center mb-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="company"
                  value={company.companyId}
                  onChange={(e) => setSelectedCompany(parseInt(e.target.value))}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">{company.companyName}</div>
                  <div className="text-sm text-gray-500">Role: {company.role}</div>
                </div>
              </label>
            ))}
          </div>

          {error && <p className="text-red-500 mb-2">{error}</p>}

          <button
            onClick={handleCompanySelection}
            disabled={loading || !selectedCompany}
            className="w-full bg-blue-500 text-white p-3 rounded disabled:bg-gray-400"
          >
            {loading ? "Selecting..." : "Continue"}
          </button>

          <button
            onClick={() => {
              setShowCompanySelection(false);
              setCompanies([]);
              setSelectedCompany(null);
              setUserId(null);
              setError("");
            }}
            className="w-full mt-2 bg-gray-300 text-gray-700 p-3 rounded"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Sign In</h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 p-3 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full mb-4 p-3 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-500 mb-2">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white p-3 rounded disabled:bg-gray-400"
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}



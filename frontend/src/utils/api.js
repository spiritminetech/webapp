import axios from "axios";
import appConfig from "../config/app.config.js";

/**
 * Main API Client - Uses centralized configuration
 */
const api = axios.create({
  baseURL: appConfig.api.baseURL,
  timeout: appConfig.api.timeout,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(appConfig.storage.token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    appConfig.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === appConfig.httpStatus.UNAUTHORIZED) {
      localStorage.removeItem(appConfig.storage.token);
      localStorage.removeItem(appConfig.storage.user);
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

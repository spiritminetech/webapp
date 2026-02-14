import axios from 'axios';
import appConfig from '../config/app.config.js';

/**
 * Service API - Uses centralized configuration
 * Professional ERP System API Service
 */

const API_BASE_URL = appConfig.getFullApiUrl('/api');

appConfig.log('Service API initialized with URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: appConfig.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token automatically to each request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(appConfig.storage.token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    appConfig.error('Service API request error:', error);
    return Promise.reject(error);
  }
);

// Handle token expiration and errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === appConfig.httpStatus.UNAUTHORIZED) {
      appConfig.log('Token expired - clearing storage and redirecting');
      localStorage.removeItem(appConfig.storage.token);
      localStorage.removeItem(appConfig.storage.user);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

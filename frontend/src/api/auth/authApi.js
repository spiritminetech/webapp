import axios from 'axios';
import appConfig from '../../config/app.config.js';

/**
 * Authentication API - Uses centralized configuration
 */

// Debug logging to check configuration
console.log('Auth API Config:', {
  baseURL: appConfig.api.baseURL,
  fullApiUrl: appConfig.getFullApiUrl(''),
  environment: appConfig.app.environment
});

const API = axios.create({
  baseURL: appConfig.api.baseURL, // Use baseURL directly, not getFullApiUrl
  timeout: appConfig.api.timeout
});

// Attach token automatically
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(appConfig.storage.token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Debug log the full request URL
    console.log('Auth API Request:', {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`
    });
    
    return config;
  },
  (error) => {
    appConfig.error('Auth API request error:', error);
    return Promise.reject(error);
  }
);

// Auth endpoints
export const login = (payload) => API.post('/api/auth/login', payload);

export default API;

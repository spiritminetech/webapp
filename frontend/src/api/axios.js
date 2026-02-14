import axios from "axios";
import appConfig from "../config/app.config.js";
import tokenService from "../services/TokenService.js";

/**
 * Centralized API Client
 * Professional ERP System HTTP Client with Enhanced JWT Token Management
 */
class ApiClient {
  constructor() {
    this.client = this.createClient();
    this.setupInterceptors();
    this.isRefreshing = false;
    this.failedQueue = [];
  }

  createClient() {
    const client = axios.create({
      baseURL: appConfig.api.baseURL,
      timeout: appConfig.api.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    appConfig.log('API Client initialized with baseURL:', appConfig.api.baseURL);
    return client;
  }

  setupInterceptors() {
    // Request Interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Check if token needs refresh before making request
        if (tokenService.shouldRefreshToken()) {
          try {
            await tokenService.refreshToken();
          } catch (error) {
            appConfig.error('Token refresh failed in request interceptor:', error);
            // Continue with existing token, let response interceptor handle auth errors
          }
        }
        
        const token = tokenService.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Log requests in development
        if (appConfig.features.enableDebug) {
          appConfig.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
            data: config.data,
            params: config.params
          });
        }

        return config;
      },
      (error) => {
        appConfig.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response Interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Log successful responses in development
        if (appConfig.features.enableDebug) {
          appConfig.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data
          });
        }
        return response;
      },
      async (error) => {
        const { response, config } = error;
        const originalRequest = config;

        // Log errors in development
        if (appConfig.features.enableDebug) {
          appConfig.error(`❌ ${config?.method?.toUpperCase()} ${config?.url}`, {
            status: response?.status,
            message: response?.data?.message || error.message
          });
        }

        // Handle authentication errors with token refresh
        if (response?.status === appConfig.httpStatus.UNAUTHORIZED && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If already refreshing, queue the request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await tokenService.refreshToken();
            this.processQueue(null, newToken);
            
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
            
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            this.handleUnauthorized();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Handle other authentication errors
        if (response?.status === appConfig.httpStatus.UNAUTHORIZED) {
          this.handleUnauthorized();
        }

        // Handle network errors
        if (!response) {
          appConfig.error('Network error - API server might be down');
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Process queued requests after token refresh
   * @param {Error|null} error - Error if refresh failed
   * @param {string|null} token - New token if refresh succeeded
   */
  processQueue(error, token = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  handleUnauthorized() {
    appConfig.log('Unauthorized access - clearing storage and redirecting to login');
    tokenService.clearTokens();
    
    // Dispatch custom event for components to handle
    window.dispatchEvent(new CustomEvent('auth:unauthorized', {
      detail: { message: 'Session expired. Please log in again.' }
    }));
    
    // Redirect to login
    window.location.href = '/login';
  }

  // HTTP Methods
  get(url, config = {}) {
    return this.client.get(url, config);
  }

  post(url, data = {}, config = {}) {
    return this.client.post(url, data, config);
  }

  put(url, data = {}, config = {}) {
    return this.client.put(url, data, config);
  }

  patch(url, data = {}, config = {}) {
    return this.client.patch(url, data, config);
  }

  delete(url, config = {}) {
    return this.client.delete(url, config);
  }

  // File Upload
  upload(url, formData, onUploadProgress = null) {
    return this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress
    });
  }

  // Get full URL for external use
  getFullUrl(endpoint) {
    return appConfig.getFullApiUrl(endpoint);
  }
}

// Export singleton instance
const apiClient = new ApiClient();

export default apiClient.client; // For backward compatibility
export { apiClient };

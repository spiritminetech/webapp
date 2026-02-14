/**
 * Centralized Application Configuration
 * Professional ERP System Configuration Management
 */

class AppConfig {
  constructor() {
    this.validateEnvironmentVariables();
  }

  // API Configuration
  get api() {
    const baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';
    
    // Debug logging
    if (this.features.enableDebug) {
      console.log('API Configuration:', {
        REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL,
        baseURL: baseURL,
        timeout: parseInt(process.env.REACT_APP_API_TIMEOUT) || 10000
      });
    }
    
    return {
      baseURL: baseURL,
      timeout: parseInt(process.env.REACT_APP_API_TIMEOUT) || 10000,
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        projects: '/api/projects',
        attendance: '/api/attendance',
        leaveRequests: '/api/leave-requests',
        fleetTasks: '/api/fleet-tasks',
        drivers: '/api/driver',
        workers: '/api/worker',
        supervisors: '/api/supervisor',
        companyUsers: '/api/company-users',
        fleetVehicles: '/api/fleet-vehicles',
        fleetTaskPassengers: '/api/fleet-task-passengers'
      }
    };
  }

  // Application Information
  get app() {
    return {
      name: process.env.REACT_APP_APP_NAME || 'ERP System',
      version: process.env.REACT_APP_VERSION || '1.0.0',
      environment: process.env.REACT_APP_ENVIRONMENT || 'development',
      isDevelopment: process.env.REACT_APP_ENVIRONMENT === 'development',
      isProduction: process.env.REACT_APP_ENVIRONMENT === 'production'
    };
  }

  // Upload Configuration
  get upload() {
    return {
      maxFileSize: parseInt(process.env.REACT_APP_MAX_FILE_SIZE) || 10485760, // 10MB
      allowedTypes: process.env.REACT_APP_ALLOWED_FILE_TYPES?.split(',') || [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf'
      ],
      endpoints: {
        tasks: '/uploads/tasks',
        drivers: '/uploads/drivers',
        leave: '/uploads/leave',
        pickup: '/uploads/pickup',
        dropoff: '/uploads/dropoff'
      }
    };
  }

  // Feature Flags
  get features() {
    return {
      enableDebug: process.env.REACT_APP_ENABLE_DEBUG === 'true',
      enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true'
    };
  }

  // Storage Keys
  get storage() {
    return {
      token: 'token',
      user: 'user',
      selectedCompany: 'selectedCompany',
      theme: 'theme',
      language: 'language'
    };
  }

  // HTTP Status Codes
  get httpStatus() {
    return {
      OK: 200,
      CREATED: 201,
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      INTERNAL_SERVER_ERROR: 500
    };
  }

  // Validation
  validateEnvironmentVariables() {
    const required = ['REACT_APP_API_BASE_URL'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`);
      console.warn('Using default values. Please check your .env file.');
    }
  }

  // Utility Methods
  getFullApiUrl(endpoint = '') {
    return `${this.api.baseURL}${endpoint}`;
  }

  getUploadUrl(type, filename = '') {
    const baseUrl = this.api.baseURL;
    const uploadPath = this.upload.endpoints[type] || '/uploads';
    return `${baseUrl}${uploadPath}${filename ? `/${filename}` : ''}`;
  }

  // Debug logging
  log(...args) {
    if (this.features.enableDebug) {
      console.log(`[${this.app.name}]`, ...args);
    }
  }

  warn(...args) {
    if (this.features.enableDebug) {
      console.warn(`[${this.app.name}]`, ...args);
    }
  }

  error(...args) {
    if (this.features.enableDebug) {
      console.error(`[${this.app.name}]`, ...args);
    }
  }
}

// Export singleton instance
const appConfig = new AppConfig();

export default appConfig;
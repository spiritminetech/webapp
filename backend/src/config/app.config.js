/**
 * Backend Application Configuration
 * Professional ERP System Backend Configuration
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class AppConfig {
  constructor() {
    this.validateEnvironmentVariables();
  }

  // Database Configuration
  get database() {
    return {
      uri: process.env.MONGODB_URI,
      name: process.env.DB_NAME || 'erp',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    };
  }

  // Server Configuration
  get server() {
    return {
      port: parseInt(process.env.PORT) || 5001,
      environment: process.env.NODE_ENV || 'development',
      isDevelopment: process.env.NODE_ENV === 'development',
      isProduction: process.env.NODE_ENV === 'production'
    };
  }

  // CORS Configuration
  get cors() {
    return {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        process.env.DRIVER_APP_URL || 'http://localhost:3000'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    };
  }

  // JWT Configuration
  get jwt() {
    return {
      secret: process.env.JWT_SECRET || 'fallback-secret-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    };
  }

  // Email Configuration
  get email() {
    return {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };
  }

  // File Upload Configuration
  get upload() {
    return {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
      uploadPath: process.env.UPLOAD_PATH || './uploads',
      allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf'
      ],
      paths: {
        tasks: '/uploads/tasks',
        drivers: '/uploads/drivers',
        leave: '/uploads/leave',
        pickup: '/uploads/pickup',
        dropoff: '/uploads/dropoff'
      }
    };
  }

  // API Configuration
  get api() {
    return {
      version: process.env.API_VERSION || 'v1',
      prefix: process.env.API_PREFIX || '/api',
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
      }
    };
  }

  // Logging Configuration
  get logging() {
    return {
      level: this.server.isDevelopment ? 'debug' : 'info',
      enableConsole: true,
      enableFile: this.server.isProduction
    };
  }

  // Validation
  validateEnvironmentVariables() {
    const required = [
      'MONGODB_URI',
      'JWT_SECRET'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
      if (this.server.isProduction) {
        process.exit(1);
      }
    }

    // Warnings for optional but recommended variables
    const recommended = [
      'SMTP_USER',
      'SMTP_PASS'
    ];

    const missingRecommended = recommended.filter(key => !process.env[key]);
    if (missingRecommended.length > 0) {
      console.warn(`⚠️ Missing recommended environment variables: ${missingRecommended.join(', ')}`);
    }
  }

  // Utility Methods
  getFullUrl(path = '') {
    const protocol = this.server.isDevelopment ? 'http' : 'https';
    const host = process.env.HOST || 'localhost';
    return `${protocol}://${host}:${this.server.port}${path}`;
  }

  getUploadUrl(type, filename = '') {
    const basePath = this.upload.paths[type] || '/uploads';
    return this.getFullUrl(`${basePath}${filename ? `/${filename}` : ''}`);
  }

  // Debug logging
  log(...args) {
    if (this.server.isDevelopment) {
      console.log(`[ERP-Backend]`, ...args);
    }
  }

  error(...args) {
    console.error(`[ERP-Backend]`, ...args);
  }
}

// Export singleton instance
const appConfig = new AppConfig();

export default appConfig;
/**
 * Services Index
 * Centralized export for all API services
 */

// Base service
export { default as ApiService } from './ApiService.js';

// Specific services
export { default as authService } from './AuthService.js';
export { default as attendanceService } from './AttendanceService.js';
export { default as leaveService } from './LeaveService.js';

// Worker Task Mobile Services
export { default as workerTaskService } from './WorkerTaskService.js';
export { default as photoService } from './PhotoService.js';
export { default as offlineService } from './OfflineService.js';
export { default as geofenceService } from './GeofenceService.js';
export { default as geofenceIntegrationService } from './GeofenceIntegrationService.js';
export { default as workerMobileApiService } from './WorkerMobileApiService.js';

// Dashboard services
export { default as dashboardService } from './DashboardService.js';
export { default as locationService } from './LocationService.js';
export { default as performanceService } from './PerformanceService.js';
export { default as tokenService } from './TokenService.js';

// Project services
export { default as projectService } from './ProjectService.js';

// Error Handling Services
export { default as errorLoggingService } from './ErrorLoggingService.js';
export { default as retryService } from './RetryService.js';
export { default as errorRecoveryService } from './ErrorRecoveryService.js';

// Legacy API exports for backward compatibility
export { default as api } from './api.js';

// Configuration
export { default as appConfig } from '../config/app.config.js';
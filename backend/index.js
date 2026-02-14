import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import centralized configuration
import appConfig from './src/config/app.config.js';

// Import routes
import authRoutes from './src/modules/auth/authRoutes.js';
import companyUserRoutes from './src/modules/companyUser/companyUserRoutes.js';
import driverRoutes from './src/modules/driver/driverRoutes.js';
import fleetTaskRoutes from './src/modules/fleetTask/fleetTaskRoutes.js';
import fleetTaskPassengerRoutes from './src/modules/fleetTask/submodules/fleetTaskPassenger/fleetTaskPassengerRoutes.js';
import fleetVehicleRoutes from './src/modules/fleetTask/submodules/fleetvehicle/fleetVehicleRoutes.js';
import projectRoutes from './src/modules/project/projectRoutes.js';
import projectToolsRoutes from './src/modules/project/projectToolsRoutes.js';
import workerRoutes from './src/modules/worker/workerRoutes.js'; 
import attendanceRoutes from'./src/modules/attendance/attendanceRoutes.js';
import supervisorRoutes from './src/modules/supervisor/supervisorRoutes.js';
import supervisorDailyProgressRoutes  from "./src/modules/supervisorDailyProgress/supervisorDailyProgressRoutes.js";
import leaveRequestRoutes from './src/modules/leaveRequest/leaveRequestRoutes.js';
import migrationRoutes from './src/routes/migration.js';
import escalationManager from './src/modules/supervisor/escalationManager.js';

const app = express();

// Middleware
app.use(cors(appConfig.cors));
app.use(express.json({ limit: `${appConfig.upload.maxFileSize}b` }));
app.use(express.urlencoded({ extended: true, limit: `${appConfig.upload.maxFileSize}b` }));

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Serve uploaded files statically - THIS IS CRITICAL FOR PHOTO PREVIEWS
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Log static file requests for debugging
if (appConfig.server.isDevelopment) {
  app.use('/uploads', (req, res, next) => {
    appConfig.log(`📁 Static file request: ${req.path}`);
    next();
  });
}

// API Routes with centralized prefix
const apiPrefix = appConfig.api.prefix;
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/company-users`, companyUserRoutes);
app.use(`${apiPrefix}/driver`, driverRoutes);
app.use(`${apiPrefix}/fleet-tasks`, fleetTaskRoutes);
app.use(`${apiPrefix}/fleet-task-passengers`, fleetTaskPassengerRoutes);
app.use(`${apiPrefix}/fleet-vehicles`, fleetVehicleRoutes);
app.use(`${apiPrefix}/projects`, projectRoutes);
app.use(`${apiPrefix}/project`, projectToolsRoutes);
app.use(`${apiPrefix}/worker`, workerRoutes);
app.use(`${apiPrefix}/attendance`, attendanceRoutes);
app.use(`${apiPrefix}/supervisor`, supervisorRoutes);
app.use(`${apiPrefix}/supervisor`, supervisorDailyProgressRoutes);
app.use(`${apiPrefix}/leave-requests`, leaveRequestRoutes);
app.use(`${apiPrefix}/migration`, migrationRoutes);

// Enhanced health check route
app.get(`${apiPrefix}/health`, (req, res) => {
  res.json({ 
    success: true, 
    message: 'ERP System API is running', 
    timestamp: new Date().toISOString(),
    version: appConfig.api.version,
    environment: appConfig.server.environment,
    port: appConfig.server.port,
    endpoints: {
      api: apiPrefix,
      uploads: '/uploads',
      health: `${apiPrefix}/health`
    }
  });
});

// Test static file route
app.get(`${apiPrefix}/test-upload`, (req, res) => {
  res.json({
    success: true,
    message: 'Static file serving test',
    uploadsPath: path.join(__dirname, 'uploads'),
    staticRoute: '/uploads',
    maxFileSize: appConfig.upload.maxFileSize,
    allowedTypes: appConfig.upload.allowedTypes
  });
});

// MongoDB connection with centralized config
mongoose.connect(appConfig.database.uri, { 
  dbName: appConfig.database.name,
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    appConfig.log(`✅ Connected to MongoDB database: ${appConfig.database.name}`);
    appConfig.log(`🌐 Database URI: ${appConfig.database.uri.replace(/\/\/.*@/, '//***:***@')}`);
  })
  .catch(err => {
    appConfig.error('❌ MongoDB connection error:', err);
    if (appConfig.server.isProduction) {
      process.exit(1);
    }
  });

// Start server
app.listen(appConfig.server.port, () => {
  console.log('🚀 ERP System Backend Started');
  console.log('================================');
  appConfig.log(`🌍 Environment: ${appConfig.server.environment}`);
  appConfig.log(`🚀 Server: ${appConfig.getFullUrl()}`);
  appConfig.log(`📁 Static files: ${appConfig.getFullUrl('/uploads/')}`);
  appConfig.log(`🔗 Health check: ${appConfig.getFullUrl(`${apiPrefix}/health`)}`);
  appConfig.log(`🖼️  Upload endpoints: ${Object.keys(appConfig.upload.paths).join(', ')}`);
  appConfig.log(`🔒 CORS origins: ${appConfig.cors.origin.join(', ')}`);
  console.log('================================');
  
  // Start escalation manager for alert processing
  try {
    escalationManager.start();
    appConfig.log('🚨 Alert escalation manager started');
  } catch (error) {
    appConfig.error('❌ Failed to start escalation manager:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  escalationManager.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  escalationManager.stop();
  process.exit(0);
});
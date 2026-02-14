// routes/workerRoutes.js
import express from "express";
import { getWorkerTodayTrip, getWorkerTodayTask, getWorkerTasksToday, validateWorkerGeofence, startWorkerTask, submitWorkerTaskProgress, uploadWorkerTaskPhotos, reportWorkerTaskIssue } from "./workerController.js";
import { verifyToken} from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js";
import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

// Worker Portal - Today's Trip
router.get("/today-trip",
  verifyToken,
  getWorkerTodayTrip
);

// Enhanced endpoint for mobile app - Today's Tasks with comprehensive details
router.get("/tasks/today",
  verifyToken,
  getWorkerTasksToday
);

// Legacy endpoint - keeping for backward compatibility
router.get(
  "/my-task/today",
  verifyToken,
  getWorkerTodayTask
);

// Validate geofence location
router.get(
  "/geofence/validate",
  verifyToken,
  validateWorkerGeofence
);

// Start a task with geofence validation
router.post(
  "/task/start",
  verifyToken,
  startWorkerTask
);

router.post(
  "/task-progress",
  verifyToken,
  authMiddleware,
  submitWorkerTaskProgress
);

router.post(
  "/task/issue",
  verifyToken,
  reportWorkerTaskIssue
);

router.post(
  "/task/photo",
  verifyToken,
  upload.array("photos", 5),
  uploadWorkerTaskPhotos
);
//router.put('/passengers/:passengerId/confirm', authMiddleware, confirmPassengerJourney);

// In your routes file


export default router;
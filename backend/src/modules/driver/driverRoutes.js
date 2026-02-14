import express from 'express';
const router = express.Router();

import {
  getTodaysTasks, 
  getTripHistory,
  getTaskDetails, 
  confirmPickup,
  confirmDrop,
  getTripSummary,
  getDriverProfile,
  changeDriverPassword,
  uploadDriverPhoto,
  upload
} from './driverController.js';

import { verifyToken } from '../../middleware/authMiddleware.js';

// 🔹 Driver Profile Routes
router.get("/profile", verifyToken,  getDriverProfile);
router.put("/profile/password", verifyToken,  changeDriverPassword);
router.post("/profile/photo", verifyToken,  upload.single('photo'), uploadDriverPhoto);

// 🔹 Driver Task Routes
router.get("/tasks/today", verifyToken,  getTodaysTasks);
router.get("/trips/history", verifyToken,  getTripHistory);
router.get("/tasks/:taskId", verifyToken,  getTaskDetails);
router.post("/tasks/:taskId/pickup", verifyToken, confirmPickup);
router.post("/tasks/:taskId/drop", verifyToken,  confirmDrop);
router.get("/tasks/:taskId/summary", verifyToken, getTripSummary);

export default router;

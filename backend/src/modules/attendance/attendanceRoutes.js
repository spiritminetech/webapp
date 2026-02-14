import express from 'express';
import { validateAttendanceGeofence, logLocation, submitAttendance, getAttendanceHistory, getTodayAttendance } from './attendanceController.js';

import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

// Clock in / out
router.post('/validate-geofence', validateAttendanceGeofence);
router.post('/log-location',authMiddleware, logLocation);
router.post('/submit',authMiddleware, submitAttendance);
router.get('/history',authMiddleware, getAttendanceHistory);
router.get('/today',authMiddleware, getTodayAttendance);


export default router;

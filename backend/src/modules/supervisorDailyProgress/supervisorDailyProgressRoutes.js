import express from "express";

import upload from "../../middleware/upload.js";
import {
  submitDailyProgress,
  uploadDailyProgressPhotos,
  getDailyProgressByDate,
  getDailyProgressRange
} from "./supervisorDailyProgressController.js";


const router = express.Router();

/**
 * Supervisor submits daily progress (FINAL)
 * 
 */


router.post(
  "/daily-progress",

  submitDailyProgress
);

/**
 * Upload site photos
 */
router.post(
  "/daily-progress/photos",

  upload.array("photos", 10),
  uploadDailyProgressPhotos
);

/**
 * Manager / Client view (single day)
 */
router.get(
  "/daily-progress/:projectId/:date",

  getDailyProgressByDate
);

/**
 * Manager / Client view (date range)
 */
router.get(
  "/daily-progress/:projectId",
  getDailyProgressRange
);


export default router;

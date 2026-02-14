import express from 'express';
import {
  raiseLeaveRequest,
  getMyLeaveRequests,
  getPendingLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest
} from './leaveRequestController.js';

import { uploadLeaveDocuments } from '../../middleware/leaveUploadMiddleware.js';
import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

/* Worker */
router.post(
  '/',
  authMiddleware,uploadLeaveDocuments,
  raiseLeaveRequest
);

router.get(
  '/my',
  getMyLeaveRequests
);

/* Supervisor */
router.get(
  '/pending',
  getPendingLeaveRequests
);

router.post(
  '/:id/approve',authMiddleware,
  approveLeaveRequest
);

router.post(
  '/:id/reject',authMiddleware,
  rejectLeaveRequest
);

export default router;
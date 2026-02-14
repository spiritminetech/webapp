import express from 'express';
import { getAssignedWorkers,removeQueuedTask, exportReport, refreshAttendance, getSupervisorProjects,getCheckedInWorkers,getProjectTasks,getWorkerTasks ,assignTask,completeTask,getWorkerTasksForDay ,getActiveTasks, getWorkforceCount, getAttendanceSummary, getPendingApprovals, processApproval, getAlerts, acknowledgeAlert, getEscalationStats} from './supervisorController.js';
import { getSupervisorDashboard } from './supervisorDashboardController.js';
import supervisorDashboardService from './supervisorDashboardService.js';
import WorkerTaskAssignment from '../worker/models/WorkerTaskAssignment.js';
import {getTodayWorkerSubmissions,reviewWorkerProgress} from "../supervisor/submodules/supervisorReviewController.js";
const router = express.Router();
import authMiddleware, { verifyToken, authorizeRoles } from "../../middleware/authMiddleware.js";




// Supervisor Dashboard - Complete dashboard data endpoint
router.get('/:id/dashboard', verifyToken, authorizeRoles('supervisor'), getSupervisorDashboard);

// Get assigned projects for supervisor
router.get('/:id/projects', verifyToken, authorizeRoles('supervisor'), async (req, res) => {
  try {
    const { id: supervisorId } = req.params;
    
    // Get projects
    const projects = await supervisorDashboardService.getAssignedProjects(Number(supervisorId));
    const projectIds = projects.map(p => p.id);
    
    // Get current date
    const todayDateString = new Date().toISOString().split('T')[0];
    
    // Get worker assignment counts for each project
    const projectsWithWorkerCounts = await Promise.all(
      projects.map(async (project) => {
        const workerCount = await WorkerTaskAssignment.countDocuments({
          projectId: project.id,
          date: todayDateString
        });
        
        return {
          ...project.toObject(),
          workerCount
        };
      })
    );
    
    return res.status(200).json({
      success: true,
      data: projectsWithWorkerCounts
    });
  } catch (error) {
    console.error('Get assigned projects error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching assigned projects',
      error: error.message
    });
  }
});

// Get workforce count for supervisor
router.get('/:id/workforce-count', verifyToken, authorizeRoles('supervisor'), getWorkforceCount);

// Get attendance summary for supervisor
router.get('/:id/attendance', verifyToken, authorizeRoles('supervisor'), getAttendanceSummary);

// Get pending approvals for supervisor
router.get('/:id/approvals', verifyToken, authorizeRoles('supervisor'), getPendingApprovals);

// Process approval decision (approve/reject)
router.post('/approval/:id/process', verifyToken, authorizeRoles('supervisor'), processApproval);

// Get alerts for supervisor
router.get('/:id/alerts', verifyToken, authorizeRoles('supervisor'), getAlerts);

// Acknowledge alert
router.post('/alert/:id/acknowledge', verifyToken, authorizeRoles('supervisor'), acknowledgeAlert);

// Get escalation statistics (optional monitoring endpoint)
router.get('/:id/escalation-stats', verifyToken, authorizeRoles('supervisor'), getEscalationStats);

// Get checked-in workers for a project
router.get('/checked-in-workers/:projectId', getCheckedInWorkers);

// Get tasks for a project
router.get('/projects/:projectId/tasks', getProjectTasks);



router.get('/projects', getSupervisorProjects);

router.get('/active-tasks/:projectId', getActiveTasks);
router.get("/worker-tasks", getWorkerTasks);
router.delete("/remove-queued-task", removeQueuedTask);




// Assign task to worker
router.post('/assign-task',authMiddleware, assignTask);

router.post("/complete",  completeTask);
router.get("/worker/daily",  getWorkerTasksForDay);

/**
 * Route to fetch workers assigned to a specific project
 * GET /api/supervisor/workers-assigned
 */
router.get('/workers-assigned', getAssignedWorkers);

/**
 * Route to export the daily attendance report (CSV/PDF)
 * GET /api/supervisor/export-report
 */
router.get('/export-report', exportReport);

/**
 * Route to refresh workers' attendance data for UI updates
 * GET /api/supervisor/refresh-attendance
 */
router.get('/refresh-attendance', refreshAttendance);

router.get(
  "/projects/:projectId/worker-submissions/today",

  getTodayWorkerSubmissions
);


router.patch(
  "/worker-progress/:progressId/review",

  reviewWorkerProgress
);


// router.post(
//   "/supervisor/daily-progress",

//   submitDailyProgress
// );

// /**
//  * Upload site photos
//  */
// router.post(
//   "/supervisor/daily-progress/photos",

//   upload.array("photos", 10),
//   uploadDailyProgressPhotos
// );

// /**
//  * Manager / Client view (single day)
//  */
// router.get(
//   "/supervisor/daily-progress/:projectId/:date",

//   getDailyProgressByDate
// );

// /**
//  * Manager / Client view (date range)
//  */
// router.get(
//   "/supervisor/daily-progress/:projectId",
//   getDailyProgressRange
// );


export default router; 
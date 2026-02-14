// controllers/workerController.js

import fs from "fs";
import path from "path";
import FleetTask from "../fleetTask/models/FleetTask.js";
import FleetTaskPassenger from "../fleetTask/submodules/fleetTaskPassenger/FleetTaskPassenger.js";
import Project from '../project/models/Project.js';
import FleetVehicle from "../fleetTask/submodules/fleetvehicle/FleetVehicle.js";
import Employee from "../employee/Employee.js";
import WorkerTaskAssignment from "../worker/models/WorkerTaskAssignment.js";
import WorkerTaskProgress from "../worker/models/WorkerTaskProgress.js";
import WorkerTaskPhoto from "../worker/models/WorkerTaskPhoto.js";
import Task from "../task/Task.js";
import Attendance from "../attendance/Attendance.js";
import LocationLog from "../attendance/LocationLog.js";
import Tool from "../project/models/Tool.js";
import Material from "../project/models/Material.js";
import TaskIssue from "./models/TaskIssue.js";
import { validateGeofence } from "../../../utils/geofenceUtil.js";
import { getNextId } from "../../utils/idGenerator.js";
import { 
  validateAuthData, 
  validateDateString, 
  validateProgressPercentage,
  validateNumericValue,
  validateStringField,
  validateCoordinates,
  validateId
} from "../../../utils/validationUtil.js";

/* ----------------------------------------------------
   Helper: Resolve logged-in employee (MANDATORY)
---------------------------------------------------- */
const resolveEmployee = async (req) => {
  try {
    // Validate request structure
    if (!req || !req.user) {
      console.error("❌ Invalid request structure - missing user data");
      return null;
    }

    const { userId, companyId } = req.user;

    // Validate required fields
    if (!userId || !companyId) {
      console.error("❌ Missing required user fields:", { userId, companyId });
      return null;
    }

    // Validate field types
    if (!Number.isInteger(userId) || !Number.isInteger(companyId)) {
      console.error("❌ Invalid user field types:", { 
        userId: typeof userId, 
        companyId: typeof companyId 
      });
      return null;
    }

    // Validate field values
    if (userId <= 0 || companyId <= 0) {
      console.error("❌ Invalid user field values:", { userId, companyId });
      return null;
    }

    const employee = await Employee.findOne({
      userId: userId,
      companyId: companyId,
      status: "ACTIVE"
    });

    if (!employee) {
      console.warn("⚠️ Employee not found or inactive:", { userId, companyId });
      return null;
    }

    // Validate employee data integrity
    if (!employee.id || !employee.fullName) {
      console.error("❌ Employee data integrity issue:", {
        employeeId: employee.id,
        hasFullName: Boolean(employee.fullName)
      });
      return null;
    }

    return employee;

  } catch (error) {
    console.error("❌ Error resolving employee:", error);
    return null;
  }
};

/* ----------------------------------------------------
   GET /worker/tasks/today - Comprehensive task details
   Enhanced version with full mobile app requirements
---------------------------------------------------- */
export const getWorkerTasksToday = async (req, res) => {
  try {
    // Rate limiting check (basic implementation)
    const clientIP = req.ip || req.connection.remoteAddress;
    const rateLimitKey = `worker_tasks_${clientIP}`;
    
    // Input validation using validation utilities
    const authValidation = validateAuthData(req);
    if (!authValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: authValidation.message,
        error: authValidation.error
      });
    }

    const { userId, companyId } = authValidation;

    // Validate optional query parameters
    const dateValidation = validateDateString(req.query?.date, false);
    if (!dateValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: dateValidation.message,
        error: dateValidation.error
      });
    }

    const targetDate = dateValidation.date;

    // Resolve employee with additional validation
    const employee = await resolveEmployee(req);
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: "Employee not found or inactive",
        error: "EMPLOYEE_NOT_FOUND"
      });
    }

    // Validate employee status
    if (employee.status !== 'ACTIVE') {
      return res.status(403).json({ 
        success: false, 
        message: "Employee account is not active",
        error: "EMPLOYEE_INACTIVE"
      });
    }

    const today = targetDate;

    // Get all task assignments for today with error handling
    let assignments;
    try {
      assignments = await WorkerTaskAssignment.find({
        employeeId: employee.id,
        date: today
      }).sort({ sequence: 1 });
    } catch (dbError) {
      console.error("❌ Database error fetching assignments:", dbError);
      return res.status(500).json({ 
        success: false, 
        message: "Database error while fetching task assignments",
        error: "DATABASE_ERROR"
      });
    }

    if (!assignments || assignments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No tasks assigned for today",
        error: "NO_TASKS_ASSIGNED"
      });
    }

    // Validate assignments data integrity
    const invalidAssignments = assignments.filter(a => 
      !a.projectId || !a.taskId || !Number.isInteger(a.projectId) || !Number.isInteger(a.taskId)
    );
    
    if (invalidAssignments.length > 0) {
      console.error("❌ Invalid assignment data found:", invalidAssignments.map(a => a.id));
      return res.status(500).json({
        success: false,
        message: "Invalid task assignment data detected",
        error: "INVALID_ASSIGNMENT_DATA"
      });
    }

    // Get project information (assuming one project per day)
    const projectId = assignments[0].projectId;
    let project;
    try {
      project = await Project.findOne({ id: projectId });
    } catch (dbError) {
      console.error("❌ Database error fetching project:", dbError);
      return res.status(500).json({ 
        success: false, 
        message: "Database error while fetching project information",
        error: "DATABASE_ERROR"
      });
    }

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found for assigned tasks",
        error: "PROJECT_NOT_FOUND"
      });
    }

    // Validate project data integrity
    if (!project.projectName || !project.id) {
      console.error("❌ Invalid project data:", project.id);
      return res.status(500).json({
        success: false,
        message: "Invalid project data detected",
        error: "INVALID_PROJECT_DATA"
      });
    }

    // Get supervisor information with error handling
    const supervisorId = assignments[0].supervisorId;
    let supervisor = null;
    
    if (supervisorId) {
      try {
        supervisor = await Employee.findOne({ id: supervisorId });
        
        // Validate supervisor data if found
        if (supervisor && (!supervisor.fullName || supervisor.status !== 'ACTIVE')) {
          console.warn("⚠️ Supervisor found but has invalid data or is inactive:", supervisorId);
          // Don't fail the request, just log the warning
        }
      } catch (dbError) {
        console.error("❌ Database error fetching supervisor:", dbError);
        // Don't fail the request for supervisor fetch errors, just log
        console.warn("⚠️ Could not fetch supervisor information, continuing without it");
      }
    }

    // Get worker's current attendance and location status with error handling
    const todayStart = new Date(today + 'T00:00:00.000Z');
    const todayEnd = new Date(today + 'T23:59:59.999Z');
    
    let attendance = null;
    try {
      attendance = await Attendance.findOne({
        employeeId: employee.id,
        projectId: projectId,
        date: { $gte: todayStart, $lte: todayEnd }
      });
    } catch (dbError) {
      console.error("❌ Database error fetching attendance:", dbError);
      // Continue without attendance data
    }

    // Get latest location log with error handling
    let latestLocation = null;
    try {
      latestLocation = await LocationLog.findOne({
        employeeId: employee.id,
        projectId: projectId
      }).sort({ createdAt: -1 });
    } catch (dbError) {
      console.error("❌ Database error fetching location:", dbError);
      // Continue without location data
    }

    // Prepare project geofence information with validation
    let projectGeofence;
    try {
      const centerLat = project.geofence?.center?.latitude || project.latitude || 0;
      const centerLng = project.geofence?.center?.longitude || project.longitude || 0;
      const radius = project.geofence?.radius || project.geofenceRadius || 100;

      // Validate and sanitize geofence coordinates
      const latValidation = validateNumericValue(centerLat, { 
        min: -90, 
        max: 90, 
        default: 0, 
        fieldName: "latitude" 
      });
      
      const lngValidation = validateNumericValue(centerLng, { 
        min: -180, 
        max: 180, 
        default: 0, 
        fieldName: "longitude" 
      });
      
      const radiusValidation = validateNumericValue(radius, { 
        min: 1, 
        max: 10000, 
        default: 100, 
        fieldName: "radius" 
      });

      // Log warnings if values were modified
      if (latValidation.warning) console.warn("⚠️", latValidation.warning);
      if (lngValidation.warning) console.warn("⚠️", lngValidation.warning);
      if (radiusValidation.warning) console.warn("⚠️", radiusValidation.warning);

      projectGeofence = {
        center: {
          latitude: latValidation.value,
          longitude: lngValidation.value
        },
        radius: radiusValidation.value,
        strictMode: project.geofence?.strictMode !== false,
        allowedVariance: validateNumericValue(
          project.geofence?.allowedVariance, 
          { min: 0, max: 1000, default: 10, fieldName: "allowedVariance" }
        ).value
      };
    } catch (error) {
      console.error("❌ Error preparing geofence data:", error);
      // Use default geofence values
      projectGeofence = {
        center: { latitude: 0, longitude: 0 },
        radius: 100,
        strictMode: true,
        allowedVariance: 10
      };
    }

    // Calculate geofence validation for current location with error handling
    let currentLocationStatus = {
      latitude: latestLocation?.latitude || 0,
      longitude: latestLocation?.longitude || 0,
      insideGeofence: false,
      lastUpdated: latestLocation?.createdAt || null
    };

    if (latestLocation && latestLocation.latitude && latestLocation.longitude) {
      try {
        // Validate location coordinates using validation utility
        const coordValidation = validateCoordinates(latestLocation.latitude, latestLocation.longitude);
        
        if (coordValidation.isValid) {
          const geofenceValidation = validateGeofence(
            { latitude: latestLocation.latitude, longitude: latestLocation.longitude },
            projectGeofence
          );
          currentLocationStatus.insideGeofence = geofenceValidation.insideGeofence;
        } else {
          console.warn("⚠️ Invalid location coordinates:", coordValidation.message);
        }
      } catch (geofenceError) {
        console.error("❌ Error validating geofence:", geofenceError);
        // Continue with default values
      }
    }

    // Build task details with progress information and error handling
    let taskDetails;
    try {
      taskDetails = await Promise.all(assignments.map(async (assignment) => {
        try {
          // Validate assignment data
          if (!assignment.id || !assignment.taskId) {
            console.error("❌ Invalid assignment data:", assignment);
            throw new Error(`Invalid assignment data for assignment ${assignment.id}`);
          }

          const task = await Task.findOne({ id: assignment.taskId });
          
          if (!task) {
            console.warn("⚠️ Task not found for assignment:", assignment.id);
            // Return a placeholder task instead of failing
            return {
              assignmentId: assignment.id,
              taskId: assignment.taskId,
              taskName: "Task Not Found",
              taskType: "WORK",
              description: "Task details unavailable",
              workArea: assignment.workArea || "",
              floor: assignment.floor || "",
              zone: assignment.zone || "",
              status: assignment.status || "queued",
              priority: assignment.priority || "medium",
              sequence: assignment.sequence || 0,
              dailyTarget: {
                description: "",
                quantity: 0,
                unit: "",
                targetCompletion: 100
              },
              progress: {
                percentage: 0,
                completed: 0,
                remaining: 0,
                lastUpdated: null
              },
              timeEstimate: {
                estimated: 0,
                elapsed: 0,
                remaining: 0
              },
              supervisorInstructions: "",
              startTime: null,
              estimatedEndTime: null,
              canStart: false,
              dependencies: []
            };
          }
          
          // Get latest progress with error handling
          let latestProgress = null;
          try {
            latestProgress = await WorkerTaskProgress.findOne({
              workerTaskAssignmentId: assignment.id
            }).sort({ submittedAt: -1 });
          } catch (progressError) {
            console.error("❌ Error fetching progress for assignment:", assignment.id, progressError);
            // Continue without progress data
          }

          // Calculate progress metrics with validation
          const progressValidation = validateProgressPercentage(assignment.progressPercent);
          const progressPercent = progressValidation.percentage;
          
          if (progressValidation.wasModified) {
            console.warn("⚠️ Progress percentage was clamped for assignment:", assignment.id);
          }

          const dailyTarget = assignment.dailyTarget || {};
          
          // Validate daily target data using validation utility
          const targetQuantityValidation = validateNumericValue(
            dailyTarget.quantity, 
            { min: 0, max: 10000, default: 0, fieldName: "target quantity" }
          );
          const targetQuantity = targetQuantityValidation.value;
          
          const completed = targetQuantity > 0 
            ? Math.floor((progressPercent / 100) * targetQuantity) 
            : 0;
          const remaining = Math.max(0, targetQuantity - completed);

          // Calculate time estimates with validation
          const timeEstimate = assignment.timeEstimate || {};
          
          const estimatedValidation = validateNumericValue(
            timeEstimate.estimated, 
            { min: 0, max: 1440, default: 0, fieldName: "estimated time" }
          );
          const estimatedMinutes = estimatedValidation.value;
          
          const elapsedValidation = validateNumericValue(
            timeEstimate.elapsed, 
            { min: 0, max: estimatedMinutes, default: 0, fieldName: "elapsed time" }
          );
          const elapsedMinutes = elapsedValidation.value;
          
          const remainingMinutes = Math.max(0, estimatedMinutes - elapsedMinutes);

          // Determine if task can be started with error handling
          let canStart = true;
          let validationMessage = null;
          
          // Check task dependencies
          if (assignment.dependencies && assignment.dependencies.length > 0) {
            try {
              const dependencyResult = await checkDependencies(assignment.dependencies);
              canStart = dependencyResult.canStart;
              if (!canStart) {
                validationMessage = dependencyResult.message;
              }
            } catch (depError) {
              console.error("❌ Error checking dependencies for assignment:", assignment.id, depError);
              canStart = false; // Err on the side of caution
              validationMessage = "Error validating task dependencies";
            }
          }
          
          // Check task sequence if dependencies are satisfied
          if (canStart) {
            try {
              const sequenceResult = await validateTaskSequence(assignment, assignment.employeeId, assignment.date);
              canStart = sequenceResult.canStart;
              if (!canStart) {
                validationMessage = sequenceResult.message;
              }
            } catch (seqError) {
              console.error("❌ Error validating task sequence for assignment:", assignment.id, seqError);
              canStart = false;
              validationMessage = "Error validating task sequence";
            }
          }

          // Calculate estimated end time with validation
          let estimatedEndTime = null;
          if (assignment.startTime && remainingMinutes > 0) {
            try {
              const startTime = new Date(assignment.startTime);
              if (!isNaN(startTime.getTime())) {
                estimatedEndTime = new Date(startTime.getTime() + remainingMinutes * 60000);
              }
            } catch (timeError) {
              console.error("❌ Error calculating estimated end time:", timeError);
            }
          } else if (remainingMinutes > 0) {
            const now = new Date();
            estimatedEndTime = new Date(now.getTime() + remainingMinutes * 60000);
          }

          return {
            assignmentId: assignment.id,
            taskId: assignment.taskId,
            taskName: task.taskName || "N/A",
            taskType: task.taskType || "WORK",
            description: task.description || "",
            workArea: assignment.workArea || "",
            floor: assignment.floor || "",
            zone: assignment.zone || "",
            status: assignment.status || "queued",
            priority: assignment.priority || "medium",
            sequence: assignment.sequence || 0,
            dailyTarget: {
              description: validateStringField(
                dailyTarget.description, 
                { maxLength: 500, default: "", fieldName: "daily target description" }
              ).value,
              quantity: targetQuantity,
              unit: validateStringField(
                dailyTarget.unit, 
                { maxLength: 50, default: "", fieldName: "target unit" }
              ).value,
              targetCompletion: validateNumericValue(
                dailyTarget.targetCompletion, 
                { min: 0, max: 100, default: 100, fieldName: "target completion" }
              ).value
            },
            progress: {
              percentage: progressPercent,
              completed: completed,
              remaining: remaining,
              lastUpdated: latestProgress?.submittedAt || null
            },
            timeEstimate: {
              estimated: estimatedMinutes,
              elapsed: elapsedMinutes,
              remaining: remainingMinutes
            },
            supervisorInstructions: validateStringField(
              task.description, 
              { maxLength: 2000, default: "", fieldName: "supervisor instructions" }
            ).value,
            startTime: assignment.startTime,
            estimatedEndTime: estimatedEndTime,
            canStart: canStart,
            canStartMessage: validationMessage,
            dependencies: assignment.dependencies || []
          };
        } catch (taskError) {
          console.error("❌ Error processing task assignment:", assignment.id, taskError);
          // Return error placeholder instead of failing entire request
          return {
            assignmentId: assignment.id,
            taskId: assignment.taskId || 0,
            taskName: "Error Loading Task",
            taskType: "WORK",
            description: "Unable to load task details",
            workArea: assignment.workArea || "",
            floor: assignment.floor || "",
            zone: assignment.zone || "",
            status: "error",
            priority: "medium",
            sequence: assignment.sequence || 0,
            dailyTarget: { description: "", quantity: 0, unit: "", targetCompletion: 100 },
            progress: { percentage: 0, completed: 0, remaining: 0, lastUpdated: null },
            timeEstimate: { estimated: 0, elapsed: 0, remaining: 0 },
            supervisorInstructions: "",
            startTime: null,
            estimatedEndTime: null,
            canStart: false,
            dependencies: []
          };
        }
      }));
    } catch (taskDetailsError) {
      console.error("❌ Critical error building task details:", taskDetailsError);
      return res.status(500).json({
        success: false,
        message: "Error processing task details",
        error: "TASK_PROCESSING_ERROR"
      });
    }

    // Calculate daily summary with validation
    const totalTasks = taskDetails.length;
    const completedTasks = taskDetails.filter(t => t.status === 'completed').length;
    const inProgressTasks = taskDetails.filter(t => t.status === 'in_progress').length;
    const queuedTasks = taskDetails.filter(t => t.status === 'queued').length;
    const errorTasks = taskDetails.filter(t => t.status === 'error').length;
    
    // Validate and calculate time totals
    const totalEstimatedMinutes = taskDetails.reduce((sum, t) => {
      const estimated = Number.isFinite(t.timeEstimate.estimated) ? t.timeEstimate.estimated : 0;
      return sum + estimated;
    }, 0);
    
    const totalElapsedMinutes = taskDetails.reduce((sum, t) => {
      const elapsed = Number.isFinite(t.timeEstimate.elapsed) ? t.timeEstimate.elapsed : 0;
      return sum + elapsed;
    }, 0);
    
    const totalRemainingMinutes = taskDetails.reduce((sum, t) => {
      const remaining = Number.isFinite(t.timeEstimate.remaining) ? t.timeEstimate.remaining : 0;
      return sum + remaining;
    }, 0);
    
    // Calculate overall progress with validation
    const validProgressTasks = taskDetails.filter(t => 
      Number.isFinite(t.progress.percentage) && t.status !== 'error'
    );
    
    const overallProgress = validProgressTasks.length > 0 
      ? Math.round(validProgressTasks.reduce((sum, t) => sum + t.progress.percentage, 0) / validProgressTasks.length)
      : 0;

    // Get tools and materials for the project with error handling
    let formattedTools = [];
    let formattedMaterials = [];
    
    try {
      const tools = await Tool.find({
        companyId: req.user.companyId,
        projectId: projectId
      }).select('id name category quantity unit allocated location condition status');

      formattedTools = tools.map(tool => ({
        id: tool.id,
        name: validateStringField(tool.name, { default: "Unknown Tool", maxLength: 200 }).value,
        quantity: validateNumericValue(tool.quantity, { min: 0, max: 10000, default: 0 }).value,
        unit: validateStringField(tool.unit, { default: "pieces", maxLength: 50 }).value,
        allocated: Boolean(tool.allocated),
        location: validateStringField(tool.location, { default: "Not specified", maxLength: 200 }).value
      }));
    } catch (toolsError) {
      console.error("❌ Error fetching tools:", toolsError);
      // Continue with empty tools array
    }

    try {
      const materials = await Material.find({
        companyId: req.user.companyId,
        projectId: projectId
      }).select('id name category quantity unit allocated used remaining location status');

      formattedMaterials = materials.map(material => {
        const quantityValidation = validateNumericValue(material.quantity, { min: 0, max: 100000, default: 0 });
        const allocatedValidation = validateNumericValue(material.allocated, { min: 0, max: 100000, default: 0 });
        const usedValidation = validateNumericValue(material.used, { min: 0, max: 100000, default: 0 });
        
        const quantity = quantityValidation.value;
        const allocated = allocatedValidation.value;
        const used = usedValidation.value;
        const remaining = validateNumericValue(
          material.remaining, 
          { min: 0, max: 100000, default: Math.max(0, allocated - used) }
        ).value;

        return {
          id: material.id,
          name: validateStringField(material.name, { default: "Unknown Material", maxLength: 200 }).value,
          quantity: quantity,
          unit: validateStringField(material.unit, { default: "pieces", maxLength: 50 }).value,
          allocated: allocated,
          used: used,
          remaining: remaining,
          location: validateStringField(material.location, { default: "Not specified", maxLength: 200 }).value
        };
      });
    } catch (materialsError) {
      console.error("❌ Error fetching materials:", materialsError);
      // Continue with empty materials array
    }

    // Build response according to design specification with validation
    const response = {
      success: true,
      data: {
        project: {
          id: project.id,
          name: validateStringField(project.projectName, { default: "N/A", maxLength: 200 }).value,
          code: validateStringField(project.projectCode, { default: "N/A", maxLength: 100 }).value,
          location: validateStringField(project.address, { default: "N/A", maxLength: 500 }).value,
          geofence: {
            latitude: projectGeofence.center.latitude,
            longitude: projectGeofence.center.longitude,
            radius: projectGeofence.radius
          }
        },
        supervisor: {
          id: supervisor?.id || 0,
          name: validateStringField(supervisor?.fullName, { default: "N/A", maxLength: 200 }).value,
          phone: validateStringField(supervisor?.phone, { default: "N/A", maxLength: 50 }).value,
          email: validateStringField(supervisor?.email, { default: "N/A", maxLength: 200 }).value
        },
        worker: {
          id: employee.id,
          name: validateStringField(employee.fullName, { default: "N/A", maxLength: 200 }).value,
          role: validateStringField(employee.jobTitle, { default: "Construction Worker", maxLength: 100 }).value,
          checkInStatus: attendance?.checkIn ? "checked_in" : "not_checked_in",
          currentLocation: {
            latitude: currentLocationStatus.latitude,
            longitude: currentLocationStatus.longitude,
            insideGeofence: Boolean(currentLocationStatus.insideGeofence),
            lastUpdated: currentLocationStatus.lastUpdated
          }
        },
        tasks: taskDetails,
        toolsAndMaterials: {
          tools: formattedTools,
          materials: formattedMaterials
        },
        dailySummary: {
          totalTasks: totalTasks,
          completedTasks: completedTasks,
          inProgressTasks: inProgressTasks,
          queuedTasks: queuedTasks,
          errorTasks: errorTasks,
          totalHoursWorked: validateNumericValue(totalElapsedMinutes / 60, { min: 0, max: 24, default: 0 }).value,
          remainingHours: validateNumericValue(totalRemainingMinutes / 60, { min: 0, max: 24, default: 0 }).value,
          overallProgress: validateNumericValue(overallProgress, { min: 0, max: 100, default: 0 }).value
        }
      }
    };

    // Final validation of response structure
    if (!response.data.project.id || !response.data.worker.id || !Array.isArray(response.data.tasks)) {
      console.error("❌ Invalid response structure generated");
      return res.status(500).json({
        success: false,
        message: "Error generating response data",
        error: "RESPONSE_GENERATION_ERROR"
      });
    }

    return res.json(response);

  } catch (err) {
    console.error("❌ getWorkerTasksToday - Unexpected error:", err);
    
    // Determine error type and provide appropriate response
    if (err.name === 'MongoError' || err.name === 'MongooseError') {
      return res.status(500).json({ 
        success: false, 
        message: "Database connection error",
        error: "DATABASE_CONNECTION_ERROR"
      });
    }
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: "Data validation error",
        error: "VALIDATION_ERROR"
      });
    }
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid data format",
        error: "INVALID_DATA_FORMAT"
      });
    }
    
    // Generic server error for unknown issues
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error",
      error: "INTERNAL_SERVER_ERROR"
    });
  }
};

/**
 * Enhanced helper function to check if task dependencies are completed
 * 
 * @param {number[]} dependencyIds - Array of assignment IDs that this task depends on
 * @returns {Object} - Object with canStart boolean, message string, and additional data
 * 
 * **Validates: Requirements 3.2 - Task Status Management**
 * - Validates that all dependent tasks are completed before allowing task start
 * - Provides detailed error messages for missing or incomplete dependencies
 * - Returns structured data for client-side error handling
 */
const checkDependencies = async (dependencyIds) => {
  try {
    if (!dependencyIds || dependencyIds.length === 0) return { canStart: true, message: null };
    
    // Validate dependency IDs
    const validDependencyIds = dependencyIds.filter(id => 
      Number.isInteger(id) && id > 0
    );
    
    if (validDependencyIds.length === 0) {
      console.warn("⚠️ No valid dependency IDs found:", dependencyIds);
      return { canStart: true, message: null }; // If no valid dependencies, allow task to start
    }
    
    const dependencies = await WorkerTaskAssignment.find({
      id: { $in: validDependencyIds }
    });
    
    // Check if all dependencies exist
    if (dependencies.length !== validDependencyIds.length) {
      const foundIds = dependencies.map(d => d.id);
      const missingIds = validDependencyIds.filter(id => !foundIds.includes(id));
      console.warn("⚠️ Missing dependency assignments:", missingIds);
      return { 
        canStart: false, 
        message: `Missing dependency assignments: ${missingIds.join(', ')}`,
        missingDependencies: missingIds
      };
    }
    
    // Check which dependencies are not completed
    const incompleteDependencies = dependencies.filter(dep => dep.status !== 'completed');
    
    if (incompleteDependencies.length > 0) {
      const incompleteInfo = incompleteDependencies.map(dep => ({
        id: dep.id,
        status: dep.status,
        progressPercent: dep.progressPercent || 0
      }));
      
      return {
        canStart: false,
        message: `Dependent tasks must be completed first: ${incompleteDependencies.map(d => `Task ${d.id} (${d.status})`).join(', ')}`,
        incompleteDependencies: incompleteInfo
      };
    }
    
    // All dependencies are completed
    return { canStart: true, message: null };
    
  } catch (error) {
    console.error("❌ Error checking dependencies:", error);
    return { 
      canStart: false, 
      message: "Error validating task dependencies",
      error: error.message
    };
  }
};

/**
 * Helper function to validate task sequence
 * 
 * @param {Object} assignment - The task assignment to validate
 * @param {number} employeeId - The employee ID
 * @param {string} date - The date in YYYY-MM-DD format
 * @returns {Object} - Object with canStart boolean, message string, and additional data
 * 
 * **Validates: Requirements 3.2 - Task Status Management**
 * - Prevents starting tasks out of assigned sequence
 * - Ensures earlier sequence tasks are completed first
 * - Provides detailed information about incomplete earlier tasks
 */
const validateTaskSequence = async (assignment, employeeId, date) => {
  try {
    // If no sequence is defined, allow the task to start
    if (!assignment.sequence || assignment.sequence <= 1) {
      return { canStart: true, message: null };
    }
    
    // Get all assignments for the same employee and date
    const allAssignments = await WorkerTaskAssignment.find({
      employeeId: employeeId,
      date: date,
      projectId: assignment.projectId
    }).sort({ sequence: 1 });
    
    // Check if there are any earlier sequence tasks that are not completed
    const earlierTasks = allAssignments.filter(task => 
      task.sequence < assignment.sequence && 
      task.id !== assignment.id
    );
    
    if (earlierTasks.length === 0) {
      return { canStart: true, message: null };
    }
    
    // Check if all earlier sequence tasks are completed
    const incompleteEarlierTasks = earlierTasks.filter(task => 
      task.status !== 'completed'
    );
    
    if (incompleteEarlierTasks.length > 0) {
      const incompleteInfo = incompleteEarlierTasks.map(task => ({
        id: task.id,
        sequence: task.sequence,
        status: task.status,
        progressPercent: task.progressPercent || 0
      }));
      
      return {
        canStart: false,
        message: `Tasks must be completed in sequence. Complete earlier tasks first: ${incompleteEarlierTasks.map(t => `Sequence ${t.sequence} (Task ${t.id})`).join(', ')}`,
        incompleteEarlierTasks: incompleteInfo
      };
    }
    
    return { canStart: true, message: null };
    
  } catch (error) {
    console.error("❌ Error validating task sequence:", error);
    return { 
      canStart: false, 
      message: "Error validating task sequence",
      error: error.message
    };
  }
};

/* ----------------------------------------------------
   GET /worker/today-trip
---------------------------------------------------- */
export const getWorkerTodayTrip = async (req, res) => {
  try {
    const employee = await resolveEmployee(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const passengerRecords = await FleetTaskPassenger.find({
      workerEmployeeId: employee.id
    });

    if (!passengerRecords.length) {
      return res.json({ success: true, data: [] });
    }

    const fleetTaskIds = passengerRecords.map(p => p.fleetTaskId);

    const tasks = await FleetTask.find({
      id: { $in: fleetTaskIds },
      taskDate: { $gte: startOfDay, $lte: endOfDay },
      companyId: req.user.companyId
    });

    const enriched = await Promise.all(tasks.map(async (task) => {
      const [project, vehicle, driver, passengerCount] = await Promise.all([
        Project.findOne({ id: task.projectId }).select("projectName"),
        FleetVehicle.findOne({ id: task.vehicleId }).select("registrationNo vehicleType"),
        Employee.findOne({ id: task.driverId }).select("fullName phone photoUrl"),
        FleetTaskPassenger.countDocuments({ fleetTaskId: task.id })
      ]);

      return {
        taskId: task.id,
        projectName: project?.projectName || "N/A",
        vehicleNumber: vehicle?.registrationNo || "N/A",
        vehicleType: vehicle?.vehicleType || "N/A",
        driverName: driver?.fullName || "N/A",
        driverContact: driver?.phone || "N/A",
        driverPhoto: driver?.photoUrl || null,
        startTime: task.plannedPickupTime,
        dropTime: task.plannedDropTime,
        pickupLocation: task.pickupLocation,
        dropLocation: task.dropLocation,
        status: task.status,
        passengerCount
      };
    }));

    return res.json({ success: true, data: enriched });

  } catch (err) {
    console.error("❌ getWorkerTodayTrip:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ----------------------------------------------------
   GET /worker/today-tasks
   ONE PROJECT → MULTIPLE TASKS
---------------------------------------------------- */
export const getWorkerTodayTask = async (req, res) => {
  try {
    const employee = await resolveEmployee(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const today = new Date().toISOString().split("T")[0];

    const assignments = await WorkerTaskAssignment.find({
      employeeId: employee.id,
      //companyId: req.user.companyId,
      date: today
    });

    if (!assignments.length) {
      return res.status(404).json({
        success: false,
        message: "No tasks assigned for today"
      });
    }

    // Enforce ONE PROJECT per day
    const projectId = assignments[0].projectId;

    const project = await Project.findOne({ id: projectId })
      .select("projectName projectCode");

    const supervisor = await Employee.findOne({
      id: assignments[0].supervisorId
    }).select("fullName phone");

    const taskDetails = await Promise.all(assignments.map(async (a) => {
      const task = await Task.findOne({ id: a.taskId }).select("taskName");
      return {
        assignmentId: a.id,
        taskId: a.taskId,
        taskName: task?.taskName || "N/A",
        status: a.status,
        progressPercent: a.progressPercent ?? 0
      };
    }));

    return res.json({
      success: true,
      data: {
        projectId,
        projectName: project?.projectName || "N/A",
        projectCode: project?.projectCode || "N/A",
        supervisorName: supervisor?.fullName || "N/A",
        supervisorPhone: supervisor?.phone || "N/A",
        tasks: taskDetails
      }
    });

  } catch (err) {
    console.error("❌ getWorkerTodayTask:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ----------------------------------------------------
   GET /worker/geofence/validate - Validate current location against project geofence
---------------------------------------------------- */
export const validateWorkerGeofence = async (req, res) => {
  try {
    // Input validation using validation utilities
    const authValidation = validateAuthData(req);
    if (!authValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: authValidation.message,
        error: authValidation.error
      });
    }

    const employee = await resolveEmployee(req);
    if (!employee) {
      return res.status(403).json({ 
        success: false, 
        message: "Employee not found or unauthorized",
        error: "EMPLOYEE_UNAUTHORIZED"
      });
    }

    // Get location from query parameters
    const { latitude, longitude, projectId, accuracy } = req.query;

    // Validate coordinates
    const coordValidation = validateCoordinates(
      parseFloat(latitude), 
      parseFloat(longitude)
    );
    if (!coordValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: coordValidation.message,
        error: coordValidation.error
      });
    }

    // Parse and validate GPS accuracy if provided
    let gpsAccuracy = null;
    if (accuracy) {
      gpsAccuracy = parseFloat(accuracy);
      if (isNaN(gpsAccuracy) || gpsAccuracy < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid GPS accuracy value",
          error: "INVALID_GPS_ACCURACY"
        });
      }
    }

    // Determine project ID - use provided or get from current assignment
    let targetProjectId = null;
    if (projectId) {
      const projectIdValidation = validateId(parseInt(projectId), "project");
      if (!projectIdValidation.isValid) {
        return res.status(400).json({ 
          success: false, 
          message: projectIdValidation.message,
          error: projectIdValidation.error
        });
      }
      targetProjectId = projectIdValidation.id;
    } else {
      // Get project from current day's assignment
      const today = new Date().toISOString().split("T")[0];
      const assignment = await WorkerTaskAssignment.findOne({
        employeeId: employee.id,
        date: today
      });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "No active project assignment found for today",
          error: "NO_ACTIVE_ASSIGNMENT"
        });
      }

      targetProjectId = assignment.projectId;
    }

    // Get project information
    const project = await Project.findOne({ id: targetProjectId });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
        error: "PROJECT_NOT_FOUND"
      });
    }

    // Prepare project geofence information
    const centerLat = project.geofence?.center?.latitude || project.latitude || 0;
    const centerLng = project.geofence?.center?.longitude || project.longitude || 0;
    const radius = project.geofence?.radius || project.geofenceRadius || 100;

    const projectGeofence = {
      center: {
        latitude: centerLat,
        longitude: centerLng
      },
      radius: radius,
      strictMode: project.geofence?.strictMode !== false,
      allowedVariance: project.geofence?.allowedVariance || 10
    };

    // Validate geofence location
    const geofenceValidation = validateGeofence(
      { latitude: coordValidation.latitude, longitude: coordValidation.longitude },
      projectGeofence
    );

    // Handle GPS accuracy edge cases
    let accuracyWarning = null;
    let adjustedValidation = geofenceValidation;
    
    if (gpsAccuracy !== null) {
      // If GPS accuracy is poor (>50m), provide warning
      if (gpsAccuracy > 50) {
        accuracyWarning = `GPS accuracy is poor (${Math.round(gpsAccuracy)}m). Location validation may be unreliable.`;
        
        // If accuracy is very poor (>100m), be more lenient with validation
        if (gpsAccuracy > 100 && !geofenceValidation.isValid) {
          const lenientRadius = projectGeofence.radius + gpsAccuracy;
          const lenientValidation = validateGeofence(
            { latitude: coordValidation.latitude, longitude: coordValidation.longitude },
            { ...projectGeofence, radius: lenientRadius }
          );
          
          if (lenientValidation.isValid) {
            adjustedValidation = {
              ...geofenceValidation,
              isValid: true,
              message: `Location validated with GPS accuracy consideration (${Math.round(gpsAccuracy)}m accuracy)`
            };
          }
        }
      }
    }

    // Create location log for audit trail
    try {
      const locationLog = new LocationLog({
        employeeId: employee.id,
        projectId: targetProjectId,
        latitude: coordValidation.latitude,
        longitude: coordValidation.longitude,
        accuracy: gpsAccuracy,
        insideGeofence: adjustedValidation.insideGeofence,
        logType: 'GEOFENCE_VALIDATION',
        taskAssignmentId: null // Will be set when validating for specific task
      });
      
      await locationLog.save();
    } catch (logError) {
      console.warn("⚠️ Failed to create location log:", logError);
      // Don't fail the request if logging fails
    }

    return res.json({
      success: true,
      data: {
        insideGeofence: adjustedValidation.insideGeofence,
        distance: adjustedValidation.distance,
        geofence: {
          center: {
            latitude: projectGeofence.center.latitude,
            longitude: projectGeofence.center.longitude
          },
          radius: projectGeofence.radius
        },
        canStartTasks: adjustedValidation.isValid,
        message: adjustedValidation.message,
        strictMode: adjustedValidation.strictValidation,
        allowedVariance: adjustedValidation.allowedVariance,
        gpsAccuracy: gpsAccuracy,
        accuracyWarning: accuracyWarning,
        validationTimestamp: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error("❌ validateWorkerGeofence:", err);
    
    // Determine error type and provide appropriate response
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: "Data validation error",
        error: "VALIDATION_ERROR"
      });
    }
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid data format",
        error: "INVALID_DATA_FORMAT"
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error",
      error: "INTERNAL_SERVER_ERROR"
    });
  }
};

/* ----------------------------------------------------
   POST /worker/task/start - Start a task with geofence validation
---------------------------------------------------- */
export const startWorkerTask = async (req, res) => {
  try {
    // Input validation using validation utilities
    const authValidation = validateAuthData(req);
    if (!authValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: authValidation.message,
        error: authValidation.error
      });
    }

    const employee = await resolveEmployee(req);
    if (!employee) {
      return res.status(403).json({ 
        success: false, 
        message: "Employee not found or unauthorized",
        error: "EMPLOYEE_UNAUTHORIZED"
      });
    }

    // Validate request body
    const { assignmentId, location } = req.body;

    // Validate assignment ID
    const assignmentIdValidation = validateId(assignmentId, "assignment");
    if (!assignmentIdValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: assignmentIdValidation.message,
        error: assignmentIdValidation.error
      });
    }

    // Validate location data
    if (!location) {
      return res.status(400).json({ 
        success: false, 
        message: "Location data is required to start task",
        error: "MISSING_LOCATION"
      });
    }

    const coordValidation = validateCoordinates(location.latitude, location.longitude);
    if (!coordValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: coordValidation.message,
        error: coordValidation.error
      });
    }

    // Validate location accuracy if provided
    let accuracy = null;
    if (location.accuracy !== undefined) {
      const accuracyValidation = validateNumericValue(location.accuracy, {
        min: 0,
        max: 1000,
        default: null,
        fieldName: "location accuracy"
      });
      accuracy = accuracyValidation.value;
    }

    // Find the task assignment
    const assignment = await WorkerTaskAssignment.findOne({
      id: assignmentIdValidation.id,
      employeeId: employee.id
    });

    if (!assignment) {
      return res.status(403).json({ 
        success: false, 
        message: "Task assignment not found or unauthorized",
        error: "ASSIGNMENT_UNAUTHORIZED"
      });
    }

    // Check if task is already started or completed
    if (assignment.status === 'in_progress') {
      return res.status(400).json({ 
        success: false, 
        message: "Task is already in progress",
        error: "TASK_ALREADY_STARTED"
      });
    }

    if (assignment.status === 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: "Task is already completed",
        error: "TASK_ALREADY_COMPLETED"
      });
    }

    // Check task dependencies
    if (assignment.dependencies && assignment.dependencies.length > 0) {
      const dependencyResult = await checkDependencies(assignment.dependencies);
      if (!dependencyResult.canStart) {
        return res.status(400).json({ 
          success: false, 
          message: dependencyResult.message,
          error: "DEPENDENCIES_NOT_MET",
          data: {
            incompleteDependencies: dependencyResult.incompleteDependencies,
            missingDependencies: dependencyResult.missingDependencies
          }
        });
      }
    }
    
    // Check task sequence
    const sequenceResult = await validateTaskSequence(assignment, employee.id, assignment.date);
    if (!sequenceResult.canStart) {
      return res.status(400).json({ 
        success: false, 
        message: sequenceResult.message,
        error: "SEQUENCE_VALIDATION_FAILED",
        data: {
          incompleteEarlierTasks: sequenceResult.incompleteEarlierTasks
        }
      });
    }

    // Get project information for geofence validation
    const project = await Project.findOne({ id: assignment.projectId });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found for this task",
        error: "PROJECT_NOT_FOUND"
      });
    }

    // Prepare project geofence information
    const centerLat = project.geofence?.center?.latitude || project.latitude || 0;
    const centerLng = project.geofence?.center?.longitude || project.longitude || 0;
    const radius = project.geofence?.radius || project.geofenceRadius || 100;

    const projectGeofence = {
      center: {
        latitude: centerLat,
        longitude: centerLng
      },
      radius: radius,
      strictMode: project.geofence?.strictMode !== false,
      allowedVariance: project.geofence?.allowedVariance || 10
    };

    // Validate geofence location
    const geofenceValidation = validateGeofence(
      { latitude: location.latitude, longitude: location.longitude },
      projectGeofence
    );

    if (!geofenceValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: geofenceValidation.message,
        error: "GEOFENCE_VALIDATION_FAILED",
        data: {
          distance: geofenceValidation.distance,
          allowedRadius: geofenceValidation.allowedRadius,
          insideGeofence: geofenceValidation.insideGeofence,
          strictMode: geofenceValidation.strictValidation
        }
      });
    }

    // Update task assignment status
    const startTime = new Date();
    assignment.status = 'in_progress';
    assignment.startTime = startTime;
    
    // Update geofence validation info
    if (!assignment.geofenceValidation) {
      assignment.geofenceValidation = {};
    }
    assignment.geofenceValidation.lastValidated = startTime;
    assignment.geofenceValidation.validationLocation = {
      latitude: location.latitude,
      longitude: location.longitude
    };

    await assignment.save();

    // Log location for audit trail
    try {
      const nextLocationId = await getNextId(LocationLog);

      await LocationLog.create({
        id: nextLocationId,
        employeeId: employee.id,
        projectId: assignment.projectId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: accuracy,
        insideGeofence: geofenceValidation.insideGeofence,
        logType: 'TASK_START',
        taskAssignmentId: assignment.id
      });
    } catch (locationLogError) {
      console.error("❌ Error logging location for task start:", locationLogError);
      // Don't fail the request if location logging fails
    }

    // Calculate estimated end time if time estimate is available
    let estimatedEndTime = null;
    if (assignment.timeEstimate && assignment.timeEstimate.remaining > 0) {
      estimatedEndTime = new Date(startTime.getTime() + assignment.timeEstimate.remaining * 60000);
    }

    return res.json({
      success: true,
      message: "Task started successfully",
      data: {
        assignmentId: assignment.id,
        status: assignment.status,
        startTime: startTime,
        estimatedEndTime: estimatedEndTime,
        geofenceValidation: {
          insideGeofence: geofenceValidation.insideGeofence,
          distance: geofenceValidation.distance,
          validated: true,
          validatedAt: startTime
        }
      }
    });

  } catch (err) {
    console.error("❌ startWorkerTask:", err);
    
    // Determine error type and provide appropriate response
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: "Data validation error",
        error: "VALIDATION_ERROR"
      });
    }
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid data format",
        error: "INVALID_DATA_FORMAT"
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error",
      error: "INTERNAL_SERVER_ERROR"
    });
  }
};

/* ----------------------------------------------------
   POST /api/worker/task/progress - Submit task progress updates
   Enhanced version matching design specification
---------------------------------------------------- */
export const submitWorkerTaskProgress = async (req, res) => {
  try {
    // Input validation using validation utilities
    const authValidation = validateAuthData(req);
    if (!authValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: authValidation.message,
        error: authValidation.error
      });
    }

    const employee = await resolveEmployee(req);
    if (!employee) {  
      return res.status(403).json({ 
        success: false, 
        message: "Employee not found or unauthorized",
        error: "EMPLOYEE_UNAUTHORIZED"
      });
    }

    // Validate request body - enhanced to match design specification
    const { 
      assignmentId, 
      progressPercent, 
      description, 
      notes, 
      location,
      completedQuantity,
      issuesEncountered 
    } = req.body;

    // Validate assignment ID
    const assignmentIdValidation = validateId(assignmentId, "assignment");
    if (!assignmentIdValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: assignmentIdValidation.message,
        error: assignmentIdValidation.error
      });
    }

    // Validate progress percentage
    const progressValidation = validateProgressPercentage(progressPercent);
    if (!progressValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: progressValidation.message,
        error: progressValidation.error
      });
    }

    // Validate description (required field)
    const descriptionValidation = validateStringField(description, { 
      maxLength: 1000, 
      required: true,
      fieldName: "description"
    });
    
    if (!descriptionValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: descriptionValidation.message,
        error: descriptionValidation.error
      });
    }
    
    const notesValidation = validateStringField(notes, { 
      maxLength: 500, 
      default: "", 
      fieldName: "notes" 
    });

    // Validate location if provided
    let validatedLocation = null;
    if (location) {
      const coordValidation = validateCoordinates(location.latitude, location.longitude);
      if (coordValidation.isValid) {
        validatedLocation = {
          latitude: coordValidation.latitude,
          longitude: coordValidation.longitude,
          timestamp: location.timestamp ? new Date(location.timestamp) : new Date()
        };
      } else {
        console.warn("⚠️ Invalid location coordinates provided:", coordValidation.message);
      }
    }

    // Validate completed quantity if provided
    let validatedCompletedQuantity = null;
    if (completedQuantity !== undefined) {
      const quantityValidation = validateNumericValue(completedQuantity, {
        min: 0,
        max: 100000,
        default: null,
        fieldName: "completed quantity"
      });
      validatedCompletedQuantity = quantityValidation.value;
    }

    // Validate issues encountered if provided
    let validatedIssues = [];
    if (issuesEncountered && Array.isArray(issuesEncountered)) {
      validatedIssues = issuesEncountered.slice(0, 10).map(issue => {
        if (typeof issue === 'string') {
          return validateStringField(issue, { 
            maxLength: 200, 
            default: "", 
            fieldName: "issue" 
          }).value;
        }
        return "";
      }).filter(issue => issue.length > 0);
    }

    // Find the task assignment
    const assignment = await WorkerTaskAssignment.findOne({
      id: assignmentIdValidation.id,
      employeeId: employee.id
    });

    if (!assignment) {
      return res.status(403).json({ 
        success: false, 
        message: "Task assignment not found or unauthorized",
        error: "ASSIGNMENT_UNAUTHORIZED"
      });
    }

    // Check if task is in a valid state for progress updates
    if (assignment.status === 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot update progress for completed task",
        error: "TASK_ALREADY_COMPLETED"
      });
    }

    if (assignment.status === 'queued') {
      return res.status(400).json({ 
        success: false, 
        message: "Task must be started before progress can be updated",
        error: "TASK_NOT_STARTED"
      });
    }

    // Validate progress logic - cannot decrease progress
    const currentProgress = assignment.progressPercent || 0;
    if (progressValidation.percentage < currentProgress) {
      return res.status(400).json({ 
        success: false, 
        message: `Progress percentage cannot be decreased from ${currentProgress}% to ${progressValidation.percentage}%`,
        error: "INVALID_PROGRESS_DECREASE",
        data: {
          currentProgress: currentProgress,
          attemptedProgress: progressValidation.percentage
        }
      });
    }

    // Create WorkerTaskProgress record
    const nextId = await getNextId(WorkerTaskProgress);

    const submittedAt = new Date();
    const progressRecord = await WorkerTaskProgress.create({
      id: nextId,
      workerTaskAssignmentId: assignmentIdValidation.id,
      employeeId: employee.id,
      progressPercent: progressValidation.percentage,
      description: descriptionValidation.value,
      notes: notesValidation.value,
      location: validatedLocation,
      completedQuantity: validatedCompletedQuantity,
      issuesEncountered: validatedIssues,
      submittedAt: submittedAt,
      status: "SUBMITTED"
    });

    // Update assignment progress and status
    const previousProgress = assignment.progressPercent || 0;
    assignment.progressPercent = progressValidation.percentage;
    
    // Update status based on progress
    if (progressValidation.percentage >= 100) {
      assignment.status = "completed";
      assignment.completedAt = submittedAt;
    } else if (assignment.status === 'queued') {
      assignment.status = "in_progress";
      if (!assignment.startTime) {
        assignment.startTime = submittedAt;
      }
    }

    // Update time estimates if available
    if (assignment.timeEstimate) {
      const progressDelta = progressValidation.percentage - previousProgress;
      if (progressDelta > 0 && assignment.timeEstimate.estimated > 0) {
        const estimatedElapsed = (progressValidation.percentage / 100) * assignment.timeEstimate.estimated;
        assignment.timeEstimate.elapsed = Math.min(estimatedElapsed, assignment.timeEstimate.estimated);
        assignment.timeEstimate.remaining = Math.max(0, assignment.timeEstimate.estimated - assignment.timeEstimate.elapsed);
      }
    }

    await assignment.save();

    // Log location for audit trail if provided
    if (validatedLocation) {
      try {
        const nextLocationId = await getNextId(LocationLog);

        await LocationLog.create({
          id: nextLocationId,
          employeeId: employee.id,
          projectId: assignment.projectId,
          latitude: validatedLocation.latitude,
          longitude: validatedLocation.longitude,
          logType: 'PROGRESS_UPDATE',
          taskAssignmentId: assignment.id,
          progressPercent: progressValidation.percentage
        });
      } catch (locationLogError) {
        console.error("❌ Error logging location for progress update:", locationLogError);
        // Don't fail the request if location logging fails
      }
    }

    // Determine next action based on progress and status
    let nextAction = "continue_work";
    if (progressValidation.percentage >= 100) {
      nextAction = "task_completed";
    } else if (validatedIssues.length > 0) {
      nextAction = "resolve_issues";
    }

    // Return response matching design specification
    return res.json({ 
      success: true, 
      message: "Progress updated successfully",
      data: {
        progressId: progressRecord.id,
        assignmentId: assignment.id,
        progressPercent: progressValidation.percentage,
        submittedAt: submittedAt,
        status: "SUBMITTED",
        nextAction: nextAction,
        taskStatus: assignment.status,
        previousProgress: previousProgress,
        progressDelta: progressValidation.percentage - previousProgress
      }
    });

  } catch (err) {
    console.error("❌ submitWorkerTaskProgress:", err);
    
    // Determine error type and provide appropriate response
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: "Data validation error",
        error: "VALIDATION_ERROR"
      });
    }
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid data format",
        error: "INVALID_DATA_FORMAT"
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error",
      error: "INTERNAL_SERVER_ERROR"
    });
  }
};

/* ----------------------------------------------------
   POST /worker/task-photos
---------------------------------------------------- */
export const uploadWorkerTaskPhotos = async (req, res) => {
  try {
    // Input validation using validation utilities
    const authValidation = validateAuthData(req);
    if (!authValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: authValidation.message,
        error: authValidation.error
      });
    }

    const employee = await resolveEmployee(req);
    if (!employee) {
      return res.status(403).json({ 
        success: false, 
        message: "Employee not found or unauthorized",
        error: "EMPLOYEE_UNAUTHORIZED"
      });
    }

    const { assignmentId, captions, location } = req.body;

    // Validate assignment ID
    const assignmentIdValidation = validateId(assignmentId, "assignment");
    if (!assignmentIdValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: assignmentIdValidation.message,
        error: assignmentIdValidation.error
      });
    }

    // Validate files are present
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "No photos provided",
        error: "NO_PHOTOS_PROVIDED"
      });
    }

    // Validate file count (max 5 photos as per design spec)
    if (req.files.length > 5) {
      return res.status(400).json({ 
        success: false, 
        message: "Maximum 5 photos allowed per upload",
        error: "TOO_MANY_PHOTOS"
      });
    }

    // Validate file types and sizes
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxFileSize = 10 * 1024 * 1024; // 10MB as per design spec

    for (const file of req.files) {
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid file type. Only JPEG and PNG files are allowed",
          error: "INVALID_FILE_TYPE"
        });
      }

      if (file.size > maxFileSize) {
        return res.status(400).json({ 
          success: false, 
          message: "File size too large. Maximum 10MB per file",
          error: "FILE_TOO_LARGE"
        });
      }
    }

    const assignment = await WorkerTaskAssignment.findOne({
      id: assignmentIdValidation.id,
      employeeId: employee.id
    });

    if (!assignment) {
      return res.status(403).json({ 
        success: false, 
        message: "Task assignment not found or unauthorized",
        error: "ASSIGNMENT_UNAUTHORIZED"
      });
    }

    // Check existing photo count to enforce limit
    const existingPhotoCount = await WorkerTaskPhoto.countDocuments({
      workerTaskAssignmentId: assignmentIdValidation.id
    });

    if (existingPhotoCount + req.files.length > 5) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot upload ${req.files.length} photos. Maximum 5 photos per task (${existingPhotoCount} already uploaded)`,
        error: "PHOTO_LIMIT_EXCEEDED"
      });
    }

    // Parse captions if provided (should be array or comma-separated string)
    let photoCaptions = [];
    if (captions) {
      try {
        if (Array.isArray(captions)) {
          photoCaptions = captions;
        } else if (typeof captions === 'string') {
          // Try to parse as JSON array first, then fall back to comma-separated
          try {
            photoCaptions = JSON.parse(captions);
          } catch {
            photoCaptions = captions.split(',').map(c => c.trim());
          }
        }
      } catch (error) {
        console.warn("⚠️ Error parsing captions, using empty captions:", error);
        photoCaptions = [];
      }
    }

    // Parse location if provided
    let photoLocation = null;
    if (location) {
      try {
        const locationData = typeof location === 'string' ? JSON.parse(location) : location;
        if (locationData && locationData.latitude && locationData.longitude) {
          const coordValidation = validateCoordinates(locationData.latitude, locationData.longitude);
          if (coordValidation.isValid) {
            photoLocation = {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              timestamp: locationData.timestamp || new Date().toISOString()
            };
          }
        }
      } catch (error) {
        console.warn("⚠️ Error parsing location data:", error);
      }
    }

    let nextId = await getNextId(WorkerTaskPhoto);

    // Create photo records with enhanced naming convention
    const uploadTimestamp = Date.now();
    const photos = [];
    
    // Process each file with proper naming convention
    for (let index = 0; index < req.files.length; index++) {
      const file = req.files[index];
      const fileIndex = index + 1;
      const extension = path.extname(file.originalname);
      
      // Generate proper filename: task_{assignmentId}_{timestamp}_{index}.jpg
      const properFilename = `task_${assignmentIdValidation.id}_${uploadTimestamp}_${fileIndex}${extension}`;
      const oldPath = file.path;
      const newPath = path.join(path.dirname(oldPath), properFilename);
      
      try {
        // Rename the file to follow proper naming convention
        fs.renameSync(oldPath, newPath);
        
        // Update the file object with new filename
        file.filename = properFilename;
        file.path = newPath;
      } catch (renameError) {
        console.error(`❌ Error renaming file ${file.filename} to ${properFilename}:`, renameError);
        // If rename fails, use original filename but log the error
      }
      
      // Create photo URL with proper filename
      const photoUrl = `/uploads/tasks/${file.filename}`;
      
      const photo = {
        id: nextId++,
        workerTaskAssignmentId: assignmentIdValidation.id,
        employeeId: employee.id,
        photoUrl: photoUrl,
        caption: photoCaptions[index] || '',
        location: photoLocation,
        uploadedAt: new Date(),
        fileSize: file.size,
        originalName: file.originalname,
        mimeType: file.mimetype
      };
      
      photos.push(photo);
    }

    await WorkerTaskPhoto.insertMany(photos);

    // Enhanced response format matching design specification
    return res.json({
      success: true,
      data: {
        uploadedPhotos: photos.map(photo => ({
          id: photo.id,
          photoUrl: photo.photoUrl,
          caption: photo.caption,
          uploadedAt: photo.uploadedAt,
          fileSize: photo.fileSize,
          dimensions: "1920x1080" // Placeholder - would need image processing to get actual dimensions
        })),
        totalPhotos: existingPhotoCount + photos.length,
        maxPhotos: 5
      },
      message: "Photos uploaded successfully"
    });

  } catch (err) {
    console.error("❌ uploadWorkerTaskPhotos:", err);
    
    // Determine error type and provide appropriate response
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: "Data validation error",
        error: "VALIDATION_ERROR"
      });
    }
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid data format",
        error: "INVALID_DATA_FORMAT"
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error",
      error: "INTERNAL_SERVER_ERROR"
    });
  }
};

/* ----------------------------------------------------
   POST /worker/task/issue - Report task issue
---------------------------------------------------- */
export const reportWorkerTaskIssue = async (req, res) => {
  try {
    // Input validation using validation utilities
    const authValidation = validateAuthData(req);
    if (!authValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: authValidation.message,
        error: authValidation.error
      });
    }

    const employee = await resolveEmployee(req);
    if (!employee) {
      return res.status(403).json({ 
        success: false, 
        message: "Employee not found or unauthorized",
        error: "EMPLOYEE_UNAUTHORIZED"
      });
    }

    const { assignmentId, issueType, priority, description, location } = req.body;

    // Validate assignment ID
    const assignmentIdValidation = validateId(assignmentId, "assignment");
    if (!assignmentIdValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: assignmentIdValidation.message,
        error: assignmentIdValidation.error
      });
    }

    // Validate issue type
    const validIssueTypes = [
      'material_shortage', 'tool_malfunction', 'safety_concern', 
      'quality_issue', 'weather_delay', 'technical_problem', 'other'
    ];
    
    if (!issueType || !validIssueTypes.includes(issueType)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid issue type. Must be one of: " + validIssueTypes.join(', '),
        error: "INVALID_ISSUE_TYPE"
      });
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    const issuePriority = priority || 'medium';
    
    if (!validPriorities.includes(issuePriority)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid priority. Must be one of: " + validPriorities.join(', '),
        error: "INVALID_PRIORITY"
      });
    }

    // Validate description
    const descriptionValidation = validateStringField(description, {
      required: true,
      minLength: 10,
      maxLength: 1000,
      fieldName: "description"
    });

    if (!descriptionValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: descriptionValidation.message,
        error: descriptionValidation.error
      });
    }

    // Verify assignment belongs to employee
    const assignment = await WorkerTaskAssignment.findOne({
      id: assignmentIdValidation.id,
      employeeId: employee.id
    });

    if (!assignment) {
      return res.status(403).json({ 
        success: false, 
        message: "Task assignment not found or unauthorized",
        error: "ASSIGNMENT_UNAUTHORIZED"
      });
    }

    // Parse location if provided
    let issueLocation = null;
    if (location) {
      try {
        const locationData = typeof location === 'string' ? JSON.parse(location) : location;
        if (locationData && locationData.latitude && locationData.longitude) {
          const coordValidation = validateCoordinates(locationData.latitude, locationData.longitude);
          if (coordValidation.isValid) {
            issueLocation = {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              workArea: locationData.workArea || assignment.workArea || 'Unknown',
              timestamp: locationData.timestamp || new Date().toISOString()
            };
          }
        }
      } catch (error) {
        console.warn("⚠️ Error parsing location data:", error);
      }
    }

    // Import TaskIssue model
    const { default: TaskIssue } = await import('./models/TaskIssue.js');

    // Get next ID for TaskIssue
    const nextId = await getNextId(TaskIssue);

    // Generate ticket number
    const ticketNumber = `ISSUE_${Date.now()}_${nextId}`;

    // Create issue record
    const issue = new TaskIssue({
      id: nextId,
      assignmentId: assignmentIdValidation.id,
      employeeId: employee.id,
      projectId: assignment.projectId, // Add projectId from assignment
      issueType: issueType,
      priority: issuePriority,
      description: descriptionValidation.value,
      location: issueLocation,
      ticketNumber: ticketNumber,
      status: 'reported', // Use correct enum value
      reportedAt: new Date()
    });

    await issue.save();

    // Update assignment status if needed (optional)
    if (issuePriority === 'critical' || issuePriority === 'high') {
      assignment.status = 'blocked';
      await assignment.save();
    }

    // Enhanced response format
    return res.json({
      success: true,
      data: {
        issueId: issue.id,
        ticketNumber: ticketNumber,
        status: 'reported',
        reportedAt: issue.reportedAt,
        estimatedResolution: null, // Could be calculated based on issue type and priority
        assignmentStatus: assignment.status
      },
      message: "Issue reported successfully"
    });

  } catch (err) {
    console.error("❌ reportWorkerTaskIssue:", err);
    
    // Determine error type and provide appropriate response
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: "Data validation error",
        error: "VALIDATION_ERROR"
      });
    }
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid data format",
        error: "INVALID_DATA_FORMAT"
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error",
      error: "INTERNAL_SERVER_ERROR"
    });
  }
};
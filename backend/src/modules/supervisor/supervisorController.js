import Attendance from '../attendance/Attendance.js';
import Project from '../project/models/Project.js';
import Employee from '../employee/Employee.js';
import LocationLog from '../attendance/LocationLog.js';
import WorkerTaskAssignment from '../worker/models/WorkerTaskAssignment.js';
import CompanyUser from "../companyUser/CompanyUser.js";
import Task from "../task/Task.js";
import LeaveRequest from '../leaveRequest/models/LeaveRequest.js';
import alertService from './alertService.js';

export const getAssignedWorkers = async (req, res) => {
  try {
    const { projectId, search = '', date } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ message: 'projectId is required' });
    }

    const workDate = date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const project = await Project.findOne({ id: Number(projectId) });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
   
    // 1️⃣ Get assignments for the project & date
    const assignments = await WorkerTaskAssignment.find({
      projectId: Number(projectId),
      date: workDate
    });

    if (assignments.length === 0) {
      return res.status(200).json({ workers: [] });
    }

    const employeeIds = assignments.map(a => a.employeeId);

    // 2️⃣ Fetch employees
    const employees = await Employee.find({
      id: { $in: employeeIds },
      fullName: { $regex: search, $options: 'i' }
    }).lean();

    // 3️⃣ Build response
    const workers = await Promise.all(
      employees.map(async (worker) => {
        // Format the workDate properly for MongoDB query
        const targetDate = new Date(workDate);
        targetDate.setHours(0, 0, 0, 0); // Set to beginning of day
        
        const attendance = await Attendance.findOne({
          employeeId: worker.id,
          projectId: Number(projectId),
          date: {
            $gte: new Date(workDate), // Greater than or equal to start of day
            $lt: new Date(new Date(workDate).setDate(new Date(workDate).getDate() + 1)) // Less than next day
          }
        }).lean();

        let status = '❌ Absent';
        if (attendance) {
          status = attendance.checkOut ? '✅ Present' : '⏳ Pending';
        }

        return {
          employeeId: worker.id,
          workerName: worker.fullName,
          role: worker.role,
          checkIn: attendance?.checkIn || '-',
          checkOut: attendance?.checkOut || '-',
          status
        };
      })
    );

    return res.status(200).json({ workers });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching assigned workers' });
  }
};


/**
 * Export Daily Attendance Report (CSV/PDF)
 * @route GET /api/supervisor/export-report
 */
export const exportReport = async (req, res) => {
  try {
    const { projectId, date } = req.query;
    const project = await Project.findOne({ id: projectId });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Logic to generate the report (CSV or PDF) for workers' attendance on the selected date
    // This part should implement the export functionality (you can use libraries like csv-writer, pdfkit, etc.)

    const workers = await Employee.find({ projectId: projectId });
    const attendanceRecords = await Attendance.find({
      projectId: projectId,
      date: new Date(date).setHours(0, 0, 0, 0)
    });

    // Mock response for demonstration
    return res.status(200).json({
      message: 'Exported report successfully',
      fileUrl: 'http://example.com/reports/attendance_report.csv'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error exporting report' });
  }
};

/**
 * Refresh Workers Attendance (For UI update)
 * @route GET /api/supervisor/refresh-attendance
 */
export const refreshAttendance = async (req, res) => {
  try {
    const { projectId } = req.query;

    const workers = await Employee.find({ projectId });
    const workerData = await Promise.all(workers.map(async (worker) => {
      const attendance = await Attendance.findOne({ employeeId: worker.id, projectId: projectId, date: new Date().setHours(0, 0, 0, 0) });
      const status = attendance
        ? attendance.checkOut ? '✅ Present' : '⏳ Pending'
        : '❌ Absent';

      return {
        workerName: worker.fullName,
        role: worker.role,
        checkIn: attendance ? attendance.checkIn : '-',
        checkOut: attendance ? attendance.checkOut : '-',
        status: status
      };
    }));

    return res.status(200).json({ workers: workerData });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error refreshing attendance' });
  }
};

export const getSupervisorProjects = async (req, res) => {
  try {
    // 1️⃣ Get all projects
    const projects = await Project.find();

    // 2️⃣ Filter projects by checking linked employee and companyUser
    const filteredProjects = [];

    for (const project of projects) {
      // Find employee linked to supervisorId
      const employee = await Employee.findOne({ id: project.supervisorId });
      if (!employee) continue; // skip if no employee

      // Check if the employee's userId is a supervisor in CompanyUser
      const companyUser = await CompanyUser.findOne({ userId: employee.userId, role: "supervisor" });
      if (!companyUser) continue; // skip if not a supervisor

      // Passed all checks, include project
      filteredProjects.push(project);
    }

    // 3️⃣ Return filtered projects
    res.json({
      success: true,
      data: filteredProjects,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: filteredProjects.length,
        itemsPerPage: filteredProjects.length,
      },
    });
  } catch (err) {
    console.error("getSupervisorProjects error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



/**
 * Get checked-in workers for a project
/**
 * Get checked-in workers for a project (ERP-safe)
 * Only workers who are:
 *   - Checked-in today
 *   - Inside geofence at check-in
 *   - Have at most one active task
 */
export const getCheckedInWorkers = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({ message: "projectId is required" });
    }

    // Today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1️⃣ Get all checked-in attendances for today, inside geofence
    const attendances = await Attendance.find({
      projectId,
      date: { $gte: today },
      checkIn: { $ne: null },
      checkOut: null, // still working
      insideGeofenceAtCheckin: true,
    });

    // 2️⃣ Map attendance -> worker info with active task
    const workerData = await Promise.all(
      attendances.map(async (att) => {
        // Fetch employee info (ensure correct id type)
        const employee = await Employee.findOne({ id: att.employeeId }).lean();

        if (!employee) return null; // skip if employee not found

        // Check if worker has an active task today
        const activeTask = await WorkerTaskAssignment.findOne({
          employeeId: employee.id,
          projectId,
          date: today,
          status: "in_progress", // only active task
        });
                console.log("active",activeTask);
        return {
          employee: {
            id: employee.id,
            fullName: employee.fullName,
          },
          taskId: activeTask ? activeTask.taskId : null,
          assignmentId: activeTask ? activeTask.id : null,
        };
      })
    );

    // Filter out nulls (missing employee)
    const filteredWorkers = workerData.filter((w) => w !== null);

    res.json(filteredWorkers);
  } catch (err) {
    console.error("getCheckedInWorkers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



/**
 * Get all tasks for a project
 */
export const getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const tasks = await Task.find({ projectId });
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all tasks assigned to a worker for a specific date
 * @route GET /api/supervisor/worker-tasks
 * @query employeeId, date (YYYY-MM-DD)
 */
export const getWorkerTasks = async (req, res) => {
  try {
    const { employeeId, date } = req.query;

    if (!employeeId || !date) {
      return res.status(400).json({ message: "employeeId and date are required" });
    }

    // Start and end of the selected day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Fetch assignments for the worker for this date
    const assignments = await WorkerTaskAssignment.find({
      employeeId: Number(employeeId),
      date: {
        $gte: dayStart,
        $lt: dayEnd,
      },
    }).sort({ sequence: 1 }); // Order by sequence if available

    // Populate task details
    const tasksWithDetails = await Promise.all(
      assignments.map(async (a) => {
        const task = await Task.findOne({ id: a.taskId }).lean();
        return {
          assignmentId: a.id,
          taskId: a.taskId,
          taskName: task?.taskName || "Unknown Task",
          status: a.status.toLowerCase(), // queued, in_progress, completed
          sequence: a.sequence || null,
          startTime: a.startTime || null,
          endTime: a.endTime || null,
        };
      })
    );

    return res.status(200).json({ success: true, tasks: tasksWithDetails });
  } catch (err) {
    console.error("getWorkerTasks error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


/**
 * Assign task to a worker
 */

export const assignTask = async (req, res) => {
  try {
    const { employeeId, projectId, taskIds, date } = req.body;

    if (!employeeId || !projectId || !Array.isArray(taskIds) || !taskIds.length || !date) {
      return res.status(400).json({ message: "Invalid input data" });
    }

    // 1️⃣ Validate tasks belong to project
    const validTasks = await Task.find({
      id: { $in: taskIds },
      projectId: Number(projectId),
    });

    if (validTasks.length !== taskIds.length) {
      return res.status(400).json({
        message: "One or more tasks do not belong to this project",
      });
    }

    // 2️⃣ Prevent duplicate assignments (same task, same day)
    const existing = await WorkerTaskAssignment.find({
      employeeId: Number(employeeId),
      projectId: Number(projectId),
      taskId: { $in: taskIds },
      date,
    });

    if (existing.length) {
      return res.status(400).json({
        message: "Some tasks are already assigned for this worker on this date",
      });
    }

    // 3️⃣ Find last sequence for the day
    const lastTask = await WorkerTaskAssignment
      .findOne({ employeeId, projectId, date })
      .sort({ sequence: -1 });

    let sequenceStart = lastTask ? lastTask.sequence + 1 : 1;

    // 4️⃣ Generate incremental IDs safely
    const lastId = await WorkerTaskAssignment.findOne().sort({ id: -1 });
    let nextId = lastId ? lastId.id + 1 : 1;

    const assignments = taskIds.map((taskId, index) => ({
      id: nextId++,
      employeeId: Number(employeeId),
      projectId: Number(projectId),
      taskId: Number(taskId),
      date,
      status: "queued",
      sequence: sequenceStart + index,
      createdAt: new Date(),
    }));

    await WorkerTaskAssignment.insertMany(assignments);

    res.json({
      success: true,
      message: "Tasks queued successfully",
      totalQueued: assignments.length,
    });

  } catch (err) {
    console.error("assignTasks error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const startTask = async (req, res) => {
  try {
    const { assignmentId } = req.body;

    // 1️⃣ Get assignment
    const assignment = await WorkerTaskAssignment.findOne({
      id: assignmentId,
      status: "queued",
    });

    if (!assignment) {
      return res.status(404).json({ message: "Queued task not found" });
    }

    // 2️⃣ Check attendance + geofence
    const attendance = await Attendance.findOne({
      employeeId: assignment.employeeId,
      projectId: assignment.projectId,
      checkIn: { $ne: null },
      checkOut: null,
      insideGeofenceAtCheckin: true,
    });

    if (!attendance) {
      return res.status(400).json({
        message: "Worker must be checked-in inside geofence",
      });
    }

    // 3️⃣ Enforce ONE active task
    const activeTask = await WorkerTaskAssignment.findOne({
      employeeId: assignment.employeeId,
      date: assignment.date,
      status: "in_progress",
    });

    if (activeTask) {
      return res.status(400).json({
        message: "Worker already has an active task",
      });
    }

    // 4️⃣ Start task
    assignment.status = "in_progress";
    assignment.startTime = new Date();

    await assignment.save();

    res.json({
      success: true,
      message: "Task started successfully",
      assignmentId: assignment.id,
    });

  } catch (err) {
    console.error("startTask error:", err);
    res.status(500).json({ message: "Server error" });
  }
};





export const completeTask = async (req, res) => {
  try {
    const { assignmentId } = req.body;

    const assignment = await WorkerTaskAssignment.findOne({
      id: assignmentId,
      status: "IN_PROGRESS"
    });

    if (!assignment) {
      return res.status(404).json({ message: "Active task not found" });
    }

    assignment.status = "COMPLETED";
    assignment.endTime = new Date();
    assignment.completedAt = new Date();

    await assignment.save();

    return res.json({
      success: true,
      message: "Task completed"
    });

  } catch (err) {
    console.error("completeTask error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const getWorkerTasksForDay = async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    const { date } = req.query;

    const tasks = await WorkerTaskAssignment.find({
      employeeId,
      date,
    }).sort({ sequence: 1 });

    res.json({
      success: true,
      tasks,
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const removeQueuedTask = async (req, res) => {
  try {
    const { assignmentId } = req.body;

    if (!assignmentId) {
      return res.status(400).json({ message: "assignmentId is required" });
    }

    // 1️⃣ Fetch assignment
    const assignment = await WorkerTaskAssignment.findOne({
      id: Number(assignmentId),
    });

    if (!assignment) {
      return res.status(404).json({ message: "Task assignment not found" });
    }

    // 2️⃣ Only queued tasks can be removed
    if (assignment.status !== "queued") {
      return res.status(400).json({
        message: "Only queued tasks can be removed",
      });
    }

    const { employeeId, projectId, date, sequence } = assignment;

    // 3️⃣ Remove task
    await WorkerTaskAssignment.deleteOne({ id: assignment.id });

    // 4️⃣ Re-sequence remaining queued tasks
    const queuedTasks = await WorkerTaskAssignment.find({
      employeeId,
      projectId,
      date,
      status: "queued",
    }).sort({ sequence: 1 });

    for (let i = 0; i < queuedTasks.length; i++) {
      queuedTasks[i].sequence = i + 1;
      await queuedTasks[i].save();
    }

    res.json({
      success: true,
      message: "Queued task removed successfully",
    });

  } catch (err) {
    console.error("removeQueuedTask error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const getActiveTasks = async (req, res) => {
  try {
    const { projectId } = req.params;

    const activeAssignments = await WorkerTaskAssignment.find({
      projectId: Number(projectId),
      status: "in_progress"
    }).select("taskId");

    const activeTaskIds = activeAssignments.map(a => a.taskId);

    res.json(activeTaskIds);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get workforce count for a supervisor
 * @route GET /api/supervisor/:id/workforce-count
 */
export const getWorkforceCount = async (req, res) => {
  try {
    const { id: supervisorId } = req.params;
    const { date } = req.query;

    // Use provided date or default to today
    const targetDate = date ? new Date(date) : new Date();
    const dateString = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Set up date range for queries (start and end of day)
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Get all projects assigned to this supervisor
    const supervisorProjects = await Project.find({ supervisorId: Number(supervisorId) });
    const projectIds = supervisorProjects.map(p => p.id);

    if (projectIds.length === 0) {
      return res.json({
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        onLeave: 0,
        overtime: 0,
        lastUpdated: new Date()
      });
    }

    // Get all worker assignments for supervisor's projects on the target date
    const assignments = await WorkerTaskAssignment.find({
      projectId: { $in: projectIds },
      date: dateString
    });

    const assignedEmployeeIds = assignments.map(a => a.employeeId);

    if (assignedEmployeeIds.length === 0) {
      return res.json({
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        onLeave: 0,
        overtime: 0,
        lastUpdated: new Date()
      });
    }

    // Get attendance records for assigned workers on target date
    const attendanceRecords = await Attendance.find({
      employeeId: { $in: assignedEmployeeIds },
      projectId: { $in: projectIds },
      date: {
        $gte: dayStart,
        $lte: dayEnd
      }
    });

    // Get approved leave requests for the target date
    const leaveRequests = await LeaveRequest.find({
      employeeId: { $in: assignedEmployeeIds },
      status: 'APPROVED',
      fromDate: { $lte: dayEnd },
      toDate: { $gte: dayStart }
    });

    const onLeaveEmployeeIds = leaveRequests.map(lr => lr.employeeId);

    // Initialize counters
    let present = 0;
    let absent = 0;
    let late = 0;
    let onLeave = 0;
    let overtime = 0;

    // Standard work hours (8 AM to 6 PM = 10 hours)
    const standardWorkHours = 10 * 60 * 60 * 1000; // 10 hours in milliseconds
    const lateThreshold = 8 * 60 + 30; // 8:30 AM in minutes from midnight

    // Process each assigned employee
    for (const employeeId of assignedEmployeeIds) {
      // Check if employee is on approved leave
      if (onLeaveEmployeeIds.includes(employeeId)) {
        onLeave++;
        continue;
      }

      // Find attendance record for this employee
      const attendance = attendanceRecords.find(a => a.employeeId === employeeId);

      if (!attendance || !attendance.checkIn) {
        // No check-in record = absent
        absent++;
      } else {
        // Employee has checked in
        const checkInTime = new Date(attendance.checkIn);
        const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();

        // Check if late (after 8:30 AM)
        if (checkInMinutes > lateThreshold) {
          late++;
        } else {
          present++;
        }

        // Check for overtime (if still working after standard hours)
        if (attendance.checkIn && !attendance.checkOut) {
          const now = new Date();
          const workDuration = now - checkInTime;
          
          if (workDuration > standardWorkHours) {
            overtime++;
          }
        } else if (attendance.checkIn && attendance.checkOut) {
          const checkOutTime = new Date(attendance.checkOut);
          const workDuration = checkOutTime - checkInTime;
          
          if (workDuration > standardWorkHours) {
            overtime++;
          }
        }
      }
    }

    const total = assignedEmployeeIds.length;

    const workforceCount = {
      total,
      present,
      absent,
      late,
      onLeave,
      overtime,
      lastUpdated: new Date()
    };

    res.json(workforceCount);

  } catch (err) {
    console.error('getWorkforceCount error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get attendance summary for supervisor
 * @route GET /api/supervisor/:id/attendance
 */
export const getAttendanceSummary = async (req, res) => {
  try {
    const { id: supervisorId } = req.params;
    const { date } = req.query;

    // Use provided date or default to today
    const targetDate = date ? new Date(date) : new Date();
    const dateString = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Set up date range for queries (start and end of day)
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Get all projects assigned to this supervisor
    const supervisorProjects = await Project.find({ supervisorId: Number(supervisorId) });
    const projectIds = supervisorProjects.map(p => p.id);

    if (projectIds.length === 0) {
      return res.json({
        workers: [],
        summary: {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          onLeave: 0,
          overtime: 0,
          geofenceViolations: 0,
          missingLogouts: 0
        },
        lastUpdated: new Date()
      });
    }

    // Get all worker assignments for supervisor's projects on the target date
    const assignments = await WorkerTaskAssignment.find({
      projectId: { $in: projectIds },
      date: dateString
    });

    const assignedEmployeeIds = assignments.map(a => a.employeeId);

    if (assignedEmployeeIds.length === 0) {
      return res.json({
        workers: [],
        summary: {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          onLeave: 0,
          overtime: 0,
          geofenceViolations: 0,
          missingLogouts: 0
        },
        lastUpdated: new Date()
      });
    }

    // Get employee details
    const employees = await Employee.find({
      id: { $in: assignedEmployeeIds }
    }).lean();

    // Get attendance records for assigned workers on target date
    const attendanceRecords = await Attendance.find({
      employeeId: { $in: assignedEmployeeIds },
      projectId: { $in: projectIds },
      date: {
        $gte: dayStart,
        $lte: dayEnd
      }
    });

    // Get approved leave requests for the target date
    const leaveRequests = await LeaveRequest.find({
      employeeId: { $in: assignedEmployeeIds },
      status: 'APPROVED',
      fromDate: { $lte: dayEnd },
      toDate: { $gte: dayStart }
    });

    const onLeaveEmployeeIds = leaveRequests.map(lr => lr.employeeId);

    // Standard work hours and thresholds
    const standardWorkHours = 10 * 60 * 60 * 1000; // 10 hours in milliseconds
    const lateThreshold = 8 * 60 + 30; // 8:30 AM in minutes from midnight
    const standardEndTime = 18 * 60; // 6:00 PM in minutes from midnight
    const now = new Date();

    // Initialize summary counters
    let summary = {
      total: assignedEmployeeIds.length,
      present: 0,
      absent: 0,
      late: 0,
      onLeave: 0,
      overtime: 0,
      geofenceViolations: 0,
      missingLogouts: 0
    };

    // Process each assigned employee
    const workers = await Promise.all(
      employees.map(async (employee) => {
        const employeeId = employee.id;
        
        // Check if employee is on approved leave
        if (onLeaveEmployeeIds.includes(employeeId)) {
          summary.onLeave++;
          return {
            workerId: employeeId,
            workerName: employee.fullName,
            checkInTime: null,
            checkOutTime: null,
            locationStatus: 'on_leave',
            currentActivity: 'On Leave',
            isLate: false,
            isOvertime: false,
            overtimeDuration: 0,
            hasGeofenceViolation: false,
            hasMissingLogout: false,
            status: 'on_leave'
          };
        }

        // Find attendance record for this employee
        const attendance = attendanceRecords.find(a => a.employeeId === employeeId);
        
        // Find project assignment to get project details for geofence validation
        const assignment = assignments.find(a => a.employeeId === employeeId);
        const project = assignment ? supervisorProjects.find(p => p.id === assignment.projectId) : null;

        let workerData = {
          workerId: employeeId,
          workerName: employee.fullName,
          checkInTime: null,
          checkOutTime: null,
          locationStatus: 'unknown',
          currentActivity: 'Not Started',
          isLate: false,
          isOvertime: false,
          overtimeDuration: 0,
          hasGeofenceViolation: false,
          hasMissingLogout: false,
          status: 'absent'
        };

        if (!attendance || !attendance.checkIn) {
          // No check-in record = absent
          summary.absent++;
          workerData.status = 'absent';
          workerData.currentActivity = 'Absent';
        } else {
          // Employee has checked in
          const checkInTime = new Date(attendance.checkIn);
          const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
          
          workerData.checkInTime = attendance.checkIn;
          workerData.checkOutTime = attendance.checkOut;

          // Determine location status based on geofence validation
          if (attendance.insideGeofenceAtCheckin === false) {
            workerData.locationStatus = 'outside';
            workerData.hasGeofenceViolation = true;
            summary.geofenceViolations++;
          } else if (attendance.insideGeofenceAtCheckin === true) {
            workerData.locationStatus = 'inside';
          } else {
            workerData.locationStatus = 'unknown';
          }

          // Check if late (after 8:30 AM)
          if (checkInMinutes > lateThreshold) {
            workerData.isLate = true;
            workerData.status = 'late';
            summary.late++;
          } else {
            workerData.status = 'present';
            summary.present++;
          }

          // Check for missing logout after standard work hours
          if (!attendance.checkOut) {
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            
            // If it's past 6 PM and worker hasn't checked out
            if (currentMinutes > standardEndTime && 
                now.toDateString() === targetDate.toDateString()) {
              workerData.hasMissingLogout = true;
              summary.missingLogouts++;
            }
            
            workerData.currentActivity = 'Working';
            
            // Check for overtime (if still working after standard hours)
            const workDuration = now - checkInTime;
            if (workDuration > standardWorkHours) {
              workerData.isOvertime = true;
              workerData.overtimeDuration = Math.round((workDuration - standardWorkHours) / (60 * 60 * 1000) * 10) / 10; // Hours with 1 decimal
              summary.overtime++;
            }
          } else {
            // Worker has checked out
            const checkOutTime = new Date(attendance.checkOut);
            const workDuration = checkOutTime - checkInTime;
            
            workerData.currentActivity = 'Completed';
            
            // Check for overtime in completed work
            if (workDuration > standardWorkHours) {
              workerData.isOvertime = true;
              workerData.overtimeDuration = Math.round((workDuration - standardWorkHours) / (60 * 60 * 1000) * 10) / 10; // Hours with 1 decimal
              summary.overtime++;
            }
          }
        }

        return workerData;
      })
    );

    // Sort workers by status priority (absent, late, present, on_leave) and then by name
    const statusPriority = { 'absent': 1, 'late': 2, 'present': 3, 'on_leave': 4 };
    workers.sort((a, b) => {
      const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
      if (priorityDiff !== 0) return priorityDiff;
      return a.workerName.localeCompare(b.workerName);
    });

    const response = {
      workers,
      summary,
      lastUpdated: new Date()
    };

    res.json(response);

  } catch (err) {
    console.error('getAttendanceSummary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get pending approvals for supervisor
 * @route GET /api/supervisor/:id/approvals
 */
export const getPendingApprovals = async (req, res) => {
  try {
    const { id: supervisorId } = req.params;
    const { type, priority } = req.query;

    // Get all projects assigned to this supervisor
    const supervisorProjects = await Project.find({ supervisorId: Number(supervisorId) });
    const projectIds = supervisorProjects.map(p => p.id);

    if (projectIds.length === 0) {
      return res.json({
        approvals: [],
        summary: {
          total: 0,
          leave: 0,
          advance_payment: 0,
          material_request: 0,
          attendance_correction: 0
        },
        lastUpdated: new Date()
      });
    }

    // Get all worker assignments for supervisor's projects to identify supervised employees
    const assignments = await WorkerTaskAssignment.find({
      projectId: { $in: projectIds }
    }).distinct('employeeId');

    const supervisedEmployeeIds = assignments;

    if (supervisedEmployeeIds.length === 0) {
      return res.json({
        approvals: [],
        summary: {
          total: 0,
          leave: 0,
          advance_payment: 0,
          material_request: 0,
          attendance_correction: 0
        },
        lastUpdated: new Date()
      });
    }

    // Get employee details for name mapping
    const employees = await Employee.find({
      id: { $in: supervisedEmployeeIds }
    }).lean();

    const employeeMap = {};
    employees.forEach(emp => {
      employeeMap[emp.id] = emp.fullName;
    });

    // Initialize approvals array
    let approvals = [];

    // 1. Get pending leave requests
    let leaveQuery = {
      employeeId: { $in: supervisedEmployeeIds },
      status: 'PENDING'
    };

    const leaveRequests = await LeaveRequest.find(leaveQuery).sort({ requestedAt: -1 });

    // Add leave requests to approvals
    leaveRequests.forEach(leave => {
      const priority = calculateLeavePriority(leave);
      approvals.push({
        approvalId: `leave_${leave.id}`,
        type: 'leave',
        requesterId: leave.employeeId,
        requesterName: employeeMap[leave.employeeId] || 'Unknown Employee',
        submittedDate: leave.requestedAt,
        priority: priority,
        details: {
          leaveType: leave.leaveType,
          fromDate: leave.fromDate,
          toDate: leave.toDate,
          totalDays: leave.totalDays,
          reason: leave.reason
        },
        originalId: leave.id
      });
    });

    // 2. Mock other approval types (since they don't exist in current system)
    // In a real implementation, these would come from actual collections

    // Filter by type if specified
    if (type) {
      approvals = approvals.filter(approval => approval.type === type);
    }

    // Filter by priority if specified
    if (priority) {
      approvals = approvals.filter(approval => approval.priority === priority);
    }

    // Sort by priority (high -> medium -> low) and then by submission date (newest first)
    const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
    approvals.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.submittedDate) - new Date(a.submittedDate);
    });

    // Calculate summary
    const summary = {
      total: approvals.length,
      leave: approvals.filter(a => a.type === 'leave').length,
      advance_payment: approvals.filter(a => a.type === 'advance_payment').length,
      material_request: approvals.filter(a => a.type === 'material_request').length,
      attendance_correction: approvals.filter(a => a.type === 'attendance_correction').length
    };

    const response = {
      approvals,
      summary,
      lastUpdated: new Date()
    };

    res.json(response);

  } catch (err) {
    console.error('getPendingApprovals error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Helper function to calculate leave request priority
 */
function calculateLeavePriority(leaveRequest) {
  const now = new Date();
  const fromDate = new Date(leaveRequest.fromDate);
  const daysUntilLeave = Math.ceil((fromDate - now) / (1000 * 60 * 60 * 24));

  // Emergency leave or medical leave gets high priority
  if (leaveRequest.leaveType === 'EMERGENCY' || leaveRequest.leaveType === 'MEDICAL') {
    return 'high';
  }

  // Leave starting within 3 days gets high priority
  if (daysUntilLeave <= 3) {
    return 'high';
  }

  // Leave starting within 7 days gets medium priority
  if (daysUntilLeave <= 7) {
    return 'medium';
  }

  // All other leave requests get low priority
  return 'low';
}

/**
 * Process approval decision (approve/reject)
 * @route POST /api/supervisor/approval/:id/process
 */
export const processApproval = async (req, res) => {
  try {
    const { id: approvalId } = req.params;
    const { decision, remarks } = req.body;
    const supervisorId = req.user.id; // From auth middleware

    // Validate input
    if (!decision || !['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ 
        message: 'Invalid decision. Must be "approve" or "reject"' 
      });
    }

    if (!remarks || remarks.trim().length === 0) {
      return res.status(400).json({ 
        message: 'Remarks are mandatory for approval decisions' 
      });
    }

    // Parse approval ID to determine type and original ID
    const [approvalType, originalId] = approvalId.split('_');

    if (!approvalType || !originalId) {
      return res.status(400).json({ 
        message: 'Invalid approval ID format' 
      });
    }

    let processedApproval = null;

    // Process based on approval type
    switch (approvalType) {
      case 'leave':
        processedApproval = await processLeaveApproval(originalId, decision, remarks, supervisorId);
        break;
      
      case 'advance_payment':
        // Mock implementation - in real system would process advance payment
        processedApproval = await processMockApproval('advance_payment', originalId, decision, remarks, supervisorId);
        break;
      
      case 'material_request':
        // Mock implementation - in real system would process material request
        processedApproval = await processMockApproval('material_request', originalId, decision, remarks, supervisorId);
        break;
      
      case 'attendance_correction':
        // Mock implementation - in real system would process attendance correction
        processedApproval = await processMockApproval('attendance_correction', originalId, decision, remarks, supervisorId);
        break;
      
      default:
        return res.status(400).json({ 
          message: 'Unsupported approval type' 
        });
    }

    // Log audit entry
    await logApprovalAudit({
      supervisorId,
      approvalId,
      approvalType,
      originalId,
      decision,
      remarks: remarks.substring(0, 500), // Limit remarks length for storage
      processedAt: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    const response = {
      success: true,
      message: `${approvalType.replace('_', ' ')} ${decision}d successfully`,
      approvalId,
      decision,
      processedAt: new Date(),
      details: processedApproval
    };

    res.json(response);

  } catch (err) {
    console.error('processApproval error:', err);
    
    // Handle specific error types
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    
    if (err.message.includes('already processed')) {
      return res.status(400).json({ message: err.message });
    }

    res.status(500).json({ message: 'Server error processing approval' });
  }
};

/**
 * Process leave approval
 */
async function processLeaveApproval(leaveRequestId, decision, remarks, supervisorId) {
  const leaveRequest = await LeaveRequest.findOne({ id: Number(leaveRequestId) });
  
  if (!leaveRequest) {
    throw new Error('Leave request not found');
  }

  if (leaveRequest.status !== 'PENDING') {
    throw new Error('Leave request already processed');
  }

  // Update leave request status
  const newStatus = decision === 'approve' ? 'APPROVED' : 'REJECTED';
  await LeaveRequest.findOneAndUpdate(
    { id: Number(leaveRequestId) },
    { 
      status: newStatus, 
      currentApproverId: supervisorId 
    }
  );

  // Update leave approval record
  await LeaveApproval.findOneAndUpdate(
    { leaveRequestId: Number(leaveRequestId) },
    { 
      action: newStatus,
      remarks,
      approverId: supervisorId,
      actionAt: new Date()
    }
  );

  // Create notification for employee (mock implementation)
  // In real system, this would integrate with notification system
  console.log(`Notification: Leave request ${decision}d for employee ${leaveRequest.employeeId}`);

  return {
    leaveRequestId: leaveRequest.id,
    employeeId: leaveRequest.employeeId,
    leaveType: leaveRequest.leaveType,
    fromDate: leaveRequest.fromDate,
    toDate: leaveRequest.toDate,
    newStatus
  };
}

/**
 * Mock approval processing for non-implemented approval types
 */
async function processMockApproval(approvalType, originalId, decision, remarks, supervisorId) {
  // In a real implementation, this would process actual approval records
  console.log(`Mock processing: ${approvalType} ${originalId} ${decision}d by supervisor ${supervisorId}`);
  
  return {
    approvalType,
    originalId,
    decision,
    processedBy: supervisorId,
    processedAt: new Date()
  };
}

/**
 * Log approval audit entry
 */
async function logApprovalAudit(auditData) {
  try {
    // In a real implementation, this would save to an audit log collection
    // For now, we'll log to console and could extend to save to database
    
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'APPROVAL_DECISION',
      supervisorId: auditData.supervisorId,
      approvalId: auditData.approvalId,
      approvalType: auditData.approvalType,
      originalId: auditData.originalId,
      decision: auditData.decision.toUpperCase(),
      remarks: auditData.remarks,
      processedAt: auditData.processedAt,
      ipAddress: auditData.ipAddress,
      userAgent: auditData.userAgent
    };

    // Log to console (in production, this would go to a proper audit system)
    console.log('AUDIT LOG:', JSON.stringify(auditEntry, null, 2));

    // TODO: Save to audit collection
    // await AuditLog.create(auditEntry);

  } catch (err) {
    console.error('Failed to log audit entry:', err);
    // Don't throw error here as audit logging failure shouldn't break the main flow
  }
}

/**
 * Get alerts for supervisor
 * @route GET /api/supervisor/:id/alerts
 */
export const getAlerts = async (req, res) => {
  try {
    const { id: supervisorId } = req.params;
    const { type, priority, isRead, limit = 50 } = req.query;

    // Build filters
    const filters = {};
    if (type) filters.type = type;
    if (priority) filters.priority = priority;
    if (isRead !== undefined) filters.isRead = isRead === 'true';

    // Get alerts from service
    const alerts = await alertService.getAlertsForSupervisor(
      Number(supervisorId), 
      filters
    );

    // Apply limit
    const limitedAlerts = alerts.slice(0, Number(limit));

    // Calculate summary statistics
    const summary = {
      total: alerts.length,
      unread: alerts.filter(a => !a.isRead).length,
      critical: alerts.filter(a => a.priority === 'critical').length,
      warning: alerts.filter(a => a.priority === 'warning').length,
      info: alerts.filter(a => a.priority === 'info').length,
      byType: {
        geofence_violation: alerts.filter(a => a.type === 'geofence_violation').length,
        worker_absence: alerts.filter(a => a.type === 'worker_absence').length,
        attendance_anomaly: alerts.filter(a => a.type === 'attendance_anomaly').length,
        safety_alert: alerts.filter(a => a.type === 'safety_alert').length
      }
    };

    const response = {
      alerts: limitedAlerts,
      summary,
      pagination: {
        total: alerts.length,
        limit: Number(limit),
        hasMore: alerts.length > Number(limit)
      },
      lastUpdated: new Date()
    };

    res.json(response);

  } catch (err) {
    console.error('getAlerts error:', err);
    res.status(500).json({ message: 'Server error retrieving alerts' });
  }
};

/**
 * Acknowledge alert
 * @route POST /api/supervisor/alert/:id/acknowledge
 */
export const acknowledgeAlert = async (req, res) => {
  try {
    const { id: alertId } = req.params;
    const supervisorId = req.user.id || req.user.employeeId; // From auth middleware
    const { notes } = req.body;

    console.log('acknowledgeAlert called with:', { alertId, supervisorId, notes });

    if (!alertId) {
      return res.status(400).json({ message: 'Alert ID is required' });
    }

    // Convert to number and validate
    const numericAlertId = Number(alertId);
    
    if (isNaN(numericAlertId)) {
      console.log('Invalid alert ID format:', alertId);
      return res.status(400).json({ message: 'Invalid alert ID format' });
    }

    console.log('Processing alert ID:', numericAlertId);

    // Acknowledge alert through service
    const acknowledgedAlert = await alertService.acknowledgeAlert(
      numericAlertId, 
      Number(supervisorId)
    );

    // Log additional notes if provided
    if (notes && notes.trim().length > 0) {
      await alertService.logAlertAction(
        Number(alertId), 
        Number(supervisorId), 
        'acknowledged_with_notes', 
        { notes: notes.trim() }
      );
    }

    const response = {
      success: true,
      message: 'Alert acknowledged successfully',
      alert: acknowledgedAlert,
      acknowledgedAt: new Date()
    };

    res.json(response);

  } catch (err) {
    console.error('acknowledgeAlert error:', err);
    
    // Handle specific error types
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    
    if (err.message.includes('Access denied')) {
      return res.status(403).json({ message: err.message });
    }
    
    if (err.message.includes('already acknowledged')) {
      return res.status(400).json({ message: err.message });
    }

    res.status(500).json({ message: 'Server error acknowledging alert' });
  }
};

/**
 * Get escalation statistics for supervisor (optional endpoint for monitoring)
 * @route GET /api/supervisor/:id/escalation-stats
 */
export const getEscalationStats = async (req, res) => {
  try {
    const { id: supervisorId } = req.params;

    const stats = await alertService.getEscalationStats(Number(supervisorId));

    const response = {
      supervisorId: Number(supervisorId),
      escalationStats: stats,
      generatedAt: new Date()
    };

    res.json(response);

  } catch (err) {
    console.error('getEscalationStats error:', err);
    res.status(500).json({ message: 'Server error retrieving escalation statistics' });
  }
};


import Project from "../../project/models/Project.js";
import WorkerTaskAssignment from "../../worker/models/WorkerTaskAssignment.js";
import WorkerTaskProgress from "../../worker/models/WorkerTaskProgress.js";
import WorkerTaskPhoto from "../../worker/models/WorkerTaskPhoto.js";
import Employee from "../../employee/Employee.js";
import Task from "../../task/Task.js";
import Attendance from "../../attendance/Attendance.js";
import CompanyUser from "../../companyUser/CompanyUser.js";

/* ----------------------------------------
   GET Supervisor Projects (Review)
---------------------------------------- */



/* ----------------------------------------
   GET Today Worker Submissions
---------------------------------------- */
export const getTodayWorkerSubmissions = async (req, res) => {
  try {
    const { projectId } = req.params;

    const todayStr = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
    const assignments = await WorkerTaskAssignment.find({
      projectId,
      date: todayStr
    });

    if (!assignments.length) return res.json([]);

    const assignmentIds = assignments.map(a => a.id);

    const progresses = await WorkerTaskProgress.find({
      workerTaskAssignmentId: { $in: assignmentIds },
status: { $in: ["SUBMITTED", "APPROVED"] }
    });

    const response = [];

  const today = new Date();
const startOfDayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0,0,0));
const endOfDayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23,59,59));

    for (const progress of progresses) {
      const assignment = assignments.find(a =>
        a.id === progress.workerTaskAssignmentId
      );
      if (!assignment) continue;

      const worker = await Employee.findOne({ id: assignment.employeeId });
      const task = await Task.findOne({ id: assignment.taskId });

     const attendance = await Attendance.findOne({
  employeeId: Number(assignment.employeeId),
  projectId: Number(projectId),
  //date: { $gte: startOfDayUTC, $lte: endOfDayUTC },
  checkIn: { $ne: null }
});

      const photos = await WorkerTaskPhoto.find({
        workerTaskAssignmentId: assignment.id
      });

      response.push({
        progressId: progress.id,
        assignmentId: assignment.id,
        workerName: worker ? worker.fullName : "Unknown Worker",
        taskName: task ? task.taskName : "Unknown Task",
        attendanceChecked: !!attendance,
        progressPercent: progress.progressPercent,
        description: progress.description,
        status: progress.status,
        photos: photos.map(p => ({ photoUrl: p.photoUrl }))
      });
    }

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};



/* ----------------------------------------
   PATCH Review Worker Progress
---------------------------------------- */
export const reviewWorkerProgress = async (req, res) => {
  try {
    const { progressId } = req.params; // progressId = numeric string
    const { status, approvedPercent, remarks } = req.body;

    const progress = await WorkerTaskProgress.findOne({ id: Number(progressId) });
    if (!progress) return res.status(404).json({ message: "Progress not found" });

    if (status === "REJECTED" && !remarks) {
      return res.status(400).json({ message: "Remarks required" });
    }

    if (status === "APPROVED" && approvedPercent > progress.progressPercent) {
      return res.status(400).json({ message: "Invalid approved %" });
    }

    progress.status = status;
    progress.approvedPercent = status === "APPROVED" ? approvedPercent : 0;
    progress.remarks = remarks;
    progress.reviewedBy = req.user?.employeeId || null; // supervisor id optional
    progress.reviewedAt = new Date();

    await progress.save();

    res.json({ message: `Progress ${status.toLowerCase()} successfully` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


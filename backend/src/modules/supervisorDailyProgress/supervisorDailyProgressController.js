import WorkerTaskProgress from "../worker/models/WorkerTaskProgress.js";
import ProjectDailyProgress from "../project/models/ProjectDailyProgress.js";
import ProjectDailyProgressPhoto from "../project/models/ProjectDailyProgressPhoto.js";
import Project from "../project/models/Project.js";
import WorkerTaskAssignment from "../worker/models/WorkerTaskAssignment.js";

/* ----------------------------------------------------
   POST: Submit Daily Progress (SUPERVISOR)
---------------------------------------------------- */
export const submitDailyProgress = async (req, res) => {
    try {
        const { projectId, remarks = "", issues = "" } = req.body;

        if (!projectId) {
            return res.status(400).json({ message: "projectId is required" });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const todayStr = new Date().toISOString().split("T")[0];

        const assignments = await WorkerTaskAssignment.find({
            projectId: Number(projectId),
            date: todayStr
        });



        if (!assignments.length) {
            return res.status(400).json({
                message: "No worker assignments today"
            });
        }

        const assignmentIds = assignments.map(a => a.id);

        // 2️⃣ Get APPROVED progress via assignmentId
        const approvedProgress = await WorkerTaskProgress.find({
            workerTaskAssignmentId: { $in: assignmentIds },
            status: "APPROVED",
            submittedAt: { $gte: startOfDay, $lte: endOfDay }
        });

        if (!approvedProgress.length) {
            return res.status(400).json({
                message: "No approved worker progress found"
            });
        }

        // 3️⃣ Calculate progress
        const total = approvedProgress.reduce(
            (sum, p) => sum + p.progressPercent,
            0
        );

        const overallProgress = Math.round(total / approvedProgress.length);


        const lastProgress = await ProjectDailyProgress.findOne().sort({ id: -1 });
        const nextId = lastProgress && typeof lastProgress.id === "number" ? lastProgress.id + 1 : 1;

        // Get supervisorId from Project
        const project = await Project.findOne({ id: Number(projectId) });
        if (!project || !project.supervisorId) {
            return res.status(400).json({
                message: "Project not found or supervisor not assigned"
            });
        }
        const supervisorId = project.supervisorId;

        const dailyProgress = await ProjectDailyProgress.create({
            id: nextId,
            projectId: Number(projectId),
            supervisorId,             // <-- added supervisorId
            date: today,
            overallProgress,
            remarks,
            issues,
            submittedAt: new Date()
        });

        return res.status(201).json({
            message: "Daily progress submitted successfully",
            dailyProgress
        });


    } catch (err) {
        console.error("submitDailyProgress error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ----------------------------------------------------
   POST: Upload Daily Progress Photos
---------------------------------------------------- */


export const uploadDailyProgressPhotos = async (req, res) => {
  try {
    const { projectId, dailyProgressId, remarks = "", issues = "" } = req.body;

    const numericProjectId = Number(projectId);
    if (!numericProjectId || isNaN(numericProjectId)) {
      return res.status(400).json({ message: "projectId must be a valid number" });
    }

    if (!req.files?.length) {
      return res.status(400).json({ message: "No photos uploaded" });
    }

    // Get supervisorId from Project
    const project = await Project.findOne({ id: numericProjectId });
    if (!project || !project.supervisorId) {
      return res.status(400).json({ message: "Project not found or supervisor not assigned" });
    }
    const supervisorId = project.supervisorId;

    let numericDailyProgressId = Number(dailyProgressId);
    let dailyProgressRecord;

    // If dailyProgressId is invalid or missing, create a new daily progress record
    if (!numericDailyProgressId || isNaN(numericDailyProgressId)) {
      // Calculate overall progress from approved worker tasks today
      const todayStr = new Date().toISOString().split("T")[0];
      const assignments = await WorkerTaskAssignment.find({
        projectId: numericProjectId,
        date: todayStr
      });

      if (!assignments.length) {
        return res.status(400).json({ message: "No worker assignments today" });
      }

      const assignmentIds = assignments.map(a => a.id);

      const approvedProgress = await WorkerTaskProgress.find({
        workerTaskAssignmentId: { $in: assignmentIds },
        status: "APPROVED"
      });

      const overallProgress =
        approvedProgress.length > 0
          ? Math.round(approvedProgress.reduce((sum, p) => sum + p.progressPercent, 0) / approvedProgress.length)
          : 0;

      // Generate numeric id safely
      const lastProgress = await ProjectDailyProgress.findOne().sort({ id: -1 });
      numericDailyProgressId = lastProgress && typeof lastProgress.id === "number" ? lastProgress.id + 1 : 1;

      dailyProgressRecord = await ProjectDailyProgress.create({
        id: numericDailyProgressId,
        projectId: numericProjectId,
        supervisorId,
        date: new Date(),
        overallProgress,
        remarks,
        issues,
        submittedAt: new Date()
      });
    } else {
      // Fetch existing daily progress
      dailyProgressRecord = await ProjectDailyProgress.findOne({ id: numericDailyProgressId });
      if (!dailyProgressRecord) {
        return res.status(404).json({ message: "Daily progress not found" });
      }
    }

    // Generate numeric id for photos
    const lastPhoto = await ProjectDailyProgressPhoto.findOne().sort({ id: -1 });
    let nextId = lastPhoto && typeof lastPhoto.id === "number" ? lastPhoto.id + 1 : 1;

    const photos = req.files.map(file => ({
      id: nextId++,
      dailyProgressId: numericDailyProgressId,
      projectId: numericProjectId,
      supervisorId,
      photoUrl: `/uploads/${file.filename}`,
      uploadedAt: new Date()
    }));

    const insertedPhotos = await ProjectDailyProgressPhoto.insertMany(photos);

    return res.json({
      message: "Daily progress and photos uploaded successfully",
      dailyProgress: dailyProgressRecord,
      count: insertedPhotos.length,
      photos: insertedPhotos
    });
  } catch (err) {
    console.error("uploadDailyProgressPhotos error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



/* ----------------------------------------------------
   GET: Daily Progress (Single Day)
---------------------------------------------------- */
export const getDailyProgressByDate = async (req, res) => {
    try {
        const { projectId, date } = req.params;

        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        const progress = await ProjectDailyProgress.findOne({
            projectId: Number(projectId),
            date: targetDate
        });

        if (!progress) {
            return res.status(404).json({
                message: "Daily progress not found"
            });
        }

        const photos = await ProjectDailyProgressPhoto.find({
            dailyProgressId: progress.id
        });

        return res.json({
            projectId,
            date: targetDate,
            overallProgress: progress.overallProgress,
            remarks: progress.remarks,
            issues: progress.issues,
            photos: photos.map(p => p.photoUrl),
            submittedAt: progress.submittedAt
        });
    } catch (err) {
        console.error("getDailyProgressByDate error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

/* ----------------------------------------------------
   GET: Daily Progress (DATE RANGE)
---------------------------------------------------- */
export const getDailyProgressRange = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { from, to } = req.query;

        if (!from || !to) {
            return res.status(400).json({
                message: "from and to dates are required"
            });
        }

        const fromDate = new Date(from);
        const toDate = new Date(to);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);

        const progressList = await ProjectDailyProgress.find({
            projectId: Number(projectId),
            date: { $gte: fromDate, $lte: toDate }
        }).sort({ date: 1 });

        return res.json({
            projectId,
            count: progressList.length,
            data: progressList
        });
    } catch (err) {
        console.error("getDailyProgressRange error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

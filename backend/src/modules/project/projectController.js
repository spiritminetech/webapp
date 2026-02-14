import Project from './models/Project.js';
import WorkerTaskAssignment from "../worker/models/WorkerTaskAssignment.js";
// ✅ Get all projects (with pagination + filters)
export const getAllProjects = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, companyId } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (companyId) filter.companyId = parseInt(companyId);

    const projects = await Project.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Project.countDocuments(filter);

    res.json({
      success: true,
      data: projects,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching projects',
      error: error.message,
    });
  }
};

// ✅ Get projects by company ID
export const getProjectsByCompany = async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    if (isNaN(companyId)) {
      return res.status(400).json({ success: false, message: 'Invalid company ID format' });
    }

    const { page = 1, limit = 10, status } = req.query;

    const filter = { companyId };
    if (status) filter.status = status;

    const projects = await Project.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Project.countDocuments(filter);

    res.json({
      success: true,
      data: projects,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching projects by company:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching company projects',
      error: error.message,
    });
  }
};

// ✅ Get single project by numeric ID
export const getProjectById = async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ success: false, message: 'Invalid project ID format' });
    }

    const project = await Project.findOne({ id: projectId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({ success: true, data: project });
  } catch (error) {
    console.error('❌ Error fetching project:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching project',
      error: error.message,
    });
  }
};

// ✅ Create new project
export const createProject = async (req, res) => {
  try {
    const lastProject = await Project.findOne().sort({ id: -1 });
    const newId = lastProject ? lastProject.id + 1 : 1;

    const projectData = {
      id: newId,
      ...req.body,
    };

    if (!projectData.name || !projectData.companyId) {
      return res.status(400).json({
        success: false,
        message: 'Project name and company ID are required',
      });
    }

    const project = new Project(projectData);
    await project.save();

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project,
    });
  } catch (error) {
    console.error('❌ Error creating project:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Project code already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating project',
      error: error.message,
    });
  }
};

// ✅ Update project
export const updateProject = async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ success: false, message: 'Invalid project ID format' });
    }

    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData._id;

    const project = await Project.findOneAndUpdate(
      { id: projectId },
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: project,
    });
  } catch (error) {
    console.error('❌ Error updating project:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Project code already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating project',
      error: error.message,
    });
  }
};

// ✅ Delete project
export const deleteProject = async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ success: false, message: 'Invalid project ID format' });
    }

    const project = await Project.findOneAndDelete({ id: projectId });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully',
      data: { id: projectId },
    });
  } catch (error) {
    console.error('❌ Error deleting project:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting project',
      error: error.message,
    });
  }
};

// ✅ Get project statistics
export const getProjectStats = async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    if (isNaN(companyId)) {
      return res.status(400).json({ success: false, message: 'Invalid company ID format' });
    }

    const stats = await Project.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBudget: { $sum: '$budget' },
        },
      },
    ]);

    const totalProjects = await Project.countDocuments({ companyId });
    const totalBudgetResult = await Project.aggregate([
      { $match: { companyId } },
      { $group: { _id: null, total: { $sum: '$budget' } } },
    ]);

    res.json({
      success: true,
      data: {
        stats,
        totalProjects,
        totalBudget: totalBudgetResult[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching project stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching project statistics',
      error: error.message,
    });
  }
};


export const getAssignedProjects = async (req, res) => {
  try {
    const employeeId = Number(req.query.employeeId);

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "employeeId is required"
      });
    }

    // ✅ India-safe today date (avoid UTC mistakes)
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata"
    });

    // 1️⃣ Get today's assignments from correct collection
    const assignments = await WorkerTaskAssignment.find({
      employeeId,
      date: today
    });

    if (!assignments.length) {
      return res.status(200).json({
        success: true,
        projects: []
      });
    }

    // 2️⃣ Remove duplicate project IDs
    const projectIds = [...new Set(assignments.map(a => a.projectId))];

    // 3️⃣ Fetch project details
    const projects = await Project.find({
      id: { $in: projectIds }
    }).select("id projectName");

    return res.status(200).json({
      success: true,
      projects
    });

  } catch (err) {
    console.error("❌ Error fetching projects:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
}
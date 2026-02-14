import Tool from './models/Tool.js';
import Material from './models/Material.js';
import Employee from '../employee/Employee.js';
import WorkerTaskAssignment from '../worker/models/WorkerTaskAssignment.js';

/* ----------------------------------------------------
   Helper: Resolve logged-in employee (MANDATORY)
---------------------------------------------------- */
const resolveEmployee = async (req) => {
  return Employee.findOne({
    userId: req.user.userId,
    companyId: req.user.companyId,
    status: "ACTIVE"
  });
};

/* ----------------------------------------------------
   GET /api/project/tools-materials
   Get tools and materials for worker's current project
---------------------------------------------------- */
export const getProjectToolsAndMaterials = async (req, res) => {
  try {
    const employee = await resolveEmployee(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const { projectId } = req.query;
    let targetProjectId = projectId;

    // If no projectId provided, get from today's task assignments
    if (!targetProjectId) {
      const today = new Date().toISOString().split("T")[0];
      const assignment = await WorkerTaskAssignment.findOne({
        employeeId: employee.id,
        date: today
      });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "No project assignment found for today"
        });
      }

      targetProjectId = assignment.projectId;
    }

    // Get tools for the project
    const tools = await Tool.find({
      companyId: req.user.companyId,
      projectId: targetProjectId
    }).select('id name category quantity unit allocated location condition status');

    // Get materials for the project
    const materials = await Material.find({
      companyId: req.user.companyId,
      projectId: targetProjectId
    }).select('id name category quantity unit allocated used remaining location status');

    // Format tools data according to API specification
    const formattedTools = tools.map(tool => ({
      id: tool.id,
      name: tool.name,
      category: tool.category,
      quantity: tool.quantity,
      unit: tool.unit,
      allocated: tool.allocated,
      location: tool.location || "Not specified",
      condition: tool.condition,
      status: tool.status
    }));

    // Format materials data according to API specification
    const formattedMaterials = materials.map(material => ({
      id: material.id,
      name: material.name,
      category: material.category,
      quantity: material.quantity,
      unit: material.unit,
      allocated: material.allocated,
      used: material.used,
      remaining: material.remaining,
      location: material.location || "Not specified",
      status: material.status
    }));

    return res.json({
      success: true,
      data: {
        projectId: parseInt(targetProjectId),
        tools: formattedTools,
        materials: formattedMaterials,
        summary: {
          totalTools: formattedTools.length,
          allocatedTools: formattedTools.filter(t => t.allocated).length,
          totalMaterials: formattedMaterials.length,
          allocatedMaterials: formattedMaterials.filter(m => m.allocated > 0).length
        }
      }
    });

  } catch (err) {
    console.error("❌ getProjectToolsAndMaterials:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ----------------------------------------------------
   GET /api/project/tools
   Get tools for a specific project
---------------------------------------------------- */
export const getProjectTools = async (req, res) => {
  try {
    const employee = await resolveEmployee(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const { projectId } = req.params;
    const { category, status } = req.query;

    const filter = {
      companyId: req.user.companyId,
      projectId: parseInt(projectId)
    };

    if (category) filter.category = category;
    if (status) filter.status = status;

    const tools = await Tool.find(filter);

    return res.json({
      success: true,
      data: tools
    });

  } catch (err) {
    console.error("❌ getProjectTools:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ----------------------------------------------------
   GET /api/project/materials
   Get materials for a specific project
---------------------------------------------------- */
export const getProjectMaterials = async (req, res) => {
  try {
    const employee = await resolveEmployee(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const { projectId } = req.params;
    const { category, status } = req.query;

    const filter = {
      companyId: req.user.companyId,
      projectId: parseInt(projectId)
    };

    if (category) filter.category = category;
    if (status) filter.status = status;

    const materials = await Material.find(filter);

    return res.json({
      success: true,
      data: materials
    });

  } catch (err) {
    console.error("❌ getProjectMaterials:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
import express from 'express';
import {
  getAllProjects,
  getProjectsByCompany,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectStats,
  getAssignedProjects
} from './projectController.js';

const router = express.Router();

// Create a new project
router.post('/', createProject);


router.get("/getAssignedProjects", getAssignedProjects);

// Get all projects (supports pagination & filters)
router.get('/', getAllProjects);

// Get projects by company ID
router.get('/company/:companyId', getProjectsByCompany);

// Get project statistics by company ID
router.get('/company/:companyId/stats', getProjectStats);

// Get a single project by ID
router.get('/:id', getProjectById);

// Update a project
router.put('/:id', updateProject);

// Delete a project
router.delete('/:id', deleteProject);



export default router;

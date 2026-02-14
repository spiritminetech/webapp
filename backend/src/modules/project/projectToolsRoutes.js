import express from 'express';
import { 
  getProjectToolsAndMaterials, 
  getProjectTools, 
  getProjectMaterials 
} from './projectToolsController.js';
import authMiddleware from '../../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// GET /api/project/tools-materials - Get tools and materials for worker's current project
router.get('/tools-materials', getProjectToolsAndMaterials);

// GET /api/project/:projectId/tools - Get tools for a specific project
router.get('/:projectId/tools', getProjectTools);

// GET /api/project/:projectId/materials - Get materials for a specific project
router.get('/:projectId/materials', getProjectMaterials);

export default router;
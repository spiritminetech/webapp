import express from 'express';
import {
  createFleetTask,
  getFleetTasks,
  getFleetTaskById,
  getFleetTasksByCompany,
  getFleetTasksByStatus,
  getFleetTasksByVehicle,
  updateFleetTask,
  deleteFleetTask,
  confirmPickup,
  confirmDrop,
  uploadTaskPhoto,
  deleteTaskPhoto,
  getTaskPhotos,
  uploadMiddleware
} from './fleetTaskController.js';

const router = express.Router();

// Existing routes
router.get('/', getFleetTasks);
router.get('/:id', getFleetTaskById);
router.post('/', createFleetTask);
router.put('/:id', updateFleetTask);
router.delete('/:id', deleteFleetTask);
router.get('/company/:companyId', getFleetTasksByCompany);
router.get('/status/:status', getFleetTasksByStatus);
router.get('/vehicle/:vehicleId', getFleetTasksByVehicle);

// Photo and confirmation routes
router.post('/:id/pickup', confirmPickup);
router.post('/:id/drop', confirmDrop);
router.post('/:id/photos', uploadMiddleware, uploadTaskPhoto);
router.delete('/photos/:photoId', deleteTaskPhoto);
router.get('/:id/photos', getTaskPhotos);

export default router;
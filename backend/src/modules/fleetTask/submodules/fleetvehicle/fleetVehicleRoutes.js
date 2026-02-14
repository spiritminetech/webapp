import express from 'express';
import {
  createFleetVehicle,
  getFleetVehicles,
  getFleetVehicleById,
  getFleetVehiclesByCompany,
  getFleetVehiclesByStatus,
  updateFleetVehicle,
  deleteFleetVehicle,
} from './fleetVehicleController.js';

const router = express.Router();

// 🚗 Create a new fleet vehicle
router.post('/', createFleetVehicle);

// 📋 Get all fleet vehicles
router.get('/', getFleetVehicles);

// 🏢 Get vehicles by company
router.get('/company/:companyId', getFleetVehiclesByCompany);

// ⚙️ Get vehicles by status
router.get('/status/:status', getFleetVehiclesByStatus);

// 🔍 Get single fleet vehicle by ID
router.get('/:id', getFleetVehicleById);

// ✏️ Update fleet vehicle
router.put('/:id', updateFleetVehicle);

// 🗑️ Delete fleet vehicle
router.delete('/:id', deleteFleetVehicle);

export default router;

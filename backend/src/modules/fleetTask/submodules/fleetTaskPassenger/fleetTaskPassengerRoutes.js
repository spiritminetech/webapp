import express from 'express';
const router = express.Router();

import {
  createFleetTaskPassenger,
  getFleetTaskPassengers,
  getFleetTaskPassengerById,
  getFleetTaskPassengersByTaskId,
  getFleetTaskPassengersByCompany,
  updateFleetTaskPassenger,
  deleteFleetTaskPassenger
} from './fleetTaskPassengerController.js';

// Create a new fleet task passenger
router.post('/', createFleetTaskPassenger);

// Get all fleet task passengers
router.get('/', getFleetTaskPassengers);

// Get fleet task passenger by ID
router.get('/:id', getFleetTaskPassengerById);

// Get fleet task passengers by task ID
router.get('/task/:taskId', getFleetTaskPassengersByTaskId);

// Get fleet task passengers by company ID
router.get('/company/:companyId', getFleetTaskPassengersByCompany);

// Update a fleet task passenger by ID
router.put('/:id', updateFleetTaskPassenger);

// Delete a fleet task passenger by ID
router.delete('/:id', deleteFleetTaskPassenger);

export default router;

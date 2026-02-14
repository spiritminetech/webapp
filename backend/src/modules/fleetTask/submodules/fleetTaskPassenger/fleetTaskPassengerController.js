// controllers/fleetTaskPassengerController.js

import FleetTaskPassenger from './FleetTaskPassenger.js';
import Company from '../../../company/Company.js';
import FleetTask from '../../../fleetTask/models/FleetTask.js';
// import Employee from '../models/Employee.js';

// @desc Create new fleet task passenger
export const createFleetTaskPassenger = async (req, res) => {
  try {
    const { 
      id, 
      companyId, 
      fleetTaskId, 
      workerEmployeeId, 
      employeeName,
      employeeCode,
      department,
      pickupLocation,
      dropLocation,
      pickupConfirmedAt, 
      dropConfirmedAt, 
      status, 
      notes, 
      createdBy,
      createdAt 
    } = req.body;

    console.log('🟡 Creating fleet task passenger with data:', req.body);

    // Validate required fields
    if (!id || !companyId || !fleetTaskId || !workerEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'ID, companyId, fleetTaskId, and workerEmployeeId are required fields'
      });
    }

    if (isNaN(id) || isNaN(companyId) || isNaN(fleetTaskId) || isNaN(workerEmployeeId)) {
      return res.status(400).json({
        success: false,
        message: 'ID, companyId, fleetTaskId, and workerEmployeeId must be numbers'
      });
    }

    // Validate references
    const companyExists = await Company.findOne({ id: companyId });
    if (!companyExists) {
      return res.status(400).json({
        success: false,
        message: `Company with ID ${companyId} does not exist`
      });
    }

    const fleetTaskExists = await FleetTask.findOne({ id: fleetTaskId });
    if (!fleetTaskExists) {
      return res.status(400).json({
        success: false,
        message: `Fleet task with ID ${fleetTaskId} does not exist`
      });
    }

    const existingPassenger = await FleetTaskPassenger.findOne({ id });
    if (existingPassenger) {
      return res.status(400).json({
        success: false,
        message: `Fleet task passenger with ID ${id} already exists`
      });
    }

    const fleetTaskPassenger = new FleetTaskPassenger({
      id: parseInt(id),
      companyId: parseInt(companyId),
      fleetTaskId: parseInt(fleetTaskId),
      workerEmployeeId: parseInt(workerEmployeeId),
      employeeName: employeeName || 'Unknown Employee',
      employeeCode: employeeCode || '',
      department: department || '',
      pickupLocation: pickupLocation || '',
      dropLocation: dropLocation || '',
      pickupConfirmedAt: pickupConfirmedAt ? new Date(pickupConfirmedAt) : null,
      dropConfirmedAt: dropConfirmedAt ? new Date(dropConfirmedAt) : null,
      status: status || 'PLANNED',
      notes: notes?.trim() || null,
      createdBy: createdBy || 1,
      createdAt: createdAt ? new Date(createdAt) : new Date()
    });

    const savedPassenger = await fleetTaskPassenger.save();

    console.log('✅ Fleet task passenger created successfully:', savedPassenger);

    res.status(201).json({
      success: true,
      message: 'Fleet task passenger created successfully',
      data: savedPassenger
    });
  } catch (error) {
    console.error('❌ Error creating fleet task passenger:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Fleet task passenger with this ID already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// @desc Get all passengers
export const getFleetTaskPassengers = async (req, res) => {
  try {
    const { page = 1, limit = 10, companyId, fleetTaskId, status } = req.query;

    const filter = {};
    if (companyId) filter.companyId = Number(companyId);
    if (fleetTaskId) filter.fleetTaskId = Number(fleetTaskId);
    if (status) filter.status = status;

    const passengers = await FleetTaskPassenger.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await FleetTaskPassenger.countDocuments(filter);

    res.json({
      success: true,
      data: passengers,
      pagination: {
        current: Number(page),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching passengers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching passengers: ' + error.message
    });
  }
};

// @desc Get passenger by ID
export const getFleetTaskPassengerById = async (req, res) => {
  try {
    const passengerId = parseInt(req.params.id);
    if (isNaN(passengerId)) {
      return res.status(400).json({ success: false, message: 'Invalid passenger ID' });
    }

    const passenger = await FleetTaskPassenger.findOne({ id: passengerId });
    if (!passenger) {
      return res.status(404).json({ success: false, message: `Passenger with ID ${passengerId} not found` });
    }

    res.json({ success: true, data: passenger });
  } catch (error) {
    console.error('❌ Error fetching passenger:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc Get passengers by task ID
export const getFleetTaskPassengersByTaskId = async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID' });
    }

    const fleetTask = await FleetTask.findOne({ id: taskId });
    if (!fleetTask) {
      return res.status(404).json({ success: false, message: `Fleet task ${taskId} not found` });
    }

    const passengers = await FleetTaskPassenger.find({ fleetTaskId: taskId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: passengers.length,
      task: {
        id: fleetTask.id,
        taskDate: fleetTask.taskDate,
        vehicleId: fleetTask.vehicleId
      },
      data: passengers
    });
  } catch (error) {
    console.error('❌ Error fetching passengers by task:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc Get passengers by company
export const getFleetTaskPassengersByCompany = async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    if (isNaN(companyId)) {
      return res.status(400).json({ success: false, message: 'Invalid company ID' });
    }

    const company = await Company.findOne({ id: companyId });
    if (!company) {
      return res.status(404).json({ success: false, message: `Company ${companyId} not found` });
    }

    const passengers = await FleetTaskPassenger.find({ companyId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: passengers.length,
      company: {
        id: company.id,
        name: company.name,
        tenantCode: company.tenantCode
      },
      data: passengers
    });
  } catch (error) {
    console.error('❌ Error fetching passengers by company:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc Update passenger
export const updateFleetTaskPassenger = async (req, res) => {
  try {
    const passengerId = parseInt(req.params.id);
    if (isNaN(passengerId)) {
      return res.status(400).json({ success: false, message: 'Invalid passenger ID' });
    }

    const existing = await FleetTaskPassenger.findOne({ id: passengerId });
    if (!existing) {
      return res.status(404).json({ success: false, message: `Passenger ${passengerId} not found` });
    }

    const updateData = { ...req.body };

    if (updateData.pickupConfirmedAt)
      updateData.pickupConfirmedAt = new Date(updateData.pickupConfirmedAt);
    if (updateData.dropConfirmedAt)
      updateData.dropConfirmedAt = new Date(updateData.dropConfirmedAt);

    const updated = await FleetTaskPassenger.findOneAndUpdate(
      { id: passengerId },
      updateData,
      { new: true, runValidators: true }
    );

    res.json({ success: true, message: 'Passenger updated successfully', data: updated });
  } catch (error) {
    console.error('❌ Error updating passenger:', error);
    res.status(400).json({ success: false, message: 'Error updating passenger: ' + error.message });
  }
};

// @desc Delete passenger
export const deleteFleetTaskPassenger = async (req, res) => {
  try {
    const passengerId = parseInt(req.params.id);
    if (isNaN(passengerId)) {
      return res.status(400).json({ success: false, message: 'Invalid passenger ID' });
    }

    const deleted = await FleetTaskPassenger.findOneAndDelete({ id: passengerId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: `Passenger ${passengerId} not found` });
    }

    res.json({
      success: true,
      message: 'Passenger deleted successfully',
      deletedPassenger: {
        id: deleted.id,
        fleetTaskId: deleted.fleetTaskId,
        workerEmployeeId: deleted.workerEmployeeId
      }
    });
  } catch (error) {
    console.error('❌ Error deleting passenger:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

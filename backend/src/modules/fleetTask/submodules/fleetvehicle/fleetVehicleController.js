import FleetVehicle from './FleetVehicle.js';
import Company from '../../../company/Company.js';

// ✅ Create a new fleet vehicle
export const createFleetVehicle = async (req, res) => {
  try {
    const {
      id,
      companyId,
      vehicleCode,
      registrationNo,
      vehicleType,
      capacity,
      status,
      insuranceExpiry,
      lastServiceDate,
      odometer,
      meta,
      createdAt
    } = req.body;

    if (!id || !companyId || !vehicleCode) {
      return res.status(400).json({
        success: false,
        message: 'ID, companyId, and vehicleCode are required fields'
      });
    }

    if (isNaN(id) || isNaN(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'ID and companyId must be numbers'
      });
    }

    if (!vehicleCode.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle code cannot be empty'
      });
    }

    const companyExists = await Company.findOne({ id: companyId });
    if (!companyExists) {
      return res.status(404).json({
        success: false,
        message: `Company with ID ${companyId} does not exist`
      });
    }

    if (await FleetVehicle.findOne({ id })) {
      return res.status(400).json({
        success: false,
        message: `Fleet vehicle with ID ${id} already exists`
      });
    }

    if (await FleetVehicle.findOne({ vehicleCode: vehicleCode.trim() })) {
      return res.status(400).json({
        success: false,
        message: `Vehicle with code '${vehicleCode}' already exists`
      });
    }

    if (registrationNo && await FleetVehicle.findOne({ registrationNo: registrationNo.trim() })) {
      return res.status(400).json({
        success: false,
        message: `Vehicle with registration number '${registrationNo}' already exists`
      });
    }

    const fleetVehicle = new FleetVehicle({
      id: Number(id),
      companyId: Number(companyId),
      vehicleCode: vehicleCode.trim(),
      registrationNo: registrationNo?.trim() || null,
      vehicleType: vehicleType?.trim() || null,
      capacity: capacity ? Number(capacity) : null,
      status: status?.toUpperCase() || 'AVAILABLE',
      insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
      lastServiceDate: lastServiceDate ? new Date(lastServiceDate) : null,
      odometer: odometer ? Number(odometer) : null,
      meta: meta || {},
      createdAt: createdAt ? new Date(createdAt) : new Date()
    });

    const savedVehicle = await fleetVehicle.save();

    res.status(201).json({
      success: true,
      message: 'Fleet vehicle created successfully',
      data: savedVehicle
    });
  } catch (error) {
    handleControllerError(error, res);
  }
};

// ✅ Get all fleet vehicles
export const getFleetVehicles = async (req, res) => {
  try {
    const fleetVehicles = await FleetVehicle.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: fleetVehicles.length,
      data: fleetVehicles
    });
  } catch (error) {
    handleControllerError(error, res, 'Error fetching fleet vehicles');
  }
};

// ✅ Get vehicle by numeric ID
export const getFleetVehicleById = async (req, res) => {
  try {
    const vehicleId = Number(req.params.id);
    if (isNaN(vehicleId)) {
      return res.status(400).json({ success: false, message: 'Invalid vehicle ID' });
    }

    const fleetVehicle = await FleetVehicle.findOne({ id: vehicleId });
    if (!fleetVehicle) {
      return res.status(404).json({
        success: false,
        message: `Fleet vehicle with ID ${vehicleId} not found`
      });
    }

    res.json({ success: true, data: fleetVehicle });
  } catch (error) {
    handleControllerError(error, res, 'Error fetching fleet vehicle');
  }
};

// ✅ Get vehicles by company
export const getFleetVehiclesByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    let queryCompanyId;

    // Detect MongoDB _id or numeric id
    if (/^[0-9a-fA-F]{24}$/.test(companyId)) {
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: `Company with _id ${companyId} not found`
        });
      }
      queryCompanyId = company.id;
    } else {
      queryCompanyId = Number(companyId);
      if (isNaN(queryCompanyId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID. Must be a number or valid MongoDB _id.'
        });
      }
    }

    const companyExists = await Company.findOne({ id: queryCompanyId });
    if (!companyExists) {
      return res.status(404).json({
        success: false,
        message: `Company with ID ${queryCompanyId} not found`
      });
    }

    const fleetVehicles = await FleetVehicle.find({ companyId: queryCompanyId }).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: fleetVehicles.length,
      company: {
        id: companyExists.id,
        name: companyExists.name,
        tenantCode: companyExists.tenantCode
      },
      data: fleetVehicles
    });
  } catch (error) {
    handleControllerError(error, res, 'Error fetching company vehicles');
  }
};

// ✅ Get vehicles by status
export const getFleetVehiclesByStatus = async (req, res) => {
  try {
    const status = req.params.status?.toUpperCase();
    const validStatuses = ['AVAILABLE', 'IN_SERVICE', 'MAINTENANCE'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const fleetVehicles = await FleetVehicle.find({ status }).sort({ createdAt: -1 });
    res.json({ success: true, count: fleetVehicles.length, data: fleetVehicles });
  } catch (error) {
    handleControllerError(error, res, 'Error fetching fleet vehicles by status');
  }
};

// ✅ Update vehicle
export const updateFleetVehicle = async (req, res) => {
  try {
    const vehicleId = Number(req.params.id);
    if (isNaN(vehicleId)) {
      return res.status(400).json({ success: false, message: 'Invalid fleet vehicle ID' });
    }

    const existingVehicle = await FleetVehicle.findOne({ id: vehicleId });
    if (!existingVehicle) {
      return res.status(404).json({ success: false, message: 'Fleet vehicle not found' });
    }

    const updateData = { ...req.body };

    if (updateData.companyId) {
      const company = await Company.findOne({ id: Number(updateData.companyId) });
      if (!company) {
        return res.status(400).json({ success: false, message: 'Company does not exist' });
      }
      updateData.companyId = Number(updateData.companyId);
    }

    if (updateData.vehicleCode) {
      const exists = await FleetVehicle.findOne({
        vehicleCode: updateData.vehicleCode.trim(),
        id: { $ne: vehicleId }
      });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: `Vehicle code '${updateData.vehicleCode}' already exists`
        });
      }
      updateData.vehicleCode = updateData.vehicleCode.trim();
    }

    if (updateData.registrationNo) {
      const exists = await FleetVehicle.findOne({
        registrationNo: updateData.registrationNo.trim(),
        id: { $ne: vehicleId }
      });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: `Registration number '${updateData.registrationNo}' already exists`
        });
      }
      updateData.registrationNo = updateData.registrationNo.trim();
    }

    if (updateData.status) {
      const validStatuses = ['AVAILABLE', 'IN_SERVICE', 'MAINTENANCE'];
      if (!validStatuses.includes(updateData.status.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${validStatuses.join(', ')}`
        });
      }
      updateData.status = updateData.status.toUpperCase();
    }

    ['capacity', 'odometer'].forEach(key => {
      if (updateData[key]) updateData[key] = Number(updateData[key]);
    });

    ['insuranceExpiry', 'lastServiceDate'].forEach(key => {
      if (updateData[key]) updateData[key] = new Date(updateData[key]);
    });

    const updatedVehicle = await FleetVehicle.findOneAndUpdate(
      { id: vehicleId },
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Fleet vehicle updated successfully',
      data: updatedVehicle
    });
  } catch (error) {
    handleControllerError(error, res, 'Error updating fleet vehicle');
  }
};

// ✅ Delete vehicle
export const deleteFleetVehicle = async (req, res) => {
  try {
    const vehicleId = Number(req.params.id);
    if (isNaN(vehicleId)) {
      return res.status(400).json({ success: false, message: 'Invalid fleet vehicle ID' });
    }

    const deleted = await FleetVehicle.findOneAndDelete({ id: vehicleId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Fleet vehicle not found' });
    }

    res.json({
      success: true,
      message: 'Fleet vehicle deleted successfully',
      deletedVehicle: deleted
    });
  } catch (error) {
    handleControllerError(error, res, 'Error deleting fleet vehicle');
  }
};

// ✅ Centralized error handler
function handleControllerError(error, res, context = 'Server error') {
  console.error('❌', context, error);

  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: 'Validation error', errors });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate value for field '${field}'`
    });
  }

  res.status(500).json({ success: false, message: `${context}: ${error.message}` });
}

// src/controllers/fleetTaskController.js
import FleetTask from "./models/FleetTask.js";
import Company from "../company/Company.js";
import FleetVehicle from "./submodules/fleetvehicle/FleetVehicle.js";
import User from "../user/User.js";
import FleetTaskPhoto from "./models/FleetTaskPhoto.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = 'uploads/tasks';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `task_${req.params.id}_${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// -------------------------------------------------------------
// @desc    Create a new fleet task
// @route   POST /api/fleet-tasks
// @access  Public
// -------------------------------------------------------------
export const createFleetTask = async (req, res) => {
  try {
    const {
      id,
      companyId,
      projectId,
      driverId,
      vehicleId,
      taskDate,
      plannedPickupTime,
      plannedDropTime,
      pickupLocation,
      pickupAddress,
      dropLocation,
      dropAddress,
      expectedPassengers,
      actualStartTime,
      actualEndTime,
      routeLog,
      status,
      notes,
      createdBy,
      createdAt,
    } = req.body;

    if (!id || !companyId || !vehicleId || !taskDate) {
      return res.status(400).json({
        success: false,
        message: "ID, companyId, vehicleId, and taskDate are required fields",
      });
    }

    if (isNaN(id) || isNaN(companyId) || isNaN(vehicleId)) {
      return res.status(400).json({
        success: false,
        message: "ID, companyId, and vehicleId must be numbers",
      });
    }

    const companyExists = await Company.findOne({ id: companyId });
    if (!companyExists) {
      return res.status(400).json({
        success: false,
        message: `Company with ID ${companyId} does not exist`,
      });
    }

    const vehicleExists = await FleetVehicle.findOne({ id: vehicleId });
    if (!vehicleExists) {
      return res.status(400).json({
        success: false,
        message: `Fleet vehicle with ID ${vehicleId} does not exist`,
      });
    }

    if (createdBy) {
      const userExists = await User.findOne({ id: createdBy });
      if (!userExists) {
        return res.status(400).json({
          success: false,
          message: `User with ID ${createdBy} does not exist`,
        });
      }
    }

    const existingTaskById = await FleetTask.findOne({ id: id });
    if (existingTaskById) {
      return res.status(400).json({
        success: false,
        message: `Fleet task with ID ${id} already exists`,
      });
    }

    const pickupLocationString =
      pickupLocation && typeof pickupLocation === "object"
        ? `Location (${pickupLocation.lat}, ${pickupLocation.lng})`
        : pickupLocation
        ? String(pickupLocation).trim()
        : null;

    const dropLocationString =
      dropLocation && typeof dropLocation === "object"
        ? `Location (${dropLocation.lat}, ${dropLocation.lng})`
        : dropLocation
        ? String(dropLocation).trim()
        : null;

    const fleetTask = new FleetTask({
      id: parseInt(id),
      companyId: parseInt(companyId),
      projectId: projectId ? parseInt(projectId) : null,
      driverId: driverId ? parseInt(driverId) : null,
      vehicleId: parseInt(vehicleId),
      taskDate: new Date(taskDate),
      plannedPickupTime: plannedPickupTime ? new Date(plannedPickupTime) : null,
      plannedDropTime: plannedDropTime ? new Date(plannedDropTime) : null,
      pickupLocation: pickupLocationString,
      pickupAddress: pickupAddress ? pickupAddress.trim() : null,
      dropLocation: dropLocationString,
      dropAddress: dropAddress ? dropAddress.trim() : null,
      expectedPassengers: expectedPassengers ? parseInt(expectedPassengers) : 0,
      actualStartTime: actualStartTime ? new Date(actualStartTime) : null,
      actualEndTime: actualEndTime ? new Date(actualEndTime) : null,
      routeLog: routeLog || [],
      status: status || "PLANNED",
      notes: notes ? notes.trim() : null,
      createdBy: createdBy ? parseInt(createdBy) : null,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
    });

    const savedTask = await fleetTask.save();

    res.status(201).json({
      success: true,
      message: "Fleet task created successfully",
      data: savedTask,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Fleet task with this ${field} already exists`,
      });
    }

    if (error.name === "TypeError" && error.message.includes("Invalid time value")) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use ISO format (e.g., 2024-01-15T10:30:00.000Z)",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};

// -------------------------------------------------------------
// @desc    Get all fleet tasks
// -------------------------------------------------------------
export const getFleetTasks = async (req, res) => {
  try {
    const fleetTasks = await FleetTask.find()
      .populate("companyId", "name tenantCode")
      .populate("vehicleId", "vehicleCode registrationNo vehicleType")
      .populate("createdBy", "name email")
      .sort({ taskDate: -1, createdAt: -1 });

    res.json({
      success: true,
      count: fleetTasks.length,
      data: fleetTasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching fleet tasks: " + error.message,
    });
  }
};

// -------------------------------------------------------------
// @desc    Get fleet task by ID
// -------------------------------------------------------------
export const getFleetTaskById = async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fleet task ID. Must be a number.",
      });
    }

    const fleetTask = await FleetTask.findOne({ id: taskId })
      .populate("companyId", "name tenantCode")
      .populate("vehicleId", "vehicleCode registrationNo vehicleType")
      .populate("createdBy", "name email");

    if (!fleetTask) {
      return res.status(404).json({
        success: false,
        message: `Fleet task with ID ${taskId} not found`,
      });
    }

    res.json({
      success: true,
      data: fleetTask,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching fleet task: " + error.message,
    });
  }
};

// -------------------------------------------------------------
// @desc    Get fleet tasks by company
// -------------------------------------------------------------
export const getFleetTasksByCompany = async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    if (isNaN(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID. Must be a number.",
      });
    }

    const companyExists = await Company.findOne({ id: companyId });
    if (!companyExists) {
      return res.status(404).json({
        success: false,
        message: `Company with ID ${companyId} not found`,
      });
    }

    const fleetTasks = await FleetTask.find({ companyId })
      .populate("vehicleId", "vehicleCode registrationNo vehicleType")
      .populate("createdBy", "name email")
      .sort({ taskDate: -1, createdAt: -1 });

    res.json({
      success: true,
      count: fleetTasks.length,
      company: {
        id: companyExists.id,
        name: companyExists.name,
        tenantCode: companyExists.tenantCode,
      },
      data: fleetTasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching fleet tasks: " + error.message,
    });
  }
};

// -------------------------------------------------------------
// @desc    Get fleet tasks by status
// -------------------------------------------------------------
export const getFleetTasksByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const validStatuses = ["PLANNED", "ONGOING", "COMPLETED", "CANCELLED"];
    if (!validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const fleetTasks = await FleetTask.find({ status: status.toUpperCase() })
      .populate("companyId", "name tenantCode")
      .populate("vehicleId", "vehicleCode registrationNo vehicleType")
      .populate("createdBy", "name email")
      .sort({ taskDate: -1, createdAt: -1 });

    res.json({
      success: true,
      count: fleetTasks.length,
      data: fleetTasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching fleet tasks: " + error.message,
    });
  }
};

// -------------------------------------------------------------
// @desc    Get fleet tasks by vehicle
// -------------------------------------------------------------
export const getFleetTasksByVehicle = async (req, res) => {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    if (isNaN(vehicleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID. Must be a number.",
      });
    }

    const vehicleExists = await FleetVehicle.findOne({ id: vehicleId });
    if (!vehicleExists) {
      return res.status(404).json({
        success: false,
        message: `Fleet vehicle with ID ${vehicleId} not found`,
      });
    }

    const fleetTasks = await FleetTask.find({ vehicleId })
      .populate("companyId", "name tenantCode")
      .populate("createdBy", "name email")
      .sort({ taskDate: -1, createdAt: -1 });

    res.json({
      success: true,
      count: fleetTasks.length,
      vehicle: {
        id: vehicleExists.id,
        vehicleCode: vehicleExists.vehicleCode,
        registrationNo: vehicleExists.registrationNo,
        vehicleType: vehicleExists.vehicleType,
      },
      data: fleetTasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching fleet tasks: " + error.message,
    });
  }
};

// -------------------------------------------------------------
// @desc    Update fleet task
// -------------------------------------------------------------
export const updateFleetTask = async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fleet task ID. Must be a number.",
      });
    }

    const existingTask = await FleetTask.findOne({ id: taskId });
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: `Fleet task with ID ${taskId} not found`,
      });
    }

    const updateData = { ...req.body };

    if (updateData.pickupLocation) {
      if (typeof updateData.pickupLocation === "object" && updateData.pickupLocation.lng && updateData.pickupLocation.lat) {
        updateData.pickupLocation = `Location (${updateData.pickupLocation.lat}, ${updateData.pickupLocation.lng})`;
      } else {
        updateData.pickupLocation = String(updateData.pickupLocation).trim();
      }
    }

    if (updateData.dropLocation) {
      if (typeof updateData.dropLocation === "object" && updateData.dropLocation.lng && updateData.dropLocation.lat) {
        updateData.dropLocation = `Location (${updateData.dropLocation.lat}, ${updateData.dropLocation.lng})`;
      } else {
        updateData.dropLocation = String(updateData.dropLocation).trim();
      }
    }

    const dateFields = ["taskDate", "plannedPickupTime", "plannedDropTime", "actualStartTime", "actualEndTime"];
    dateFields.forEach((field) => {
      if (updateData[field]) updateData[field] = new Date(updateData[field]);
    });

    if (updateData.expectedPassengers) {
      updateData.expectedPassengers = parseInt(updateData.expectedPassengers);
    }

    const validStatuses = ["PLANNED", "ONGOING", "COMPLETED", "CANCELLED"];
    if (updateData.status && !validStatuses.includes(updateData.status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const fleetTask = await FleetTask.findOneAndUpdate(
      { id: taskId },
      updateData,
      { new: true, runValidators: true, context: "query" }
    )
      .populate("companyId", "name tenantCode")
      .populate("vehicleId", "vehicleCode registrationNo vehicleType")
      .populate("createdBy", "name email");

    res.json({
      success: true,
      message: "Fleet task updated successfully",
      data: fleetTask,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error updating fleet task: " + error.message,
    });
  }
};

// -------------------------------------------------------------
// @desc    Delete fleet task
// -------------------------------------------------------------
export const deleteFleetTask = async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fleet task ID. Must be a number.",
      });
    }

    const fleetTask = await FleetTask.findOneAndDelete({ id: taskId });
    if (!fleetTask) {
      return res.status(404).json({
        success: false,
        message: `Fleet task with ID ${taskId} not found`,
      });
    }

    res.json({
      success: true,
      message: "Fleet task deleted successfully",
      deletedTask: {
        id: fleetTask.id,
        taskDate: fleetTask.taskDate,
        vehicleId: fleetTask.vehicleId,
        status: fleetTask.status,
        createdAt: fleetTask.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting fleet task: " + error.message,
    });
  }
};

// -------------------------------------------------------------
// @desc    Upload task photo with camera capture
// @route   POST /api/fleet-tasks/:id/photos
// @access  Public
// -------------------------------------------------------------
export const uploadTaskPhoto = async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { photoType, driverId, companyId, remarks } = req.body;

    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fleet task ID",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Photo file is required",
      });
    }

    const task = await FleetTask.findOne({ id: taskId });
    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Fleet task with ID ${taskId} not found`,
      });
    }

    // ✅ FIXED: Use proper URL path without duplicate "uploads"
    const photoUrl = `uploads/tasks/${req.file.filename}`;

    // ✅ FIXED: Convert all IDs to numbers properly
    const parsedDriverId = driverId ? parseInt(driverId) : 0;
    const parsedCompanyId = companyId ? parseInt(companyId) : task.companyId;

    // Validate that IDs are numbers
    if (isNaN(parsedDriverId) || isNaN(parsedCompanyId)) {
      return res.status(400).json({
        success: false,
        message: "driverId and companyId must be valid numbers",
      });
    }

    // Create photo record in FleetTaskPhoto collection
    const photo = new FleetTaskPhoto({
      fleetTaskId: taskId, // ✅ Already a number from parseInt above
      driverId: parsedDriverId, // ✅ Converted to number
      companyId: parsedCompanyId, // ✅ Converted to number
      photoType: photoType || 'pickup',
      photoUrl: photoUrl,
      remarks: remarks || '',
      createdAt: new Date()
    });

    const savedPhoto = await photo.save();

    res.status(201).json({
      success: true,
      message: "Photo captured and saved successfully",
      data: {
        _id: savedPhoto._id,
        photoUrl: savedPhoto.photoUrl,
        photoType: savedPhoto.photoType,
        remarks: savedPhoto.remarks,
        createdAt: savedPhoto.createdAt,
        filename: req.file.filename
      },
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({
      success: false,
      message: "Error capturing photo: " + error.message,
    });
  }
};

// -------------------------------------------------------------
// @desc    Confirm pickup with photos and remarks
// @route   POST /api/fleet-tasks/:id/pickup
// @access  Public
// -------------------------------------------------------------
export const confirmPickup = async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { confirmed, missed, remarks, photoIds } = req.body;

    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fleet task ID",
      });
    }

    const fleetTask = await FleetTask.findOne({ id: taskId });
    if (!fleetTask) {
      return res.status(404).json({
        success: false,
        message: `Fleet task with ID ${taskId} not found`,
      });
    }

    // Get pickup photos
    let pickupPhotos = [];
    if (photoIds && photoIds.length > 0) {
      pickupPhotos = await FleetTaskPhoto.find({ 
        _id: { $in: photoIds },
        photoType: 'pickup'
      });
    }

    // Update passenger pickup statuses
    if (fleetTask.passengers && fleetTask.passengers.length > 0) {
      fleetTask.passengers = fleetTask.passengers.map(passenger => {
        if (confirmed && confirmed.includes(passenger.id)) {
          return { ...passenger, pickupStatus: 'present' };
        } else if (missed && missed.includes(passenger.id)) {
          return { ...passenger, pickupStatus: 'absent' };
        }
        return passenger;
      });
    }

    // Update task status
    fleetTask.pickupConfirmed = true;
    fleetTask.pickupConfirmedAt = new Date();
    fleetTask.pickupRemarks = remarks || '';
    fleetTask.currentStatus = 'PICKUP_COMPLETED';
    fleetTask.status = 'ONGOING';

    const updatedTask = await fleetTask.save();

    res.json({
      success: true,
      message: "Pickup confirmed successfully with photo proof",
      data: {
        task: updatedTask,
        photos: pickupPhotos,
        summary: {
          present: confirmed?.length || 0,
          absent: missed?.length || 0,
          totalPassengers: fleetTask.passengers?.length || 0,
          photoCount: pickupPhotos.length
        }
      },
    });
  } catch (error) {
    console.error('Error confirming pickup:', error);
    res.status(500).json({
      success: false,
      message: "Error confirming pickup: " + error.message,
    });
  }
};

// -------------------------------------------------------------
// @desc    Confirm drop with photos and remarks
// @route   POST /api/fleet-tasks/:id/drop
// @access  Public
// -------------------------------------------------------------
export const confirmDrop = async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { confirmed, missed, remarks, photoIds } = req.body;

    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fleet task ID",
      });
    }

    const fleetTask = await FleetTask.findOne({ id: taskId });
    if (!fleetTask) {
      return res.status(404).json({
        success: false,
        message: `Fleet task with ID ${taskId} not found`,
      });
    }

    // Get dropoff photos
    let dropoffPhotos = [];
    if (photoIds && photoIds.length > 0) {
      dropoffPhotos = await FleetTaskPhoto.find({ 
        _id: { $in: photoIds },
        photoType: 'dropoff'
      });
    }

    // Update passenger drop statuses
    if (fleetTask.passengers && fleetTask.passengers.length > 0) {
      fleetTask.passengers = fleetTask.passengers.map(passenger => {
        if (confirmed && confirmed.includes(passenger.id)) {
          return { ...passenger, dropStatus: 'confirmed' };
        } else if (missed && missed.includes(passenger.id)) {
          return { ...passenger, dropStatus: 'missed' };
        }
        return passenger;
      });
    }

    // Update task status
    fleetTask.dropConfirmed = true;
    fleetTask.dropConfirmedAt = new Date();
    fleetTask.dropRemarks = remarks || '';
    fleetTask.currentStatus = 'COMPLETED';
    fleetTask.status = 'COMPLETED';
    fleetTask.actualEndTime = new Date();

    const updatedTask = await fleetTask.save();

    res.json({
      success: true,
      message: "Drop-off confirmed successfully with photo proof",
      data: {
        task: updatedTask,
        photos: dropoffPhotos,
        summary: {
          confirmed: confirmed?.length || 0,
          missed: missed?.length || 0,
          totalPassengers: fleetTask.passengers?.length || 0,
          photoCount: dropoffPhotos.length
        }
      },
    });
  } catch (error) {
    console.error('Error confirming drop:', error);
    res.status(500).json({
      success: false,
      message: "Error confirming drop: " + error.message,
    });
  }
};

// -------------------------------------------------------------
// @desc    Get task photos
// @route   GET /api/fleet-tasks/:id/photos
// @access  Public
// -------------------------------------------------------------
export const getTaskPhotos = async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { photoType } = req.query;

    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fleet task ID",
      });
    }

    const query = { fleetTaskId: taskId }; // ✅ Now searching by number
    if (photoType) {
      query.photoType = photoType;
    }

    const photos = await FleetTaskPhoto.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: photos.length,
      data: photos,
    });
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching photos: " + error.message,
    });
  }
};

// -------------------------------------------------------------
// @desc    Delete task photo
// @route   DELETE /api/fleet-tasks/photos/:photoId
// @access  Public
// -------------------------------------------------------------
export const deleteTaskPhoto = async (req, res) => {
  try {
    const { photoId } = req.params;

    const photo = await FleetTaskPhoto.findByIdAndDelete(photoId);
    if (!photo) {
      return res.status(404).json({
        success: false,
        message: "Photo not found",
      });
    }

    // Delete physical file
    const filePath = path.join('uploads/tasks', path.basename(photo.photoUrl));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: "Photo deleted successfully",
      data: photo,
    });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({
      success: false,
      message: "Error deleting photo: " + error.message,
    });
  }
};

// Multer middleware
export const uploadMiddleware = upload.single('photo');
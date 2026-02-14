import mongoose from 'mongoose';

const fleetVehicleSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  companyId: {
    type: Number,
    required: true,
    ref: 'Company'
  },
  vehicleCode: {
    type: String,
    required: true,
    trim: true
  },
  registrationNo: {
    type: String,
    unique: true,
    trim: true
  },
  vehicleType: {
    type: String,
    trim: true
  },
  capacity: {
    type: Number,
    min: 0
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'IN_SERVICE', 'MAINTENANCE'],
    default: 'AVAILABLE'
  },
  insuranceExpiry: {
    type: Date
  },
  lastServiceDate: {
    type: Date
  },
  odometer: {
    type: Number,
    min: 0
  },
  meta: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update `updatedAt` before saving
fleetVehicleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Third argument sets the collection name explicitly
const FleetVehicle = mongoose.model('FleetVehicle', fleetVehicleSchema, 'fleetVehicles');

export default FleetVehicle;

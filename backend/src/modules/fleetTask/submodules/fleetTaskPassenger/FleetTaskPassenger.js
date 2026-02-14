import mongoose from 'mongoose';

const fleetTaskPassengerSchema = new mongoose.Schema({
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
  fleetTaskId: {
    type: Number,
    required: true,
    ref: 'FleetTask'
  },
  workerEmployeeId: {
    type: Number,
    required: true,
    // ref: 'Employee' // Uncomment if Employee model exists
  },
  pickupConfirmedAt: {
    type: Date
  },
  dropConfirmedAt: {
    type: Date
  },
  pickupStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'missed'],
    default: 'pending'
  },
  dropStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'missed'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Explicit collection name: 'fleetTaskPassengers'
const FleetTaskPassenger = mongoose.model('FleetTaskPassenger', fleetTaskPassengerSchema, 'fleetTaskPassengers');

export default FleetTaskPassenger;

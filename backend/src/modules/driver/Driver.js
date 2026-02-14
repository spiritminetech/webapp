import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  companyId: {
    type: Number,
    required: true
  },
  employeeId: {
    type: Number,
    required: true
    // Removed unique constraint to avoid errors
  },
  employeeName: {
    type: String,
    required: true
  },
  employeeCode: {
    type: String
  },
  jobTitle: {
    type: String
  },
  licenseNo: {
    type: String,
    required: true
  },
  licenseExpiry: {
    type: Date
  },
  vehicleId: {
    type: Number
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    default: 'ACTIVE'
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

// Update updatedAt before saving
driverSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Driver = mongoose.model('Driver', driverSchema);

export default Driver;

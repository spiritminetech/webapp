import mongoose from 'mongoose';

const WorkerTaskAssignmentSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  projectId: {
    type: Number,
    required: true
  },
  employeeId: {
    type: Number,
    required: true
  },
  supervisorId: {
    type: Number,
    
  },
  vehicleId: {
    type: Number,
    default: null
  },
  taskId: {
    type: Number,
    default: null
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  status: {
    type: String,
    default: 'queued',
    enum: ['queued', 'in_progress', 'completed']
  },
  companyId: {
    type: Number,
    
  },
  createdAt: {
    type: Date,
    default: Date.now
  }, 
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  // New fields for mobile app
  dailyTarget: {
    description: String,
    quantity: Number,
    unit: String,
    targetCompletion: { type: Number, default: 100 }
  },
  
  workArea: String,
  floor: String,
  zone: String,
  
  timeEstimate: {
    estimated: Number, // minutes
    elapsed: Number,
    remaining: Number
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  sequence: Number,
  
  dependencies: [Number], // Array of assignment IDs
  
  geofenceValidation: {
    required: { type: Boolean, default: true },
    lastValidated: Date,
    validationLocation: {
      latitude: Number,
      longitude: Number
    }
  }
}, {
  collection: 'workerTaskAssignment',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});
//WorkerTaskAssignmentSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export default mongoose.model('WorkerTaskAssignment', WorkerTaskAssignmentSchema);
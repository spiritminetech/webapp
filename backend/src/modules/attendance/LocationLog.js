import mongoose from 'mongoose';

const locationLogSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true,
    },
    employeeId: {
      type: Number,
    
    },
    projectId: {
      type: Number,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    accuracy: {
      type: Number,
      default: null,
    },
    insideGeofence: {
      type: Boolean,
      default: false,
    },
    // Track how long worker has been outside geofence
    outsideGeofenceStart: {
      type: Date,
      default: null,
    },
    // Optional: link with attendance record for auto-checkout or absent marking
    attendanceId: {
      type:Number,
      ref: 'Attendance',
    },
    // Log type to categorize different location events
    logType: {
      type: String,
      enum: ['CHECK_IN', 'CHECK_OUT', 'TASK_START', 'TASK_PROGRESS', 'TASK_COMPLETE', 'PERIODIC', 'MANUAL', 'GEOFENCE_VALIDATION'],
      default: 'PERIODIC',
    },
    // Link to task assignment for task-related location logs
    taskAssignmentId: {
      type: Number,
      default: null,
    },
  },
  {
    collection: 'locationLogs',
    timestamps: true, // includes createdAt and updatedAt
  }
);

export default mongoose.model('LocationLog', locationLogSchema);

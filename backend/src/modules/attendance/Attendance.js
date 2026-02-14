import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true,
    },
    employeeId: {
      type: Number,
      required: true,
    },
    projectId: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    checkIn: {
      type: Date,
      default: null,
    },
    checkOut: {
      type: Date,
      default: null,
    },
    pendingCheckout: {
      type: Boolean,
      default: false,
    },
    insideGeofenceAtCheckin: {
      type: Boolean,
      default: false,
    },
    insideGeofenceAtCheckout: {
      type: Boolean,
      default: false,
    },
    // Optional: store last known location
    lastLatitude: {
      type: Number,
    },
    lastLongitude: {
      type: Number,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'attendance',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

export default mongoose.model('Attendance', attendanceSchema);
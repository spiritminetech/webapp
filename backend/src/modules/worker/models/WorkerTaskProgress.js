import mongoose from "mongoose";

const WorkerTaskProgressSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true
    },

    workerTaskAssignmentId: {
      type: Number,
      required: true
    },

    employeeId: {
      type: Number,
      required: true
    },

    progressPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },

    description: {
      type: String,
      required: true,
      trim: true
    },

    notes: {
      type: String,
      trim: true
    },

    // Enhanced fields for mobile app support
    location: {
      latitude: {
        type: Number,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180
      },
      timestamp: {
        type: Date
      }
    },

    completedQuantity: {
      type: Number,
      min: 0
    },

    issuesEncountered: [{
      type: String,
      trim: true,
      maxlength: 200
    }],

    submittedAt: {
      type: Date,
      default: Date.now
    },

    status: {
      type: String,
      enum: ["SUBMITTED", "REVIEWED", "APPROVED", "REJECTED"],
      default: "SUBMITTED"
    }
}, {
  collection: 'workerTaskProgress',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// Add indexes for better query performance
WorkerTaskProgressSchema.index({ workerTaskAssignmentId: 1, submittedAt: -1 });
WorkerTaskProgressSchema.index({ employeeId: 1, submittedAt: -1 });

export default mongoose.model(
  "WorkerTaskProgress",
  WorkerTaskProgressSchema
);

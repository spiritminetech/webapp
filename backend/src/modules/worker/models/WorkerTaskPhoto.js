import mongoose from "mongoose";

const WorkerTaskPhotoSchema = new mongoose.Schema(
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

    photoUrl: {
      type: String,
      required: true
    },

    caption: {
      type: String,
      trim: true,
      default: ''
    },

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

    fileSize: {
      type: Number,
      min: 0
    },

    originalName: {
      type: String,
      trim: true
    },

    mimeType: {
      type: String,
      enum: ['image/jpeg', 'image/jpg', 'image/png']
    },

    uploadedAt: {
      type: Date,
      default: Date.now
    }
}, {
  collection: 'workerTaskPhoto',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// Index for efficient querying
WorkerTaskPhotoSchema.index({ workerTaskAssignmentId: 1 });
WorkerTaskPhotoSchema.index({ employeeId: 1 });
WorkerTaskPhotoSchema.index({ uploadedAt: -1 });

export default mongoose.model(
  "WorkerTaskPhoto",
  WorkerTaskPhotoSchema
);

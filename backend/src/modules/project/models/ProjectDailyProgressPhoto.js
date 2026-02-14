import mongoose from "mongoose";

const ProjectDailyProgressPhotoSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      //required: true,
      unique: true
    },

    dailyProgressId: {
      type:Number,
     // required: true,
      index: true
    },

    projectId: {
      type: Number,
      //required: true,
      index: true
    },

    supervisorId: {
      type: Number,
      //required: true
    },

    photoUrl: {
      type: String,
     // required: true
    },

    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: "projectDailyProgressPhoto",
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" }
  }
);

export default mongoose.model(
  "ProjectDailyProgressPhoto",
  ProjectDailyProgressPhotoSchema
);

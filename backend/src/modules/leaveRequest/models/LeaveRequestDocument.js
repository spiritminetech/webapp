import mongoose from 'mongoose';

const leaveRequestDocumentSchema = new mongoose.Schema({
//   id: {
//     type: Number,
   
//   },
  leaveRequestId: {
    type: Number,
    
    
  },
  documentType: {
    type: String,
    enum: ['MEDICAL_CERT', 'SUPPORTING_DOC'],
  
  },
  filePath: {
    type: String,
   
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  uploadedBy: {
    type: Number,
    ref: 'User'
  }
}, {
    collection: 'leaveRequestDocuments',
    timestamps: true, // includes createdAt and updatedAt
  });

leaveRequestDocumentSchema.index({ leaveRequestId: 1 });



export default mongoose.model('LeaveRequestDocument', leaveRequestDocumentSchema);
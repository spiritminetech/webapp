import mongoose from 'mongoose';

const leaveApprovalSchema = new mongoose.Schema({
  id: {
    type: Number,
    unique: true
  },
  leaveRequestId: {
    type: Number,
  
  },
  approverId: {
    type: Number,
  
   
  },
  approverRole: {
    type: String,
    enum: ['SUPERVISOR', 'MANAGER', 'ADMIN', 'BOSS'],
    
  },
  action: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  remarks: {
    type: String,
    trim: true
  },
  actionAt: {
    type: Date
  }
}, {
    collection: 'leaveApprovals',
    timestamps: true, // includes createdAt and updatedAt
  });




export default mongoose.model('LeaveApproval', leaveApprovalSchema);
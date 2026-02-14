import mongoose from 'mongoose';

const leaveRequestSchema = new mongoose.Schema({
  id: {
    type: Number,
    unique: true
  },
  companyId: {
    type: Number,
 
 
  },
  employeeId: {
    type: Number,
   
   
  },
  requestType: {
    type: String,
    enum: ['LEAVE'],
    default: 'LEAVE'
  },
  leaveType: {
    type: String,
    enum: ['ANNUAL', 'MEDICAL', 'EMERGENCY'],
    
  },
  fromDate: {
    type: Date,
    
  },
  toDate: {
    type: Date,
    
  },
  totalDays: {
    type: Number
  },
  reason: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
    default: 'PENDING'
  },
  currentApproverId: {
    type: Number,
    
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: Number,
   
  }
}, {
    collection: 'leaveRequests',
    timestamps: true, // includes createdAt and updatedAt
  });





export default mongoose.model('LeaveRequest', leaveRequestSchema);
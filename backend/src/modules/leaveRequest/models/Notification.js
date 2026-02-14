import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  id: {
    type: Number,
    unique: true
  },
  companyId: {
    type: Number,
   
    ref: 'Company'
  },
  recipientUserId: {
    type: Number,
   
    ref: 'User'
  },
  referenceType: {
    type: String,
    enum: ['LEAVE_REQUEST', 'TASK', 'ATTENDANCE', 'PROJECT'],
   
  },
  referenceId: {
    type: Number,
   
  },
  title: {
    type: String,
    trim: true
  },
  message: {
    type: String,
    trim: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
    collection: 'notifications',
    timestamps: true, // includes createdAt and updatedAt
  });

notificationSchema.index({ recipientUserId: 1, isRead: 1 });



export default mongoose.model('Notification', notificationSchema);
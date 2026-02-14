import mongoose from 'mongoose';

const companyUserSchema = new mongoose.Schema({
  id: {
    type: Number,
   
    unique: true
  },
  companyId: {
    type: Number,
    required: true
  },
  userId: {
    type: Number,
    required: true
  },
  roleId:{
    type: Number, required: true 
  },
 
  isPrimary: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },

    joinedAt: { type: Date, default: Date.now }
}, {
  collection: 'companyUsers',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
}
  
);


export default mongoose.model('CompanyUser', companyUserSchema);
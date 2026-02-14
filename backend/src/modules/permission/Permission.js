
import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    module: { type: String, required: true },   // Project, Payroll
    action: { type: String, required: true },  
    isActive:{type:Boolean,default:true} ,
    code: { type: String, required: true, unique: true }
},  {
  collection: 'permissions',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

export default mongoose.model('Permission', permissionSchema);

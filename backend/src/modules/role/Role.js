// models/Role.js
import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true }, // manual numeric ID
  name: { type: String, required: true }, // Boss, Admin
  level: { type: Number, required: true },
  isSystemRole: { type: Boolean, default: true }
},  {
  collection: 'roles',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

export default mongoose.model ('Role', roleSchema);

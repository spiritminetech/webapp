// models/RolePermission.js
import mongoose from 'mongoose';

const rolePermissionSchema = new mongoose.Schema({
  roleId: { type: Number, required: true },
  permissionId: { type: Number, required: true }
}, {
  collection: 'rolePermissions',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});



export default mongoose.model('RolePermission', rolePermissionSchema);

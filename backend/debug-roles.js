import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from './src/modules/role/Role.js';
import RolePermission from './src/modules/rolePermission/RolePermission.js';
import Permission from './src/modules/permission/Permission.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const debugRoles = async () => {
  try {
    console.log('🔍 Debugging roles and permissions...\n');

    // Check all roles
    const roles = await Role.find().sort({ id: 1 });
    console.log('👑 Roles in database:');
    roles.forEach(role => {
      console.log(`   ID: ${role.id}, Name: ${role.name}, Level: ${role.level}`);
    });
    console.log('');

    // Check all permissions
    const permissions = await Permission.find().sort({ code: 1 });
    console.log('🔐 Permissions in database:');
    permissions.forEach(perm => {
      console.log(`   Code: ${perm.code}`);
    });
    console.log('');

    // Check role-permission mappings
    const rolePermissions = await RolePermission.find();
    console.log('🔗 Role-Permission mappings:');
    for (const rp of rolePermissions) {
      const role = await Role.findOne({ id: rp.roleId });
      const permission = await Permission.findOne({ id: rp.permissionId });
      console.log(`   Role: ${role?.name || 'Unknown'} (${rp.roleId}) → Permission: ${permission?.code || 'Unknown'} (${rp.permissionId})`);
    }

  } catch (error) {
    console.error('❌ Error debugging roles:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await debugRoles();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script execution error:', error);
  process.exit(1);
});
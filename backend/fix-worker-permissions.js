import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/modules/user/User.js';
import CompanyUser from './src/modules/companyUser/CompanyUser.js';
import Role from './src/modules/role/Role.js';
import Permission from './src/modules/permission/Permission.js';
import RolePermission from './src/modules/rolePermission/RolePermission.js';

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

const fixWorkerPermissions = async () => {
  try {
    console.log('🔧 Fixing worker permissions...\n');

    // 1. Find or create WORKER role
    let workerRole = await Role.findOne({ name: 'WORKER' });
    if (!workerRole) {
      const lastRole = await Role.findOne({}, {}, { sort: { id: -1 } });
      const nextId = lastRole ? lastRole.id + 1 : 1;
      
      workerRole = new Role({
        id: nextId,
        name: 'WORKER',
        description: 'Worker role with task and attendance permissions',
        isActive: true
      });
      await workerRole.save();
      console.log('✅ Created WORKER role');
    } else {
      console.log('✅ Found existing WORKER role');
    }

    // 2. Define required permissions for workers
    const requiredPermissions = [
      'WORKER_TASK_VIEW',
      'WORKER_TRIP_VIEW', 
      'COMMON_ATTENDANCE_VIEW',
      'PROFILE_VIEW',
      'LEAVE_REQUEST_VIEW'
    ];

    // 3. Create permissions if they don't exist
    for (const permCode of requiredPermissions) {
      let permission = await Permission.findOne({ code: permCode });
      if (!permission) {
        const lastPermission = await Permission.findOne({}, {}, { sort: { id: -1 } });
        const nextId = lastPermission ? lastPermission.id + 1 : 1;
        
        permission = new Permission({
          id: nextId,
          code: permCode,
          name: permCode.replace(/_/g, ' ').toLowerCase(),
          description: `Permission for ${permCode}`,
          isActive: true
        });
        await permission.save();
        console.log(`✅ Created permission: ${permCode}`);
      }

      // 4. Assign permission to WORKER role
      const existingRolePermission = await RolePermission.findOne({
        roleId: workerRole.id,
        permissionId: permission.id
      });

      if (!existingRolePermission) {
        const lastRolePermission = await RolePermission.findOne({}, {}, { sort: { id: -1 } });
        const nextId = lastRolePermission ? lastRolePermission.id + 1 : 1;
        
        const rolePermission = new RolePermission({
          id: nextId,
          roleId: workerRole.id,
          permissionId: permission.id,
          isActive: true
        });
        await rolePermission.save();
        console.log(`✅ Assigned ${permCode} to WORKER role`);
      }
    }

    // 5. Update test worker user to have WORKER role
    const testUser = await User.findOne({ email: 'testworker@company.com' });
    if (testUser) {
      const companyUser = await CompanyUser.findOne({ userId: testUser.id });
      if (companyUser) {
        companyUser.roleId = workerRole.id;
        await companyUser.save();
        console.log('✅ Updated test worker user role');
      }
    }

    // 6. Verify the setup
    console.log('\n📋 VERIFICATION:');
    console.log('================');
    
    const rolePermissions = await RolePermission.find({ roleId: workerRole.id });
    const permissionIds = rolePermissions.map(rp => rp.permissionId);
    const permissions = await Permission.find({ id: { $in: permissionIds } });
    
    console.log(`WORKER role (ID: ${workerRole.id}) has permissions:`);
    permissions.forEach(p => console.log(`- ${p.code}`));

    console.log('\n🎉 Worker permissions fixed!');
    console.log('📝 Users with WORKER role should now have access to:');
    console.log('   - Worker Dashboard (/worker/dashboard)');
    console.log('   - Worker Tasks (/worker/tasks)');
    console.log('   - Today Trip (/worker/today-trip)');
    console.log('   - Attendance (/attendance)');
    console.log('   - Leave Requests (/leave/request)');

  } catch (error) {
    console.error('❌ Error fixing worker permissions:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await fixWorkerPermissions();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script execution error:', error);
  process.exit(1);
});
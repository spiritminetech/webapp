import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CompanyUser from './src/modules/companyUser/CompanyUser.js';
import User from './src/modules/user/User.js';

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

const fixUserRole = async () => {
  try {
    console.log('🔧 Fixing user role...\n');

    // Find the user
    const user = await User.findOne({ email: 'testworker@company.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    console.log(`👤 Found user: ${user.email} (ID: ${user.id})`);

    // Update CompanyUser to use roleId 4 (WORKER)
    const result = await CompanyUser.updateOne(
      { userId: user.id },
      { roleId: 4 }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Updated user role to WORKER (roleId: 4)');
    } else {
      console.log('⚠️ No CompanyUser record was updated');
    }

    // Verify the change
    const companyUser = await CompanyUser.findOne({ userId: user.id });
    if (companyUser) {
      console.log(`✅ CompanyUser roleId is now: ${companyUser.roleId}`);
    }

    console.log('\n🎉 User role fixed! The user should now have WORKER permissions.');
    console.log('📋 Expected permissions: WORKER_TASK_VIEW, WORKER_TRIP_VIEW, COMMON_ATTENDANCE_VIEW, PROFILE_VIEW');

  } catch (error) {
    console.error('❌ Error fixing user role:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await fixUserRole();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script execution error:', error);
  process.exit(1);
});
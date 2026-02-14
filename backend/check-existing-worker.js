import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/modules/user/User.js';
import CompanyUser from './src/modules/companyUser/CompanyUser.js';
import Employee from './src/modules/employee/Employee.js';

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

const checkExistingWorker = async () => {
  try {
    console.log('🔍 Checking existing worker user...\n');

    // Find the worker user
    const workerUser = await User.findOne({ id: 2 });
    if (!workerUser) {
      console.log('❌ Worker user with ID 2 not found');
      return;
    }

    console.log('👤 Worker User:');
    console.log(`   ID: ${workerUser.id}, Email: ${workerUser.email}, Active: ${workerUser.isActive}`);

    // Check CompanyUser
    const companyUser = await CompanyUser.findOne({ userId: workerUser.id });
    if (companyUser) {
      console.log('🏢 Company User:');
      console.log(`   ID: ${companyUser.id}, UserID: ${companyUser.userId}, CompanyID: ${companyUser.companyId}, RoleID: ${companyUser.roleId}, Active: ${companyUser.isActive}`);
    } else {
      console.log('❌ No CompanyUser record found');
    }

    // Check Employee
    const employee = await Employee.findOne({ userId: workerUser.id });
    if (employee) {
      console.log('👥 Employee:');
      console.log(`   ID: ${employee.id}, Name: ${employee.fullName}, UserID: ${employee.userId}, CompanyID: ${employee.companyId}`);
    } else {
      console.log('❌ No Employee record found');
    }

    // Test common passwords
    const commonPasswords = ['password', 'password123', '123456', 'admin', 'worker'];
    console.log('\n🔐 Testing common passwords:');
    
    for (const pwd of commonPasswords) {
      const isValid = await bcrypt.compare(pwd, workerUser.passwordHash);
      console.log(`   Password '${pwd}': ${isValid ? '✅ VALID' : '❌ Invalid'}`);
      if (isValid) break;
    }

  } catch (error) {
    console.error('❌ Error checking worker:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await checkExistingWorker();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script execution error:', error);
  process.exit(1);
});
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

const debugUser = async () => {
  try {
    console.log('🔍 Debugging User Data...\n');

    // Check users
    const users = await User.find();
    console.log('👤 Users in database:');
    users.forEach(user => {
      console.log(`   ID: ${user.id}, Email: ${user.email}, Active: ${user.isActive}`);
      console.log(`   Password Hash: ${user.passwordHash.substring(0, 20)}...`);
    });
    console.log('');

    // Check company users
    const companyUsers = await CompanyUser.find();
    console.log('🏢 Company Users:');
    companyUsers.forEach(cu => {
      console.log(`   ID: ${cu.id}, UserID: ${cu.userId}, CompanyID: ${cu.companyId}, RoleID: ${cu.roleId}, Active: ${cu.isActive}`);
    });
    console.log('');

    // Check employees
    const employees = await Employee.find();
    console.log('👥 Employees:');
    employees.forEach(emp => {
      console.log(`   ID: ${emp.id}, Name: ${emp.fullName}, UserID: ${emp.userId}, CompanyID: ${emp.companyId}`);
    });
    console.log('');

    // Test password verification
    const testUser = await User.findOne({ email: 'worker@company.com' });
    if (testUser) {
      console.log('🔐 Testing password verification:');
      const isValid = await bcrypt.compare('password123', testUser.passwordHash);
      console.log(`   Password 'password123' is valid: ${isValid}`);
    }

  } catch (error) {
    console.error('❌ Error debugging user:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await debugUser();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script execution error:', error);
  process.exit(1);
});
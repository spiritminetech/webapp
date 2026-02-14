import mongoose from 'mongoose';
import dotenv from 'dotenv';
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

const debugUsers = async () => {
  try {
    console.log('🔍 Debugging User Data...\n');

    // Check users
    const users = await User.find();
    console.log('👤 Users in database:');
    users.forEach(user => {
      console.log(`   ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Active: ${user.isActive}`);
    });
    console.log('');

    // Check company users
    const companyUsers = await CompanyUser.find();
    console.log('🏢 Company Users:');
    companyUsers.forEach(cu => {
      console.log(`   UserID: ${cu.userId}, CompanyID: ${cu.companyId}, Role: ${cu.role}`);
    });
    console.log('');

    // Check employees
    const employees = await Employee.find();
    console.log('👥 Employees:');
    employees.forEach(emp => {
      console.log(`   ID: ${emp.id}, UserID: ${emp.userId}, Name: ${emp.fullName}, Job: ${emp.jobTitle}`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ Error debugging users:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await debugUsers();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script execution error:', error);
  process.exit(1);
});
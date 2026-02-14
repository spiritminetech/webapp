import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/modules/user/User.js';
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

const debugEmployeeLink = async () => {
  try {
    console.log('🔍 Debugging employee link...\n');

    // Find the user
    const user = await User.findOne({ email: 'testworker@company.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    console.log(`👤 User: ID ${user.id}, Email: ${user.email}`);

    // Find employee with this userId
    const employee = await Employee.findOne({ userId: user.id });
    if (employee) {
      console.log(`👥 Employee: ID ${employee.id}, Name: ${employee.fullName}, CompanyID: ${employee.companyId}, Status: ${employee.status}`);
    } else {
      console.log('❌ No employee found with this userId');
    }

    // Find employee with ID 1
    const employee1 = await Employee.findOne({ id: 1 });
    if (employee1) {
      console.log(`👥 Employee ID 1: Name: ${employee1.fullName}, UserID: ${employee1.userId}, CompanyID: ${employee1.companyId}, Status: ${employee1.status}`);
    }

    // Check what the resolveEmployee function would find
    console.log('\n🔍 Testing resolveEmployee logic:');
    const testEmployee = await Employee.findOne({
      userId: user.id,
      companyId: 1,
      status: "ACTIVE"
    });
    
    if (testEmployee) {
      console.log(`✅ resolveEmployee would find: ${testEmployee.fullName}`);
    } else {
      console.log('❌ resolveEmployee would not find any employee');
      
      // Check each condition separately
      const byUserId = await Employee.findOne({ userId: user.id });
      const byCompanyId = await Employee.findOne({ companyId: 1 });
      const byStatus = await Employee.findOne({ status: "ACTIVE" });
      
      console.log(`   - Employee with userId ${user.id}: ${byUserId ? 'Found' : 'Not found'}`);
      console.log(`   - Employee with companyId 1: ${byCompanyId ? 'Found' : 'Not found'}`);
      console.log(`   - Employee with status ACTIVE: ${byStatus ? 'Found' : 'Not found'}`);
    }

  } catch (error) {
    console.error('❌ Error debugging employee link:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await debugEmployeeLink();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script execution error:', error);
  process.exit(1);
});
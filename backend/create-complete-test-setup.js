import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/modules/user/User.js';
import CompanyUser from './src/modules/companyUser/CompanyUser.js';
import Employee from './src/modules/employee/Employee.js';
import Role from './src/modules/role/Role.js';
import Company from './src/modules/company/Company.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('🔍 Database name:', mongoose.connection.name);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Get next available ID for a collection
const getNextId = async (Model) => {
  const lastRecord = await Model.findOne().sort({ id: -1 });
  const nextId = lastRecord ? lastRecord.id + 1 : 1;
  
  // Double-check that this ID doesn't exist
  const existing = await Model.findOne({ id: nextId });
  if (existing) {
    // If it exists, find the highest ID and add 1
    const allRecords = await Model.find({}, { id: 1 }).sort({ id: -1 }).limit(10);
    const maxId = Math.max(...allRecords.map(r => r.id), 0);
    return maxId + 1;
  }
  
  return nextId;
};

const createCompleteTestSetup = async () => {
  try {
    console.log('🏗️ Creating complete test setup...\n');

    // 1. Ensure Company exists
    let company = await Company.findOne({ id: 1 });
    if (!company) {
      company = new Company({
        id: 1,
        name: 'Test Company',
        tenantCode: 'TEST001',
        isActive: true
      });
      await company.save();
      console.log('✅ Created Test Company');
    } else {
      console.log('✅ Company already exists');
    }

    // 2. Ensure Role exists
    let workerRole = await Role.findOne({ id: 1 });
    if (!workerRole) {
      workerRole = new Role({
        id: 1,
        name: 'Worker',
        level: 1,
        isSystemRole: true
      });
      await workerRole.save();
      console.log('✅ Created Worker role');
    } else {
      console.log('✅ Worker role already exists');
    }

    // 3. Create/Update User
    const testEmail = 'testworker@company.com';
    let user = await User.findOne({ email: testEmail });
    
    if (!user) {
      const userId = await getNextId(User);
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      user = new User({
        id: userId,
        email: testEmail,
        passwordHash: hashedPassword,
        isActive: true
      });
      await user.save();
      console.log(`✅ Created user with ID: ${userId}, Email: ${testEmail}`);
    } else {
      console.log(`✅ User already exists: ${user.id}, ${user.email}`);
    }

    // 4. Create/Update CompanyUser
    let companyUser = await CompanyUser.findOne({ userId: user.id });
    if (!companyUser) {
      const companyUserId = await getNextId(CompanyUser);
      companyUser = new CompanyUser({
        id: companyUserId,
        userId: user.id,
        companyId: 1,
        roleId: 1,
        isActive: true,
        status: 'ACTIVE'
      });
      await companyUser.save();
      console.log(`✅ Created CompanyUser with ID: ${companyUserId}`);
    } else {
      console.log(`✅ CompanyUser already exists: ${companyUser.id}`);
    }

    // 5. Update Employee to link to this user
    const employee = await Employee.findOne({ id: 1 });
    if (employee) {
      // Only update the userId field
      await Employee.updateOne({ id: 1 }, { userId: user.id });
      console.log(`✅ Linked Employee ID 1 (${employee.fullName}) to User ID ${user.id}`);
    } else {
      console.log('❌ Employee ID 1 not found');
    }

    console.log('\n🎉 Complete test setup finished!');
    console.log('📋 Login credentials:');
    console.log(`   Email: ${testEmail}`);
    console.log('   Password: password123');

  } catch (error) {
    console.error('❌ Error creating test setup:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await createCompleteTestSetup();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script execution error:', error);
  process.exit(1);
});
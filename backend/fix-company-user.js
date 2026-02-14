import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/modules/user/User.js';
import CompanyUser from './src/modules/companyUser/CompanyUser.js';
import Role from './src/modules/role/Role.js';
import Company from './src/modules/company/Company.js';

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

const fixCompanyUser = async () => {
  try {
    console.log('🔧 Fixing CompanyUser record...\n');

    // Ensure company exists
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
    }

    // Find the user
    const user = await User.findOne({ email: 'worker@company.com' });
    if (!user) {
      console.error('❌ User not found');
      return;
    }

    // Check if CompanyUser already exists
    const existingCompanyUser = await CompanyUser.findOne({ userId: user.id });
    if (existingCompanyUser) {
      console.log('✅ CompanyUser record already exists');
      console.log(`   ID: ${existingCompanyUser.id}, UserID: ${existingCompanyUser.userId}, CompanyID: ${existingCompanyUser.companyId}, RoleID: ${existingCompanyUser.roleId}`);
      return;
    }

    // Ensure role exists
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
    }

    // Create CompanyUser record
    const companyUserId = await getNextId(CompanyUser);
    const companyUser = new CompanyUser({
      id: companyUserId,
      userId: user.id,
      companyId: 1,
      roleId: 1,
      isActive: true,
      status: 'ACTIVE'
    });

    await companyUser.save();
    console.log(`✅ Created CompanyUser record with ID: ${companyUserId}`);
    console.log(`   UserID: ${user.id}, CompanyID: 1, RoleID: 1`);

  } catch (error) {
    console.error('❌ Error fixing CompanyUser:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await fixCompanyUser();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script execution error:', error);
  process.exit(1);
});
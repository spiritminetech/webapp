import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/modules/user/User.js';
import CompanyUser from './src/modules/companyUser/CompanyUser.js';
import Employee from './src/modules/employee/Employee.js';
import Role from './src/modules/role/Role.js';

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

const createTestUser = async () => {
  try {
    console.log('🔍 Creating test user for authentication...\n');

    // Ensure basic role exists
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

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'worker@company.com' });
    if (existingUser) {
      console.log('⚠️ Test user already exists');
      console.log(`   User ID: ${existingUser.id}, Email: ${existingUser.email}`);
      
      // Check if employee is linked
      const employee = await Employee.findOne({ userId: existingUser.id });
      if (employee) {
        console.log(`   Linked to Employee ID: ${employee.id} (${employee.fullName})`);
      } else {
        console.log('   Not linked to any employee - linking now...');
        const workerEmployee = await Employee.findOne({ fullName: 'John Worker' });
        if (workerEmployee) {
          workerEmployee.userId = existingUser.id;
          await workerEmployee.save();
          console.log(`   ✅ Linked user to employee ${workerEmployee.id}`);
        }
      }
      return;
    }

    // Create a test user
    const userId = await getNextId(User);
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const testUser = new User({
      id: userId,
      email: 'worker@company.com',
      passwordHash: hashedPassword,
      isActive: true
    });

    await testUser.save();
    console.log(`✅ Created test user with ID: ${userId}`);
    console.log(`   Email: worker@company.com`);
    console.log(`   Password: password123`);

    // Create company user relationship
    const companyUserId = await getNextId(CompanyUser);
    const companyUser = new CompanyUser({
      id: companyUserId,
      userId: userId,
      companyId: 1,
      roleId: 1, // Assuming roleId 1 is for workers
      isActive: true,
      createdAt: new Date()
    });

    await companyUser.save();
    console.log(`✅ Created company user relationship with ID: ${companyUserId}`);

    // Link the user to the existing employee
    const employee = await Employee.findOne({ fullName: 'John Worker' });
    if (employee) {
      employee.userId = userId;
      await employee.save();
      console.log(`✅ Linked user to employee ${employee.id} (${employee.fullName})`);
    } else {
      console.log('⚠️ No employee found to link to');
    }

    console.log('\n🎉 Test user setup complete!');
    console.log('📋 Login credentials:');
    console.log('   Email: worker@company.com');
    console.log('   Password: password123');
    console.log('\n🌐 You can now log in at: http://localhost:3000/login');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await createTestUser();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script execution error:', error);
  process.exit(1);
});
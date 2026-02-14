import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
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

const testLogin = async (email, password) => {
  console.log(`\n🔐 Testing login for: ${email}`);
  
  try {
    // Find user
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ User found: ID ${user.id}, Email: ${user.email}`);
    
    // Check password
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      console.log('❌ Password does not match');
      return;
    }
    
    console.log('✅ Password matches');
    
    // Check company mappings
    const mappings = await CompanyUser.find({
      userId: user.id,
      isActive: true
    });
    
    console.log(`📋 Found ${mappings.length} company mappings`);
    
    for (const mapping of mappings) {
      console.log(`   - CompanyID: ${mapping.companyId}, RoleID: ${mapping.roleId}`);
      
      const company = await Company.findOne({ id: mapping.companyId, isActive: true });
      const role = await Role.findOne({ id: mapping.roleId });
      
      console.log(`   - Company: ${company?.name || 'Not found'}`);
      console.log(`   - Role: ${role?.name || 'Not found'}`);
    }
    
    if (mappings.length === 0) {
      console.log('❌ No company access');
      return;
    }
    
    console.log('✅ Login should succeed');
    
  } catch (error) {
    console.error('❌ Login test error:', error);
  }
};

const main = async () => {
  await connectDB();
  
  // Test different users
  await testLogin('worker@gmail.com', 'password123');
  await testLogin('dashboard.worker@company.com', 'password123');
  await testLogin('admin@gmail.com', 'password123');
  
  await mongoose.disconnect();
  console.log('\n✅ Disconnected from MongoDB');
};

main().catch(console.error);
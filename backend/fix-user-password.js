import mongoose from 'mongoose';
import bcrypt from 'bcrypt'; // Same library as authService
import dotenv from 'dotenv';
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

const fixUserPassword = async (email, newPassword) => {
  try {
    console.log(`🔧 Fixing password for: ${email}`);
    
    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    // Hash the new password using the same bcrypt library as authService
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the user's password
    await User.updateOne(
      { email },
      { passwordHash: hashedPassword }
    );
    
    console.log(`✅ Password updated for ${email}`);
    console.log(`   New password: ${newPassword}`);
    
    // Test the password
    const testMatch = await bcrypt.compare(newPassword, hashedPassword);
    console.log(`   Password test: ${testMatch ? '✅ PASS' : '❌ FAIL'}`);
    
  } catch (error) {
    console.error('❌ Error fixing password:', error);
  }
};

const main = async () => {
  await connectDB();
  
  // Fix passwords for common test users
  await fixUserPassword('worker@gmail.com', 'password123');
  await fixUserPassword('admin@gmail.com', 'password123');
  await fixUserPassword('supervisor@gmail.com', 'password123');
  await fixUserPassword('dashboard.worker@company.com', 'password123');
  
  await mongoose.disconnect();
  console.log('\n✅ Disconnected from MongoDB');
  console.log('\n🎉 You can now login with:');
  console.log('   Email: worker@gmail.com');
  console.log('   Password: password123');
  console.log('\n   Or any of the other fixed accounts with password123');
};

main().catch(console.error);
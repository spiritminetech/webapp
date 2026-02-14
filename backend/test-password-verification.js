import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from './src/modules/user/User.js';
import appConfig from './src/config/app.config.js';

async function testPasswordVerification() {
  try {
    console.log('🔍 Testing Password Verification...\n');

    // Connect to database
    await mongoose.connect(appConfig.database.uri);
    console.log('✅ Connected to database');

    // Test supervisor user
    const supervisorUser = await User.findOne({ email: 'supervisor@gmail.com' });
    if (supervisorUser) {
      console.log(`\n👤 Found supervisor user: ${supervisorUser.email}`);
      console.log(`   User ID: ${supervisorUser.id}`);
      console.log(`   Password hash: ${supervisorUser.passwordHash.substring(0, 20)}...`);
      
      // Test different passwords
      const passwords = ['password123', 'password', '123456', 'admin', 'supervisor'];
      
      for (const password of passwords) {
        const isValid = await bcrypt.compare(password, supervisorUser.passwordHash);
        console.log(`   Password '${password}': ${isValid ? '✅ VALID' : '❌ Invalid'}`);
        if (isValid) {
          console.log(`\n🎯 Correct password found: ${password}`);
          break;
        }
      }
    } else {
      console.log('❌ Supervisor user not found');
    }

    // Also test worker user
    const workerUser = await User.findOne({ email: 'worker@gmail.com' });
    if (workerUser) {
      console.log(`\n👤 Found worker user: ${workerUser.email}`);
      const isValid = await bcrypt.compare('password123', workerUser.passwordHash);
      console.log(`   Password 'password123': ${isValid ? '✅ VALID' : '❌ Invalid'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

testPasswordVerification();
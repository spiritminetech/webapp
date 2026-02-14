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

const linkUserToEmployee = async () => {
  try {
    console.log('🔗 Linking user to employee...\n');

    // Find the user
    const user = await User.findOne({ email: 'john.worker@example.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 Found user:', { id: user.id, email: user.email });

    // Find the employee
    const employee = await Employee.findOne({ id: 1 });
    if (!employee) {
      console.log('❌ Employee not found');
      return;
    }

    console.log('👥 Found employee:', { id: employee.id, name: employee.fullName });

    // Link them
    employee.userId = user.id;
    await employee.save();

    console.log('✅ Successfully linked user to employee');
    console.log(`   User ID ${user.id} (${user.email}) → Employee ID ${employee.id} (${employee.fullName})`);

  } catch (error) {
    console.error('❌ Error linking user to employee:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await linkUserToEmployee();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script execution error:', error);
  process.exit(1);
});
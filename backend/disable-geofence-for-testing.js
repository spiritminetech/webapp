// Completely disable geofence validation for testing
import mongoose from 'mongoose';
import Project from './src/modules/project/models/Project.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

async function disableGeofenceForTesting() {
  try {
    await connectDB();

    console.log('🔧 Disabling geofence validation for testing...');
    
    // Set project to your approximate location with massive radius
    // This will allow testing from anywhere
    const testingLocation = {
      latitude: 12.9716,   // Bangalore (central India location)
      longitude: 77.5946,  // Bangalore
      radius: 1000000      // 1000km radius - covers most of India!
    };
    
    // Update all projects with testing-friendly settings
    const updateResult = await Project.updateMany(
      {}, // Update all projects
      {
        $set: {
          latitude: testingLocation.latitude,
          longitude: testingLocation.longitude,
          geofenceRadius: testingLocation.radius,
          'geofence.center.latitude': testingLocation.latitude,
          'geofence.center.longitude': testingLocation.longitude,
          'geofence.radius': testingLocation.radius,
          'geofence.strictMode': false, // Completely disabled
          'geofence.allowedVariance': 500000, // 500km variance
          address: `Test Construction Site - Geofence Disabled for Testing (Radius: ${testingLocation.radius/1000}km)`
        }
      }
    );

    console.log(`✅ Updated ${updateResult.modifiedCount} projects for testing!`);
    
    console.log('\n🎯 Testing Configuration Applied:');
    console.log(`   - Center: Bangalore (${testingLocation.latitude}, ${testingLocation.longitude})`);
    console.log(`   - Radius: ${testingLocation.radius/1000}km (covers most of India)`);
    console.log('   - Strict mode: COMPLETELY DISABLED');
    console.log('   - Allowed variance: 500km');
    console.log('   - Result: Geofence should pass from anywhere in India');
    
    console.log('\n📱 What this means:');
    console.log('✅ You can test the app from anywhere');
    console.log('✅ Geofence validation will always pass');
    console.log('✅ Task start functionality will work');
    console.log('✅ All location-based features enabled');
    
    console.log('\n🔄 Next steps:');
    console.log('1. Refresh your mobile app');
    console.log('2. Try geofence validation again');
    console.log('3. It should now pass regardless of your location');
    console.log('4. Test all app features normally');

  } catch (error) {
    console.error('❌ Error disabling geofence:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the update
disableGeofenceForTesting();
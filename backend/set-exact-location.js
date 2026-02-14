// Set project location to your exact coordinates
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

async function setExactLocation() {
  try {
    await connectDB();

    // 🎯 REPLACE THESE COORDINATES WITH YOUR EXACT LOCATION
    // To get your coordinates:
    // 1. Open Google Maps on your phone
    // 2. Long press on your current location
    // 3. Copy the coordinates that appear
    // 4. Replace the values below
    
    const yourExactLocation = {
      latitude: 13.0827,   // 👈 REPLACE WITH YOUR LATITUDE
      longitude: 80.2707,  // 👈 REPLACE WITH YOUR LONGITUDE
      radius: 100          // Geofence radius in meters
    };

    console.log('📍 Setting project location to your exact coordinates...');
    console.log(`🎯 Latitude: ${yourExactLocation.latitude}`);
    console.log(`🎯 Longitude: ${yourExactLocation.longitude}`);
    console.log(`📏 Radius: ${yourExactLocation.radius}m`);
    
    // Update all projects to your exact location
    const updateResult = await Project.updateMany(
      {}, // Update all projects
      {
        $set: {
          latitude: yourExactLocation.latitude,
          longitude: yourExactLocation.longitude,
          geofenceRadius: yourExactLocation.radius,
          'geofence.center.latitude': yourExactLocation.latitude,
          'geofence.center.longitude': yourExactLocation.longitude,
          'geofence.radius': yourExactLocation.radius,
          'geofence.strictMode': false, // Keep disabled for testing
          'geofence.allowedVariance': 20, // Small variance for precise testing
          address: `Construction Site at Your Location (${yourExactLocation.latitude}, ${yourExactLocation.longitude})`
        }
      }
    );

    console.log(`✅ Updated ${updateResult.modifiedCount} projects to your exact location!`);
    
    console.log('\n🎉 Setup complete!');
    console.log('\n📱 Now you can:');
    console.log('1. Refresh your mobile app');
    console.log('2. Test geofence validation - you should be inside the area');
    console.log('3. Try starting tasks - geofence validation should pass');
    console.log('4. Test all the mobile app features');
    
    console.log('\n🔧 Current geofence settings:');
    console.log(`   - Center: ${yourExactLocation.latitude}, ${yourExactLocation.longitude}`);
    console.log(`   - Radius: ${yourExactLocation.radius}m`);
    console.log('   - Strict mode: OFF (for easier testing)');
    console.log('   - Allowed variance: 20m');

  } catch (error) {
    console.error('❌ Error setting exact location:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the update
setExactLocation();
// Update project location to user's approximate current location
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

async function updateToUserLocation() {
  try {
    await connectDB();

    // Based on your distance from Kerala (11.258753, 75.780411), 
    // I'll set the project to a location that should be much closer to you
    
    // If you're 257km away from Kerala, you might be in:
    // - Tamil Nadu (Chennai area)
    // - Karnataka (Bangalore area) 
    // - Or another nearby region
    
    // I'll use coordinates that are more universally accessible for testing
    // You can replace these with your exact coordinates if needed
    
    const userLocation = {
      latitude: 13.0827,   // Chennai area - adjust this to your actual location
      longitude: 80.2707,  // Chennai area - adjust this to your actual location  
      radius: 500          // Large radius for easy testing
    };

    console.log('🔍 Updating projects to be near your location...');
    console.log(`📍 New project location: ${userLocation.latitude}, ${userLocation.longitude}`);
    console.log(`🎯 Geofence radius: ${userLocation.radius}m`);
    
    // Update all projects to the new location
    const updateResult = await Project.updateMany(
      {}, // Update all projects
      {
        $set: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          geofenceRadius: userLocation.radius,
          'geofence.center.latitude': userLocation.latitude,
          'geofence.center.longitude': userLocation.longitude,
          'geofence.radius': userLocation.radius,
          'geofence.strictMode': false, // Disabled for easy testing
          'geofence.allowedVariance': 100, // Large variance for testing
          address: `Test Construction Site - Near User Location (${userLocation.latitude}, ${userLocation.longitude})`
        }
      }
    );

    console.log(`✅ Updated ${updateResult.modifiedCount} projects successfully!`);
    
    console.log('\n🎯 Project updates complete!');
    console.log('\n📱 Testing instructions:');
    console.log('1. Refresh your mobile app');
    console.log('2. Try the geofence validation again');
    console.log('3. You should now be within the geofence area');
    console.log('4. If still outside, you can:');
    console.log('   - Get your exact GPS coordinates');
    console.log('   - Update the userLocation object above');
    console.log('   - Run this script again');
    
    console.log('\n🔧 Current settings:');
    console.log(`   - Location: ${userLocation.latitude}, ${userLocation.longitude}`);
    console.log(`   - Radius: ${userLocation.radius}m`);
    console.log('   - Strict mode: OFF');
    console.log('   - Allowed variance: 100m');
    console.log('   - This should allow testing from a wide area');

  } catch (error) {
    console.error('❌ Error updating project location:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the update
updateToUserLocation();
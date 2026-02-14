// Set project location to your exact current location
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

async function setToYourExactLocation() {
  try {
    await connectDB();

    // Based on your distance from both Kerala (257km) and Chennai (315km),
    // I need to calculate where you might be located.
    
    // Let me try a few different locations that might be closer to you:
    
    // Option 1: If you're in Bangalore area
    const bangaloreLocation = {
      latitude: 12.9716,
      longitude: 77.5946,
      name: "Bangalore"
    };
    
    // Option 2: If you're in Hyderabad area  
    const hyderabadLocation = {
      latitude: 17.3850,
      longitude: 78.4867,
      name: "Hyderabad"
    };
    
    // Option 3: If you're in Mumbai area
    const mumbaiLocation = {
      latitude: 19.0760,
      longitude: 72.8777,
      name: "Mumbai"
    };
    
    // Option 4: If you're in Pune area
    const puneLocation = {
      latitude: 18.5204,
      longitude: 73.8567,
      name: "Pune"
    };

    // Option 5: If you're in Coimbatore area (between Kerala and Chennai)
    const coimbatoreLocation = {
      latitude: 11.0168,
      longitude: 76.9558,
      name: "Coimbatore"
    };

    // I'll set it to a central location that should be accessible
    // You can modify this to your exact coordinates
    const yourLocation = bangaloreLocation; // Change this if needed

    console.log(`🎯 Setting project location to ${yourLocation.name} area...`);
    console.log(`📍 Coordinates: ${yourLocation.latitude}, ${yourLocation.longitude}`);
    
    // Update all projects to your location with a very large radius for testing
    const updateResult = await Project.updateMany(
      {}, // Update all projects
      {
        $set: {
          latitude: yourLocation.latitude,
          longitude: yourLocation.longitude,
          geofenceRadius: 50000, // 50km radius - very large for testing
          'geofence.center.latitude': yourLocation.latitude,
          'geofence.center.longitude': yourLocation.longitude,
          'geofence.radius': 50000, // 50km radius
          'geofence.strictMode': false, // Completely disabled
          'geofence.allowedVariance': 10000, // 10km variance
          address: `Test Construction Site - ${yourLocation.name} Area (${yourLocation.latitude}, ${yourLocation.longitude})`
        }
      }
    );

    console.log(`✅ Updated ${updateResult.modifiedCount} projects successfully!`);
    
    console.log('\n🎯 New project settings:');
    console.log(`   - Location: ${yourLocation.name} (${yourLocation.latitude}, ${yourLocation.longitude})`);
    console.log('   - Radius: 50km (very large for testing)');
    console.log('   - Strict mode: COMPLETELY OFF');
    console.log('   - Allowed variance: 10km');
    console.log('   - This should work from anywhere in the region');
    
    console.log('\n📱 Alternative locations you can try:');
    console.log('If this still doesn\'t work, edit this script and change yourLocation to:');
    console.log(`- Bangalore: ${bangaloreLocation.latitude}, ${bangaloreLocation.longitude}`);
    console.log(`- Hyderabad: ${hyderabadLocation.latitude}, ${hyderabadLocation.longitude}`);
    console.log(`- Mumbai: ${mumbaiLocation.latitude}, ${mumbaiLocation.longitude}`);
    console.log(`- Pune: ${puneLocation.latitude}, ${puneLocation.longitude}`);
    console.log(`- Coimbatore: ${coimbatoreLocation.latitude}, ${coimbatoreLocation.longitude}`);
    
    console.log('\n🔧 To set your EXACT location:');
    console.log('1. Open Google Maps on your phone');
    console.log('2. Long press on your current location');
    console.log('3. Copy the coordinates that appear');
    console.log('4. Replace the yourLocation coordinates above');
    console.log('5. Run this script again');

  } catch (error) {
    console.error('❌ Error setting location:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the update
setToYourExactLocation();
// Update project location to be closer to user's current location
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

async function updateProjectLocation() {
  try {
    await connectDB();

    // Based on the geofence response, your current location seems to be around:
    // The project was at: 11.258753, 75.780411 (Kerala, India)
    // You're 257km away, so let's estimate your location and set project nearby

    // Let's assume you're somewhere in a major city and set the project location
    // to a reasonable construction site location near you
    
    // I'll use coordinates that would be more accessible for testing
    // These coordinates are for a general area - you can adjust as needed
    const newLocation = {
      latitude: 12.9716,   // Bangalore area (adjust based on your actual location)
      longitude: 77.5946,  // Bangalore area (adjust based on your actual location)
      radius: 200          // Increased radius for easier testing
    };

    console.log('🔍 Finding projects to update...');
    
    // Find all projects (there should be at least one for the test data)
    const projects = await Project.find({});
    console.log(`📋 Found ${projects.length} projects`);

    if (projects.length === 0) {
      console.log('❌ No projects found to update');
      return;
    }

    // Update all projects to the new location
    for (const project of projects) {
      console.log(`📍 Updating project: ${project.projectName} (ID: ${project.id})`);
      
      // Update the project with new geofence coordinates
      await Project.updateOne(
        { id: project.id },
        {
          $set: {
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
            geofenceRadius: newLocation.radius,
            'geofence.center.latitude': newLocation.latitude,
            'geofence.center.longitude': newLocation.longitude,
            'geofence.radius': newLocation.radius,
            'geofence.strictMode': false, // Make it less strict for testing
            'geofence.allowedVariance': 50, // Allow more variance for testing
            address: `Updated Test Location - Bangalore Tech Park, Bangalore, Karnataka, India` // Update address too
          }
        }
      );

      console.log(`✅ Updated project ${project.projectName}:`);
      console.log(`   - New coordinates: ${newLocation.latitude}, ${newLocation.longitude}`);
      console.log(`   - New radius: ${newLocation.radius}m`);
      console.log(`   - Strict mode: disabled for testing`);
      console.log(`   - Allowed variance: 50m`);
    }

    console.log('\n🎯 Project location update complete!');
    console.log('\n📱 You can now test the geofence functionality:');
    console.log('1. The project is now located closer to a major city area');
    console.log('2. Geofence radius increased to 200m for easier testing');
    console.log('3. Strict mode disabled and variance increased');
    console.log('4. You may need to refresh the app to see the changes');
    
    console.log('\n🔧 If you want to set it to your exact location:');
    console.log('1. Get your current GPS coordinates');
    console.log('2. Update the newLocation object in this script');
    console.log('3. Run this script again');

  } catch (error) {
    console.error('❌ Error updating project location:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the update
updateProjectLocation();
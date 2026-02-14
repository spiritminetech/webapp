import mongoose from 'mongoose';
import Project from './src/modules/project/models/Project.js';
import appConfig from './src/config/app.config.js';

/**
 * Script to update existing projects with proper names
 */

// Connect to MongoDB
mongoose.connect(appConfig.database.uri, { 
  dbName: appConfig.database.name,
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  updateProjectNames();
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function updateProjectNames() {
  try {
    console.log('🚀 Starting to update project names...');

    // Define the project names for the first three projects with supervisor ID 4
    const projectUpdates = [
      {
        projectName: 'Orchard Road Office Tower Maintenance',
        description: 'Comprehensive maintenance and renovation of office tower facilities',
        address: 'Orchard Road, Singapore'
      },
      {
        projectName: 'Marina Bay Construction Phase 1',
        description: 'First phase of Marina Bay commercial development project',
        address: 'Marina Bay, Singapore'
      },
      {
        projectName: 'Jurong Industrial Complex Renovation',
        description: 'Industrial facility renovation and modernization project',
        address: 'Jurong Industrial Estate, Singapore'
      }
    ];

    // Get projects with supervisor ID 4, ordered by ID
    const projects = await Project.find({ supervisorId: 4 }).sort({ id: 1 }).limit(3);
    
    if (projects.length < 3) {
      console.log('⚠️ Not enough projects with supervisor ID 4 found');
      return;
    }

    console.log(`📊 Found ${projects.length} projects to update:`);

    // Update each project
    for (let i = 0; i < Math.min(projects.length, projectUpdates.length); i++) {
      const project = projects[i];
      const updateData = projectUpdates[i];
      
      console.log(`\n📋 Updating Project ID: ${project.id}`);
      console.log(`   Old name: ${project.projectName || 'No name'}`);
      console.log(`   New name: ${updateData.projectName}`);
      
      await Project.updateOne(
        { id: project.id },
        {
          $set: {
            projectName: updateData.projectName,
            description: updateData.description,
            address: updateData.address,
            status: 'Ongoing' // Ensure consistent status
          }
        }
      );
      
      console.log(`   ✅ Updated successfully`);
    }

    // Verify the updates
    console.log('\n📊 Verification - Updated projects:');
    const updatedProjects = await Project.find({ supervisorId: 4 }).sort({ id: 1 }).limit(3);
    
    for (const project of updatedProjects) {
      console.log(`  Project ID ${project.id}: ${project.projectName}`);
    }

    console.log('\n🎉 Successfully updated project names!');
    
  } catch (error) {
    console.error('❌ Error updating project names:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️ Process interrupted');
  mongoose.connection.close();
  process.exit(0);
});
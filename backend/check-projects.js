import mongoose from 'mongoose';
import Project from './src/modules/project/models/Project.js';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';
import appConfig from './src/config/app.config.js';

// Connect to MongoDB
mongoose.connect(appConfig.database.uri, { 
  dbName: appConfig.database.name,
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  checkProjects();
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function checkProjects() {
  try {
    console.log('🔍 Checking existing projects...\n');

    // Get all projects
    const projects = await Project.find().sort({ id: 1 });
    
    console.log(`📊 Found ${projects.length} projects:`);
    
    for (const project of projects) {
      console.log(`\n📋 Project ID: ${project.id}`);
      console.log(`   Name: ${project.name || 'No name'}`);
      console.log(`   Location: ${project.location || 'No location'}`);
      console.log(`   Status: ${project.status || 'No status'}`);
      console.log(`   Supervisor ID: ${project.supervisorId || 'No supervisor'}`);
    }

    // Check assignments
    const today = new Date().toISOString().split('T')[0];
    console.log(`\n📅 Checking assignments for ${today}:`);
    
    const assignments = await WorkerTaskAssignment.find({ date: today });
    console.log(`📝 Found ${assignments.length} assignments:`);
    
    for (const assignment of assignments) {
      console.log(`   Assignment ID: ${assignment.id}, Project ID: ${assignment.projectId}, Employee ID: ${assignment.employeeId}`);
    }

    // Check which project IDs we should use
    const projectIds = projects.map(p => p.id).filter(id => id !== undefined);
    console.log(`\n🎯 Available Project IDs: ${projectIds.join(', ')}`);

  } catch (error) {
    console.error('❌ Error checking projects:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️ Process interrupted');
  mongoose.connection.close();
  process.exit(0);
});
import mongoose from 'mongoose';
import Employee from './src/modules/employee/Employee.js';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';
import Project from './src/modules/project/models/Project.js';
import appConfig from './src/config/app.config.js';

/**
 * Script to populate sample worker assignments for the three projects
 * This will make the Assigned Projects show realistic worker counts instead of 0
 */

// Connect to MongoDB
mongoose.connect(appConfig.database.uri, { 
  dbName: appConfig.database.name,
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  populateProjectWorkers();
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function populateProjectWorkers() {
  try {
    console.log('🚀 Starting to populate project workers...');

    // Get the current date for assignments
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Define the projects and their desired worker counts
    const projectWorkerCounts = [
      { 
        projectName: 'Orchard Road Office Tower Maintenance',
        projectId: 1001, // Actual project ID from database
        workerCount: 3,
        supervisorId: 4
      },
      { 
        projectName: 'Marina Bay Construction Phase 1',
        projectId: 1002, // Actual project ID from database
        workerCount: 2,
        supervisorId: 4
      },
      { 
        projectName: 'Jurong Industrial Complex Renovation',
        projectId: 1003, // Actual project ID from database
        workerCount: 1,
        supervisorId: 4
      }
    ];

    // First, let's check if we have enough employees
    const employees = await Employee.find({ status: 'ACTIVE' }).limit(10);
    console.log(`📊 Found ${employees.length} active employees`);

    if (employees.length < 6) {
      console.log('⚠️ Not enough employees found. Creating sample employees...');
      await createSampleEmployees();
      // Refresh employee list
      const newEmployees = await Employee.find({ status: 'ACTIVE' }).limit(10);
      employees.push(...newEmployees);
    }

    // Clear existing assignments for today to avoid duplicates
    await WorkerTaskAssignment.deleteMany({ date: today });
    console.log('🧹 Cleared existing assignments for today');

    // Find the next available assignment ID
    const lastAssignment = await WorkerTaskAssignment.findOne().sort({ id: -1 });
    let assignmentId = lastAssignment ? lastAssignment.id + 1 : 1;
    console.log(`📝 Starting assignment IDs from: ${assignmentId}`);

    let employeeIndex = 0;

    // Create assignments for each project
    for (const projectInfo of projectWorkerCounts) {
      console.log(`\n📋 Creating assignments for ${projectInfo.projectName}...`);
      
      for (let i = 0; i < projectInfo.workerCount; i++) {
        if (employeeIndex >= employees.length) {
          console.log('⚠️ Not enough employees for all assignments');
          break;
        }

        const employee = employees[employeeIndex];
        
        const assignment = new WorkerTaskAssignment({
          id: assignmentId,
          projectId: projectInfo.projectId,
          employeeId: employee.id,
          supervisorId: projectInfo.supervisorId,
          date: today,
          status: 'queued',
          companyId: employee.companyId,
          priority: i === 0 ? 'high' : 'medium', // First worker gets high priority
          workArea: `Area ${String.fromCharCode(65 + i)}`, // Area A, B, C, etc.
          floor: `Floor ${i + 1}`,
          zone: `Zone ${i + 1}`,
          timeEstimate: {
            estimated: 480, // 8 hours in minutes
            elapsed: 0,
            remaining: 480
          },
          dailyTarget: {
            description: `Complete ${projectInfo.projectName.split(' ')[0]} work`,
            quantity: 1,
            unit: 'section',
            targetCompletion: 100
          },
          geofenceValidation: {
            required: true,
            lastValidated: null
          }
        });

        await assignment.save();
        console.log(`  ✅ Assigned ${employee.fullName} (ID: ${employee.id}) to ${projectInfo.projectName}`);
        
        employeeIndex++;
        assignmentId++;
      }
    }

    // Verify the assignments
    console.log('\n📊 Verification - Worker counts per project:');
    for (const projectInfo of projectWorkerCounts) {
      const count = await WorkerTaskAssignment.countDocuments({
        projectId: projectInfo.projectId,
        date: today
      });
      console.log(`  ${projectInfo.projectName}: ${count} workers assigned`);
    }

    console.log('\n🎉 Successfully populated project workers!');
    console.log('💡 The Assigned Projects should now show realistic worker counts instead of 0');
    
  } catch (error) {
    console.error('❌ Error populating project workers:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

async function createSampleEmployees() {
  console.log('👥 Creating sample employees...');
  
  const sampleEmployees = [
    { id: 101, companyId: 1, fullName: 'John Smith', phone: '+65 9123 4567', jobTitle: 'Construction Worker', employeeCode: 'EMP001' },
    { id: 102, companyId: 1, fullName: 'Mary Johnson', phone: '+65 9123 4568', jobTitle: 'Site Technician', employeeCode: 'EMP002' },
    { id: 103, companyId: 1, fullName: 'David Lee', phone: '+65 9123 4569', jobTitle: 'Maintenance Worker', employeeCode: 'EMP003' },
    { id: 104, companyId: 1, fullName: 'Sarah Chen', phone: '+65 9123 4570', jobTitle: 'Safety Officer', employeeCode: 'EMP004' },
    { id: 105, companyId: 1, fullName: 'Michael Wong', phone: '+65 9123 4571', jobTitle: 'Equipment Operator', employeeCode: 'EMP005' },
    { id: 106, companyId: 1, fullName: 'Lisa Tan', phone: '+65 9123 4572', jobTitle: 'Quality Inspector', employeeCode: 'EMP006' }
  ];

  for (const empData of sampleEmployees) {
    // Check if employee already exists
    const existing = await Employee.findOne({ id: empData.id });
    if (!existing) {
      const employee = new Employee(empData);
      await employee.save();
      console.log(`  ✅ Created employee: ${empData.fullName}`);
    } else {
      console.log(`  ⏭️ Employee ${empData.fullName} already exists`);
    }
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️ Process interrupted');
  mongoose.connection.close();
  process.exit(0);
});
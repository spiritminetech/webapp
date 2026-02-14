import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';
import Task from './src/modules/task/Task.js';
import Project from './src/modules/project/models/Project.js';
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

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Get next available ID for a collection
const getNextId = async (Model) => {
  const lastRecord = await Model.findOne().sort({ id: -1 });
  const nextId = lastRecord ? lastRecord.id + 1 : 1;
  
  // Double-check that this ID doesn't exist
  const existing = await Model.findOne({ id: nextId });
  if (existing) {
    // If it exists, find the highest ID and add 1
    const allRecords = await Model.find({}, { id: 1 }).sort({ id: -1 }).limit(10);
    const maxId = Math.max(...allRecords.map(r => r.id), 0);
    return maxId + 1;
  }
  
  return nextId;
};

// Sample data creation
const createSampleData = async () => {
  try {
    const today = getTodayDate();
    console.log(`📅 Creating sample tasks for date: ${today}`);

    // Check if we have any employees
    const employees = await Employee.find().limit(1);
    if (employees.length === 0) {
      console.log('⚠️ No employees found. Creating a sample employee...');
      
      const employeeId = await getNextId(Employee);
      const sampleEmployee = new Employee({
        id: employeeId,
        companyId: 1,
        fullName: 'John Worker',
        phone: '+1234567890',
        jobTitle: 'Construction Worker',
        status: 'ACTIVE',
        employeeCode: 'EMP001'
      });
      await sampleEmployee.save();
      console.log(`✅ Created sample employee with ID: ${employeeId}`);
    }

    const employee = await Employee.findOne();
    const employeeId = employee.id;
    const companyId = employee.companyId || 1;

    // Check if we have a project
    let project = await Project.findOne();
    if (!project) {
      console.log('⚠️ No projects found. Creating a sample project...');
      
      const projectId = await getNextId(Project);
      project = new Project({
        id: projectId,
        companyId: companyId,
        projectCode: 'MCP-2024-001',
        projectName: 'Metro Construction Project',
        description: 'Downtown construction site development',
        status: 'Ongoing',
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        address: 'Downtown Site A, Metro City',
        latitude: 40.7128,
        longitude: -74.0060,
        geofenceRadius: 100,
        supervisorId: 5,
        // Enhanced geofencing support
        geofence: {
          center: {
            latitude: 40.7128,
            longitude: -74.0060
          },
          radius: 100,
          strictMode: true,
          allowedVariance: 10
        },
        workAreas: [
          {
            name: 'Zone A',
            zone: 'A',
            floor: 'Floor 3',
            description: 'Main construction area',
            coordinates: {
              latitude: 40.7130,
              longitude: -74.0058
            }
          },
          {
            name: 'Zone B',
            zone: 'B',
            floor: 'Floor 2',
            description: 'Secondary work area',
            coordinates: {
              latitude: 40.7126,
              longitude: -74.0062
            }
          }
        ]
      });
      await project.save();
      console.log(`✅ Created sample project with ID: ${projectId}`);
    }

    const projectId = project.id;

    // Create sample tasks if they don't exist
    const existingTasks = await Task.find({ projectId: projectId });
    let task1, task2;

    if (existingTasks.length < 2) {
      console.log('⚠️ Creating sample tasks...');
      
      const task1Id = await getNextId(Task);
      task1 = new Task({
        id: task1Id,
        companyId: companyId,
        projectId: projectId,
        taskType: 'WORK',
        taskName: 'Install Ceiling Panels - Zone A',
        description: 'Install acoustic ceiling panels in Zone A, Floor 3',
        status: 'IN_PROGRESS',
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        assignedBy: 5,
        createdBy: 5
      });
      await task1.save();

      const task2Id = await getNextId(Task);
      task2 = new Task({
        id: task2Id,
        companyId: companyId,
        projectId: projectId,
        taskType: 'WORK',
        taskName: 'Electrical Wiring - Zone B',
        description: 'Install electrical outlets and wiring in Zone B',
        status: 'PLANNED',
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        assignedBy: 5,
        createdBy: 5
      });
      await task2.save();

      console.log(`✅ Created sample tasks with IDs: ${task1Id}, ${task2Id}`);
    } else {
      task1 = existingTasks[0];
      task2 = existingTasks[1];
      console.log(`✅ Using existing tasks with IDs: ${task1.id}, ${task2.id}`);
    }

    // Check if worker task assignments already exist for today
    const existingAssignments = await WorkerTaskAssignment.find({
      employeeId: employeeId,
      date: today
    });

    if (existingAssignments.length > 0) {
      console.log(`⚠️ Removing existing task assignments for employee ${employeeId} on ${today}`);
      await WorkerTaskAssignment.deleteMany({
        employeeId: employeeId,
        date: today
      });
      console.log('✅ Existing assignments removed');
    }

    // Create worker task assignments with timestamp-based IDs to avoid conflicts
    const timestamp = Date.now();
    const assignment1Id = Math.floor(timestamp / 1000); // Use timestamp in seconds
    const assignment2Id = assignment1Id + 1;
    const assignment1 = new WorkerTaskAssignment({
      id: assignment1Id,
      projectId: projectId,
      employeeId: employeeId,
      supervisorId: 5,
      taskId: task1.id,
      date: today,
      status: 'in_progress',
      companyId: companyId,
      sequence: 1,
      
      // Mobile app specific fields
      dailyTarget: {
        description: 'Install 50 ceiling panels',
        quantity: 50,
        unit: 'panels',
        targetCompletion: 100
      },
      workArea: 'Zone A',
      floor: 'Floor 3',
      zone: 'A',
      timeEstimate: {
        estimated: 240, // 4 hours in minutes
        elapsed: 180,   // 3 hours elapsed
        remaining: 60   // 1 hour remaining
      },
      priority: 'high',
      dependencies: [],
      geofenceValidation: {
        required: true,
        lastValidated: new Date(),
        validationLocation: {
          latitude: 40.7130,
          longitude: -74.0058
        }
      }
    });


    const assignment2 = new WorkerTaskAssignment({
      id: assignment2Id,
      projectId: projectId,
      employeeId: employeeId,
      supervisorId: 5,
      taskId: task2.id,
      date: today,
      status: 'queued',
      companyId: companyId,
      sequence: 2,
      
      // Mobile app specific fields
      dailyTarget: {
        description: 'Install 20 electrical outlets',
        quantity: 20,
        unit: 'outlets',
        targetCompletion: 100
      },
      workArea: 'Zone B',
      floor: 'Floor 2',
      zone: 'B',
      timeEstimate: {
        estimated: 240, // 4 hours in minutes
        elapsed: 0,
        remaining: 240
      },
      priority: 'medium',
      dependencies: [assignment1Id], // Depends on first task
      geofenceValidation: {
        required: true
      }
    });

    await assignment1.save();
    await assignment2.save();

    console.log('🎉 Sample data created successfully!');
    console.log('📋 Summary:');
    console.log(`   Employee ID: ${employeeId} (${employee.fullName})`);
    console.log(`   Project ID: ${projectId} (${project.projectName})`);
    console.log(`   Task 1 ID: ${task1.id} (${task1.taskName})`);
    console.log(`   Task 2 ID: ${task2.id} (${task2.taskName})`);
    console.log(`   Assignment 1 ID: ${assignment1Id} (${assignment1.status})`);
    console.log(`   Assignment 2 ID: ${assignment2Id} (${assignment2.status})`);
    console.log(`   Date: ${today}`);
    console.log('');
    console.log('🌐 You can now test the API endpoint:');
    console.log(`   GET /api/worker/tasks/today`);
    console.log('   (Make sure to include proper authentication headers)');

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await createSampleData();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script execution error:', error);
  process.exit(1);
});
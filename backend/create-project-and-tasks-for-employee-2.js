import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';
import Task from './src/modules/task/Task.js';
import Project from './src/modules/project/models/Project.js';
import Employee from './src/modules/employee/Employee.js';

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const getNextId = async (Model) => {
  const lastRecord = await Model.findOne().sort({ id: -1 });
  return lastRecord ? lastRecord.id + 1 : 1;
};

const createProjectAndTasksForEmployee2 = async () => {
  try {
    console.log('📝 Creating project and tasks for Employee ID 2...\n');

    // Check if employee exists
    const employee = await Employee.findOne({ id: 2 });
    if (!employee) {
      console.log('❌ Employee with ID 2 not found');
      return;
    }
    
    console.log('✅ Employee found:', {
      id: employee.id,
      fullName: employee.fullName,
      status: employee.status
    });

    // Check existing projects
    let projects = await Project.find({ status: { $in: ['Ongoing', 'Not Started'] } });
    console.log(`\n📋 Found ${projects.length} existing active projects`);

    let project;
    if (projects.length === 0) {
      // Create a new project
      const projectId = await getNextId(Project);
      project = new Project({
        id: projectId,
        projectName: 'Hospital Plumbing Renovation',
        projectCode: 'PLB-001',
        description: 'Complete plumbing renovation for hospital facility',
        address: 'Main Hospital Building',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: 'Ongoing', // Use valid enum value
        latitude: 40.7128,
        longitude: -74.0060,
        geofenceRadius: 100,
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
            floor: '3',
            description: 'Main work area for ceiling installation',
            coordinates: {
              latitude: 40.7128,
              longitude: -74.0060
            }
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await project.save();
      console.log(`✅ Created new project: ${project.projectName} (ID: ${project.id})`);
    } else {
      project = projects[0];
      console.log(`✅ Using existing project: ${project.projectName} (ID: ${project.id})`);
    }

    // Check existing tasks for this project
    let tasks = await Task.find({ 
      projectId: project.id
    });

    console.log(`\n📋 Found ${tasks.length} existing tasks for this project`);

    // Create tasks if needed
    if (tasks.length < 2) {
      const tasksToCreate = [
        {
          taskName: 'Install Ceiling Panels - Zone A',
          description: 'Install acoustic ceiling panels in Zone A, Floor 3',
          taskType: 'WORK',
          companyId: 1 // Assuming company ID 1
        },
        {
          taskName: 'Electrical Wiring Installation',
          description: 'Install electrical wiring for new ceiling fixtures',
          taskType: 'WORK',
          companyId: 1 // Assuming company ID 1
        }
      ];

      for (const taskData of tasksToCreate) {
        const taskId = await getNextId(Task);
        const task = new Task({
          id: taskId,
          companyId: taskData.companyId,
          projectId: project.id,
          taskName: taskData.taskName,
          description: taskData.description,
          taskType: taskData.taskType,
          status: 'PLANNED',
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          createdAt: new Date(),
          updatedAt: new Date()
        });

        await task.save();
        tasks.push(task);
        console.log(`✅ Created task: ${task.taskName} (ID: ${task.id})`);
      }
    }

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`\n📅 Assigning tasks for date: ${today}`);

    // Remove existing assignments for today
    const existingAssignments = await WorkerTaskAssignment.find({
      employeeId: 2,
      date: today
    });

    if (existingAssignments.length > 0) {
      console.log(`⚠️ Removing ${existingAssignments.length} existing assignments for today`);
      await WorkerTaskAssignment.deleteMany({
        employeeId: 2,
        date: today
      });
    }

    // Create task assignments (take first 2 tasks)
    const tasksToAssign = tasks.slice(0, 2);
    const assignments = [];
    
    for (let i = 0; i < tasksToAssign.length; i++) {
      const task = tasksToAssign[i];
      const assignmentId = await getNextId(WorkerTaskAssignment);
      
      const assignment = new WorkerTaskAssignment({
        id: assignmentId,
        employeeId: 2, // Ensure it's a number
        projectId: project.id, // Ensure it's a number
        taskId: task.id, // Ensure it's a number
        date: today,
        status: 'queued',
        sequence: i + 1,
        progressPercent: 0,
        workArea: task.description || 'General',
        estimatedHours: 8,
        actualStartTime: null,
        actualEndTime: null,
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await assignment.save();
      assignments.push(assignment);
      
      console.log(`✅ Created assignment ${assignmentId}: "${task.taskName}"`);
      console.log(`   Employee ID: ${assignment.employeeId} (${typeof assignment.employeeId})`);
      console.log(`   Project ID: ${assignment.projectId} (${typeof assignment.projectId})`);
      console.log(`   Task ID: ${assignment.taskId} (${typeof assignment.taskId})`);
      console.log(`   Status: ${assignment.status}`);
      console.log(`   Sequence: ${assignment.sequence}`);
    }

    console.log('\n🎉 Task assignments created successfully!');
    console.log('📋 Summary:');
    console.log(`   Employee: ${employee.fullName} (ID: ${employee.id})`);
    console.log(`   Project: ${project.projectName} (ID: ${project.id})`);
    console.log(`   Date: ${today}`);
    console.log(`   Tasks assigned: ${assignments.length}`);
    
    assignments.forEach((assignment, index) => {
      const task = tasksToAssign[index];
      console.log(`   ${index + 1}. ${task.taskName} - ${assignment.status}`);
    });

    // Verify the assignments
    console.log('\n🔍 Verifying assignments...');
    const verifyAssignments = await WorkerTaskAssignment.find({
      employeeId: 2,
      date: today
    });

    console.log(`✅ Found ${verifyAssignments.length} assignments in database`);

    const invalidAssignments = verifyAssignments.filter(a => 
      !a.projectId || !a.taskId || !Number.isInteger(a.projectId) || !Number.isInteger(a.taskId)
    );

    if (invalidAssignments.length === 0) {
      console.log('✅ All assignments have valid data types');
      console.log('✅ Employee ID 2 should now be able to view tasks without errors');
    } else {
      console.log(`❌ ${invalidAssignments.length} assignments have invalid data types`);
      invalidAssignments.forEach(a => {
        console.log(`   Assignment ${a.id}: projectId=${a.projectId} (${typeof a.projectId}), taskId=${a.taskId} (${typeof a.taskId})`);
      });
    }

  } catch (error) {
    console.error('❌ Error creating project and tasks:', error);
  }
};

const main = async () => {
  await connectDB();
  await createProjectAndTasksForEmployee2();
  await mongoose.disconnect();
  console.log('\n✅ Disconnected from MongoDB');
};

main().catch(console.error);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';
import Task from './src/modules/task/Task.js';
import Employee from './src/modules/employee/Employee.js';
import Project from './src/modules/project/models/Project.js';

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

const createTaskAssignmentsToday = async () => {
  try {
    console.log('📝 Creating task assignments for today...\n');

    // Find the employee
    const employee = await Employee.findOne({ id: 1 });
    if (!employee) {
      console.log('❌ Employee ID 1 not found');
      return;
    }
    console.log(`👤 Found employee: ${employee.fullName} (ID: ${employee.id})`);

    // Find the project
    const project = await Project.findOne({ id: 1001 });
    if (!project) {
      console.log('❌ Project ID 1001 not found');
      return;
    }
    console.log(`🏗️ Found project: ${project.projectName} (ID: ${project.id})`);

    // Find supervisor (we'll use employee ID 2 as supervisor)
    const supervisor = await Employee.findOne({ id: 2 });
    console.log(`👷 Supervisor: ${supervisor?.fullName || 'Not found'} (ID: ${supervisor?.id || 'N/A'})`);

    // Create tasks if they don't exist
    const taskData = [
      {
        taskName: 'Install Ceiling Panels - Zone A',
        taskType: 'WORK',
        description: 'Install acoustic ceiling panels in Zone A, Floor 3',
        estimatedDuration: 240, // 4 hours in minutes
        priority: 'high'
      },
      {
        taskName: 'Electrical Wiring - Zone B',
        taskType: 'WORK', 
        description: 'Install electrical outlets and wiring in Zone B',
        estimatedDuration: 240, // 4 hours in minutes
        priority: 'medium'
      },
      {
        taskName: 'Quality Inspection - Zone A',
        taskType: 'INSPECTION',
        description: 'Perform quality inspection of completed work in Zone A',
        estimatedDuration: 120, // 2 hours in minutes
        priority: 'medium'
      }
    ];

    const createdTasks = [];
    
    for (const taskInfo of taskData) {
      let task = await Task.findOne({ taskName: taskInfo.taskName });
      
      if (!task) {
        const taskId = await getNextId(Task);
        task = new Task({
          id: taskId,
          taskName: taskInfo.taskName,
          taskType: taskInfo.taskType,
          description: taskInfo.description,
          estimatedDuration: taskInfo.estimatedDuration,
          priority: taskInfo.priority,
          companyId: 1,
          projectId: project.id,
          createdBy: supervisor?.id || 1,
          isActive: true
        });
        await task.save();
        console.log(`✅ Created task: ${task.taskName} (ID: ${task.id})`);
      } else {
        console.log(`✅ Found existing task: ${task.taskName} (ID: ${task.id})`);
      }
      
      createdTasks.push(task);
    }

    // Create today's date
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Check if assignments already exist for today
    const existingAssignments = await WorkerTaskAssignment.find({
      employeeId: employee.id,
      date: todayString
    });

    if (existingAssignments.length > 0) {
      console.log(`⚠️ ${existingAssignments.length} task assignments already exist for today`);
      console.log('Existing assignments:');
      existingAssignments.forEach(assignment => {
        console.log(`   - Assignment ID: ${assignment.id}, Task ID: ${assignment.taskId}, Status: ${assignment.status}`);
      });
      return;
    }

    // Create task assignments for today
    const assignments = [];
    
    for (let i = 0; i < createdTasks.length; i++) {
      const task = createdTasks[i];
      const assignmentId = await getNextId(WorkerTaskAssignment);
      
      // Determine status and progress based on task sequence
      let status, progressPercent, startTime = null;
      
      if (i === 0) {
        // First task - in progress
        status = 'in_progress';
        progressPercent = 75;
        startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0); // 8:00 AM
      } else if (i === 1) {
        // Second task - queued
        status = 'queued';
        progressPercent = 0;
      } else {
        // Third task - queued (waiting for previous tasks)
        status = 'queued';
        progressPercent = 0;
      }

      const assignment = new WorkerTaskAssignment({
        id: assignmentId,
        employeeId: employee.id,
        taskId: task.id,
        projectId: project.id,
        supervisorId: supervisor?.id || 2,
        companyId: 1,
        date: todayString,
        status: status,
        startTime: startTime,
        
        // Enhanced fields for mobile app
        workArea: i === 0 ? 'Zone A' : i === 1 ? 'Zone B' : 'Zone A',
        floor: i === 0 ? 'Floor 3' : i === 1 ? 'Floor 2' : 'All Floors',
        zone: i === 0 ? 'A' : i === 1 ? 'B' : 'A',
        priority: task.priority,
        sequence: i + 1,
        
        dailyTarget: {
          description: i === 0 ? 'Install 50 ceiling panels' : 
                      i === 1 ? 'Install 20 electrical outlets' : 
                      'Complete full inspection',
          quantity: i === 0 ? 50 : i === 1 ? 20 : 1,
          unit: i === 0 ? 'panels' : i === 1 ? 'outlets' : 'inspection',
          targetCompletion: 100
        },
        
        timeEstimate: {
          estimated: task.estimatedDuration,
          elapsed: status === 'in_progress' ? 180 : 0, // 3 hours elapsed for in-progress task
          remaining: status === 'in_progress' ? 60 : task.estimatedDuration // 1 hour remaining
        },
        
        dependencies: i > 0 ? [assignments[i-1]?.id].filter(Boolean) : [],
        
        geofenceValidation: {
          required: true,
          lastValidated: status === 'in_progress' ? new Date() : null
        },
        
        assignedAt: new Date()
      });

      await assignment.save();
      assignments.push(assignment);
      
      console.log(`✅ Created assignment: ${assignment.id} for task "${task.taskName}"`);
      console.log(`   Status: ${status}, Progress: ${progressPercent}%, Work Area: ${assignment.workArea}`);
    }

    console.log('\n🎉 Task assignments created successfully!');
    console.log('📋 Summary:');
    console.log(`   Employee: ${employee.fullName} (ID: ${employee.id})`);
    console.log(`   Project: ${project.projectName} (ID: ${project.id})`);
    console.log(`   Date: ${todayString}`);
    console.log(`   Total Assignments: ${assignments.length}`);
    
    assignments.forEach((assignment, index) => {
      console.log(`   ${index + 1}. ${createdTasks[index].taskName} - ${assignment.status} (${assignment.progressPercent}%)`);
    });

  } catch (error) {
    console.error('❌ Error creating task assignments:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await createTaskAssignmentsToday();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script execution error:', error);
  process.exit(1);
});
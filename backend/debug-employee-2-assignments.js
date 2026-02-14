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

const debugEmployee2Assignments = async () => {
  try {
    console.log('🔍 Debugging Employee ID 2 assignments...\n');

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

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log('📅 Checking assignments for date:', today);

    // Get all assignments for employee 2 today
    const assignments = await WorkerTaskAssignment.find({
      employeeId: 2,
      date: today
    }).sort({ sequence: 1 });

    console.log(`\n📋 Found ${assignments.length} assignments:`);
    
    if (assignments.length === 0) {
      console.log('ℹ️ No assignments found for today');
      return;
    }

    // Check each assignment for data integrity
    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i];
      console.log(`\n${i + 1}. Assignment ID: ${assignment.id}`);
      console.log(`   Employee ID: ${assignment.employeeId} (type: ${typeof assignment.employeeId})`);
      console.log(`   Project ID: ${assignment.projectId} (type: ${typeof assignment.projectId})`);
      console.log(`   Task ID: ${assignment.taskId} (type: ${typeof assignment.taskId})`);
      console.log(`   Date: ${assignment.date}`);
      console.log(`   Status: ${assignment.status}`);
      console.log(`   Sequence: ${assignment.sequence}`);

      // Check if projectId and taskId are integers
      const projectIdValid = Number.isInteger(assignment.projectId);
      const taskIdValid = Number.isInteger(assignment.taskId);
      
      console.log(`   Project ID valid: ${projectIdValid}`);
      console.log(`   Task ID valid: ${taskIdValid}`);

      if (!projectIdValid || !taskIdValid) {
        console.log(`   ❌ INVALID DATA DETECTED!`);
        
        // Try to fix the data
        if (!projectIdValid && assignment.projectId) {
          console.log(`   Attempting to convert projectId: ${assignment.projectId} -> ${Number(assignment.projectId)}`);
        }
        if (!taskIdValid && assignment.taskId) {
          console.log(`   Attempting to convert taskId: ${assignment.taskId} -> ${Number(assignment.taskId)}`);
        }
      }

      // Check if referenced project exists
      if (assignment.projectId) {
        const project = await Project.findOne({ id: assignment.projectId });
        if (project) {
          console.log(`   ✅ Project found: ${project.projectName}`);
        } else {
          console.log(`   ❌ Project not found for ID: ${assignment.projectId}`);
        }
      }

      // Check if referenced task exists
      if (assignment.taskId) {
        const task = await Task.findOne({ id: assignment.taskId });
        if (task) {
          console.log(`   ✅ Task found: ${task.taskName}`);
        } else {
          console.log(`   ❌ Task not found for ID: ${assignment.taskId}`);
        }
      }
    }

    // Summary
    const invalidAssignments = assignments.filter(a => 
      !a.projectId || !a.taskId || !Number.isInteger(a.projectId) || !Number.isInteger(a.taskId)
    );

    console.log(`\n📊 Summary:`);
    console.log(`   Total assignments: ${assignments.length}`);
    console.log(`   Invalid assignments: ${invalidAssignments.length}`);
    
    if (invalidAssignments.length > 0) {
      console.log(`   Invalid assignment IDs: ${invalidAssignments.map(a => a.id).join(', ')}`);
      console.log(`\n🔧 Suggested fix: Update these assignments with proper integer values`);
    } else {
      console.log(`   ✅ All assignments have valid data types`);
    }

  } catch (error) {
    console.error('❌ Error debugging assignments:', error);
  }
};

const main = async () => {
  await connectDB();
  await debugEmployee2Assignments();
  await mongoose.disconnect();
  console.log('\n✅ Disconnected from MongoDB');
};

main().catch(console.error);
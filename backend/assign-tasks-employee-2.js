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

const assignTasksToEmployee2 = async () => {
  try {
    console.log('📝 Assigning tasks to Employee ID 2...\n');

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
    console.log('📅 Assigning tasks for date:', today);

    // Check if assignments already exist for today
    const existingAssignments = await WorkerTaskAssignment.find({
      employeeId: 2,
      date: today
    });

    if (existingAssignments.length > 0) {
      console.log(`⚠️ ${existingAssignments.length} assignments already exist for today`);
      console.log('Removing existing assignments...');
      await WorkerTaskAssignment.deleteMany({
        employeeId: 2,
        date: today
      });
      console.log('✅ Existing assignments removed');
    }

    // Get available projects
    const projects = await Project.find({ isActive: true }).limit(2);
    if (projects.length === 0) {
      console.log('❌ No active projects found');
      return;
    }

    console.log(`\n📋 Found ${projects.length} active projects:`);
    projects.forEach(p => {
      console.log(`   - ${p.projectName} (ID: ${p.id})`);
    });

    // Get tasks for the first project
    const project = projects[0]; // Use the first available project
    const tasks = await Task.find({ 
      projectId: project.id,
      isActive: true 
    }).limit(2);

    if (tasks.length < 2) {
      console.log(`❌ Not enough tasks found for project ${project.projectName}. Found: ${tasks.length}, Need: 2`);
      return;
    }

    console.log(`\n📋 Found ${tasks.length} tasks for project "${project.projectName}":`);
    tasks.forEach(t => {
      console.log(`   - ${t.taskName} (ID: ${t.id})`);
    });

    // Create task assignments
    const assignments = [];
    
    for (let i = 0; i < 2; i++) {
      const task = tasks[i];
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
        workArea: task.workArea || 'General',
        estimatedHours: task.estimatedHours || 8,
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
      const task = tasks[index];
      console.log(`   ${index + 1}. ${task.taskName} - ${assignment.status}`);
    });

    // Verify the assignments
    console.log('\n🔍 Verifying assignments...');
    const verifyAssignments = await WorkerTaskAssignment.find({
      employeeId: 2,
      date: today
    });

    const invalidAssignments = verifyAssignments.filter(a => 
      !a.projectId || !a.taskId || !Number.isInteger(a.projectId) || !Number.isInteger(a.taskId)
    );

    if (invalidAssignments.length === 0) {
      console.log('✅ All assignments have valid data types');
    } else {
      console.log(`❌ ${invalidAssignments.length} assignments have invalid data types`);
    }

  } catch (error) {
    console.error('❌ Error assigning tasks:', error);
  }
};

const main = async () => {
  await connectDB();
  await assignTasksToEmployee2();
  await mongoose.disconnect();
  console.log('\n✅ Disconnected from MongoDB');
};

main().catch(console.error);
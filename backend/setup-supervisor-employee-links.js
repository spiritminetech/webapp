import mongoose from 'mongoose';
import Employee from './src/modules/employee/Employee.js';
import Project from './src/modules/project/models/Project.js';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';
import Task from './src/modules/task/Task.js';
import appConfig from './src/config/app.config.js';

/**
 * Script to create task assignments linking employees to supervisors
 * This ensures supervisors can see leave requests from their supervised employees
 */

async function setupSupervisorEmployeeLinks() {
  try {
    console.log('🔗 Setting up supervisor-employee links...\n');

    // Connect to database
    await mongoose.connect(appConfig.database.uri);
    console.log('✅ Connected to database');

    // Get all projects with supervisors
    const projects = await Project.find({ supervisorId: { $exists: true, $ne: null } });
    console.log(`📋 Found ${projects.length} projects with supervisors`);

    if (projects.length === 0) {
      console.log('❌ No projects with supervisors found. Please assign supervisors to projects first.');
      return;
    }

    // Get all active employees
    const employees = await Employee.find({ status: 'ACTIVE' });
    console.log(`👥 Found ${employees.length} active employees`);

    if (employees.length === 0) {
      console.log('❌ No active employees found. Please create employees first.');
      return;
    }

    // Get existing tasks or create sample ones
    let tasks = await Task.find();
    if (tasks.length === 0) {
      console.log('📝 No tasks found. Creating sample tasks...');
      
      // Create sample tasks for each project
      const sampleTasks = [];
      let taskId = 1;

      for (const project of projects) {
        const projectTasks = [
          { id: taskId++, projectId: project.id, taskName: 'Site Preparation', description: 'Prepare construction site' },
          { id: taskId++, projectId: project.id, taskName: 'Foundation Work', description: 'Foundation construction' },
          { id: taskId++, projectId: project.id, taskName: 'Material Delivery', description: 'Receive and organize materials' },
          { id: taskId++, projectId: project.id, taskName: 'Quality Inspection', description: 'Quality control checks' },
          { id: taskId++, projectId: project.id, taskName: 'Safety Briefing', description: 'Daily safety briefing' }
        ];
        sampleTasks.push(...projectTasks);
      }

      await Task.insertMany(sampleTasks);
      tasks = await Task.find();
      console.log(`✅ Created ${sampleTasks.length} sample tasks`);
    }

    // Create task assignments to link employees to supervisors
    console.log('\n🔗 Creating task assignments...');

    // Get the next available assignment ID
    const lastAssignment = await WorkerTaskAssignment.findOne().sort({ id: -1 });
    let nextAssignmentId = lastAssignment ? lastAssignment.id + 1 : 1;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const assignments = [];

    // Distribute employees across projects
    let employeeIndex = 0;
    
    for (const project of projects) {
      const projectTasks = tasks.filter(t => t.projectId === project.id);
      
      // Assign 3-5 employees per project
      const employeesPerProject = Math.min(3 + Math.floor(Math.random() * 3), employees.length - employeeIndex);
      
      for (let i = 0; i < employeesPerProject && employeeIndex < employees.length; i++) {
        const employee = employees[employeeIndex++];
        
        // Assign 1-2 tasks per employee
        const tasksPerEmployee = 1 + Math.floor(Math.random() * 2);
        const shuffledTasks = [...projectTasks].sort(() => 0.5 - Math.random());
        
        for (let j = 0; j < Math.min(tasksPerEmployee, shuffledTasks.length); j++) {
          const task = shuffledTasks[j];
          
          assignments.push({
            id: nextAssignmentId++,
            employeeId: employee.id,
            projectId: project.id,
            taskId: task.id,
            date: today,
            status: 'queued',
            sequence: j + 1,
            createdAt: new Date()
          });
        }
      }
    }

    // Remove existing assignments for today to avoid duplicates
    await WorkerTaskAssignment.deleteMany({ date: today });

    // Insert new assignments
    if (assignments.length > 0) {
      await WorkerTaskAssignment.insertMany(assignments);
      console.log(`✅ Created ${assignments.length} task assignments`);

      // Show summary by project
      console.log('\n📊 Assignment Summary:');
      for (const project of projects) {
        const projectAssignments = assignments.filter(a => a.projectId === project.id);
        const uniqueEmployees = [...new Set(projectAssignments.map(a => a.employeeId))];
        
        console.log(`📋 Project ${project.id} (Supervisor ID: ${project.supervisorId}):`);
        console.log(`   👥 ${uniqueEmployees.length} employees assigned`);
        console.log(`   📝 ${projectAssignments.length} task assignments`);
        
        // List employee names
        for (const empId of uniqueEmployees) {
          const employee = employees.find(e => e.id === empId);
          const empAssignments = projectAssignments.filter(a => a.employeeId === empId);
          console.log(`      - ${employee?.fullName} (${empAssignments.length} tasks)`);
        }
        console.log('');
      }
    }

    console.log('✅ Supervisor-employee links created successfully!');
    console.log('🎯 Supervisors can now see leave requests from their assigned employees.');

  } catch (error) {
    console.error('❌ Error setting up supervisor-employee links:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run the setup
setupSupervisorEmployeeLinks();

export default setupSupervisorEmployeeLinks;
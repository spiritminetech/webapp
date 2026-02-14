import mongoose from 'mongoose';
import Employee from './src/modules/employee/Employee.js';
import Project from './src/modules/project/models/Project.js';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';
import Task from './src/modules/task/Task.js';
import LeaveRequest from './src/modules/leaveRequest/models/LeaveRequest.js';
import appConfig from './src/config/app.config.js';

/**
 * Complete setup script for pending approvals demo
 * This script will:
 * 1. Check existing data
 * 2. Create task assignments linking employees to supervisors
 * 3. Create sample leave requests
 * 4. Show summary for testing
 */

async function setupPendingApprovalsDemo() {
  try {
    console.log('🚀 Setting up Pending Approvals Demo Data...\n');

    // Connect to database
    await mongoose.connect(appConfig.database.uri);
    console.log('✅ Connected to database');

    // Step 1: Check existing data
    console.log('\n📊 Checking existing data...');
    
    const employees = await Employee.find({ status: 'ACTIVE' });
    const projects = await Project.find({ supervisorId: { $exists: true, $ne: null } });
    const existingLeaveRequests = await LeaveRequest.countDocuments({ status: 'PENDING' });
    
    console.log(`👥 Active employees: ${employees.length}`);
    console.log(`📋 Projects with supervisors: ${projects.length}`);
    console.log(`📝 Existing pending leave requests: ${existingLeaveRequests}`);

    if (employees.length === 0) {
      console.log('❌ No employees found. Please create employees first.');
      return;
    }

    if (projects.length === 0) {
      console.log('❌ No projects with supervisors found. Please create projects and assign supervisors first.');
      return;
    }

    // Step 2: Create task assignments (supervisor-employee links)
    console.log('\n🔗 Setting up supervisor-employee relationships...');
    
    const today = new Date().toISOString().split('T')[0];
    
    // Clear existing assignments for today
    await WorkerTaskAssignment.deleteMany({ date: today });
    
    // Get or create tasks
    let tasks = await Task.find();
    if (tasks.length === 0) {
      console.log('📝 Creating sample tasks...');
      const sampleTasks = [];
      let taskId = 1;

      for (const project of projects) {
        const projectTasks = [
          { id: taskId++, projectId: project.id, taskName: 'Site Setup', description: 'Daily site preparation' },
          { id: taskId++, projectId: project.id, taskName: 'Material Check', description: 'Inventory and material verification' },
          { id: taskId++, projectId: project.id, taskName: 'Safety Inspection', description: 'Safety compliance check' },
          { id: taskId++, projectId: project.id, taskName: 'Progress Review', description: 'Daily progress assessment' }
        ];
        sampleTasks.push(...projectTasks);
      }

      await Task.insertMany(sampleTasks);
      tasks = await Task.find();
      console.log(`✅ Created ${sampleTasks.length} sample tasks`);
    }

    // Create task assignments
    const lastAssignment = await WorkerTaskAssignment.findOne().sort({ id: -1 });
    let nextAssignmentId = lastAssignment ? lastAssignment.id + 1 : 1;
    const assignments = [];

    // Distribute employees across projects
    let employeeIndex = 0;
    const supervisorEmployeeMap = {};

    for (const project of projects) {
      const projectTasks = tasks.filter(t => t.projectId === project.id);
      const employeesPerProject = Math.min(4, employees.length - employeeIndex);
      
      supervisorEmployeeMap[project.supervisorId] = [];

      for (let i = 0; i < employeesPerProject && employeeIndex < employees.length; i++) {
        const employee = employees[employeeIndex++];
        supervisorEmployeeMap[project.supervisorId].push(employee);
        
        // Assign 1-2 tasks per employee
        const tasksToAssign = projectTasks.slice(0, 1 + Math.floor(Math.random() * 2));
        
        tasksToAssign.forEach((task, index) => {
          assignments.push({
            id: nextAssignmentId++,
            employeeId: employee.id,
            projectId: project.id,
            taskId: task.id,
            date: today,
            status: 'queued',
            sequence: index + 1,
            createdAt: new Date()
          });
        });
      }
    }

    if (assignments.length > 0) {
      await WorkerTaskAssignment.insertMany(assignments);
      console.log(`✅ Created ${assignments.length} task assignments`);
    }

    // Step 3: Create sample leave requests
    console.log('\n📝 Creating sample leave requests...');
    
    // Clear existing pending requests
    await LeaveRequest.deleteMany({ status: 'PENDING' });
    
    const lastLeaveRequest = await LeaveRequest.findOne().sort({ id: -1 });
    let nextLeaveId = lastLeaveRequest ? lastLeaveRequest.id + 1 : 1;

    const leaveTypes = ['ANNUAL', 'MEDICAL', 'EMERGENCY'];
    const reasons = {
      'ANNUAL': [
        'Family vacation to Malaysia',
        'Wedding anniversary celebration',
        'Personal family matters',
        'Pre-planned holiday trip'
      ],
      'MEDICAL': [
        'Medical check-up appointment',
        'Dental surgery procedure',
        'Recovery from illness',
        'Doctor recommended rest'
      ],
      'EMERGENCY': [
        'Family emergency situation',
        'Urgent personal matter',
        'Unexpected family illness',
        'Emergency childcare required'
      ]
    };

    const sampleLeaveRequests = [];

    // Create 2-3 leave requests per supervisor's employees
    for (const [supervisorId, supervisedEmployees] of Object.entries(supervisorEmployeeMap)) {
      const requestsToCreate = Math.min(3, supervisedEmployees.length);
      
      for (let i = 0; i < requestsToCreate; i++) {
        const employee = supervisedEmployees[i];
        const leaveType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
        const reasonsList = reasons[leaveType];
        const reason = reasonsList[Math.floor(Math.random() * reasonsList.length)];

        // Determine dates based on leave type
        let fromDate, totalDays;
        
        if (leaveType === 'EMERGENCY') {
          fromDate = new Date(); // Today or tomorrow
          if (Math.random() > 0.5) {
            fromDate.setDate(fromDate.getDate() + 1);
          }
          totalDays = 1 + Math.floor(Math.random() * 2); // 1-2 days
        } else if (leaveType === 'MEDICAL') {
          fromDate = new Date();
          fromDate.setDate(fromDate.getDate() + Math.floor(Math.random() * 7)); // Within a week
          totalDays = 1 + Math.floor(Math.random() * 3); // 1-3 days
        } else {
          fromDate = new Date();
          fromDate.setDate(fromDate.getDate() + 7 + Math.floor(Math.random() * 30)); // 1-5 weeks ahead
          totalDays = 2 + Math.floor(Math.random() * 6); // 2-7 days
        }

        const toDate = new Date(fromDate);
        toDate.setDate(toDate.getDate() + totalDays - 1);

        const requestedAt = new Date();
        requestedAt.setDate(requestedAt.getDate() - Math.floor(Math.random() * 3)); // 0-3 days ago

        sampleLeaveRequests.push({
          id: nextLeaveId++,
          companyId: employee.companyId,
          employeeId: employee.id,
          requestType: 'LEAVE',
          leaveType: leaveType,
          fromDate: fromDate,
          toDate: toDate,
          totalDays: totalDays,
          reason: reason,
          status: 'PENDING',
          requestedAt: requestedAt,
          createdBy: employee.id
        });
      }
    }

    // Insert leave requests
    if (sampleLeaveRequests.length > 0) {
      await LeaveRequest.insertMany(sampleLeaveRequests);
      console.log(`✅ Created ${sampleLeaveRequests.length} sample leave requests`);
    }

    // Step 4: Show summary
    console.log('\n📊 DEMO SETUP COMPLETE - SUMMARY:');
    console.log('=' .repeat(50));

    for (const project of projects) {
      const supervisedEmployees = supervisorEmployeeMap[project.supervisorId] || [];
      const pendingRequests = sampleLeaveRequests.filter(req => 
        supervisedEmployees.some(emp => emp.id === req.employeeId)
      );

      console.log(`\n📋 Project: ${project.projectName || `Project ${project.id}`}`);
      console.log(`👨‍💼 Supervisor ID: ${project.supervisorId}`);
      console.log(`👥 Supervised Employees: ${supervisedEmployees.length}`);
      console.log(`📝 Pending Leave Requests: ${pendingRequests.length}`);
      
      if (pendingRequests.length > 0) {
        console.log('   Leave Requests:');
        pendingRequests.forEach(req => {
          const employee = supervisedEmployees.find(emp => emp.id === req.employeeId);
          console.log(`   - ${employee?.fullName}: ${req.leaveType} (${req.totalDays} days, ${req.fromDate.toDateString()})`);
        });
      }
    }

    console.log('\n🎯 TESTING INSTRUCTIONS:');
    console.log('1. Login as a supervisor (supervisor ID from above)');
    console.log('2. Go to supervisor dashboard');
    console.log('3. Check "Pending Approvals" card - should show real count');
    console.log('4. Click on pending approvals to see detailed list');
    console.log('5. The data is now real-time from your database!');

    console.log('\n✅ Demo setup completed successfully!');

  } catch (error) {
    console.error('❌ Error setting up demo:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run the setup
setupPendingApprovalsDemo();

export default setupPendingApprovalsDemo;
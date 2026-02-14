import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from './src/modules/project/models/Project.js';
import Employee from './src/modules/employee/Employee.js';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';
import Attendance from './src/modules/attendance/Attendance.js';

// Load environment variables
dotenv.config();

async function createWorkforceSampleData() {
  try {
    console.log('🔍 Creating Workforce Sample Data...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const supervisorId = 4;
    const todayDateString = new Date().toISOString().split('T')[0];
    
    console.log(`📊 Creating data for Supervisor ID: ${supervisorId}`);
    console.log(`📅 Date: ${todayDateString}\n`);

    // 1. Ensure projects exist
    console.log('1️⃣ Ensuring projects exist...');
    const projectsData = [
      {
        id: 1001,
        projectName: 'Orchard Road Office Tower Maintenance',
        address: '238 Orchard Road, Singapore 238851',
        location: '238 Orchard Road, Singapore 238851',
        supervisorId: 4,
        status: 'on_hold',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-06-30'),
        description: 'Office tower maintenance and renovation project'
      },
      {
        id: 1002,
        projectName: 'Marina Bay Construction Phase 1',
        address: 'Marina Bay, Singapore',
        location: 'Marina Bay, Singapore',
        supervisorId: 4,
        status: 'ongoing',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-08-31'),
        description: 'Marina Bay construction project phase 1'
      },
      {
        id: 1003,
        projectName: 'Jurong Industrial Complex Renovation',
        address: '2 Jurong East Street 21, Singapore 609601',
        location: '2 Jurong East Street 21, Singapore 609601',
        supervisorId: 4,
        status: 'ongoing',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-09-30'),
        description: 'Industrial complex renovation project'
      }
    ];

    for (const projectData of projectsData) {
      const existingProject = await Project.findOne({ id: projectData.id });
      if (!existingProject) {
        const project = new Project(projectData);
        await project.save();
        console.log(`   ✅ Created project: ${projectData.projectName}`);
      } else {
        // Update existing project to ensure it has the right supervisor
        await Project.updateOne({ id: projectData.id }, { supervisorId: 4 });
        console.log(`   ✅ Updated project: ${projectData.projectName}`);
      }
    }

    // 2. Ensure employees exist
    console.log('\n2️⃣ Ensuring employees exist...');
    const employeesData = [
      { id: 60, fullName: 'Sarah Construction Supervisor', role: 'supervisor', userId: 60 },
      { id: 61, fullName: 'Alex Dashboard Worker', role: 'worker', userId: 61 },
      { id: 62, fullName: 'Mike Field Worker', role: 'worker', userId: 62 },
      { id: 63, fullName: 'Lisa Site Manager', role: 'manager', userId: 63 },
      { id: 64, fullName: 'John Safety Officer', role: 'safety_officer', userId: 64 },
      { id: 65, fullName: 'Emma Quality Inspector', role: 'inspector', userId: 65 }
    ];

    for (const empData of employeesData) {
      const existingEmployee = await Employee.findOne({ id: empData.id });
      if (!existingEmployee) {
        const employee = new Employee(empData);
        await employee.save();
        console.log(`   ✅ Created employee: ${empData.fullName}`);
      } else {
        console.log(`   ✅ Employee exists: ${empData.fullName}`);
      }
    }

    // 3. Create worker assignments for today
    console.log('\n3️⃣ Creating worker assignments for today...');
    
    // Clear existing assignments for today
    await WorkerTaskAssignment.deleteMany({
      projectId: { $in: [1001, 1002, 1003] },
      date: todayDateString
    });
    console.log('   🧹 Cleared existing assignments for today');

    const assignmentsData = [
      // Project 1001 - 3 workers (Orchard Road Office Tower Maintenance)
      { id: 2001, employeeId: 60, projectId: 1001, taskId: 1, date: todayDateString, status: 'queued' },
      { id: 2002, employeeId: 61, projectId: 1001, taskId: 2, date: todayDateString, status: 'queued' },
      { id: 2003, employeeId: 62, projectId: 1001, taskId: 3, date: todayDateString, status: 'queued' },
      
      // Project 1002 - 2 workers (Marina Bay Construction Phase 1)
      { id: 2004, employeeId: 63, projectId: 1002, taskId: 4, date: todayDateString, status: 'queued' },
      { id: 2005, employeeId: 64, projectId: 1002, taskId: 5, date: todayDateString, status: 'queued' },
      
      // Project 1003 - 1 worker (Jurong Industrial Complex Renovation)
      { id: 2006, employeeId: 65, projectId: 1003, taskId: 6, date: todayDateString, status: 'queued' }
    ];

    for (const assignmentData of assignmentsData) {
      const assignment = new WorkerTaskAssignment(assignmentData);
      await assignment.save();
      console.log(`   ✅ Created assignment: Employee ${assignmentData.employeeId} -> Project ${assignmentData.projectId}`);
    }

    // 4. Clear attendance records to ensure all workers are absent
    console.log('\n4️⃣ Clearing attendance records (all workers absent)...');
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);

    await Attendance.deleteMany({
      employeeId: { $in: [60, 61, 62, 63, 64, 65] },
      projectId: { $in: [1001, 1002, 1003] },
      date: {
        $gte: dayStart,
        $lte: dayEnd
      }
    });
    console.log('   🧹 Cleared attendance records for today');

    // 5. Verify the expected workforce count
    console.log('\n5️⃣ Verifying expected workforce count...');
    
    const assignments = await WorkerTaskAssignment.find({
      projectId: { $in: [1001, 1002, 1003] },
      date: todayDateString
    });
    
    const attendanceRecords = await Attendance.find({
      employeeId: { $in: [60, 61, 62, 63, 64, 65] },
      projectId: { $in: [1001, 1002, 1003] },
      date: {
        $gte: dayStart,
        $lte: dayEnd
      }
    });

    const expectedWorkforceCount = {
      total: assignments.length,
      present: 0, // No attendance records = all absent
      absent: assignments.length,
      late: 0,
      onLeave: 0,
      overtime: 0
    };

    console.log('📊 Expected Workforce Count:');
    console.log(`   Total: ${expectedWorkforceCount.total}`);
    console.log(`   Present: ${expectedWorkforceCount.present}`);
    console.log(`   Absent: ${expectedWorkforceCount.absent}`);
    console.log(`   Late: ${expectedWorkforceCount.late}`);
    console.log(`   On Leave: ${expectedWorkforceCount.onLeave}`);
    console.log(`   Overtime: ${expectedWorkforceCount.overtime}`);

    // 6. Verify project worker counts
    console.log('\n6️⃣ Verifying project worker counts...');
    for (const projectId of [1001, 1002, 1003]) {
      const workerCount = await WorkerTaskAssignment.countDocuments({
        projectId: projectId,
        date: todayDateString
      });
      
      const project = await Project.findOne({ id: projectId });
      console.log(`   Project ${projectId} (${project?.projectName}): ${workerCount} workers`);
    }

    console.log('\n✅ Workforce sample data created successfully!');
    console.log('\n📋 Summary:');
    console.log('   - 3 projects assigned to supervisor 4');
    console.log('   - 6 workers assigned across projects (3+2+1)');
    console.log('   - All workers absent (no attendance records)');
    console.log('   - Expected API response: {"total": 6, "present": 0, "absent": 6, "late": 0, "onLeave": 0, "overtime": 0}');

  } catch (error) {
    console.error('❌ Error creating workforce sample data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📝 Disconnected from MongoDB');
  }
}

// Run the script
createWorkforceSampleData();
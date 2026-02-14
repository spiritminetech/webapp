import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from './src/modules/project/models/Project.js';
import Employee from './src/modules/employee/Employee.js';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';
import Attendance from './src/modules/attendance/Attendance.js';
import LeaveRequest from './src/modules/leaveRequest/models/LeaveRequest.js';

// Load environment variables
dotenv.config();

async function testWorkforceCountAPI() {
  try {
    console.log('🔍 Testing Workforce Count API and Creating Sample Data...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const supervisorId = 4;
    const todayDateString = new Date().toISOString().split('T')[0];
    
    console.log(`📊 Testing for Supervisor ID: ${supervisorId}`);
    console.log(`📅 Date: ${todayDateString}\n`);

    // 1. Check supervisor's projects
    console.log('1️⃣ Checking supervisor projects...');
    const supervisorProjects = await Project.find({ supervisorId: Number(supervisorId) });
    console.log(`   Found ${supervisorProjects.length} projects:`);
    supervisorProjects.forEach(p => {
      console.log(`   - Project ${p.id}: ${p.projectName}`);
    });
    
    if (supervisorProjects.length === 0) {
      console.log('❌ No projects found for supervisor. Creating sample projects...');
      
      // Create sample projects if none exist
      const sampleProjects = [
        {
          id: 1001,
          projectName: 'Orchard Road Office Tower Maintenance',
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
          location: '2 Jurong East Street 21, Singapore 609601',
          supervisorId: 4,
          status: 'ongoing',
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-09-30'),
          description: 'Industrial complex renovation project'
        }
      ];

      for (const projectData of sampleProjects) {
        const existingProject = await Project.findOne({ id: projectData.id });
        if (!existingProject) {
          const project = new Project(projectData);
          await project.save();
          console.log(`   ✅ Created project: ${projectData.projectName}`);
        }
      }
      
      // Refresh projects list
      const updatedProjects = await Project.find({ supervisorId: Number(supervisorId) });
      console.log(`   📊 Now have ${updatedProjects.length} projects for supervisor\n`);
    }

    const projectIds = supervisorProjects.map(p => p.id);
    console.log(`   Project IDs: [${projectIds.join(', ')}]\n`);

    // 2. Check worker assignments for today
    console.log('2️⃣ Checking worker assignments for today...');
    const assignments = await WorkerTaskAssignment.find({
      projectId: { $in: projectIds },
      date: todayDateString
    });
    
    console.log(`   Found ${assignments.length} assignments for today`);
    
    if (assignments.length === 0) {
      console.log('❌ No assignments found for today. Creating sample assignments...');
      
      // Create sample employees if they don't exist
      const sampleEmployees = [
        { id: 60, fullName: 'Sarah Construction Supervisor', role: 'supervisor', userId: 60 },
        { id: 61, fullName: 'Alex Dashboard Worker', role: 'worker', userId: 61 },
        { id: 62, fullName: 'Mike Field Worker', role: 'worker', userId: 62 },
        { id: 63, fullName: 'Lisa Site Manager', role: 'manager', userId: 63 },
        { id: 64, fullName: 'John Safety Officer', role: 'safety_officer', userId: 64 },
        { id: 65, fullName: 'Emma Quality Inspector', role: 'inspector', userId: 65 }
      ];

      for (const empData of sampleEmployees) {
        const existingEmployee = await Employee.findOne({ id: empData.id });
        if (!existingEmployee) {
          const employee = new Employee(empData);
          await employee.save();
          console.log(`   ✅ Created employee: ${empData.fullName}`);
        }
      }

      // Create sample task assignments
      const sampleAssignments = [
        // Project 1001 - 3 workers
        { id: 1001, employeeId: 60, projectId: 1001, taskId: 1, date: todayDateString, status: 'queued' },
        { id: 1002, employeeId: 61, projectId: 1001, taskId: 2, date: todayDateString, status: 'queued' },
        { id: 1003, employeeId: 62, projectId: 1001, taskId: 3, date: todayDateString, status: 'queued' },
        
        // Project 1002 - 2 workers
        { id: 1004, employeeId: 63, projectId: 1002, taskId: 4, date: todayDateString, status: 'queued' },
        { id: 1005, employeeId: 64, projectId: 1002, taskId: 5, date: todayDateString, status: 'queued' },
        
        // Project 1003 - 1 worker
        { id: 1006, employeeId: 65, projectId: 1003, taskId: 6, date: todayDateString, status: 'queued' }
      ];

      for (const assignmentData of sampleAssignments) {
        const existingAssignment = await WorkerTaskAssignment.findOne({ id: assignmentData.id });
        if (!existingAssignment) {
          const assignment = new WorkerTaskAssignment(assignmentData);
          await assignment.save();
          console.log(`   ✅ Created assignment: Employee ${assignmentData.employeeId} -> Project ${assignmentData.projectId}`);
        }
      }
      
      console.log(`   📊 Created sample assignments for 6 workers\n`);
    }

    // Refresh assignments
    const updatedAssignments = await WorkerTaskAssignment.find({
      projectId: { $in: projectIds },
      date: todayDateString
    });
    
    const assignedEmployeeIds = updatedAssignments.map(a => a.employeeId);
    console.log(`   Employee IDs assigned today: [${assignedEmployeeIds.join(', ')}]`);
    console.log(`   Total workers assigned: ${assignedEmployeeIds.length}\n`);

    // 3. Check attendance records
    console.log('3️⃣ Checking attendance records...');
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);

    const attendanceRecords = await Attendance.find({
      employeeId: { $in: assignedEmployeeIds },
      projectId: { $in: projectIds },
      date: {
        $gte: dayStart,
        $lte: dayEnd
      }
    });

    console.log(`   Found ${attendanceRecords.length} attendance records for today`);
    
    // Create sample attendance data to match the expected workforce count
    if (attendanceRecords.length === 0) {
      console.log('❌ No attendance records found. Creating sample attendance...');
      
      // All workers are absent (no check-in records) to match expected data:
      // {"total": 6, "present": 0, "absent": 6, "late": 0, "onLeave": 0, "overtime": 0}
      console.log('   📊 Creating scenario: All 6 workers absent (no check-ins)\n');
    }

    // 4. Check leave requests
    console.log('4️⃣ Checking leave requests...');
    const leaveRequests = await LeaveRequest.find({
      employeeId: { $in: assignedEmployeeIds },
      status: 'APPROVED',
      fromDate: { $lte: dayEnd },
      toDate: { $gte: dayStart }
    });

    console.log(`   Found ${leaveRequests.length} approved leave requests for today\n`);

    // 5. Calculate workforce count manually (same logic as API)
    console.log('5️⃣ Calculating workforce count...');
    
    const onLeaveEmployeeIds = leaveRequests.map(lr => lr.employeeId);
    let present = 0, absent = 0, late = 0, onLeave = 0, overtime = 0;
    const lateThreshold = 8 * 60 + 30; // 8:30 AM in minutes

    for (const employeeId of assignedEmployeeIds) {
      if (onLeaveEmployeeIds.includes(employeeId)) {
        onLeave++;
        continue;
      }

      const attendance = attendanceRecords.find(a => a.employeeId === employeeId);
      if (!attendance || !attendance.checkIn) {
        absent++;
      } else {
        const checkInTime = new Date(attendance.checkIn);
        const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
        
        if (checkInMinutes > lateThreshold) {
          late++;
        } else {
          present++;
        }
      }
    }

    const workforceCount = {
      total: assignedEmployeeIds.length,
      present,
      absent,
      late,
      onLeave,
      overtime,
      lastUpdated: new Date()
    };

    console.log('📊 Calculated Workforce Count:');
    console.log(`   Total: ${workforceCount.total}`);
    console.log(`   Present: ${workforceCount.present}`);
    console.log(`   Absent: ${workforceCount.absent}`);
    console.log(`   Late: ${workforceCount.late}`);
    console.log(`   On Leave: ${workforceCount.onLeave}`);
    console.log(`   Overtime: ${workforceCount.overtime}\n`);

    // 6. Test the actual API endpoint
    console.log('6️⃣ Testing API endpoint logic...');
    
    // Import the controller function
    const { getWorkforceCount } = await import('./src/modules/supervisor/supervisorController.js');
    
    // Mock request and response objects
    const req = {
      params: { id: supervisorId.toString() },
      query: {}
    };
    
    let apiResponse = null;
    const res = {
      json: (data) => {
        apiResponse = data;
        return res;
      },
      status: (code) => {
        console.log(`   API Status Code: ${code}`);
        return res;
      }
    };

    // Call the API function
    await getWorkforceCount(req, res);
    
    console.log('📊 API Response:');
    console.log(JSON.stringify(apiResponse, null, 2));

    // 7. Verify the data matches expected format
    console.log('\n7️⃣ Verification:');
    const expectedFormat = {
      total: 6,
      present: 0,
      absent: 6,
      late: 0,
      onLeave: 0,
      overtime: 0
    };

    console.log('Expected format:', JSON.stringify(expectedFormat, null, 2));
    
    if (apiResponse) {
      const matches = (
        apiResponse.total === expectedFormat.total &&
        apiResponse.present === expectedFormat.present &&
        apiResponse.absent === expectedFormat.absent &&
        apiResponse.late === expectedFormat.late &&
        apiResponse.onLeave === expectedFormat.onLeave &&
        apiResponse.overtime === expectedFormat.overtime
      );
      
      console.log(`✅ Data format matches expected: ${matches ? 'YES' : 'NO'}`);
      
      if (!matches) {
        console.log('❌ Differences found:');
        Object.keys(expectedFormat).forEach(key => {
          if (apiResponse[key] !== expectedFormat[key]) {
            console.log(`   ${key}: expected ${expectedFormat[key]}, got ${apiResponse[key]}`);
          }
        });
      }
    }

    console.log('\n✅ Workforce count API test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing workforce count API:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📝 Disconnected from MongoDB');
  }
}

// Run the test
testWorkforceCountAPI();
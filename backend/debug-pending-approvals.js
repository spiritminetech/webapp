import mongoose from 'mongoose';
import Employee from './src/modules/employee/Employee.js';
import Project from './src/modules/project/models/Project.js';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';
import LeaveRequest from './src/modules/leaveRequest/models/LeaveRequest.js';
import appConfig from './src/config/app.config.js';

/**
 * Debug script to check pending approvals data flow
 */

async function debugPendingApprovals() {
  try {
    console.log('🔍 Debugging Pending Approvals Data Flow...\n');

    // Connect to database
    await mongoose.connect(appConfig.database.uri);
    console.log('✅ Connected to database');

    // Test with supervisor ID 4 (from the demo data)
    const supervisorId = 4;
    console.log(`\n🧪 Testing with Supervisor ID: ${supervisorId}`);

    // Step 1: Check projects for this supervisor
    console.log('\n📋 Step 1: Checking supervisor projects...');
    const supervisorProjects = await Project.find({ supervisorId: Number(supervisorId) });
    console.log(`Found ${supervisorProjects.length} projects for supervisor ${supervisorId}:`);
    supervisorProjects.forEach(p => {
      console.log(`  - Project ${p.id}: ${p.projectName || 'Unnamed Project'}`);
    });

    if (supervisorProjects.length === 0) {
      console.log('❌ No projects found for this supervisor!');
      return;
    }

    const projectIds = supervisorProjects.map(p => p.id);

    // Step 2: Check task assignments
    console.log('\n📝 Step 2: Checking task assignments...');
    const assignments = await WorkerTaskAssignment.find({
      projectId: { $in: projectIds }
    }).distinct('employeeId');

    console.log(`Found ${assignments.length} supervised employees:`, assignments);

    if (assignments.length === 0) {
      console.log('❌ No task assignments found for supervisor projects!');
      return;
    }

    // Step 3: Check employee details
    console.log('\n👥 Step 3: Checking employee details...');
    const employees = await Employee.find({
      id: { $in: assignments }
    }).lean();

    console.log('Supervised employees:');
    employees.forEach(emp => {
      console.log(`  - ${emp.id}: ${emp.fullName}`);
    });

    // Step 4: Check leave requests
    console.log('\n📄 Step 4: Checking leave requests...');
    const allLeaveRequests = await LeaveRequest.find({
      employeeId: { $in: assignments }
    });

    console.log(`Total leave requests from supervised employees: ${allLeaveRequests.length}`);
    
    const pendingLeaveRequests = await LeaveRequest.find({
      employeeId: { $in: assignments },
      status: 'PENDING'
    });

    console.log(`Pending leave requests: ${pendingLeaveRequests.length}`);

    if (pendingLeaveRequests.length > 0) {
      console.log('Pending requests details:');
      pendingLeaveRequests.forEach(req => {
        const employee = employees.find(e => e.id === req.employeeId);
        console.log(`  - ${employee?.fullName || 'Unknown'}: ${req.leaveType} (${req.totalDays} days, ${req.fromDate.toDateString()})`);
      });
    }

    // Step 5: Test the actual API logic
    console.log('\n🔧 Step 5: Testing API logic...');
    
    // Simulate the getPendingApprovals function
    const employeeMap = {};
    employees.forEach(emp => {
      employeeMap[emp.id] = emp.fullName;
    });

    const approvals = pendingLeaveRequests.map(request => {
      const priority = calculateLeavePriority(request);
      
      return {
        approvalId: `leave_${request.id}`,
        type: 'leave',
        requesterId: request.employeeId,
        requesterName: employeeMap[request.employeeId] || 'Unknown Employee',
        submittedDate: request.requestedAt,
        priority: priority,
        details: {
          leaveType: request.leaveType,
          fromDate: request.fromDate,
          toDate: request.toDate,
          totalDays: request.totalDays,
          reason: request.reason
        },
        originalId: request.id
      };
    });

    console.log(`API would return ${approvals.length} approvals`);

    // Step 6: Test dashboard service logic
    console.log('\n📊 Step 6: Testing dashboard service...');
    const dashboardResponse = {
      approvals,
      summary: {
        total: approvals.length,
        leave: approvals.filter(a => a.type === 'leave').length,
        advance_payment: 0,
        material_request: 0,
        attendance_correction: 0
      },
      lastUpdated: new Date()
    };

    console.log('Dashboard service response:');
    console.log(JSON.stringify(dashboardResponse, null, 2));

    // Step 7: Check what the dashboard endpoint would return
    console.log('\n🌐 Step 7: Dashboard endpoint structure...');
    console.log('The dashboard should return:');
    console.log(`pendingApprovals: { total: ${approvals.length}, items: [...] }`);

    console.log('\n✅ Debug completed!');
    console.log(`\n🎯 Expected result: Supervisor ${supervisorId} should see ${approvals.length} pending approvals`);

  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

function calculateLeavePriority(leaveRequest) {
  const now = new Date();
  const fromDate = new Date(leaveRequest.fromDate);
  const daysUntilLeave = Math.ceil((fromDate - now) / (1000 * 60 * 60 * 24));

  if (leaveRequest.leaveType === 'EMERGENCY' || leaveRequest.leaveType === 'MEDICAL') {
    return 'high';
  }

  if (daysUntilLeave <= 3) {
    return 'high';
  }

  if (daysUntilLeave <= 7) {
    return 'medium';
  }

  return 'low';
}

// Run the debug
debugPendingApprovals();
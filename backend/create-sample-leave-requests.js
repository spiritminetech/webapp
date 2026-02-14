import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeaveRequest from './src/modules/leaveRequest/models/LeaveRequest.js';
import Employee from './src/modules/employee/Employee.js';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://smterp:smterp123@cluster0.fvfmm.mongodb.net/smt_erp?retryWrites=true&w=majority';

async function createSampleLeaveRequests() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get today's date
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    console.log(`📅 Creating leave requests for: ${todayString}`);

    // Get employees who have task assignments today
    const todayAssignments = await WorkerTaskAssignment.find({ date: todayString });
    const assignedEmployeeIds = todayAssignments.map(a => a.employeeId);
    
    console.log(`👷 Found ${assignedEmployeeIds.length} employees with assignments today`);

    if (assignedEmployeeIds.length === 0) {
      console.log('❌ No employees with assignments found. Please run create-sample-workforce-data.js first.');
      return;
    }

    // Clean up existing leave requests for today
    console.log('🧹 Cleaning up existing leave requests for today...');
    await LeaveRequest.deleteMany({
      fromDate: { $lte: today },
      toDate: { $gte: today }
    });

    // Get the highest existing leave request ID
    const lastLeaveRequest = await LeaveRequest.findOne().sort({ id: -1 });
    let leaveRequestId = lastLeaveRequest ? lastLeaveRequest.id + 1 : 1;

    // Create leave requests for 2 employees (to show "On Leave: 2")
    const employeesOnLeave = assignedEmployeeIds.slice(0, 2); // Take first 2 employees
    const leaveRequests = [];

    for (const employeeId of employeesOnLeave) {
      const employee = await Employee.findOne({ id: employeeId });
      
      if (employee) {
        const leaveRequest = {
          id: leaveRequestId++,
          companyId: 1,
          employeeId: employeeId,
          requestType: 'LEAVE',
          leaveType: Math.random() > 0.5 ? 'MEDICAL' : 'EMERGENCY',
          fromDate: today,
          toDate: today,
          totalDays: 1,
          reason: Math.random() > 0.5 ? 'Medical appointment' : 'Family emergency',
          status: 'APPROVED', // Must be approved to count in workforce
          currentApproverId: 4, // Supervisor ID
          requestedAt: new Date(today.getTime() - 24 * 60 * 60 * 1000), // Applied yesterday
          createdBy: employeeId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        leaveRequests.push(leaveRequest);
        console.log(`✅ Created leave request for employee ${employeeId} (${employee.fullName})`);
      }
    }

    if (leaveRequests.length > 0) {
      await LeaveRequest.insertMany(leaveRequests);
      console.log(`✅ Created ${leaveRequests.length} approved leave requests`);
    }

    // Test the workforce count API to verify the changes
    console.log('\n🧪 Testing workforce count calculation...');
    
    // Import the controller function
    const { getWorkforceCount } = await import('./src/modules/supervisor/supervisorController.js');
    
    // Mock request and response objects
    const req = {
      params: { id: '4' },
      query: {}
    };
    
    let responseData = null;
    const res = {
      json: (data) => {
        responseData = data;
        return res;
      },
      status: (code) => {
        console.log(`Status: ${code}`);
        return res;
      }
    };
    
    // Call the API function
    await getWorkforceCount(req, res);
    
    console.log('📊 Updated Workforce Count Result:');
    console.log(JSON.stringify(responseData, null, 2));

    // Verify the data
    if (responseData) {
      console.log('\n📈 Summary:');
      console.log(`Total Workers: ${responseData.total}`);
      console.log(`Present: ${responseData.present}`);
      console.log(`Absent: ${responseData.absent}`);
      console.log(`Late: ${responseData.late}`);
      console.log(`On Leave: ${responseData.onLeave} ✅`);
      console.log(`Overtime: ${responseData.overtime}`);
      
      if (responseData.onLeave > 0) {
        console.log('✅ Leave requests created successfully! On Leave count is now > 0');
      } else {
        console.log('⚠️  On Leave count is still 0. Check leave request logic.');
      }
    }

    console.log('\n🎉 Sample leave requests creation completed!');

  } catch (error) {
    console.error('❌ Error creating sample leave requests:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
createSampleLeaveRequests();
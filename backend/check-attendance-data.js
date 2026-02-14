import mongoose from 'mongoose';
import Attendance from './src/modules/attendance/Attendance.js';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';
import Employee from './src/modules/employee/Employee.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkAttendanceData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('Checking data for today:', today.toISOString().split('T')[0]);
    console.log('='.repeat(50));
    
    // Check attendance records
    const attendanceRecords = await Attendance.find({
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    console.log(`\n📊 ATTENDANCE RECORDS (${attendanceRecords.length} total):`);
    attendanceRecords.forEach(record => {
      console.log(`- Employee ${record.employeeId} (Project ${record.projectId}): CheckIn: ${record.checkIn ? record.checkIn.toISOString() : 'None'}, CheckOut: ${record.checkOut ? record.checkOut.toISOString() : 'None'}`);
    });
    
    // Check worker task assignments
    const todayString = today.toISOString().split('T')[0];
    const assignments = await WorkerTaskAssignment.find({
      date: todayString
    });
    
    console.log(`\n📋 WORKER TASK ASSIGNMENTS (${assignments.length} total):`);
    assignments.forEach(assignment => {
      console.log(`- Employee ${assignment.employeeId} (Project ${assignment.projectId}): Task ${assignment.taskId}, Status: ${assignment.status}`);
    });
    
    // Check employees
    const employees = await Employee.find({
      status: 'ACTIVE'
    });
    
    console.log(`\n👥 ACTIVE EMPLOYEES (${employees.length} total):`);
    employees.forEach(employee => {
      console.log(`- ID ${employee.id}: ${employee.fullName} (${employee.jobTitle})`);
    });
    
    // Calculate workforce statistics
    console.log('\n📈 WORKFORCE STATISTICS:');
    
    const assignedEmployeeIds = assignments.map(a => a.employeeId);
    console.log(`- Assigned workers today: ${assignedEmployeeIds.length}`);
    
    const presentEmployeeIds = attendanceRecords
      .filter(a => a.checkIn)
      .map(a => a.employeeId);
    console.log(`- Present workers: ${presentEmployeeIds.length}`);
    
    const absentCount = assignedEmployeeIds.filter(id => !presentEmployeeIds.includes(id)).length;
    console.log(`- Absent workers: ${absentCount}`);
    
    // Check for late workers (after 8:00 AM)
    const standardStartTime = new Date(today);
    standardStartTime.setHours(8, 0, 0, 0);
    
    const lateWorkers = attendanceRecords.filter(a => 
      a.checkIn && a.checkIn > standardStartTime
    );
    console.log(`- Late workers: ${lateWorkers.length}`);
    
    // Check for overtime workers (still working after 6:00 PM or worked past 6:00 PM)
    const standardEndTime = new Date(today);
    standardEndTime.setHours(18, 0, 0, 0);
    const now = new Date();
    
    const overtimeWorkers = attendanceRecords.filter(a => {
      if (a.checkOut && a.checkOut > standardEndTime) {
        return true; // Worked past 6 PM
      }
      if (a.checkIn && !a.checkOut && now > standardEndTime) {
        return true; // Still working after 6 PM
      }
      return false;
    });
    console.log(`- Overtime workers: ${overtimeWorkers.length}`);
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAttendanceData();
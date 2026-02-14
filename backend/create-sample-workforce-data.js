import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';
import Attendance from './src/modules/attendance/Attendance.js';
import Employee from './src/modules/employee/Employee.js';
import Project from './src/modules/project/models/Project.js';
import Task from './src/modules/task/Task.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://smterp:smterp123@cluster0.fvfmm.mongodb.net/smt_erp?retryWrites=true&w=majority';

async function createSampleWorkforceData() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    console.log(`📅 Creating workforce data for: ${todayString}`);

    // Clean up existing data for today
    console.log('🧹 Cleaning up existing data for today...');
    await WorkerTaskAssignment.deleteMany({ date: todayString });
    
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    await Attendance.deleteMany({
      date: { $gte: todayStart, $lte: todayEnd }
    });

    // Get existing projects and employees
    const projects = await Project.find({ supervisorId: 4 }).limit(3);
    const employees = await Employee.find().limit(10);
    const tasks = await Task.find().limit(5);

    if (projects.length === 0 || employees.length === 0 || tasks.length === 0) {
      console.error('❌ Missing required data. Please ensure projects, employees, and tasks exist.');
      return;
    }

    console.log(`📊 Found ${projects.length} projects, ${employees.length} employees, ${tasks.length} tasks`);

    // Create worker assignments for today
    console.log('👷 Creating worker task assignments...');
    
    // Get the highest existing assignment ID
    const lastAssignment = await WorkerTaskAssignment.findOne().sort({ id: -1 });
    let assignmentId = lastAssignment ? lastAssignment.id + 1 : 1;

    const assignments = [];

    // Assign workers to projects
    const workersPerProject = [3, 2, 1]; // Project 1: 3 workers, Project 2: 2 workers, Project 3: 1 worker
    let employeeIndex = 0;

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      const workerCount = workersPerProject[i];
      
      console.log(`  📋 Assigning ${workerCount} workers to project ${project.id} (${project.projectName})`);
      
      for (let j = 0; j < workerCount && employeeIndex < employees.length; j++) {
        const employee = employees[employeeIndex];
        const task = tasks[j % tasks.length];
        
        const assignment = {
          id: assignmentId++,
          employeeId: employee.id,
          projectId: project.id,
          taskId: task.id,
          date: todayString,
          status: 'queued',
          sequence: j + 1,
          createdAt: new Date()
        };
        
        assignments.push(assignment);
        employeeIndex++;
      }
    }

    await WorkerTaskAssignment.insertMany(assignments);
    console.log(`✅ Created ${assignments.length} worker task assignments`);

    // Create attendance records with realistic scenarios
    console.log('📋 Creating attendance records...');
    
    const attendanceRecords = [];
    const scenarios = [
      { type: 'present_early', checkIn: '07:45', checkOut: null, description: 'Present - Early arrival' },
      { type: 'present_ontime', checkIn: '08:00', checkOut: null, description: 'Present - On time' },
      { type: 'late', checkIn: '08:45', checkOut: null, description: 'Late arrival' },
      { type: 'absent', checkIn: null, checkOut: null, description: 'Absent' },
      { type: 'present_overtime', checkIn: '07:30', checkOut: null, description: 'Present - Working overtime' },
      { type: 'completed_shift', checkIn: '08:00', checkOut: '18:00', description: 'Completed full shift' }
    ];

    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i];
      const scenario = scenarios[i % scenarios.length];
      
      if (scenario.checkIn) {
        const checkInTime = new Date(today);
        const [hours, minutes] = scenario.checkIn.split(':');
        checkInTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        let checkOutTime = null;
        if (scenario.checkOut) {
          checkOutTime = new Date(today);
          const [outHours, outMinutes] = scenario.checkOut.split(':');
          checkOutTime.setHours(parseInt(outHours), parseInt(outMinutes), 0, 0);
        }
        
        const attendanceRecord = {
          employeeId: assignment.employeeId,
          projectId: assignment.projectId,
          date: checkInTime,
          checkIn: checkInTime,
          checkOut: checkOutTime,
          insideGeofenceAtCheckin: true,
          insideGeofenceAtCheckout: checkOutTime ? true : null,
          locationAtCheckin: {
            latitude: 1.3521 + (Math.random() - 0.5) * 0.001, // Singapore coordinates with small variation
            longitude: 103.8198 + (Math.random() - 0.5) * 0.001
          },
          locationAtCheckout: checkOutTime ? {
            latitude: 1.3521 + (Math.random() - 0.5) * 0.001,
            longitude: 103.8198 + (Math.random() - 0.5) * 0.001
          } : null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        attendanceRecords.push(attendanceRecord);
        console.log(`  ✅ ${scenario.description} - Employee ${assignment.employeeId} at Project ${assignment.projectId}`);
      } else {
        console.log(`  ❌ ${scenario.description} - Employee ${assignment.employeeId} at Project ${assignment.projectId}`);
      }
    }

    if (attendanceRecords.length > 0) {
      await Attendance.insertMany(attendanceRecords);
      console.log(`✅ Created ${attendanceRecords.length} attendance records`);
    }

    // Test the workforce count API
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
    
    console.log('📊 Workforce Count Result:');
    console.log(JSON.stringify(responseData, null, 2));

    // Verify the data
    if (responseData) {
      console.log('\n📈 Summary:');
      console.log(`Total Workers: ${responseData.total}`);
      console.log(`Present: ${responseData.present}`);
      console.log(`Absent: ${responseData.absent}`);
      console.log(`Late: ${responseData.late}`);
      console.log(`On Leave: ${responseData.onLeave}`);
      console.log(`Overtime: ${responseData.overtime}`);
      
      if (responseData.total > 0) {
        console.log('✅ Workforce data created successfully!');
      } else {
        console.log('⚠️  No workforce data found. Check project assignments.');
      }
    }

    console.log('\n🎉 Sample workforce data creation completed!');

  } catch (error) {
    console.error('❌ Error creating sample workforce data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
createSampleWorkforceData();
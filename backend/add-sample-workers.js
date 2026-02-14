import mongoose from 'mongoose';
import Employee from './src/modules/employee/Employee.js';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';
import Attendance from './src/modules/attendance/Attendance.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const sampleEmployees = [
  {
    id: 101,
    userId: 101,
    companyId: 1,
    fullName: 'John Tan Wei Ming',
    jobTitle: 'Construction Worker',
    phone: '+65 9123 4567',
    status: 'ACTIVE'
  },
  {
    id: 102,
    userId: 102,
    companyId: 1,
    fullName: 'Ahmad Rahman',
    jobTitle: 'Site Foreman',
    phone: '+65 9234 5678',
    status: 'ACTIVE'
  },
  {
    id: 103,
    userId: 103,
    companyId: 1,
    fullName: 'David Lim Cheng Huat',
    jobTitle: 'Electrician',
    phone: '+65 9345 6789',
    status: 'ACTIVE'
  },
  {
    id: 104,
    userId: 104,
    companyId: 1,
    fullName: 'Raj Kumar',
    jobTitle: 'Plumber',
    phone: '+65 9456 7890',
    status: 'ACTIVE'
  },
  {
    id: 105,
    userId: 105,
    companyId: 1,
    fullName: 'Chen Wei Jie',
    jobTitle: 'Construction Worker',
    phone: '+65 9567 8901',
    status: 'ACTIVE'
  }
];

// Get today's date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0];

const sampleTaskAssignments = [
  // Marina Bay Construction (Project 1001)
  {
    id: 2001,
    employeeId: 101,
    projectId: 1001,
    supervisorId: 4,
    taskId: 1001,
    date: today,
    startTime: new Date(new Date().setHours(8, 0, 0, 0)),
    endTime: new Date(new Date().setHours(17, 0, 0, 0)),
    status: 'in_progress',
    companyId: 1,
    dailyTarget: {
      description: 'Foundation work - Section A',
      quantity: 100,
      unit: 'sqm',
      targetCompletion: 100
    },
    workArea: 'Section A',
    floor: 'Ground',
    zone: 'North',
    timeEstimate: {
      estimated: 480, // 8 hours in minutes
      elapsed: 240,   // 4 hours elapsed
      remaining: 240  // 4 hours remaining
    },
    priority: 'high'
  },
  {
    id: 2002,
    employeeId: 102,
    projectId: 1001,
    supervisorId: 4,
    taskId: 1002,
    date: today,
    startTime: new Date(new Date().setHours(7, 30, 0, 0)),
    endTime: new Date(new Date().setHours(17, 30, 0, 0)),
    status: 'in_progress',
    companyId: 1,
    dailyTarget: {
      description: 'Site supervision and quality control',
      quantity: 1,
      unit: 'shift',
      targetCompletion: 100
    },
    workArea: 'Entire Site',
    floor: 'All',
    zone: 'All',
    timeEstimate: {
      estimated: 540, // 9 hours in minutes
      elapsed: 300,   // 5 hours elapsed
      remaining: 240  // 4 hours remaining
    },
    priority: 'critical'
  },
  {
    id: 2003,
    employeeId: 103,
    projectId: 1001,
    supervisorId: 4,
    taskId: 1003,
    date: today,
    startTime: new Date(new Date().setHours(8, 30, 0, 0)),
    endTime: new Date(new Date().setHours(17, 0, 0, 0)),
    status: 'in_progress',
    companyId: 1,
    dailyTarget: {
      description: 'Electrical installation - Floor 1',
      quantity: 50,
      unit: 'points',
      targetCompletion: 100
    },
    workArea: 'Floor 1',
    floor: '1',
    zone: 'East Wing',
    timeEstimate: {
      estimated: 480, // 8 hours in minutes
      elapsed: 180,   // 3 hours elapsed
      remaining: 300  // 5 hours remaining
    },
    priority: 'medium'
  },
  // Jurong Industrial Complex (Project 1002)
  {
    id: 2004,
    employeeId: 104,
    projectId: 1002,
    supervisorId: 4,
    taskId: 1004,
    date: today,
    startTime: new Date(new Date().setHours(8, 0, 0, 0)),
    endTime: new Date(new Date().setHours(16, 30, 0, 0)),
    status: 'in_progress',
    companyId: 1,
    dailyTarget: {
      description: 'Plumbing system renovation',
      quantity: 20,
      unit: 'fixtures',
      targetCompletion: 100
    },
    workArea: 'Building B',
    floor: '2',
    zone: 'West Wing',
    timeEstimate: {
      estimated: 480, // 8 hours in minutes
      elapsed: 360,   // 6 hours elapsed
      remaining: 120  // 2 hours remaining
    },
    priority: 'high'
  },
  {
    id: 2005,
    employeeId: 105,
    projectId: 1002,
    supervisorId: 4,
    taskId: 1005,
    date: today,
    startTime: new Date(new Date().setHours(8, 15, 0, 0)),
    endTime: new Date(new Date().setHours(17, 0, 0, 0)),
    status: 'queued', // This worker will be absent
    companyId: 1,
    dailyTarget: {
      description: 'General construction support',
      quantity: 1,
      unit: 'shift',
      targetCompletion: 100
    },
    workArea: 'Building A',
    floor: '1',
    zone: 'South Wing',
    timeEstimate: {
      estimated: 480, // 8 hours in minutes
      elapsed: 0,     // Not started
      remaining: 480  // Full time remaining
    },
    priority: 'medium'
  }
];

const sampleAttendanceRecords = [
  // Present workers
  {
    employeeId: 101,
    projectId: 1001,
    date: new Date(),
    checkIn: new Date(new Date().setHours(8, 5, 0, 0)), // 8:05 AM (5 minutes late)
    checkOut: null,
    insideGeofenceAtCheckin: true,
    insideGeofenceAtCheckout: null,
    latitude: 1.2966,
    longitude: 103.8547
  },
  {
    employeeId: 102,
    projectId: 1001,
    date: new Date(),
    checkIn: new Date(new Date().setHours(7, 25, 0, 0)), // 7:25 AM (early)
    checkOut: null,
    insideGeofenceAtCheckin: true,
    insideGeofenceAtCheckout: null,
    latitude: 1.2966,
    longitude: 103.8547
  },
  {
    employeeId: 103,
    projectId: 1001,
    date: new Date(),
    checkIn: new Date(new Date().setHours(8, 25, 0, 0)), // 8:25 AM (on time)
    checkOut: null,
    insideGeofenceAtCheckin: true,
    insideGeofenceAtCheckout: null,
    latitude: 1.2966,
    longitude: 103.8547
  },
  {
    employeeId: 104,
    projectId: 1002,
    date: new Date(),
    checkIn: new Date(new Date().setHours(7, 55, 0, 0)), // 7:55 AM (on time)
    checkOut: null,
    insideGeofenceAtCheckin: true,
    insideGeofenceAtCheckout: null,
    latitude: 1.3329,
    longitude: 103.7436
  }
  // Employee 105 will be absent (no attendance record)
];

async function addSampleWorkers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data for clean test
    console.log('Clearing existing sample data...');
    await Employee.deleteMany({ id: { $in: [101, 102, 103, 104, 105] } });
    await WorkerTaskAssignment.deleteMany({ employeeId: { $in: [101, 102, 103, 104, 105] } });
    await Attendance.deleteMany({ employeeId: { $in: [101, 102, 103, 104, 105] } });

    // Insert sample employees
    console.log('Inserting sample employees...');
    const insertedEmployees = await Employee.insertMany(sampleEmployees);
    console.log(`Inserted ${insertedEmployees.length} employees`);

    // Insert sample task assignments
    console.log('Inserting sample task assignments...');
    const insertedAssignments = await WorkerTaskAssignment.insertMany(sampleTaskAssignments);
    console.log(`Inserted ${insertedAssignments.length} task assignments`);

    // Insert sample attendance records
    console.log('Inserting sample attendance records...');
    const insertedAttendance = await Attendance.insertMany(sampleAttendanceRecords);
    console.log(`Inserted ${insertedAttendance.length} attendance records`);

    console.log('\n✅ Sample worker data added successfully!');
    console.log('\nWorkforce Summary:');
    console.log('- Total assigned workers: 5');
    console.log('- Present workers: 4');
    console.log('- Absent workers: 1 (Employee 105)');
    console.log('- Late workers: 1 (Employee 101 - 5 minutes late)');
    console.log('- Projects with workers:');
    console.log('  * Marina Bay Construction: 3 workers');
    console.log('  * Jurong Industrial Complex: 2 workers');

  } catch (error) {
    console.error('Error adding sample workers:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
addSampleWorkers();
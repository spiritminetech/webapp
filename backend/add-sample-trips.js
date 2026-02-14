import mongoose from 'mongoose';
import dotenv from 'dotenv';
import FleetTask from './src/modules/fleetTask/models/FleetTask.js';
import FleetTaskPassenger from './src/modules/fleetTask/submodules/fleetTaskPassenger/FleetTaskPassenger.js';
import FleetVehicle from './src/modules/fleetTask/submodules/fleetvehicle/FleetVehicle.js';
import Employee from './src/modules/employee/Employee.js';
import Project from './src/modules/project/models/Project.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Get today's date
const getTodayDate = () => {
  const today = new Date();
  return today;
};

// Get next available ID for a collection
const getNextId = async (Model) => {
  const lastRecord = await Model.findOne().sort({ id: -1 });
  const nextId = lastRecord ? lastRecord.id + 1 : 1;
  
  // Double-check that this ID doesn't exist
  const existing = await Model.findOne({ id: nextId });
  if (existing) {
    // If it exists, find the highest ID and add 1
    const allRecords = await Model.find({}, { id: 1 }).sort({ id: -1 }).limit(10);
    const maxId = Math.max(...allRecords.map(r => r.id), 0);
    return maxId + 1;
  }
  
  return nextId;
};

// Sample trip data creation
const createSampleTripData = async () => {
  try {
    const today = getTodayDate();
    console.log(`📅 Creating sample trips for date: ${today.toDateString()}`);

    // Get existing employee and project
    const employee = await Employee.findOne();
    if (!employee) {
      console.log('❌ No employee found. Please run add-sample-tasks.js first.');
      return;
    }

    const project = await Project.findOne();
    if (!project) {
      console.log('❌ No project found. Please run add-sample-tasks.js first.');
      return;
    }

    const employeeId = employee.id;
    const companyId = employee.companyId || 1;
    const projectId = project.id;

    // Create a driver employee if not exists
    let driver = await Employee.findOne({ jobTitle: 'Driver' });
    if (!driver) {
      console.log('⚠️ No driver found. Creating a sample driver...');
      
      const driverId = await getNextId(Employee);
      driver = new Employee({
        id: driverId,
        companyId: companyId,
        fullName: 'Mike Driver',
        phone: '+1234567891',
        jobTitle: 'Driver',
        status: 'ACTIVE',
        employeeCode: 'DRV001'
      });
      await driver.save();
      console.log(`✅ Created sample driver with ID: ${driverId}`);
    }

    // Create a fleet vehicle if not exists
    let vehicle = await FleetVehicle.findOne();
    if (!vehicle) {
      console.log('⚠️ No vehicle found. Creating a sample vehicle...');
      
      const vehicleId = await getNextId(FleetVehicle);
      vehicle = new FleetVehicle({
        id: vehicleId,
        companyId: companyId,
        vehicleCode: 'VEH001',
        registrationNo: 'ABC-1234',
        vehicleType: 'Van',
        capacity: 8,
        status: 'AVAILABLE'
      });
      await vehicle.save();
      console.log(`✅ Created sample vehicle with ID: ${vehicleId}`);
    }

    // Check if fleet tasks already exist for today
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    const existingTasks = await FleetTask.find({
      taskDate: { $gte: startOfDay, $lte: endOfDay },
      companyId: companyId
    });

    if (existingTasks.length > 0) {
      console.log(`⚠️ Removing existing fleet tasks for today`);
      const taskIds = existingTasks.map(t => t.id);
      
      // Remove associated passengers first
      await FleetTaskPassenger.deleteMany({
        fleetTaskId: { $in: taskIds }
      });
      
      // Remove fleet tasks
      await FleetTask.deleteMany({
        taskDate: { $gte: startOfDay, $lte: endOfDay },
        companyId: companyId
      });
      console.log('✅ Existing fleet tasks and passengers removed');
    }

    // Create sample fleet tasks (trips)
    const timestamp = Date.now();
    const task1Id = Math.floor(timestamp / 1000);
    const task2Id = task1Id + 1;

    // Get today's date properly
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0); // Start of day

    // Morning trip - Home to Project Site
    const morningPickupTime = new Date(todayDate);
    morningPickupTime.setHours(7, 30, 0, 0); // 7:30 AM
    
    const morningDropTime = new Date(todayDate);
    morningDropTime.setHours(8, 0, 0, 0); // 8:00 AM

    const morningTrip = new FleetTask({
      id: task1Id,
      companyId: companyId,
      projectId: projectId,
      driverId: driver.id,
      vehicleId: vehicle.id,
      taskDate: todayDate, // Use the proper date
      plannedPickupTime: morningPickupTime,
      plannedDropTime: morningDropTime,
      pickupLocation: 'Central Bus Station',
      pickupAddress: '123 Main Street, Metro City',
      dropLocation: project.projectName,
      dropAddress: project.address || 'Downtown Site A, Metro City',
      expectedPassengers: 1,
      status: 'PLANNED',
      notes: 'Morning commute to project site',
      createdBy: 1
    });

    // Evening trip - Project Site to Home
    const eveningPickupTime = new Date(todayDate);
    eveningPickupTime.setHours(17, 0, 0, 0); // 5:00 PM
    
    const eveningDropTime = new Date(todayDate);
    eveningDropTime.setHours(17, 30, 0, 0); // 5:30 PM

    const eveningTrip = new FleetTask({
      id: task2Id,
      companyId: companyId,
      projectId: projectId,
      driverId: driver.id,
      vehicleId: vehicle.id,
      taskDate: todayDate, // Use the proper date
      plannedPickupTime: eveningPickupTime,
      plannedDropTime: eveningDropTime,
      pickupLocation: project.projectName,
      pickupAddress: project.address || 'Downtown Site A, Metro City',
      dropLocation: 'Central Bus Station',
      dropAddress: '123 Main Street, Metro City',
      expectedPassengers: 1,
      status: 'PLANNED',
      notes: 'Evening commute from project site',
      createdBy: 1
    });

    await morningTrip.save();
    await eveningTrip.save();

    // Create passenger records for the worker
    const passenger1Id = Math.floor((timestamp + 1000) / 1000);
    const passenger2Id = passenger1Id + 1;

    const morningPassenger = new FleetTaskPassenger({
      id: passenger1Id,
      companyId: companyId,
      fleetTaskId: task1Id,
      workerEmployeeId: employeeId,
      pickupStatus: 'pending',
      dropStatus: 'pending',
      notes: 'Regular morning commute'
    });

    const eveningPassenger = new FleetTaskPassenger({
      id: passenger2Id,
      companyId: companyId,
      fleetTaskId: task2Id,
      workerEmployeeId: employeeId,
      pickupStatus: 'pending',
      dropStatus: 'pending',
      notes: 'Regular evening commute'
    });

    await morningPassenger.save();
    await eveningPassenger.save();

    console.log('🎉 Sample trip data created successfully!');
    console.log('📋 Summary:');
    console.log(`   Employee ID: ${employeeId} (${employee.fullName})`);
    console.log(`   Driver ID: ${driver.id} (${driver.fullName})`);
    console.log(`   Vehicle ID: ${vehicle.id} (${vehicle.registrationNo})`);
    console.log(`   Project ID: ${projectId} (${project.projectName})`);
    console.log(`   Morning Trip ID: ${task1Id} (${morningPickupTime.toLocaleTimeString()} - ${morningDropTime.toLocaleTimeString()})`);
    console.log(`   Evening Trip ID: ${task2Id} (${eveningPickupTime.toLocaleTimeString()} - ${eveningDropTime.toLocaleTimeString()})`);
    console.log(`   Passenger Records: ${passenger1Id}, ${passenger2Id}`);
    console.log(`   Date: ${today.toDateString()}`);
    console.log('');
    console.log('🌐 You can now test the API endpoint:');
    console.log(`   GET /api/worker/today-trip`);
    console.log('   (Make sure to include proper authentication headers)');

  } catch (error) {
    console.error('❌ Error creating sample trip data:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await createSampleTripData();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script execution error:', error);
  process.exit(1);
});
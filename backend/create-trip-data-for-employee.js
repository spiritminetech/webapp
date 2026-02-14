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

const createTripDataForEmployee = async () => {
  try {
    console.log('🚗 Creating trip data for employee...\n');

    // Check if employee exists
    const employee = await Employee.findOne({ id: 1 });
    if (!employee) {
      console.log('❌ Employee ID 1 not found');
      return;
    }
    console.log(`✅ Found employee: ${employee.fullName}`);

    // Check if driver exists (we'll use employee ID 2)
    const driver = await Employee.findOne({ id: 2 });
    if (!driver) {
      console.log('❌ Driver not found');
      return;
    }
    console.log(`✅ Found driver: ${driver.fullName}`);

    // Check if vehicle exists
    let vehicle = await FleetVehicle.findOne({ id: 1 });
    if (!vehicle) {
      const vehicleId = await getNextId(FleetVehicle);
      vehicle = new FleetVehicle({
        id: vehicleId,
        registrationNo: 'TEST-123',
        vehicleType: 'Van',
        capacity: 8,
        isActive: true
      });
      await vehicle.save();
      console.log(`✅ Created vehicle: ${vehicle.registrationNo}`);
    } else {
      console.log(`✅ Found vehicle: ${vehicle.registrationNo}`);
    }

    // Check if project exists
    let project = await Project.findOne({ id: 1001 });
    if (!project) {
      console.log('❌ Project ID 1001 not found');
      return;
    }
    console.log(`✅ Found project: ${project.projectName}`);

    // Create today's date
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Check if fleet tasks already exist for today
    const existingTasks = await FleetTask.find({
      taskDate: { $gte: startOfDay, $lte: endOfDay }
    });

    if (existingTasks.length > 0) {
      console.log(`⚠️ ${existingTasks.length} fleet tasks already exist for today`);
    }

    // Create morning trip (pickup)
    const morningTaskId = await getNextId(FleetTask);
    const morningTask = new FleetTask({
      id: morningTaskId,
      projectId: project.id,
      driverId: driver.id,
      vehicleId: vehicle.id,
      taskDate: today,
      plannedPickupTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0), // 8:00 AM
      plannedDropTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0), // 9:00 AM
      pickupLocation: 'Central Bus Station',
      dropLocation: project.projectName,
      status: 'PLANNED',
      companyId: 1
    });
    await morningTask.save();
    console.log(`✅ Created morning trip (ID: ${morningTaskId})`);

    // Create evening trip (drop-off)
    const eveningTaskId = await getNextId(FleetTask);
    const eveningTask = new FleetTask({
      id: eveningTaskId,
      projectId: project.id,
      driverId: driver.id,
      vehicleId: vehicle.id,
      taskDate: today,
      plannedPickupTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 0), // 5:00 PM
      plannedDropTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0), // 6:00 PM
      pickupLocation: project.projectName,
      dropLocation: 'Central Bus Station',
      status: 'PLANNED',
      companyId: 1
    });
    await eveningTask.save();
    console.log(`✅ Created evening trip (ID: ${eveningTaskId})`);

    // Create passenger records for employee ID 1
    const morningPassengerId = await getNextId(FleetTaskPassenger);
    const morningPassenger = new FleetTaskPassenger({
      id: morningPassengerId,
      companyId: 1,
      fleetTaskId: morningTaskId,
      workerEmployeeId: employee.id
    });
    await morningPassenger.save();
    console.log(`✅ Added employee to morning trip (Passenger ID: ${morningPassengerId})`);

    const eveningPassengerId = await getNextId(FleetTaskPassenger);
    const eveningPassenger = new FleetTaskPassenger({
      id: eveningPassengerId,
      companyId: 1,
      fleetTaskId: eveningTaskId,
      workerEmployeeId: employee.id
    });
    await eveningPassenger.save();
    console.log(`✅ Added employee to evening trip (Passenger ID: ${eveningPassengerId})`);

    console.log('\n🎉 Trip data created successfully!');
    console.log('📋 Summary:');
    console.log(`   Employee: ${employee.fullName} (ID: ${employee.id})`);
    console.log(`   Driver: ${driver.fullName} (ID: ${driver.id})`);
    console.log(`   Vehicle: ${vehicle.registrationNo} (ID: ${vehicle.id})`);
    console.log(`   Project: ${project.projectName} (ID: ${project.id})`);
    console.log(`   Morning Trip: ${morningTaskId} (8:00 AM - 9:00 AM)`);
    console.log(`   Evening Trip: ${eveningTaskId} (5:00 PM - 6:00 PM)`);

  } catch (error) {
    console.error('❌ Error creating trip data:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await createTripDataForEmployee();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script execution error:', error);
  process.exit(1);
});
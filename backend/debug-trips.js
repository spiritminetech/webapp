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

const debugTrips = async () => {
  try {
    console.log('🔍 Debugging Trip Data...\n');

    // Check employees
    const employees = await Employee.find();
    console.log('👥 Employees in database:');
    employees.forEach(emp => {
      console.log(`   ID: ${emp.id}, Name: ${emp.fullName}, Job: ${emp.jobTitle}`);
    });
    console.log('');

    // Check fleet tasks
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    const fleetTasks = await FleetTask.find({
      taskDate: { $gte: startOfDay, $lte: endOfDay }
    });
    console.log('🚗 Fleet Tasks for today:');
    fleetTasks.forEach(task => {
      console.log(`   ID: ${task.id}, Project: ${task.projectId}, Driver: ${task.driverId}, Vehicle: ${task.vehicleId}`);
      console.log(`   Date: ${task.taskDate}, Status: ${task.status}`);
      console.log(`   Pickup: ${task.pickupLocation} -> Drop: ${task.dropLocation}`);
    });
    console.log('');

    // Check fleet task passengers
    const passengers = await FleetTaskPassenger.find();
    console.log('👤 Fleet Task Passengers:');
    passengers.forEach(passenger => {
      console.log(`   ID: ${passenger.id}, FleetTask: ${passenger.fleetTaskId}, Worker: ${passenger.workerEmployeeId}`);
    });
    console.log('');

    // Check vehicles
    const vehicles = await FleetVehicle.find();
    console.log('🚙 Vehicles:');
    vehicles.forEach(vehicle => {
      console.log(`   ID: ${vehicle.id}, Registration: ${vehicle.registrationNo}, Type: ${vehicle.vehicleType}`);
    });
    console.log('');

    // Check projects
    const projects = await Project.find();
    console.log('🏗️ Projects:');
    projects.forEach(project => {
      console.log(`   ID: ${project.id}, Name: ${project.projectName}`);
    });
    console.log('');

    // Simulate the API logic for employee ID 1
    const employeeId = 1;
    console.log(`🔍 Simulating API logic for employee ID: ${employeeId}`);
    
    const passengerRecords = await FleetTaskPassenger.find({
      workerEmployeeId: employeeId
    });
    console.log(`   Found ${passengerRecords.length} passenger records for employee ${employeeId}`);
    
    if (passengerRecords.length > 0) {
      const fleetTaskIds = passengerRecords.map(p => p.fleetTaskId);
      console.log(`   Fleet Task IDs: ${fleetTaskIds.join(', ')}`);
      
      const tasks = await FleetTask.find({
        id: { $in: fleetTaskIds },
        taskDate: { $gte: startOfDay, $lte: endOfDay }
      });
      console.log(`   Found ${tasks.length} matching fleet tasks for today`);
      
      tasks.forEach(task => {
        console.log(`     Task ${task.id}: ${task.pickupLocation} -> ${task.dropLocation}`);
      });
    }

  } catch (error) {
    console.error('❌ Error debugging trips:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await debugTrips();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script execution error:', error);
  process.exit(1);
});
import mongoose from 'mongoose';
import Project from './src/modules/project/models/Project.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const sampleProjects = [
  {
    id: 1001,
    companyId: 1,
    projectCode: 'MBC-2024-001',
    projectName: 'Marina Bay Construction Phase 1',
    description: 'High-rise commercial building construction at Marina Bay',
    jobNature: 'Construction',
    jobSubtype: 'Commercial Building',
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-12-31'),
    expectedEndDate: new Date('2024-12-31'),
    budgetLabor: 500000,
    budgetMaterials: 800000,
    budgetTools: 150000,
    budgetTransport: 50000,
    status: 'Ongoing',
    address: '10 Marina Boulevard, Singapore 018983',
    latitude: 1.2966,
    longitude: 103.8547,
    geofenceRadius: 100,
    supervisorId: 4, // Your supervisor ID
    projectManagerId: 1,
    createdBy: 1,
    transportRequired: true,
    transportDailyWorkers: 15,
    transportPickupLocation: 'Jurong East MRT Station',
    transportPickupTime: '07:00',
    transportDropTime: '18:00',
    geofence: {
      center: {
        latitude: 1.2966,
        longitude: 103.8547
      },
      radius: 100,
      strictMode: true,
      allowedVariance: 10
    },
    workAreas: [
      {
        name: 'Main Construction Site',
        zone: 'A',
        floor: 'Ground',
        description: 'Primary construction area',
        coordinates: {
          latitude: 1.2966,
          longitude: 103.8547
        }
      }
    ]
  },
  {
    id: 1002,
    companyId: 1,
    projectCode: 'JIC-2024-002',
    projectName: 'Jurong Industrial Complex Renovation',
    description: 'Industrial facility renovation and modernization',
    jobNature: 'Renovation',
    jobSubtype: 'Industrial',
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-08-30'),
    expectedEndDate: new Date('2024-08-30'),
    budgetLabor: 300000,
    budgetMaterials: 450000,
    budgetTools: 80000,
    budgetTransport: 30000,
    status: 'Ongoing',
    address: '2 Jurong East Street 21, Singapore 609601',
    latitude: 1.3329,
    longitude: 103.7436,
    geofenceRadius: 150,
    supervisorId: 4, // Your supervisor ID
    projectManagerId: 2,
    createdBy: 1,
    transportRequired: true,
    transportDailyWorkers: 8,
    transportPickupLocation: 'Jurong East MRT Station',
    transportPickupTime: '07:30',
    transportDropTime: '17:30',
    geofence: {
      center: {
        latitude: 1.3329,
        longitude: 103.7436
      },
      radius: 150,
      strictMode: true,
      allowedVariance: 15
    },
    workAreas: [
      {
        name: 'Factory Floor A',
        zone: 'A',
        floor: '1',
        description: 'Main production area renovation',
        coordinates: {
          latitude: 1.3329,
          longitude: 103.7436
        }
      },
      {
        name: 'Warehouse Section',
        zone: 'B',
        floor: '1',
        description: 'Storage area modernization',
        coordinates: {
          latitude: 1.3330,
          longitude: 103.7437
        }
      }
    ]
  },
  {
    id: 1003,
    companyId: 1,
    projectCode: 'ORT-2024-003',
    projectName: 'Orchard Road Office Tower Maintenance',
    description: 'Routine maintenance and facade cleaning for office tower',
    jobNature: 'Maintenance',
    jobSubtype: 'Office Building',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-04-15'),
    expectedEndDate: new Date('2024-04-15'),
    budgetLabor: 80000,
    budgetMaterials: 120000,
    budgetTools: 25000,
    budgetTransport: 15000,
    status: 'On Hold',
    address: '238 Orchard Road, Singapore 238851',
    latitude: 1.3048,
    longitude: 103.8318,
    geofenceRadius: 80,
    supervisorId: 4, // Your supervisor ID
    projectManagerId: 1,
    createdBy: 1,
    transportRequired: false,
    transportDailyWorkers: 0,
    geofence: {
      center: {
        latitude: 1.3048,
        longitude: 103.8318
      },
      radius: 80,
      strictMode: false,
      allowedVariance: 20
    },
    workAreas: [
      {
        name: 'Building Exterior',
        zone: 'EXT',
        floor: 'All',
        description: 'Facade cleaning and maintenance',
        coordinates: {
          latitude: 1.3048,
          longitude: 103.8318
        }
      }
    ]
  }
];

async function addSampleProjects() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing projects for supervisor 4 (optional)
    console.log('Clearing existing projects for supervisor 4...');
    await Project.deleteMany({ supervisorId: 4 });

    // Insert sample projects
    console.log('Inserting sample projects...');
    const insertedProjects = await Project.insertMany(sampleProjects);
    
    console.log(`Successfully inserted ${insertedProjects.length} sample projects:`);
    insertedProjects.forEach(project => {
      console.log(`- ${project.projectName} (ID: ${project.id})`);
    });

    console.log('\nSample projects added successfully!');
    console.log('You can now test the supervisor dashboard with real data.');

  } catch (error) {
    console.error('Error adding sample projects:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
addSampleProjects();
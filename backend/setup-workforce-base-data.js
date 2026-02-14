import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './src/modules/employee/Employee.js';
import Project from './src/modules/project/models/Project.js';
import Task from './src/modules/task/Task.js';
import Company from './src/modules/company/Company.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://smterp:smterp123@cluster0.fvfmm.mongodb.net/smt_erp?retryWrites=true&w=majority';

async function setupWorkforceBaseData() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check existing data
    console.log('🔍 Checking existing data...');
    const existingProjects = await Project.find({ supervisorId: 4 });
    const existingEmployees = await Employee.find();
    const existingTasks = await Task.find();
    const existingCompanies = await Company.find();

    console.log(`📊 Found: ${existingProjects.length} projects, ${existingEmployees.length} employees, ${existingTasks.length} tasks, ${existingCompanies.length} companies`);

    // Create company if needed
    if (existingCompanies.length === 0) {
      console.log('🏢 Creating sample company...');
      const company = new Company({
        id: 1,
        companyName: 'SMT Construction Pte Ltd',
        address: '123 Business Park, Singapore 123456',
        contactNumber: '+65 6123 4567',
        email: 'info@smtconstruction.com',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await company.save();
      console.log('✅ Created sample company');
    }

    // Create projects if needed
    if (existingProjects.length === 0) {
      console.log('🏗️ Creating sample projects...');
      const projects = [
        {
          id: 1001,
          projectName: 'Orchard Road Office Tower Maintenance',
          description: 'Maintenance and renovation of office tower',
          location: '238 Orchard Road, Singapore 238851',
          startDate: new Date('2026-01-15'),
          endDate: new Date('2026-03-15'),
          status: 'on_hold',
          supervisorId: 4,
          geofence: {
            center: { latitude: 1.3048, longitude: 103.8318 },
            radius: 100
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 1002,
          projectName: 'Marina Bay Construction Phase 1',
          description: 'New commercial building construction',
          location: 'Marina Bay, Singapore',
          startDate: new Date('2026-01-20'),
          endDate: new Date('2026-06-20'),
          status: 'ongoing',
          supervisorId: 4,
          geofence: {
            center: { latitude: 1.2834, longitude: 103.8607 },
            radius: 150
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 1003,
          projectName: 'Jurong Industrial Complex Renovation',
          description: 'Industrial facility renovation and upgrade',
          location: '2 Jurong East Street 21, Singapore 609601',
          startDate: new Date('2026-01-10'),
          endDate: new Date('2026-04-10'),
          status: 'ongoing',
          supervisorId: 4,
          geofence: {
            center: { latitude: 1.3329, longitude: 103.7436 },
            radius: 200
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      await Project.insertMany(projects);
      console.log('✅ Created 3 sample projects');
    }

    // Create employees if needed
    if (existingEmployees.length < 6) {
      console.log('👷 Creating sample employees...');
      
      // Get the highest existing employee ID
      const lastEmployee = await Employee.findOne().sort({ id: -1 });
      let nextId = lastEmployee ? lastEmployee.id + 1 : 60;

      const employees = [
        {
          id: nextId++,
          fullName: 'John Construction Worker',
          email: 'john.worker@smtconstruction.com',
          phoneNumber: '+65 9123 4567',
          role: 'worker',
          department: 'Construction',
          hireDate: new Date('2025-06-01'),
          userId: null, // Will be linked later if needed
          companyId: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: nextId++,
          fullName: 'Sarah Site Engineer',
          email: 'sarah.engineer@smtconstruction.com',
          phoneNumber: '+65 9123 4568',
          role: 'engineer',
          department: 'Engineering',
          hireDate: new Date('2025-07-15'),
          userId: null,
          companyId: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: nextId++,
          fullName: 'Mike Safety Officer',
          email: 'mike.safety@smtconstruction.com',
          phoneNumber: '+65 9123 4569',
          role: 'safety_officer',
          department: 'Safety',
          hireDate: new Date('2025-08-01'),
          userId: null,
          companyId: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: nextId++,
          fullName: 'Lisa Project Coordinator',
          email: 'lisa.coordinator@smtconstruction.com',
          phoneNumber: '+65 9123 4570',
          role: 'coordinator',
          department: 'Project Management',
          hireDate: new Date('2025-09-01'),
          userId: null,
          companyId: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: nextId++,
          fullName: 'David Maintenance Tech',
          email: 'david.tech@smtconstruction.com',
          phoneNumber: '+65 9123 4571',
          role: 'technician',
          department: 'Maintenance',
          hireDate: new Date('2025-10-01'),
          userId: null,
          companyId: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: nextId++,
          fullName: 'Emma Quality Inspector',
          email: 'emma.inspector@smtconstruction.com',
          phoneNumber: '+65 9123 4572',
          role: 'inspector',
          department: 'Quality Control',
          hireDate: new Date('2025-11-01'),
          userId: null,
          companyId: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      await Employee.insertMany(employees);
      console.log('✅ Created 6 sample employees');
    }

    // Create tasks if needed
    if (existingTasks.length === 0) {
      console.log('📋 Creating sample tasks...');
      const tasks = [
        {
          id: 1,
          companyId: 1,
          projectId: 1001,
          taskType: 'WORK',
          taskName: 'Site Preparation',
          description: 'Prepare construction site and set up safety barriers',
          status: 'PLANNED',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 2,
          companyId: 1,
          projectId: 1002,
          taskType: 'WORK',
          taskName: 'Foundation Work',
          description: 'Excavation and foundation laying',
          status: 'PLANNED',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 3,
          companyId: 1,
          projectId: 1003,
          taskType: 'WORK',
          taskName: 'Structural Installation',
          description: 'Install structural components and framework',
          status: 'PLANNED',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 4,
          companyId: 1,
          projectId: 1001,
          taskType: 'INSPECTION',
          taskName: 'Quality Inspection',
          description: 'Inspect work quality and compliance',
          status: 'PLANNED',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 5,
          companyId: 1,
          projectId: 1002,
          taskType: 'MAINTENANCE',
          taskName: 'Site Cleanup',
          description: 'Clean up work area and organize materials',
          status: 'PLANNED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      await Task.insertMany(tasks);
      console.log('✅ Created 5 sample tasks');
    }

    // Verify final data
    console.log('\n📊 Final data verification:');
    const finalProjects = await Project.find({ supervisorId: 4 });
    const finalEmployees = await Employee.find();
    const finalTasks = await Task.find();

    console.log(`✅ Projects: ${finalProjects.length}`);
    finalProjects.forEach(p => console.log(`   - ${p.projectName} (ID: ${p.id})`));
    
    console.log(`✅ Employees: ${finalEmployees.length}`);
    finalEmployees.forEach(e => console.log(`   - ${e.fullName} (ID: ${e.id})`));
    
    console.log(`✅ Tasks: ${finalTasks.length}`);
    finalTasks.forEach(t => console.log(`   - ${t.taskName} (ID: ${t.id})`));

    console.log('\n🎉 Base data setup completed!');

  } catch (error) {
    console.error('❌ Error setting up base data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
setupWorkforceBaseData();
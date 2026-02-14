import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from './src/modules/project/models/Project.js';
import Employee from './src/modules/employee/Employee.js';
import CompanyUser from './src/modules/companyUser/CompanyUser.js';

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const fixProjectSupervisor = async () => {
  try {
    console.log('🔧 Fixing project supervisor assignment...\n');

    // Find the new project that's not showing
    const newProject = await Project.findOne({ 
      projectName: "Industrial Power Distribution System Implementation" 
    });

    if (!newProject) {
      console.log('❌ New project not found');
      return;
    }

    console.log('✅ Found new project:', {
      id: newProject.id,
      projectName: newProject.projectName,
      companyId: newProject.companyId,
      supervisorId: newProject.supervisorId
    });

    // Find available supervisors
    console.log('\n🔍 Looking for available supervisors...');
    
    // Find employees who are supervisors
    const supervisorCompanyUsers = await CompanyUser.find({ 
      role: "supervisor" 
    });
    
    console.log(`Found ${supervisorCompanyUsers.length} supervisor company users`);
    
    for (const companyUser of supervisorCompanyUsers) {
      const employee = await Employee.findOne({ userId: companyUser.userId });
      if (employee) {
        console.log(`   - Employee ID: ${employee.id}, Name: ${employee.fullName}, User ID: ${employee.userId}`);
      }
    }

    // Use the first available supervisor or create a default one
    let supervisorId = 17; // Default from existing projects
    
    if (supervisorCompanyUsers.length > 0) {
      const firstSupervisor = await Employee.findOne({ 
        userId: supervisorCompanyUsers[0].userId 
      });
      if (firstSupervisor) {
        supervisorId = firstSupervisor.id;
      }
    }

    console.log(`\n🎯 Assigning supervisor ID: ${supervisorId}`);

    // Update the project
    await Project.updateOne(
      { _id: newProject._id },
      { 
        supervisorId: supervisorId,
        companyId: 1 // Also update to match other projects
      }
    );

    console.log('✅ Project updated successfully');

    // Verify the update
    const updatedProject = await Project.findOne({ 
      projectName: "Industrial Power Distribution System Implementation" 
    });

    console.log('\n📋 Updated project details:', {
      id: updatedProject.id,
      projectName: updatedProject.projectName,
      companyId: updatedProject.companyId,
      supervisorId: updatedProject.supervisorId
    });

    // Test the filtering logic
    console.log('\n🧪 Testing project filtering logic...');
    
    const employee = await Employee.findOne({ id: updatedProject.supervisorId });
    if (employee) {
      console.log(`✅ Supervisor employee found: ${employee.fullName}`);
      
      const companyUser = await CompanyUser.findOne({ 
        userId: employee.userId, 
        role: "supervisor" 
      });
      
      if (companyUser) {
        console.log('✅ Supervisor company user found - project should now be visible');
      } else {
        console.log('❌ Supervisor company user not found - project will still be filtered out');
      }
    } else {
      console.log('❌ Supervisor employee not found');
    }

  } catch (error) {
    console.error('❌ Error fixing project supervisor:', error);
  }
};

const main = async () => {
  await connectDB();
  await fixProjectSupervisor();
  await mongoose.disconnect();
  console.log('\n✅ Disconnected from MongoDB');
};

main().catch(console.error);
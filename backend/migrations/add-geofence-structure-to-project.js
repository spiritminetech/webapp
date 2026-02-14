import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define the schema inline to avoid import issues
const ProjectSchema = new mongoose.Schema({
  id: {
    type: Number,
    unique: true
  },
  companyId: {
    type: Number,
    index: true
  },
  projectCode: {
    type: String,
    unique: true,
  },
  projectName: {
    type: String,
  },
  description: {
    type: String,
  },
  jobNature: {
    type: String,
  },
  jobSubtype: {
    type: String,
  },
  actualCompletion:{
    type: Date,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
    index: true
  },
  budgetLabor: {
    type: Number,
    default: 0
  },
  budgetMaterials: {
    type: Number,
    default: 0
  },
  budgetTools: {
    type: Number,
    default: 0
  },
  projectStatus: {
    type: String,
  },
  budgetTransport: {
    type: Number,
    default: 0
  },
  budgetWarranty: {
    type: Number,
    default: 0
  },
  budgetCertification: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Not Started', 'Ongoing', 'On Hold', 'Completed', 'Warranty', 'Cancelled'],
    default: 'Not Started',
  },
  permitRequired: {
    type: Boolean,
    default: false
  },
  permitStatus: {
    type: String,
    trim: true
  },
  siteGeo: {
    type: Object
  },
  sitePoint: {
    type: Object
  },
  address: {
    type: String,
    trim: true
  },
  contactPerson: {
    type: Object,
    default: {}
  },
  meta: {
    type: Object,
    default: {}
  },
  createdBy: {
    type: Number,
    index: true
  },
  projectType: {
    type: String
  },
  clientId: {
    type: Number
  },
  expectedEndDate: {
    type: Date
  },
  department: {
    type: String
  },
  remarks: {
    type: String
  },
  actualEndDate: {
    type: Date
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  geofenceRadius: {
    type: Number
  },
  projectManagerId: {
    type: Number
  },
  supervisorId: {
    type: Number
  },
  estimatedLaborCost: {
    type: Number
  },
  estimatedMaterialCost: {
    type: Number
  },
  estimatedToolsCost: {
    type: Number
  },
  estimatedTransportCost: {
    type: Number
  },
  transportRequired: {
    type: Boolean,
    default: false
  },
  transportDailyWorkers: {
    type: Number
  },
  transportPickupLocation: {
    type: String
  },
  transportDriverId: {
    type: Number,
  },
  radius:{
    type: String
  },
  transportPickupTime: {
    type: String
  },
  transportDropTime: {
    type: String
  },
  
  // Enhanced geofencing support
  geofence: {
    center: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    },
    radius: { type: Number, default: 100 }, // meters
    strictMode: { type: Boolean, default: true },
    allowedVariance: { type: Number, default: 10 } // meters
  }
}, {
  timestamps: true
});

const Project = mongoose.model('Project', ProjectSchema);

/**
 * Migration script to add structured geofence object to existing Project records
 * Migrates data from existing latitude, longitude, and geofenceRadius fields
 */
async function migrateGeofenceStructure() {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('🔄 Starting migration: Add geofence structure to Project');

    // Find all projects that have latitude/longitude but no geofence structure
    const projectsToMigrate = await Project.find({
      $and: [
        { latitude: { $exists: true, $ne: null } },
        { longitude: { $exists: true, $ne: null } },
        { geofence: { $exists: false } }
      ]
    });

    console.log(`📊 Found ${projectsToMigrate.length} projects to migrate`);

    let migratedCount = 0;

    for (const project of projectsToMigrate) {
      const radius = project.geofenceRadius || 
                    (project.radius ? parseInt(project.radius) : null) || 
                    100; // Default to 100 meters

      await Project.updateOne(
        { _id: project._id },
        {
          $set: {
            geofence: {
              center: {
                latitude: project.latitude,
                longitude: project.longitude
              },
              radius: radius,
              strictMode: true,
              allowedVariance: 10
            }
          }
        }
      );

      migratedCount++;
      console.log(`✅ Migrated project ${project.projectCode || project.projectName || project.id}: lat=${project.latitude}, lng=${project.longitude}, radius=${radius}`);
    }

    // Also add default geofence structure to projects without coordinates
    const projectsWithoutCoordinates = await Project.find({
      $and: [
        { geofence: { $exists: false } },
        {
          $or: [
            { latitude: { $exists: false } },
            { latitude: null },
            { longitude: { $exists: false } },
            { longitude: null }
          ]
        }
      ]
    });

    console.log(`📊 Found ${projectsWithoutCoordinates.length} projects without coordinates`);

    for (const project of projectsWithoutCoordinates) {
      await Project.updateOne(
        { _id: project._id },
        {
          $set: {
            geofence: {
              center: {
                latitude: 0, // Default coordinates - should be updated by admin
                longitude: 0
              },
              radius: 100,
              strictMode: false, // Allow more flexibility for projects without proper coordinates
              allowedVariance: 50
            }
          }
        }
      );

      migratedCount++;
      console.log(`✅ Added default geofence to project ${project.projectCode || project.projectName || project.id}`);
    }

    console.log(`✅ Migration completed successfully!`);
    console.log(`📊 Migrated ${migratedCount} projects`);
    
    // Verify the migration
    const totalProjects = await Project.countDocuments();
    const projectsWithGeofence = await Project.countDocuments({
      geofence: { $exists: true }
    });

    console.log(`📈 Total projects: ${totalProjects}`);
    console.log(`📈 Projects with geofence structure: ${projectsWithGeofence}`);

    if (totalProjects === projectsWithGeofence) {
      console.log('✅ All projects successfully updated with geofence structure');
    } else {
      console.log('⚠️  Some projects may not have been updated');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateGeofenceStructure()
    .then(() => {
      console.log('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export default migrateGeofenceStructure;
import mongoose from 'mongoose';
import appConfig from './src/config/app.config.js';
import Alert from './src/modules/supervisor/models/Alert.js';

/**
 * Script to create sample alerts for supervisor dashboard testing
 */

// Connect to MongoDB
mongoose.connect(appConfig.database.uri, { 
  dbName: appConfig.database.name,
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  createSampleAlerts();
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function createSampleAlerts() {
  try {
    console.log('🚀 Creating sample alerts for supervisor dashboard...\n');

    const supervisorId = 4;
    const currentTime = new Date();

    // Clear existing alerts for this supervisor
    await Alert.deleteMany({ supervisorId: supervisorId });
    console.log('🧹 Cleared existing alerts for supervisor 4');

    // Sample alerts with different priorities and types
    const sampleAlerts = [
      {
        id: 1001,
        type: 'geofence_violation',
        priority: 'critical',
        message: 'Worker John Doe detected outside project geofence',
        supervisorId: supervisorId,
        relatedWorkerId: 32,
        relatedProjectId: 1001,
        timestamp: new Date(currentTime.getTime() - 15 * 60 * 1000), // 15 minutes ago
        metadata: {
          workerName: 'John Doe',
          distance: '150m outside boundary',
          violationDuration: '8 minutes',
          location: 'Orchard Road Office Tower'
        }
      },
      {
        id: 1002,
        type: 'worker_absence',
        priority: 'warning',
        message: 'Sarah Chen has not checked in yet (30 minutes late)',
        supervisorId: supervisorId,
        relatedWorkerId: 104,
        relatedProjectId: 1002,
        timestamp: new Date(currentTime.getTime() - 30 * 60 * 1000), // 30 minutes ago
        metadata: {
          workerName: 'Sarah Chen',
          scheduledStartTime: '08:00 AM',
          contactAttempts: '2 calls, 1 SMS',
          lastSeen: 'Yesterday 6:15 PM'
        }
      },
      {
        id: 1003,
        type: 'attendance_anomaly',
        priority: 'warning',
        message: 'Multiple workers late at Marina Bay Construction site',
        supervisorId: supervisorId,
        relatedProjectId: 1002,
        timestamp: new Date(currentTime.getTime() - 45 * 60 * 1000), // 45 minutes ago
        metadata: {
          affectedWorkers: ['Rahul Nair', 'Suresh Kumar', 'Michael Wong'],
          averageDelay: '25 minutes',
          possibleCause: 'Traffic congestion on Marina Bay Bridge'
        }
      },
      {
        id: 1004,
        type: 'safety_alert',
        priority: 'critical',
        message: 'Emergency evacuation drill completed at Jurong site',
        supervisorId: supervisorId,
        relatedProjectId: 1003,
        timestamp: new Date(currentTime.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        metadata: {
          alertType: 'Evacuation Drill',
          evacuationStatus: 'Completed successfully',
          workersOnSite: '16 workers evacuated',
          emergencyServices: 'Fire department notified'
        }
      },
      {
        id: 1005,
        type: 'attendance_anomaly',
        priority: 'info',
        message: 'David Lee checked out early (approved overtime)',
        supervisorId: supervisorId,
        relatedWorkerId: 103,
        relatedProjectId: 1001,
        timestamp: new Date(currentTime.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
        metadata: {
          workerName: 'David Lee',
          checkOutTime: '4:30 PM',
          reason: 'Medical appointment',
          approvedBy: 'Supervisor'
        }
      },
      {
        id: 1006,
        type: 'geofence_violation',
        priority: 'warning',
        message: 'Lisa Tan briefly left project boundary (lunch break)',
        supervisorId: supervisorId,
        relatedWorkerId: 106,
        relatedProjectId: 1003,
        timestamp: new Date(currentTime.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
        metadata: {
          workerName: 'Lisa Tan',
          distance: '50m outside boundary',
          violationDuration: '2 minutes',
          reason: 'Lunch at nearby restaurant'
        }
      },
      {
        id: 1007,
        type: 'safety_alert',
        priority: 'info',
        message: 'Weekly safety inspection completed - all clear',
        supervisorId: supervisorId,
        relatedProjectId: 1001,
        timestamp: new Date(currentTime.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
        metadata: {
          alertType: 'Safety Inspection',
          findings: 'No safety violations found',
          inspector: 'Safety Officer Johnson',
          nextInspection: 'Next Monday'
        }
      }
    ];

    console.log(`📝 Creating ${sampleAlerts.length} sample alerts...`);

    // Create alerts directly using the model
    const createdAlerts = [];
    for (const alertData of sampleAlerts) {
      try {
        const alert = new Alert(alertData);
        const savedAlert = await alert.save();
        createdAlerts.push(savedAlert);
        console.log(`  ✅ Created ${alertData.priority} alert: ${alertData.message.substring(0, 50)}...`);
      } catch (error) {
        console.error(`  ❌ Failed to create alert: ${error.message}`);
      }
    }

    console.log(`\n🎉 Successfully created ${createdAlerts.length} sample alerts!`);
    console.log('💡 These alerts will now appear in the supervisor dashboard');

    // Show summary by priority
    const priorityCounts = createdAlerts.reduce((acc, alert) => {
      acc[alert.priority] = (acc[alert.priority] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📊 Alert Summary:');
    console.log(`   Critical: ${priorityCounts.critical || 0}`);
    console.log(`   Warning: ${priorityCounts.warning || 0}`);
    console.log(`   Info: ${priorityCounts.info || 0}`);

  } catch (error) {
    console.error('❌ Error creating sample alerts:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️ Process interrupted');
  mongoose.connection.close();
  process.exit(0);
});
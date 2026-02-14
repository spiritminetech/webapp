import mongoose from 'mongoose';
import Alert from './src/modules/supervisor/models/Alert.js';
import appConfig from './src/config/app.config.js';

/**
 * Cleanup script to remove duplicate alerts
 * Run this once to clean up existing duplicates
 */

async function cleanupDuplicateAlerts() {
  try {
    console.log('🧹 Starting duplicate alert cleanup...\n');

    // Connect to database
    await mongoose.connect(appConfig.database.uri);
    console.log('✅ Connected to database');

    // Find and remove duplicate alerts
    const duplicateGroups = await Alert.aggregate([
      {
        $group: {
          _id: {
            type: '$type',
            supervisorId: '$supervisorId',
            relatedWorkerId: '$relatedWorkerId',
            relatedProjectId: '$relatedProjectId',
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
          },
          count: { $sum: 1 },
          alerts: { $push: { id: '$id', timestamp: '$timestamp', message: '$message' } }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    console.log(`Found ${duplicateGroups.length} groups with duplicate alerts\n`);

    let totalRemoved = 0;

    for (const group of duplicateGroups) {
      const { alerts } = group;
      
      // Sort by timestamp and keep the latest one
      alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const alertsToRemove = alerts.slice(1); // Remove all except the latest

      console.log(`Group: ${group._id.type} for worker ${group._id.relatedWorkerId}`);
      console.log(`  Total alerts: ${alerts.length}`);
      console.log(`  Keeping latest: ${alerts[0].id} (${alerts[0].timestamp})`);
      console.log(`  Removing ${alertsToRemove.length} duplicates`);

      // Remove duplicate alerts
      for (const alert of alertsToRemove) {
        await Alert.deleteOne({ id: alert.id });
        totalRemoved++;
      }
      console.log('');
    }

    // Also remove very old alerts (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oldAlertsResult = await Alert.deleteMany({
      timestamp: { $lt: thirtyDaysAgo },
      isRead: true
    });

    console.log(`🗑️  Removed ${oldAlertsResult.deletedCount} old acknowledged alerts (>30 days)`);
    console.log(`🧹 Total duplicate alerts removed: ${totalRemoved}`);
    
    // Show final count
    const remainingAlerts = await Alert.countDocuments();
    console.log(`📊 Remaining alerts in database: ${remainingAlerts}\n`);

    console.log('✅ Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run cleanup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupDuplicateAlerts();
}

export default cleanupDuplicateAlerts;
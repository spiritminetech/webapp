import express from 'express';
import WorkerTaskAssignment from '../modules/worker/models/WorkerTaskAssignment.js';

const router = express.Router();

/**
 * POST /api/migration/mobile-fields
 * Run migration to add default values for mobile-specific fields
 */
router.post('/mobile-fields', async (req, res) => {
  try {
    console.log('🔄 Starting migration: Add mobile fields to WorkerTaskAssignment');

    // Update all existing records that don't have the new fields
    const result = await WorkerTaskAssignment.updateMany(
      {
        $or: [
          { dailyTarget: { $exists: false } },
          { workArea: { $exists: false } },
          { floor: { $exists: false } },
          { zone: { $exists: false } },
          { timeEstimate: { $exists: false } },
          { priority: { $exists: false } },
          { sequence: { $exists: false } },
          { dependencies: { $exists: false } },
          { geofenceValidation: { $exists: false } }
        ]
      },
      {
        $set: {
          dailyTarget: {
            description: 'Task completion',
            quantity: 1,
            unit: 'task',
            targetCompletion: 100
          },
          workArea: 'General Area',
          floor: 'Ground Floor',
          zone: 'A',
          timeEstimate: {
            estimated: 480, // 8 hours in minutes
            elapsed: 0,
            remaining: 480
          },
          priority: 'medium',
          sequence: 1,
          dependencies: [],
          geofenceValidation: {
            required: true,
            lastValidated: null,
            validationLocation: {
              latitude: null,
              longitude: null
            }
          }
        }
      }
    );

    console.log(`✅ Migration completed successfully!`);
    console.log(`📊 Updated ${result.modifiedCount} records`);
    
    // Verify the migration
    const totalRecords = await WorkerTaskAssignment.countDocuments();
    const recordsWithNewFields = await WorkerTaskAssignment.countDocuments({
      dailyTarget: { $exists: true },
      workArea: { $exists: true },
      floor: { $exists: true },
      zone: { $exists: true },
      timeEstimate: { $exists: true },
      priority: { $exists: true },
      sequence: { $exists: true },
      dependencies: { $exists: true },
      geofenceValidation: { $exists: true }
    });

    console.log(`📈 Total records: ${totalRecords}`);
    console.log(`📈 Records with new fields: ${recordsWithNewFields}`);

    const success = totalRecords === recordsWithNewFields;

    res.json({
      success: true,
      message: 'Migration completed successfully',
      data: {
        totalRecords,
        recordsWithNewFields,
        modifiedCount: result.modifiedCount,
        allRecordsUpdated: success
      }
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message
    });
  }
});

/**
 * GET /api/migration/status
 * Check migration status
 */
router.get('/status', async (req, res) => {
  try {
    const totalRecords = await WorkerTaskAssignment.countDocuments();
    const recordsWithNewFields = await WorkerTaskAssignment.countDocuments({
      dailyTarget: { $exists: true },
      workArea: { $exists: true },
      floor: { $exists: true },
      zone: { $exists: true },
      timeEstimate: { $exists: true },
      priority: { $exists: true },
      sequence: { $exists: true },
      dependencies: { $exists: true },
      geofenceValidation: { $exists: true }
    });

    res.json({
      success: true,
      data: {
        totalRecords,
        recordsWithNewFields,
        migrationComplete: totalRecords === recordsWithNewFields,
        migrationProgress: totalRecords > 0 ? (recordsWithNewFields / totalRecords * 100).toFixed(2) : 0
      }
    });

  } catch (error) {
    console.error('❌ Failed to check migration status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check migration status',
      error: error.message
    });
  }
});

export default router;
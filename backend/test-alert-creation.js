import mongoose from 'mongoose';
import alertService from './src/modules/supervisor/alertService.js';
import Alert from './src/modules/supervisor/models/Alert.js';
import AlertEscalation from './src/modules/supervisor/models/AlertEscalation.js';
import dotenv from 'dotenv';

dotenv.config();

async function testAlertCreation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    console.log('='.repeat(50));
    console.log('TESTING ALERT CREATION');
    console.log('='.repeat(50));
    
    // Check existing alerts
    const existingAlerts = await Alert.find({});
    console.log(`\n📊 Existing alerts in database: ${existingAlerts.length}`);
    
    if (existingAlerts.length > 0) {
      console.log('Existing alerts:');
      existingAlerts.forEach(alert => {
        console.log(`- ID ${alert.id}: ${alert.type} (${alert.priority}) - ${alert.message}`);
      });
    }
    
    // Test creating a new alert
    console.log('\n🔥 Creating a test alert...');
    
    const testAlert = {
      type: 'geofence_violation',
      priority: 'critical',
      message: 'Test geofence violation for testing purposes',
      supervisorId: 4,
      relatedWorkerId: 101,
      relatedProjectId: 1001,
      metadata: {
        testAlert: true,
        createdAt: new Date().toISOString()
      }
    };
    
    const createdAlert = await alertService.createAlert(testAlert);
    console.log('✅ Alert created successfully:');
    console.log(`- Alert ID: ${createdAlert.id}`);
    console.log(`- Type: ${createdAlert.type}`);
    console.log(`- Priority: ${createdAlert.priority}`);
    console.log(`- Message: ${createdAlert.message}`);
    
    // Check if escalation timer was started for critical alert
    console.log('\n⏰ Checking escalation timer...');
    setTimeout(async () => {
      try {
        const escalations = await AlertEscalation.find({ alertId: createdAlert.id });
        console.log(`Escalations found: ${escalations.length}`);
        
        if (escalations.length > 0) {
          console.log('Escalation details:');
          escalations.forEach(esc => {
            console.log(`- Level ${esc.escalationLevel}: ${esc.escalationReason}`);
          });
        }
      } catch (error) {
        console.error('Error checking escalations:', error);
      }
    }, 2000);
    
    // Test fetching alerts for supervisor
    console.log('\n📋 Fetching alerts for supervisor 4...');
    const supervisorAlerts = await alertService.getAlertsForSupervisor(4);
    console.log(`Found ${supervisorAlerts.length} alerts for supervisor 4:`);
    
    supervisorAlerts.forEach(alert => {
      console.log(`- ${alert.type} (${alert.priority}): ${alert.message}`);
      console.log(`  Read: ${alert.isRead}, Worker: ${alert.relatedWorkerId}, Project: ${alert.relatedProjectId}`);
    });
    
    // Test acknowledging the alert
    console.log('\n✅ Testing alert acknowledgment...');
    const acknowledgedAlert = await alertService.acknowledgeAlert(createdAlert.id, 4);
    console.log(`Alert ${acknowledgedAlert.id} acknowledged at: ${acknowledgedAlert.acknowledgedAt}`);
    
    console.log('\n🎯 Alert creation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing alert creation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testAlertCreation();
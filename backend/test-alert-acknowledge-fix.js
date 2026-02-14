import axios from 'axios';

const API_BASE = 'http://localhost:5001/api';

async function testAlertAcknowledgmentFix() {
  try {
    console.log('🧪 Testing Alert Acknowledgment Fix...\n');

    // Test with numeric ID (this should work now)
    const testAlertId = 30; // Numeric ID as it should be
    const testSupervisorId = 4;

    console.log(`Testing with alert ID: ${testAlertId}`);
    console.log(`Testing with supervisor ID: ${testSupervisorId}\n`);

    // First, let's test the dashboard endpoint to see what format IDs are returned in
    console.log('1️⃣ Testing dashboard endpoint to check alert ID format...');
    try {
      const dashboardResponse = await axios.get(
        `${API_BASE}/supervisor/${testSupervisorId}/dashboard`,
        {
          headers: {
            'Authorization': `Bearer your-jwt-token-here`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const alerts = dashboardResponse.data?.alerts || [];
      console.log('✅ Dashboard alerts:', alerts.map(a => ({ alertId: a.alertId, type: a.type })));
      
      if (alerts.length > 0) {
        const firstAlert = alerts[0];
        console.log(`First alert ID format: ${firstAlert.alertId} (type: ${typeof firstAlert.alertId})`);
      }
    } catch (error) {
      console.log('❌ Dashboard endpoint error:', error.response?.data || error.message);
    }

    console.log('\n2️⃣ Testing alert acknowledgment with numeric ID...');
    try {
      const response = await axios.post(
        `${API_BASE}/supervisor/alert/${testAlertId}/acknowledge`,
        { notes: 'Test acknowledgment with numeric ID' },
        {
          headers: {
            'Authorization': `Bearer your-jwt-token-here`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ Acknowledgment response:', response.data);
    } catch (error) {
      console.log('❌ Acknowledgment error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('Test setup error:', error.message);
  }
}

console.log('🔧 Alert Acknowledgment Fix Applied!');
console.log('📋 Changes made:');
console.log('   1. Fixed supervisorDashboardService.js to return numeric alert IDs');
console.log('   2. Simplified acknowledgeAlert controller to handle numeric IDs only');
console.log('   3. Removed legacy route for /acknowledgeRequest');
console.log('\n💡 The issue was that alert IDs were being formatted as "alert_30" in the dashboard service,');
console.log('   but the controller expected numeric IDs. Now both use consistent numeric format.');

// Uncomment to run the test (requires valid JWT token)
// testAlertAcknowledgmentFix();
// Using built-in fetch (Node.js 18+)

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQsImNvbXBhbnlJZCI6MSwicm9sZUlkIjo1LCJyb2xlIjoiU1VQRVJWSVNPUiIsImVtYWlsIjoic3VwZXJ2aXNvckBnbWFpbC5jb20iLCJwZXJtaXNzaW9ucyI6WyJQUk9GSUxFX1ZJRVciLCJTVVBFUlZJU09SX0RBU0hCT0FSRF9WSUVXIiwiU1VQRVJWSVNPUl9UQVNLX0FTU0lHTiIsIlNVUEVSVklTT1JfVEFTS19SRVZJRVciLCJTVVBFUlZJU09SX1BST0dSRVNTX1ZJRVciLCJMRUFWRV9QRU5ESU5HX1ZJRVciXSwiaWF0IjoxNzY5Njk3MDk5LCJleHAiOjE3Njk3MjU4OTl9.QyxFvJYorZO-A9JFSvBVztDvo-QTqizwYJU0F8Xb5HU';

async function testAlertAcknowledgment() {
  try {
    console.log('Testing Alert Acknowledgment API...\n');

    // First, get the dashboard to see available alerts
    console.log('1. Getting dashboard data to find alerts...');
    const dashboardResponse = await fetch('http://localhost:5001/api/supervisor/4/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!dashboardResponse.ok) {
      throw new Error(`Dashboard API failed: ${dashboardResponse.status} ${dashboardResponse.statusText}`);
    }

    const dashboardData = await dashboardResponse.json();
    const alerts = dashboardData.data.alerts?.items || [];
    
    console.log(`Found ${alerts.length} alerts`);
    
    if (alerts.length === 0) {
      console.log('No alerts to test acknowledgment with');
      return;
    }

    // Find an unread alert to acknowledge
    const unreadAlert = alerts.find(alert => !alert.isRead);
    
    if (!unreadAlert) {
      console.log('No unread alerts found to test acknowledgment');
      return;
    }

    console.log(`\n2. Testing acknowledgment of alert ID: ${unreadAlert.alertId}`);
    console.log(`   Alert: ${unreadAlert.message}`);
    console.log(`   Priority: ${unreadAlert.priority}`);

    // Test the acknowledgment API
    const ackResponse = await fetch(`http://localhost:5001/api/supervisor/alert/${unreadAlert.alertId}/acknowledge`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        supervisorId: 4,
        notes: 'Test acknowledgment from API test'
      })
    });

    console.log(`\n3. Acknowledgment API Response Status: ${ackResponse.status}`);

    if (!ackResponse.ok) {
      const errorText = await ackResponse.text();
      console.error(`❌ Acknowledgment failed: ${ackResponse.status} ${ackResponse.statusText}`);
      console.error(`Error details: ${errorText}`);
      return;
    }

    const ackResult = await ackResponse.json();
    console.log('✅ Acknowledgment API Response:');
    console.log(JSON.stringify(ackResult, null, 2));

    // Verify the alert was acknowledged by getting dashboard data again
    console.log('\n4. Verifying alert was acknowledged...');
    const verifyResponse = await fetch('http://localhost:5001/api/supervisor/4/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      const updatedAlerts = verifyData.data.alerts?.items || [];
      const acknowledgedAlert = updatedAlerts.find(alert => alert.alertId === unreadAlert.alertId);
      
      if (acknowledgedAlert) {
        console.log(`Alert ${acknowledgedAlert.alertId} status: ${acknowledgedAlert.isRead ? 'READ' : 'UNREAD'}`);
        if (acknowledgedAlert.isRead) {
          console.log('✅ Alert was successfully acknowledged!');
        } else {
          console.log('❌ Alert is still showing as unread');
        }
      } else {
        console.log('✅ Alert no longer appears in unread alerts (successfully acknowledged)');
      }
    }

    console.log('\n🎯 Alert acknowledgment test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAlertAcknowledgment();
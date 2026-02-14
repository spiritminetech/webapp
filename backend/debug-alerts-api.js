// Using built-in fetch (Node.js 18+)

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQsImNvbXBhbnlJZCI6MSwicm9sZUlkIjo1LCJyb2xlIjoiU1VQRVJWSVNPUiIsImVtYWlsIjoic3VwZXJ2aXNvckBnbWFpbC5jb20iLCJwZXJtaXNzaW9ucyI6WyJQUk9GSUxFX1ZJRVciLCJTVVBFUlZJU09SX0RBU0hCT0FSRF9WSUVXIiwiU1VQRVJWSVNPUl9UQVNLX0FTU0lHTiIsIlNVUEVSVklTT1JfVEFTS19SRVZJRVciLCJTVVBFUlZJU09SX1BST0dSRVNTX1ZJRVciLCJMRUFWRV9QRU5ESU5HX1ZJRVciXSwiaWF0IjoxNzY5Njk3MDk5LCJleHAiOjE3Njk3MjU4OTl9.QyxFvJYorZO-A9JFSvBVztDvo-QTqizwYJU0F8Xb5HU';

async function debugAlertsAPI() {
  try {
    console.log('Debugging Alerts API Response...\n');

    const response = await fetch('http://localhost:5001/api/supervisor/4/alerts', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('\nResponse data:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\nData type:', typeof data);
    console.log('Is array:', Array.isArray(data));
    
    if (data && typeof data === 'object') {
      console.log('Object keys:', Object.keys(data));
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugAlertsAPI();
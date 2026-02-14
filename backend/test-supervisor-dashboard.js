// Using built-in fetch (Node.js 18+)

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQsImNvbXBhbnlJZCI6MSwicm9sZUlkIjo1LCJyb2xlIjoiU1VQRVJWSVNPUiIsImVtYWlsIjoic3VwZXJ2aXNvckBnbWFpbC5jb20iLCJwZXJtaXNzaW9ucyI6WyJQUk9GSUxFX1ZJRVciLCJTVVBFUlZJU09SX0RBU0hCT0FSRF9WSUVXIiwiU1VQRVJWSVNPUl9UQVNLX0FTU0lHTiIsIlNVUEVSVklTT1JfVEFTS19SRVZJRVciLCJTVVBFUlZJU09SX1BST0dSRVNTX1ZJRVciLCJMRUFWRV9QRU5ESU5HX1ZJRVciXSwiaWF0IjoxNzY5Njk3MDk5LCJleHAiOjE3Njk3MjU4OTl9.QyxFvJYorZO-A9JFSvBVztDvo-QTqizwYJU0F8Xb5HU';

async function testSupervisorDashboard() {
  try {
    console.log('Testing Supervisor Dashboard API...\n');

    // Test dashboard endpoint
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
    console.log('✅ Dashboard API Response:');
    console.log(JSON.stringify(dashboardData, null, 2));

    // Test projects endpoint
    console.log('\n\nTesting Projects API...\n');
    const projectsResponse = await fetch('http://localhost:5001/api/supervisor/4/projects', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!projectsResponse.ok) {
      throw new Error(`Projects API failed: ${projectsResponse.status} ${projectsResponse.statusText}`);
    }

    const projectsData = await projectsResponse.json();
    console.log('✅ Projects API Response:');
    console.log(JSON.stringify(projectsData, null, 2));

    // Test workforce count endpoint
    console.log('\n\nTesting Workforce Count API...\n');
    const workforceResponse = await fetch('http://localhost:5001/api/supervisor/4/workforce-count', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!workforceResponse.ok) {
      throw new Error(`Workforce API failed: ${workforceResponse.status} ${workforceResponse.statusText}`);
    }

    const workforceData = await workforceResponse.json();
    console.log('✅ Workforce Count API Response:');
    console.log(JSON.stringify(workforceData, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSupervisorDashboard();
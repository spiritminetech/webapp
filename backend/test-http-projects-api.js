import fetch from 'node-fetch';

/**
 * Test the actual HTTP endpoint for assigned projects
 */

async function testProjectsAPI() {
  try {
    console.log('🧪 Testing HTTP API endpoint for assigned projects...\n');

    const supervisorId = 4;
    const url = `http://localhost:5001/api/supervisor/${supervisorId}/projects`;
    
    console.log(`📡 Calling: ${url}`);
    
    // First test without authentication to see the error
    console.log('\n🔓 Testing without authentication:');
    try {
      const response = await fetch(url);
      const data = await response.json();
      console.log(`Status: ${response.status}`);
      console.log('Response:', JSON.stringify(data, null, 2));
    } catch (error) {
      console.log('Error:', error.message);
    }

    // Test with a mock token (this will likely fail but show us the auth flow)
    console.log('\n🔐 Testing with mock token:');
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      console.log(`Status: ${response.status}`);
      console.log('Response:', JSON.stringify(data, null, 2));
    } catch (error) {
      console.log('Error:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testProjectsAPI();
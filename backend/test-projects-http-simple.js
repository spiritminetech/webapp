/**
 * Simple test to check if the projects HTTP endpoint is working
 */

async function testProjectsHTTP() {
  try {
    console.log('🧪 Testing Projects HTTP endpoint...\n');

    const supervisorId = 4;
    const url = `http://localhost:5001/api/supervisor/${supervisorId}/projects`;
    
    console.log(`📡 Testing: ${url}`);
    
    // Test without auth first to see the response
    const response = await fetch(url);
    const text = await response.text();
    
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${text}`);
    
    if (response.status === 401) {
      console.log('✅ Server is running and route exists (401 = needs auth)');
    } else if (response.status === 404) {
      console.log('❌ Route not found - server might not be running or route is wrong');
    } else {
      console.log('📊 Got response:', text);
    }

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('💡 Make sure the backend server is running on port 5001');
  }
}

// Use dynamic import for fetch
import('node-fetch').then(({ default: fetch }) => {
  global.fetch = fetch;
  testProjectsHTTP();
}).catch(() => {
  // Fallback for environments without node-fetch
  console.log('Using built-in fetch or alternative...');
  testProjectsHTTP();
});
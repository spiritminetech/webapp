

// Test the worker tasks API endpoint
const testTasksAPI = async () => {
  try {
    console.log('🧪 Testing Worker Tasks API...');
    
    // First, let's try to test if the server is responding
    const healthResponse = await fetch('http://localhost:5001/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Server health check:', healthData);
    
    // Test the tasks endpoint (this will fail without auth, but we can see the error)
    try {
      const tasksResponse = await fetch('http://localhost:5001/api/worker/tasks/today');
      const tasksData = await tasksResponse.json();
      
      if (tasksResponse.ok) {
        console.log('✅ Tasks response:', tasksData);
      } else {
        console.log('⚠️ Expected auth error:');
        console.log('   Status:', tasksResponse.status);
        console.log('   Message:', tasksData?.message);
      }
    } catch (fetchError) {
      console.log('❌ Fetch error:', fetchError.message);
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
};

testTasksAPI();
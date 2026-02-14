// Test the worker trips API endpoint
const testTripsAPI = async () => {
  try {
    console.log('🧪 Testing Worker Trips API...');
    
    // First, let's try to test if the server is responding
    const healthResponse = await fetch('http://localhost:5001/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Server health check:', healthData);
    
    // Test the trips endpoint (this will fail without auth, but we can see the error)
    try {
      const tripsResponse = await fetch('http://localhost:5001/api/worker/today-trip');
      const tripsData = await tripsResponse.json();
      
      if (tripsResponse.ok) {
        console.log('✅ Trips response:', tripsData);
      } else {
        console.log('⚠️ Expected auth error:');
        console.log('   Status:', tripsResponse.status);
        console.log('   Message:', tripsData?.message);
      }
    } catch (fetchError) {
      console.log('❌ Fetch error:', fetchError.message);
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
};

testTripsAPI();
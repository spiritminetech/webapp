import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = 'http://localhost:5001/api';

const testTripAPI = async () => {
  try {
    console.log('🔍 Testing Trip API with authentication...\n');

    // Step 1: Login to get token
    console.log('1️⃣ Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'testworker@company.com',
        password: 'password123'
      })
    });

    const loginData = await loginResponse.json();

    if (!loginData.success) {
      console.error('❌ Login failed:', loginData.message);
      return;
    }

    console.log('✅ Login successful');
    console.log('📋 Full login response:');
    console.log(JSON.stringify(loginData, null, 2));

    const token = loginData.token;

    // Step 2: Test the trip API
    console.log('\n2️⃣ Fetching today\'s trips...');
    const tripResponse = await fetch(`${BASE_URL}/worker/today-trip`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const tripData = await tripResponse.json();

    console.log('✅ Trip API Response:');
    console.log('   Success:', tripData.success);
    console.log('   Data count:', tripData.data?.length || 0);
    
    if (tripData.data && tripData.data.length > 0) {
      console.log('\n📋 Trip Details:');
      tripData.data.forEach((trip, index) => {
        console.log(`   Trip ${index + 1}:`);
        console.log(`     Project: ${trip.projectName}`);
        console.log(`     Driver: ${trip.driverName}`);
        console.log(`     Vehicle: ${trip.vehicleNumber} (${trip.vehicleType})`);
        console.log(`     Route: ${trip.pickupLocation} → ${trip.dropLocation}`);
        console.log(`     Time: ${trip.startTime} - ${trip.dropTime}`);
        console.log(`     Status: ${trip.status}`);
        console.log(`     Passengers: ${trip.passengerCount}`);
        console.log('');
      });
    } else {
      console.log('   No trips found');
    }

  } catch (error) {
    console.error('❌ Error testing trip API:', error.message);
  }
};

// Run the test
testTripAPI();
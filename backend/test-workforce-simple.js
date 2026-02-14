import fetch from 'node-fetch';

async function testWorkforceAPI() {
  try {
    console.log('🔍 Testing Workforce Count API directly...\n');

    // Test the workforce count endpoint directly
    const response = await fetch('http://localhost:5001/api/supervisor/4/workforce-count', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('\n📊 Workforce Count Data:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('\n❌ Error Response:');
      console.log(errorText);
    }

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testWorkforceAPI();
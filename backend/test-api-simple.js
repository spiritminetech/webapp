import http from 'http';

function testAPI() {
  console.log('🔍 Testing Workforce Count API...\n');

  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/supervisor/4/workforce-count',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('\n📊 Response Body:');
      try {
        const jsonData = JSON.parse(data);
        console.log(JSON.stringify(jsonData, null, 2));
        
        if (jsonData.total !== undefined) {
          console.log('\n✅ API is working! Workforce count data received.');
          console.log(`Total workers: ${jsonData.total}`);
          console.log(`Present: ${jsonData.present}`);
          console.log(`Absent: ${jsonData.absent}`);
        }
      } catch (e) {
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Request error: ${e.message}`);
  });

  req.end();
}

testAPI();
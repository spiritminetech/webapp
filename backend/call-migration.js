import http from 'http';

function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function runMigration() {
  try {
    console.log('🔄 Checking server health...');
    const healthCheck = await makeRequest('/api/health');
    console.log('✅ Server is running:', healthCheck.data.message);

    console.log('🔄 Checking migration status...');
    const statusCheck = await makeRequest('/api/migration/status');
    console.log('📊 Migration status:', statusCheck.data);

    if (statusCheck.data.data && !statusCheck.data.data.migrationComplete) {
      console.log('🔄 Running migration...');
      const migrationResult = await makeRequest('/api/migration/mobile-fields', 'POST');
      console.log('✅ Migration result:', migrationResult.data);
    } else {
      console.log('✅ Migration already complete or no records to migrate');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Server is not running. Please start the backend server first.');
    }
  }
}

runMigration();
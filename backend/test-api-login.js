import fetch from 'node-fetch';

async function testApiLogin() {
  try {
    console.log('Testing API login endpoint...');
    
    const response = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'worker@gmail.com',
        password: 'password123'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login API successful!');
      console.log('Auto-selected:', data.autoSelected);
      console.log('Token present:', !!data.token);
      console.log('User ID:', data.user?.id);
      console.log('Company:', data.company?.name);
      console.log('Role:', data.company?.role);
      
      // Test dashboard API with the token
      if (data.token) {
        console.log('\n🔍 Testing dashboard API...');
        await testDashboardApi(data.token, data.user.id);
      }
    } else {
      console.error('❌ Login API failed:', data);
    }
    
  } catch (error) {
    console.error('❌ Login test failed:', error.message);
  }
}

async function testDashboardApi(token, userId) {
  try {
    // Test today's tasks endpoint
    const tasksResponse = await fetch('http://localhost:5001/api/worker/tasks/today', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (tasksResponse.ok) {
      const tasksData = await tasksResponse.json();
      console.log('✅ Tasks API successful');
      console.log('Tasks data structure:', Object.keys(tasksData));
    } else {
      const errorData = await tasksResponse.json();
      console.error('❌ Tasks API failed:', errorData);
    }
    
    // Test attendance endpoint
    const attendanceResponse = await fetch('http://localhost:5001/api/attendance/today', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (attendanceResponse.ok) {
      const attendanceData = await attendanceResponse.json();
      console.log('✅ Attendance API successful');
      console.log('Attendance data:', attendanceData ? 'Present' : 'Null');
    } else {
      const errorData = await attendanceResponse.json();
      console.error('❌ Attendance API failed:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Dashboard API test failed:', error.message);
  }
}

testApiLogin();
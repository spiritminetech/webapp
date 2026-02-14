import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5001/api';

async function testFrontendFlow() {
  try {
    console.log('🔐 Testing exact frontend flow...');
    
    // Step 1: Login
    console.log('\n1️⃣ Login...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'dashboard.worker@company.com',
        password: 'dashboard123'
      })
    });

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    
    // Step 2: Select Demo Construction Company
    console.log('\n2️⃣ Select company...');
    const demoCompany = loginData.companies.find(c => c.companyName === 'Demo Construction Company');
    
    const selectResponse = await fetch(`${API_BASE}/auth/select-company`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: loginData.userId,
        companyId: demoCompany.companyId
      })
    });
    
    const selectData = await selectResponse.json();
    console.log('✅ Company selected');
    console.log('📋 Token length:', selectData.token?.length || 0);
    
    const token = selectData.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Step 3: Test the exact API call that WorkerTaskService makes
    console.log('\n3️⃣ Test WorkerTaskService.getTodaysTasks()...');
    console.log('Making request to: /api/worker/tasks/today');
    
    try {
      const tasksResponse = await fetch(`${API_BASE}/worker/tasks/today`, { 
        method: 'GET',
        headers 
      });
      
      console.log('📋 Response status:', tasksResponse.status);
      console.log('📋 Response headers:', Object.fromEntries(tasksResponse.headers));
      
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        console.log('✅ Tasks API successful');
        console.log('📊 Response structure:');
        console.log('  - success:', tasksData.success);
        console.log('  - data exists:', !!tasksData.data);
        
        if (tasksData.data) {
          console.log('  - project exists:', !!tasksData.data.project);
          console.log('  - supervisor exists:', !!tasksData.data.supervisor);
          console.log('  - worker exists:', !!tasksData.data.worker);
          console.log('  - tasks count:', tasksData.data.tasks?.length || 0);
          
          if (tasksData.data.project) {
            console.log('  - project.id:', tasksData.data.project.id);
            console.log('  - project.name:', tasksData.data.project.name);
            console.log('  - project.geofence:', !!tasksData.data.project.geofence);
          }
        }
        
        // This is what DashboardService.getProjectInfo() expects
        console.log('\n📊 Expected by DashboardService:');
        console.log('  - tasksData.project:', !!tasksData.project);
        console.log('  - tasksData.supervisor:', !!tasksData.supervisor);
        
        // The issue might be here - DashboardService expects tasksData.project
        // but the API returns tasksData.data.project
        
      } else {
        const errorText = await tasksResponse.text();
        console.log('❌ Tasks API error:', errorText);
      }
    } catch (error) {
      console.log('❌ Tasks API network error:', error.message);
    }

    // Step 4: Test attendance API
    console.log('\n4️⃣ Test attendance API...');
    try {
      const attendanceResponse = await fetch(`${API_BASE}/attendance/today`, { 
        method: 'GET',
        headers 
      });
      
      console.log('📋 Attendance status:', attendanceResponse.status);
      
      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json();
        console.log('✅ Attendance API successful');
        console.log('📊 Session:', attendanceData.session);
      } else {
        const errorText = await attendanceResponse.text();
        console.log('❌ Attendance API error:', errorText);
      }
    } catch (error) {
      console.log('❌ Attendance API network error:', error.message);
    }

    console.log('\n🎯 Analysis:');
    console.log('The issue might be in the response structure mismatch:');
    console.log('- API returns: { success: true, data: { project: {...}, supervisor: {...} } }');
    console.log('- DashboardService expects: { project: {...}, supervisor: {...} }');
    console.log('');
    console.log('Check DashboardService.getProjectInfo() method for response handling.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendFlow();
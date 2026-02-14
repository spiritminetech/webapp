import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5001/api';

async function debugDashboardLoading() {
  try {
    console.log('🔐 Testing complete dashboard loading flow...');
    
    // Step 1: Login
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
    console.log('✅ Step 1: Login successful');
    
    // Step 2: Select Demo Construction Company
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
    console.log('✅ Step 2: Company selection successful');
    console.log('📋 Token received:', selectData.token ? 'Yes' : 'No');
    console.log('👤 User ID:', selectData.user.id);
    console.log('🏢 Company ID:', selectData.company.id);
    console.log('🔑 Permissions:', selectData.permissions.length);
    
    const token = selectData.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Step 3: Test all dashboard API endpoints
    console.log('\n📊 Step 3: Testing dashboard API endpoints...');
    
    // Test worker tasks today
    console.log('\n🔍 Testing /api/worker/tasks/today...');
    try {
      const tasksResponse = await fetch(`${API_BASE}/worker/tasks/today`, { 
        method: 'GET',
        headers 
      });
      
      console.log('📋 Status:', tasksResponse.status);
      
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        console.log('✅ Tasks API working');
        console.log('📊 Tasks count:', tasksData.data?.tasks?.length || 0);
        console.log('📊 Project name:', tasksData.data?.project?.name || 'N/A');
        console.log('📊 Worker name:', tasksData.data?.worker?.name || 'N/A');
      } else {
        const errorText = await tasksResponse.text();
        console.log('❌ Tasks API error:', errorText);
      }
    } catch (error) {
      console.log('❌ Tasks API network error:', error.message);
    }

    // Test attendance today
    console.log('\n🔍 Testing /api/attendance/today...');
    try {
      const attendanceResponse = await fetch(`${API_BASE}/attendance/today`, { 
        method: 'GET',
        headers 
      });
      
      console.log('📋 Status:', attendanceResponse.status);
      
      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json();
        console.log('✅ Attendance API working');
        console.log('📊 Session:', attendanceData.session || 'N/A');
        console.log('📊 Check-in time:', attendanceData.checkInTime || 'N/A');
      } else {
        const errorText = await attendanceResponse.text();
        console.log('❌ Attendance API error:', errorText);
      }
    } catch (error) {
      console.log('❌ Attendance API network error:', error.message);
    }

    // Test projects endpoint (if exists)
    console.log('\n🔍 Testing /api/projects...');
    try {
      const projectsResponse = await fetch(`${API_BASE}/projects`, { 
        method: 'GET',
        headers 
      });
      
      console.log('📋 Status:', projectsResponse.status);
      
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        console.log('✅ Projects API working');
        console.log('📊 Projects count:', projectsData.projects?.length || 0);
      } else {
        const errorText = await projectsResponse.text();
        console.log('❌ Projects API error:', errorText);
      }
    } catch (error) {
      console.log('❌ Projects API network error:', error.message);
    }

    console.log('\n🎯 Summary:');
    console.log('- Login: ✅ Working');
    console.log('- Company Selection: ✅ Working');
    console.log('- Token Generation: ✅ Working');
    console.log('- API Endpoints: Check results above');
    
    console.log('\n💡 If dashboard still fails to load, check:');
    console.log('1. Browser console for JavaScript errors');
    console.log('2. Network tab for failed API requests');
    console.log('3. Token storage in localStorage');
    console.log('4. CORS issues between frontend and backend');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugDashboardLoading();
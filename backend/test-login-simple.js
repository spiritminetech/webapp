import axios from 'axios';

async function testLogin() {
  try {
    console.log('Testing login with worker@gmail.com...');
    
    const response = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'worker@gmail.com',
      password: 'password123'
    });
    
    console.log('✅ Login successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.autoSelected) {
      console.log('✅ Auto-selected company, ready for dashboard');
      console.log('Token:', response.data.token ? 'Present' : 'Missing');
      console.log('User ID:', response.data.user?.id);
      console.log('Company:', response.data.company?.name);
      console.log('Role:', response.data.company?.role);
    } else {
      console.log('⚠️ Multiple companies available, need to select one');
      console.log('Available companies:', response.data.companies);
    }
    
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
  }
}

testLogin();
// Simple test to verify API connection and token handling
// Run this in browser console after logging in

console.log('🧪 Testing API Connection');
console.log('========================');

// Check if user is logged in
const user = JSON.parse(localStorage.getItem('user') || '{}');
const token = localStorage.getItem('token');

console.log('User:', user.name || 'Not logged in');
console.log('Token exists:', !!token);

if (!token) {
  console.log('❌ No token found. Please log in first.');
} else {
  console.log('✅ Token found, testing API calls...');
  
  // Test health endpoint
  fetch('http://localhost:5001/api/health')
    .then(response => response.json())
    .then(data => {
      console.log('✅ Health check:', data.message);
      
      // Test supervisor endpoints with token
      const supervisorId = user.employeeId || 4; // Use actual employeeId or fallback to 4
      
      console.log(`Testing supervisor endpoints for ID: ${supervisorId}`);
      
      // Test approvals endpoint
      fetch(`http://localhost:5001/api/supervisor/${supervisorId}/approvals`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        console.log(`📋 Approvals endpoint status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        console.log('📋 Approvals data:', data);
      })
      .catch(error => {
        console.log('❌ Approvals error:', error.message);
      });
      
      // Test alerts endpoint
      fetch(`http://localhost:5001/api/supervisor/${supervisorId}/alerts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        console.log(`🚨 Alerts endpoint status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        console.log('🚨 Alerts data:', data);
      })
      .catch(error => {
        console.log('❌ Alerts error:', error.message);
      });
      
    })
    .catch(error => {
      console.log('❌ Health check failed:', error.message);
      console.log('🚨 Backend server might not be running');
    });
}

console.log('📝 Copy and paste this script in browser console after logging in');
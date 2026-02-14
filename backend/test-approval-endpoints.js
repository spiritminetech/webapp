import axios from 'axios';

const API_BASE = 'http://localhost:5001/api';

// Test data
const testSupervisorId = 1;
const testApprovalId = 'leave_1';

async function testApprovalEndpoints() {
  try {
    console.log('🧪 Testing Supervisor Approval Endpoints...\n');

    // Test 1: Get pending approvals
    console.log('1️⃣ Testing GET /api/supervisor/:id/approvals');
    try {
      const approvalsResponse = await axios.get(`${API_BASE}/supervisor/${testSupervisorId}/approvals`);
      console.log('✅ Approvals endpoint successful');
      console.log('📊 Response structure:', {
        approvalsCount: approvalsResponse.data.approvals?.length || 0,
        summary: approvalsResponse.data.summary,
        hasLastUpdated: !!approvalsResponse.data.lastUpdated
      });
    } catch (error) {
      console.log('❌ Approvals endpoint failed:', error.response?.data?.message || error.message);
    }

    console.log('\n');

    // Test 2: Process approval (should fail without auth)
    console.log('2️⃣ Testing POST /api/supervisor/approval/:id/process (without auth)');
    try {
      const processResponse = await axios.post(`${API_BASE}/supervisor/approval/${testApprovalId}/process`, {
        decision: 'approve',
        remarks: 'Test approval remarks'
      });
      console.log('⚠️ Process endpoint succeeded without auth (unexpected)');
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('✅ Process endpoint correctly requires authentication');
      } else {
        console.log('❌ Process endpoint failed with unexpected error:', error.response?.data?.message || error.message);
      }
    }

    console.log('\n');

    // Test 3: Test approval endpoint with filters
    console.log('3️⃣ Testing GET /api/supervisor/:id/approvals with filters');
    try {
      const filteredResponse = await axios.get(`${API_BASE}/supervisor/${testSupervisorId}/approvals?type=leave&priority=high`);
      console.log('✅ Filtered approvals endpoint successful');
      console.log('📊 Filtered results:', {
        approvalsCount: filteredResponse.data.approvals?.length || 0,
        allAreLeaveType: filteredResponse.data.approvals?.every(a => a.type === 'leave') || 'N/A',
        allAreHighPriority: filteredResponse.data.approvals?.every(a => a.priority === 'high') || 'N/A'
      });
    } catch (error) {
      console.log('❌ Filtered approvals endpoint failed:', error.response?.data?.message || error.message);
    }

    console.log('\n');

    // Test 4: Test invalid approval ID format
    console.log('4️⃣ Testing POST /api/supervisor/approval/invalid-id/process (invalid format)');
    try {
      const invalidResponse = await axios.post(`${API_BASE}/supervisor/approval/invalid-id/process`, {
        decision: 'approve',
        remarks: 'Test remarks'
      });
      console.log('⚠️ Invalid ID format succeeded (unexpected)');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid approval ID format correctly rejected');
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('✅ Authentication required (expected)');
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message || error.message);
      }
    }

    console.log('\n✨ Approval endpoints testing completed!');

  } catch (error) {
    console.error('💥 Test script error:', error.message);
  }
}

// Check if server is running first
async function checkServerStatus() {
  try {
    await axios.get(`${API_BASE}/health`);
    return true;
  } catch (error) {
    try {
      // Try a different endpoint that might exist
      await axios.get(`${API_BASE}/supervisor/projects`);
      return true;
    } catch (error2) {
      return false;
    }
  }
}

async function main() {
  console.log('🔍 Checking if backend server is running...');
  
  const serverRunning = await checkServerStatus();
  
  if (!serverRunning) {
    console.log('❌ Backend server is not running on http://localhost:5001');
    console.log('💡 Please start the backend server first with: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Backend server is running\n');
  await testApprovalEndpoints();
}

main();
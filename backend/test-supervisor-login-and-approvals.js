import appConfig from './src/config/app.config.js';

/**
 * Test script to login as supervisor and check pending approvals
 */

const API_BASE = `http://localhost:${appConfig.server.port}/api`;

async function testSupervisorLoginAndApprovals() {
  try {
    console.log('🔍 Testing Supervisor Login and Approvals...\n');

    // Step 1: Login as supervisor
    console.log('1️⃣ Logging in as supervisor...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'testworker@company.com',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log(`   User ID: ${loginData.user.id}`);
    console.log(`   Employee ID: ${loginData.user.employeeId}`);
    console.log(`   Role: ${loginData.user.role}`);
    console.log(`   Token: ${loginData.token.substring(0, 20)}...`);

    const token = loginData.token;
    const supervisorId = loginData.user.employeeId || loginData.user.id;

    // Step 2: Test pending approvals endpoint
    console.log(`\n2️⃣ Testing pending approvals for supervisor ID ${supervisorId}...`);
    const approvalsResponse = await fetch(`${API_BASE}/supervisor/${supervisorId}/approvals`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!approvalsResponse.ok) {
      throw new Error(`Approvals API failed: ${approvalsResponse.status} ${approvalsResponse.statusText}`);
    }

    const approvalsData = await approvalsResponse.json();
    console.log('✅ Approvals API successful');
    console.log(`   Total approvals: ${approvalsData.summary.total}`);
    console.log(`   Leave requests: ${approvalsData.summary.leave}`);
    console.log(`   Approvals array length: ${approvalsData.approvals.length}`);

    if (approvalsData.approvals.length > 0) {
      console.log('\n📋 Sample approval items:');
      approvalsData.approvals.slice(0, 3).forEach((approval, index) => {
        console.log(`   ${index + 1}. ${approval.requesterName} - ${approval.details.leaveType} (${approval.priority} priority)`);
      });
    }

    // Step 3: Test with different supervisor ID (should have different results)
    console.log(`\n3️⃣ Testing with different supervisor ID (15)...`);
    const otherApprovalsResponse = await fetch(`${API_BASE}/supervisor/15/approvals`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (otherApprovalsResponse.ok) {
      const otherApprovalsData = await otherApprovalsResponse.json();
      console.log(`✅ Other supervisor approvals: ${otherApprovalsData.summary.total}`);
    } else {
      console.log(`❌ Other supervisor test failed: ${otherApprovalsResponse.status}`);
    }

    console.log('\n✅ All tests completed successfully!');
    console.log(`\n🎯 Result: Supervisor ${supervisorId} has ${approvalsData.summary.total} pending approvals`);
    console.log('   If frontend shows 0, check the supervisor ID being used in the frontend');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSupervisorLoginAndApprovals();
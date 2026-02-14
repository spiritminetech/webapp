/**
 * Simple test script to verify API connections in TaskDetailsScreen
 * Run this in browser console after logging in
 */

const testTaskDetailsAPIs = async () => {
  console.log('🧪 Testing TaskDetailsScreen API Connections...\n');
  
  try {
    // Import the service
    const { default: WorkerMobileApiService } = await import('../../services/WorkerMobileApiService.js');
    
    // Test 1: Get Today's Tasks
    console.log('1️⃣ Testing getTodaysTasks...');
    try {
      const tasksResult = await WorkerMobileApiService.getTodaysTasks();
      console.log('✅ getTodaysTasks:', tasksResult.success ? 'SUCCESS' : 'FAILED');
      console.log('   Tasks count:', tasksResult.data?.tasks?.length || 0);
    } catch (error) {
      console.log('❌ getTodaysTasks FAILED:', error.message);
    }
    
    // Test 2: Validate Location
    console.log('\n2️⃣ Testing validateCurrentLocation...');
    try {
      const locationResult = await WorkerMobileApiService.validateCurrentLocation();
      console.log('✅ validateCurrentLocation:', locationResult.success ? 'SUCCESS' : 'FAILED');
      console.log('   Can start tasks:', locationResult.data?.canStartTasks);
    } catch (error) {
      console.log('❌ validateCurrentLocation FAILED:', error.message);
    }
    
    // Test 3: Submit Progress (with mock data)
    console.log('\n3️⃣ Testing submitProgress...');
    try {
      const progressResult = await WorkerMobileApiService.submitProgress({
        assignmentId: 1, // Mock assignment ID
        progressPercent: 50,
        description: 'Test progress update',
        notes: 'Test notes',
        location: {
          latitude: 40.7130,
          longitude: -74.0058,
          timestamp: new Date().toISOString()
        }
      });
      console.log('✅ submitProgress:', progressResult.success ? 'SUCCESS' : 'FAILED');
    } catch (error) {
      console.log('❌ submitProgress FAILED:', error.message);
    }
    
    // Test 4: Report Issue (with mock data)
    console.log('\n4️⃣ Testing reportIssue...');
    try {
      const issueResult = await WorkerMobileApiService.reportIssue({
        assignmentId: 1, // Mock assignment ID
        issueType: 'material_shortage',
        priority: 'medium',
        description: 'Test issue report',
        location: {
          latitude: 40.7130,
          longitude: -74.0058,
          workArea: 'Test Area'
        }
      });
      console.log('✅ reportIssue:', issueResult.success ? 'SUCCESS' : 'FAILED');
    } catch (error) {
      console.log('❌ reportIssue FAILED:', error.message);
    }
    
    console.log('\n🎉 API Connection Tests Complete!');
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
  }
};

// Export for use in browser console
window.testTaskDetailsAPIs = testTaskDetailsAPIs;

console.log('📋 To test API connections, run: testTaskDetailsAPIs()');
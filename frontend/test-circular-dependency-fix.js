/**
 * Test to verify the circular dependency fix is working
 * This should be run in the browser console
 */

async function testCircularDependencyFix() {
  console.log('🔧 Testing Circular Dependency Fix...\n');
  
  try {
    // Test 1: Import all services that were part of the circular dependency
    console.log('1️⃣ Testing service imports...');
    const [dashboardModule, authModule, apiModule, errorModule] = await Promise.all([
      import('./src/services/DashboardService.js'),
      import('./src/services/AuthService.js'),
      import('./src/services/ApiService.js'),
      import('./src/services/ErrorLoggingService.js')
    ]);
    
    console.log('✅ All services imported successfully');
    
    // Test 2: Check if DashboardService is not empty
    const dashboardService = dashboardModule.default;
    if (!dashboardService || Object.keys(dashboardService).length === 0) {
      throw new Error('DashboardService is still empty - circular dependency not resolved');
    }
    
    console.log('✅ DashboardService is not empty');
    console.log('   - Constructor:', dashboardService.constructor.name);
    console.log('   - Endpoint:', dashboardService.endpoint);
    
    // Test 3: Check if methods exist
    const expectedMethods = ['getDashboardData', 'subscribeToUpdates', 'getProjectInfo'];
    const missingMethods = expectedMethods.filter(method => typeof dashboardService[method] !== 'function');
    
    if (missingMethods.length > 0) {
      throw new Error(`Missing methods: ${missingMethods.join(', ')}`);
    }
    
    console.log('✅ All expected methods are present');
    console.log('   - Methods:', expectedMethods.join(', '));
    
    // Test 4: Test AuthService lazy loading in DashboardService
    console.log('2️⃣ Testing AuthService lazy loading...');
    const authService = await dashboardService.getAuthService();
    
    if (!authService) {
      throw new Error('AuthService lazy loading failed');
    }
    
    console.log('✅ AuthService lazy loading works');
    
    // Test 5: Test DashboardContext import
    console.log('3️⃣ Testing DashboardContext import...');
    const contextModule = await import('./src/pages/worker/dashboard/DashboardContext.jsx');
    
    if (!contextModule.DashboardProvider) {
      throw new Error('DashboardProvider not found');
    }
    
    console.log('✅ DashboardContext imported successfully');
    
    // Test 6: Test method call (should fail with auth error, not "is not a function")
    console.log('4️⃣ Testing method calls...');
    try {
      await dashboardService.getDashboardData('test-user-id');
    } catch (error) {
      if (error.message.includes('is not a function')) {
        throw new Error('Method call failed - service still empty');
      } else if (error.message.includes('Authentication required')) {
        console.log('✅ Method call works (authentication error expected)');
      } else {
        console.log('⚠️ Unexpected error (but method is callable):', error.message);
      }
    }
    
    console.log('\n🎉 All tests passed! Circular dependency is resolved.');
    console.log('\n📋 Summary:');
    console.log('✅ DashboardService imports correctly');
    console.log('✅ DashboardService is not empty');
    console.log('✅ All methods are available');
    console.log('✅ AuthService lazy loading works');
    console.log('✅ DashboardContext imports correctly');
    console.log('✅ Method calls work (authentication required)');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.testCircularDependencyFix = testCircularDependencyFix;
  console.log('🧪 Circular dependency test available as window.testCircularDependencyFix()');
}

export { testCircularDependencyFix };
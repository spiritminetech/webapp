/**
 * Test script to verify DashboardService is loading correctly
 * Run this in the browser console to test the service
 */

// Test if DashboardService can be imported and instantiated
async function testDashboardService() {
  try {
    console.log('Testing DashboardService import...');
    
    // Try to import the service
    const dashboardServiceModule = await import('./src/services/DashboardService.js');
    const dashboardService = dashboardServiceModule.default;
    
    console.log('✅ DashboardService imported successfully:', dashboardService);
    console.log('✅ DashboardService is not empty object:', Object.keys(dashboardService).length > 0);
    console.log('✅ DashboardService methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(dashboardService)));
    
    // Test if the service has the expected methods
    const expectedMethods = ['getDashboardData', 'subscribeToUpdates', 'getProjectInfo'];
    const missingMethods = expectedMethods.filter(method => typeof dashboardService[method] !== 'function');
    
    if (missingMethods.length === 0) {
      console.log('✅ All expected methods are present');
    } else {
      console.error('❌ Missing methods:', missingMethods);
    }
    
    // Test auth service lazy loading
    console.log('Testing AuthService lazy loading...');
    const authService = await dashboardService.getAuthService();
    console.log('✅ AuthService loaded:', authService);
    console.log('✅ AuthService methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(authService)));
    
    return true;
  } catch (error) {
    console.error('❌ DashboardService test failed:', error);
    return false;
  }
}

// Test the circular dependency issue
async function testCircularDependency() {
  try {
    console.log('Testing circular dependency resolution...');
    
    // Import all services that were part of the circular dependency
    const [dashboardModule, authModule, apiModule, errorModule] = await Promise.all([
      import('./src/services/DashboardService.js'),
      import('./src/services/AuthService.js'),
      import('./src/services/ApiService.js'),
      import('./src/services/ErrorLoggingService.js')
    ]);
    
    console.log('✅ All services imported without circular dependency errors');
    console.log('✅ DashboardService:', dashboardModule.default);
    console.log('✅ AuthService:', authModule.default);
    console.log('✅ ApiService:', apiModule.default);
    console.log('✅ ErrorLoggingService:', errorModule.default);
    
    return true;
  } catch (error) {
    console.error('❌ Circular dependency test failed:', error);
    return false;
  }
}

// Run tests
console.log('🧪 Starting DashboardService tests...');
testDashboardService().then(success => {
  if (success) {
    return testCircularDependency();
  }
  return false;
}).then(success => {
  if (success) {
    console.log('🎉 All tests passed! DashboardService should work correctly now.');
  } else {
    console.log('❌ Some tests failed. Check the errors above.');
  }
});
/**
 * Test script to verify the dashboard fix is working
 * This can be run in the browser console or as a module
 */

// Test the dashboard service import and functionality
async function testDashboardFix() {
  console.log('🧪 Testing Dashboard Service Fix...');
  
  try {
    // Test 1: Import DashboardService
    console.log('1️⃣ Testing DashboardService import...');
    const dashboardServiceModule = await import('./services/DashboardService.js');
    const dashboardService = dashboardServiceModule.default;
    
    if (!dashboardService) {
      throw new Error('DashboardService is null or undefined');
    }
    
    if (Object.keys(dashboardService).length === 0) {
      throw new Error('DashboardService is an empty object - circular dependency not resolved');
    }
    
    console.log('✅ DashboardService imported successfully');
    console.log('   - Service instance:', dashboardService.constructor.name);
    console.log('   - Endpoint:', dashboardService.endpoint);
    console.log('   - Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(dashboardService)).filter(m => m !== 'constructor'));
    
    // Test 2: Test AuthService lazy loading
    console.log('2️⃣ Testing AuthService lazy loading...');
    const authService = await dashboardService.getAuthService();
    
    if (!authService) {
      throw new Error('AuthService lazy loading failed');
    }
    
    console.log('✅ AuthService lazy loading works');
    console.log('   - AuthService methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(authService)).filter(m => m !== 'constructor'));
    
    // Test 3: Test circular dependency resolution
    console.log('3️⃣ Testing circular dependency resolution...');
    const [authModule, apiModule, errorModule] = await Promise.all([
      import('./services/AuthService.js'),
      import('./services/ApiService.js'),
      import('./services/ErrorLoggingService.js')
    ]);
    
    if (!authModule.default || !apiModule.default || !errorModule.default) {
      throw new Error('Some services failed to import');
    }
    
    console.log('✅ All services imported without circular dependency errors');
    
    // Test 4: Test service methods
    console.log('4️⃣ Testing service methods...');
    const expectedMethods = ['getDashboardData', 'subscribeToUpdates', 'getProjectInfo', 'getAttendanceStatus'];
    const missingMethods = expectedMethods.filter(method => typeof dashboardService[method] !== 'function');
    
    if (missingMethods.length > 0) {
      throw new Error(`Missing methods: ${missingMethods.join(', ')}`);
    }
    
    console.log('✅ All expected methods are present');
    
    // Test 5: Test if we can call a method (without authentication)
    console.log('5️⃣ Testing method calls...');
    try {
      // This should fail with authentication error, not with "service is empty" error
      await dashboardService.getDashboardData('test-user-id');
    } catch (error) {
      if (error.message.includes('Authentication required')) {
        console.log('✅ Method call works (authentication error expected)');
      } else {
        console.log('⚠️ Unexpected error (but method callable):', error.message);
      }
    }
    
    console.log('🎉 All tests passed! Dashboard service is working correctly.');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Export for use in other modules
export { testDashboardFix };

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
  window.testDashboardFix = testDashboardFix;
  console.log('Dashboard fix test function available as window.testDashboardFix()');
}
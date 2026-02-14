/**
 * Configuration Test Utility
 * Use this to verify the configuration is working correctly
 */

import appConfig from '../config/app.config.js';

export const testConfiguration = () => {
  console.log('=== ERP Configuration Test ===');
  console.log('Environment Variables:');
  console.log('- REACT_APP_API_BASE_URL:', process.env.REACT_APP_API_BASE_URL);
  console.log('- REACT_APP_ENVIRONMENT:', process.env.REACT_APP_ENVIRONMENT);
  console.log('- REACT_APP_ENABLE_DEBUG:', process.env.REACT_APP_ENABLE_DEBUG);
  
  console.log('\nApp Configuration:');
  console.log('- API Base URL:', appConfig.api.baseURL);
  console.log('- API Timeout:', appConfig.api.timeout);
  console.log('- App Name:', appConfig.app.name);
  console.log('- Environment:', appConfig.app.environment);
  console.log('- Debug Enabled:', appConfig.features.enableDebug);
  
  console.log('\nAPI Endpoints:');
  Object.entries(appConfig.api.endpoints).forEach(([key, value]) => {
    console.log(`- ${key}: ${appConfig.getFullApiUrl(value)}`);
  });
  
  console.log('\nUpload URLs:');
  Object.keys(appConfig.upload.endpoints).forEach(type => {
    console.log(`- ${type}: ${appConfig.getUploadUrl(type)}`);
  });
  
  console.log('=== Configuration Test Complete ===');
};

// Auto-run in development
if (appConfig.features.enableDebug) {
  testConfiguration();
}

export default testConfiguration;
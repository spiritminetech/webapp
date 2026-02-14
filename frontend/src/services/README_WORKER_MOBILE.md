# Worker Mobile API Service Layer

This document describes the comprehensive API service layer implemented for the Worker Task Details Mobile application.

## Overview

The API service layer provides a robust, offline-capable interface for worker mobile functionality. It includes error handling, retry logic, photo compression, geofence validation, and offline synchronization.

## Services Architecture

```
WorkerMobileApiService (Main Integration Layer)
├── WorkerTaskService (Core API Operations)
├── PhotoService (Photo Management & Compression)
├── OfflineService (Caching & Synchronization)
└── GeofenceService (Location & Validation)
```

## Core Services

### 1. WorkerTaskService

**Purpose**: Direct API communication with backend endpoints

**Key Methods**:
- `getTodaysTasks()` - Fetch today's assigned tasks
- `startTask(assignmentId, location)` - Start a task with geofence validation
- `submitProgress(progressData)` - Submit task progress updates
- `uploadPhotos(assignmentId, photos, captions, location)` - Upload task photos
- `validateGeofence(latitude, longitude, projectId)` - Validate location
- `reportIssue(issueData)` - Report task issues
- `getToolsAndMaterials(projectId)` - Get project tools and materials

**Features**:
- JWT token authentication
- Comprehensive error handling with user-friendly messages
- Request/response logging in development mode
- Automatic retry logic for failed requests

### 2. PhotoService

**Purpose**: Photo compression, validation, and upload optimization

**Key Methods**:
- `compressPhoto(file, options)` - Compress photos for optimal upload
- `validatePhotos(files)` - Validate photo files before processing
- `uploadTaskPhotos(assignmentId, photos, captions, location, onProgress)` - Complete photo upload workflow
- `batchProcessPhotos(files, onProgress)` - Process multiple photos with progress tracking

**Features**:
- Automatic photo compression (JPEG, 80% quality)
- Intelligent resizing (max 1920x1080)
- File validation (type, size, count limits)
- Progress tracking for uploads
- Memory management for preview URLs

**Configuration**:
- Max file size: 5MB
- Max photos per task: 5
- Compression quality: 80%
- Max dimensions: 1920x1080

### 3. OfflineService

**Purpose**: Data caching and offline synchronization

**Key Methods**:
- `cacheTaskData(taskData)` - Cache task data for offline access
- `getCachedTaskData()` - Retrieve cached task data
- `queueOperation(operation)` - Queue operations for later sync
- `syncQueuedOperations()` - Sync all queued operations
- `isOffline()` - Check offline status

**Features**:
- 24-hour cache expiry
- Operation queuing with retry logic
- Automatic online/offline detection
- Event-driven UI updates
- Local storage management

**Supported Operations**:
- Task start
- Progress submission
- Photo uploads
- Issue reporting

### 4. GeofenceService

**Purpose**: Location tracking and geofence validation

**Key Methods**:
- `getCurrentLocation()` - Get current GPS location
- `validateCurrentLocation(projectId)` - Validate current location against geofence
- `startLocationWatch(callback)` - Start continuous location tracking
- `calculateDistance(lat1, lon1, lat2, lon2)` - Calculate distance using Haversine formula
- `isLocationInGeofence(userLocation, geofence)` - Check if location is within geofence

**Features**:
- High-accuracy GPS tracking
- Battery-optimized location polling
- Geofence validation caching
- Permission management
- Error handling for GPS issues

**Configuration**:
- Update interval: 30 seconds
- Minimum accuracy: 50 meters
- Cache duration: 1 minute

### 5. WorkerMobileApiService (Main Integration Layer)

**Purpose**: High-level API that integrates all services with offline support

**Key Methods**:
- `getTodaysTasks(forceRefresh)` - Get tasks with offline fallback
- `startTask(assignmentId, location)` - Start task with full validation
- `submitProgress(progressData)` - Submit progress with offline queuing
- `uploadTaskPhotos(assignmentId, photos, captions, location, onProgress)` - Complete photo workflow
- `validateCurrentLocation(projectId)` - Validate location
- `syncOfflineData()` - Sync all offline operations
- `getOfflineStatus()` - Get comprehensive offline status

**Features**:
- Automatic online/offline handling
- Retry logic with exponential backoff
- Request timeout management
- Comprehensive error handling
- Service initialization and cleanup

## Usage Examples

### Basic Task Operations

```javascript
import { workerMobileApiService } from '../services';

// Initialize the service
await workerMobileApiService.initialize();

// Get today's tasks
const tasks = await workerMobileApiService.getTodaysTasks();

// Start a task
const result = await workerMobileApiService.startTask(assignmentId);

// Submit progress
const progressResult = await workerMobileApiService.submitProgress({
  assignmentId: 1,
  progressPercent: 75,
  description: 'Completed installation of panels',
  notes: 'All panels properly aligned'
});
```

### Photo Upload with Progress

```javascript
import { workerMobileApiService } from '../services';

const uploadPhotos = async (assignmentId, photoFiles) => {
  try {
    const result = await workerMobileApiService.uploadTaskPhotos(
      assignmentId,
      photoFiles,
      ['Before work', 'After completion'],
      null, // Current location will be obtained automatically
      (progress) => {
        console.log(`Upload progress: ${progress.percentage}%`);
        // Update UI progress bar
      }
    );
    
    console.log('Photos uploaded successfully:', result);
  } catch (error) {
    console.error('Photo upload failed:', error.userMessage);
  }
};
```

### Offline Status Monitoring

```javascript
import { workerMobileApiService } from '../services';

// Get offline status
const status = workerMobileApiService.getOfflineStatus();
console.log('Offline status:', status);

// Listen for offline state changes
window.addEventListener('offlineStateChanged', (event) => {
  const { offline } = event.detail;
  console.log(`App is now ${offline ? 'offline' : 'online'}`);
  
  if (!offline) {
    // Sync queued operations when back online
    workerMobileApiService.syncOfflineData();
  }
});
```

### Location Validation

```javascript
import { geofenceService } from '../services';

// Request location permissions
await geofenceService.requestLocationPermission();

// Validate current location
const validation = await geofenceService.validateCurrentLocation();
if (validation.data.canStartTasks) {
  console.log('Location validated, can start tasks');
} else {
  console.log(`Cannot start tasks: ${validation.data.message}`);
}

// Start location watching
geofenceService.startLocationWatch((location, error) => {
  if (error) {
    console.error('Location error:', error.message);
  } else {
    console.log('Location updated:', location);
  }
});
```

## Error Handling

All services provide comprehensive error handling with user-friendly messages:

```javascript
try {
  await workerMobileApiService.startTask(assignmentId);
} catch (error) {
  // error.userMessage contains user-friendly message
  // error.response contains full API response
  console.error('User message:', error.userMessage);
  console.error('Technical details:', error.message);
}
```

## Offline Functionality

The service layer automatically handles offline scenarios:

1. **Data Caching**: Task data is cached for 24 hours
2. **Operation Queuing**: Failed operations are queued for retry
3. **Automatic Sync**: Operations sync when connection is restored
4. **Status Monitoring**: Real-time offline/online status updates

## Testing

The service layer includes comprehensive tests:

- Unit tests for individual services
- Integration tests for service interactions
- Mock implementations for testing
- Error scenario testing

Run tests:
```bash
npm test -- --testPathPattern="services"
```

## Configuration

Services can be configured through `appConfig`:

```javascript
// Example configuration
const config = {
  api: {
    baseURL: 'https://api.example.com',
    timeout: 30000
  },
  features: {
    enableDebug: true,
    enableOfflineMode: true
  }
};
```

## Performance Considerations

1. **Photo Compression**: Automatic compression reduces upload time
2. **Location Caching**: Geofence validation results are cached
3. **Request Batching**: Multiple operations can be batched
4. **Memory Management**: Preview URLs are properly cleaned up
5. **Battery Optimization**: Location polling is optimized for battery life

## Security

1. **JWT Authentication**: All requests include authentication tokens
2. **Input Validation**: All inputs are validated before processing
3. **Error Sanitization**: Error messages don't expose sensitive data
4. **Secure Storage**: Sensitive data is stored securely

## Browser Compatibility

- Modern browsers with ES6+ support
- Geolocation API support required
- Local Storage support required
- File API support for photo uploads

## Troubleshooting

### Common Issues

1. **Location Permission Denied**
   - Check browser location settings
   - Ensure HTTPS connection
   - Request permissions explicitly

2. **Photo Upload Failures**
   - Check file size limits
   - Verify file formats
   - Check network connectivity

3. **Offline Sync Issues**
   - Check local storage availability
   - Verify network connectivity
   - Check queued operations count

### Debug Mode

Enable debug mode for detailed logging:

```javascript
appConfig.features.enableDebug = true;
```

This will log all API requests, responses, and service operations to the console.
# GPS Location Tracking Implementation

This directory contains the implementation of real-time GPS location tracking for the worker mobile application. The system provides continuous location monitoring, geofence validation, and location logging capabilities.

## Architecture Overview

The GPS tracking system consists of several key components:

1. **LocationService** - Core service for GPS tracking
2. **useLocationTracking** - React hook for easy component integration
3. **LocationContext** - Global state management for location data
4. **GeofenceValidator** - Component for geofence validation UI
5. **locationLogger** - Utility for logging location data to backend

## Core Components

### LocationService

The `LocationService` is a singleton class that handles all GPS-related functionality:

```javascript
import locationService from '../services/LocationService';

// Start tracking
locationService.startTracking((location, error) => {
  if (error) {
    console.error('Location error:', error);
  } else {
    console.log('Location update:', location);
  }
});

// Get current location once
const location = await locationService.getCurrentLocation();

// Validate geofence
const validation = locationService.validateGeofence(geofence);

// Stop tracking
locationService.stopTracking();
```

**Features:**
- Real-time GPS tracking with `watchPosition`
- Battery optimization with configurable update intervals
- High accuracy GPS with fallback options
- Geofence validation using Haversine formula
- Permission management
- Error handling and retry logic

### useLocationTracking Hook

React hook that provides location tracking functionality to components:

```javascript
import useLocationTracking from '../hooks/useLocationTracking';

const MyComponent = () => {
  const {
    location,
    error,
    isTracking,
    isLoading,
    startTracking,
    stopTracking,
    getCurrentLocation,
    validateGeofence
  } = useLocationTracking({
    autoStart: true,
    enableHighAccuracy: true
  });

  // Component logic here
};
```

**Features:**
- Automatic state management
- Error handling
- Loading states
- Permission checking
- Auto-start option

### LocationContext

Global context provider for location state across the application:

```javascript
import { LocationProvider, useLocation } from '../context/LocationContext';

// Wrap your app
<LocationProvider config={{ autoStart: true }}>
  <App />
</LocationProvider>

// Use in components
const { location, startTracking } = useLocation();
```

**Features:**
- Global location state
- Automatic location logging
- Geofence status management
- Configuration options

### GeofenceValidator Component

UI component for displaying geofence validation status:

```javascript
import GeofenceValidator from '../components/GeofenceValidator';

<GeofenceValidator
  geofence={projectGeofence}
  onValidationChange={(result) => console.log(result)}
  autoStart={true}
  showDetails={true}
/>
```

**Features:**
- Real-time geofence status display
- Visual distance indicators
- GPS accuracy information
- Manual refresh controls

## Configuration Options

### LocationService Options

```javascript
const options = {
  enableHighAccuracy: true,    // Use GPS for high accuracy
  timeout: 15000,              // Timeout for location requests (ms)
  maximumAge: 30000,           // Cache location for 30 seconds
  trackingInterval: 30000      // Minimum interval between updates (ms)
};
```

### LocationProvider Config

```javascript
const config = {
  autoStart: false,            // Auto-start tracking on mount
  enableHighAccuracy: true,    // GPS accuracy setting
  timeout: 15000,              // Location request timeout
  maximumAge: 30000,           // Location cache duration
  trackingInterval: 30000,     // Update interval
  logLocation: true,           // Enable location logging
  logInterval: 60000           // Logging interval
};
```

## Geofence Validation

The system uses the Haversine formula to calculate distances and validate if a user is within a defined geofence:

```javascript
const geofence = {
  center: {
    latitude: 40.7128,
    longitude: -74.0060
  },
  radius: 100,                 // Radius in meters
  strictMode: true,            // Enforce strict validation
  allowedVariance: 10          // Allowed variance in meters
};

const validation = locationService.validateGeofence(geofence);
// Returns: { isValid, insideGeofence, distance, accuracy, timestamp }
```

## Location Logging

The system can log location data to the backend for audit and compliance:

```javascript
import locationLogger from '../utils/locationLogger';

// Log task-specific location
await locationLogger.logTaskLocation(locationData, assignmentId, 'task_start');

// Log general location
await locationLogger.logGeneralLocation(locationData, employeeId, projectId);
```

**Features:**
- Offline queuing
- Automatic sync when online
- Configurable queue size
- Error handling and retry

## Battery Optimization

The system includes several battery optimization features:

1. **Configurable Update Intervals** - Limit GPS polling frequency
2. **Accuracy-Based Updates** - Only notify for high-accuracy readings
3. **Background Optimization** - Reduce updates when app is backgrounded
4. **Smart Caching** - Cache location data to reduce GPS usage

## Error Handling

The system handles various error scenarios:

- **Permission Denied** - Request permissions and provide fallback
- **GPS Unavailable** - Graceful degradation with error messages
- **Network Issues** - Offline queuing and sync
- **Timeout Errors** - Retry logic with exponential backoff

## Testing

Unit tests are provided for all major components:

```bash
# Run location service tests
npm test -- LocationService.test.js

# Run hook tests
npm test -- useLocationTracking.test.js
```

## Usage Examples

### Basic GPS Tracking

```javascript
import useLocationTracking from '../hooks/useLocationTracking';

const TaskScreen = () => {
  const { location, startTracking, stopTracking } = useLocationTracking();

  useEffect(() => {
    startTracking();
    return () => stopTracking();
  }, []);

  return (
    <div>
      {location ? (
        <p>Location: {location.latitude}, {location.longitude}</p>
      ) : (
        <p>Getting location...</p>
      )}
    </div>
  );
};
```

### Geofence Validation

```javascript
const TaskActions = () => {
  const { location, validateGeofence } = useLocation();
  const [canStartTask, setCanStartTask] = useState(false);

  useEffect(() => {
    if (location) {
      const result = validateGeofence(projectGeofence);
      setCanStartTask(result.insideGeofence);
    }
  }, [location]);

  return (
    <Button 
      disabled={!canStartTask}
      onClick={handleStartTask}
    >
      Start Task
    </Button>
  );
};
```

### Location Logging

```javascript
const TaskProgress = () => {
  const { logTaskLocation } = useLocation();

  const handleProgressUpdate = async () => {
    try {
      await logTaskLocation(taskId, 'progress_update');
      // Update progress in backend
    } catch (error) {
      console.error('Failed to log location:', error);
    }
  };
};
```

## Browser Compatibility

The GPS tracking system is compatible with:

- Chrome 50+
- Firefox 55+
- Safari 10+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security Considerations

- Location data is only collected when necessary
- User permissions are requested before tracking
- Location data is encrypted in transit
- Configurable privacy settings
- Compliance with location privacy regulations

## Performance Considerations

- Optimized for mobile devices
- Battery-efficient GPS polling
- Intelligent caching strategies
- Minimal memory footprint
- Efficient distance calculations

## Future Enhancements

- Support for multiple geofence shapes
- Indoor positioning integration
- Machine learning for location prediction
- Advanced battery optimization
- Real-time location sharing
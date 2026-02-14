/**
 * LocationTrackingExample - Example implementation of GPS location tracking
 * This shows how to integrate the location tracking system into a worker task screen
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Alert, Divider } from 'antd';
import { LocationProvider, useLocation } from '../context/LocationContext';
import GeofenceValidator from '../components/GeofenceValidator';

const { Title, Text } = Typography;

// Example worker task component that uses location tracking
const WorkerTaskScreen = () => {
  const {
    location,
    error,
    isTracking,
    isLoading,
    hasLocation,
    isLocationAccurate,
    startTracking,
    stopTracking,
    getCurrentLocation,
    validateGeofence,
    logTaskLocation
  } = useLocation();

  const [taskAssignmentId] = useState(101); // Example task ID
  const [projectGeofence] = useState({
    center: {
      latitude: 40.7128, // Example: New York coordinates
      longitude: -74.0060
    },
    radius: 100, // 100 meter radius
    strictMode: true,
    allowedVariance: 10
  });

  const [geofenceStatus, setGeofenceStatus] = useState(null);
  const [canStartTask, setCanStartTask] = useState(false);

  // Validate geofence when location changes
  useEffect(() => {
    if (location && projectGeofence) {
      const validation = validateGeofence(projectGeofence);
      setGeofenceStatus(validation);
      setCanStartTask(validation.insideGeofence);
    }
  }, [location, projectGeofence, validateGeofence]);

  /**
   * Handle task start - requires geofence validation
   */
  const handleStartTask = async () => {
    if (!canStartTask) {
      alert('You must be within the project site to start this task');
      return;
    }

    try {
      // Log location for task start
      await logTaskLocation(taskAssignmentId, 'task_start');
      
      // Here you would call your API to start the task
      console.log('Task started successfully');
      alert('Task started successfully!');
    } catch (error) {
      console.error('Failed to start task:', error);
      alert('Failed to start task. Please try again.');
    }
  };

  /**
   * Handle progress update
   */
  const handleUpdateProgress = async () => {
    if (!hasLocation) {
      alert('Location is required to update progress');
      return;
    }

    try {
      // Log location for progress update
      await logTaskLocation(taskAssignmentId, 'progress_update');
      
      // Here you would show a progress update modal
      console.log('Progress update logged');
      alert('Progress update logged successfully!');
    } catch (error) {
      console.error('Failed to log progress:', error);
      alert('Failed to log progress. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card>
        <Title level={2}>Worker Task Screen - GPS Tracking Demo</Title>
        <Text>
          This example demonstrates how GPS location tracking integrates with worker task management.
          The system validates your location against the project geofence before allowing task actions.
        </Text>
      </Card>

      {/* Location Status */}
      <Card title="Location Status">
        <Space direction="vertical" className="w-full">
          <div className="flex justify-between items-center">
            <Text strong>Tracking Status:</Text>
            <Text className={isTracking ? 'text-green-600' : 'text-red-600'}>
              {isTracking ? 'Active' : 'Inactive'}
            </Text>
          </div>
          
          <div className="flex justify-between items-center">
            <Text strong>Location Available:</Text>
            <Text className={hasLocation ? 'text-green-600' : 'text-red-600'}>
              {hasLocation ? 'Yes' : 'No'}
            </Text>
          </div>
          
          <div className="flex justify-between items-center">
            <Text strong>GPS Accuracy:</Text>
            <Text className={isLocationAccurate ? 'text-green-600' : 'text-orange-600'}>
              {isLocationAccurate ? 'High' : 'Medium/Low'}
            </Text>
          </div>

          {location && (
            <div className="bg-gray-50 p-3 rounded">
              <Text strong>Current Location:</Text>
              <div className="mt-1">
                <Text code>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
                <br />
                <Text type="secondary">
                  Accuracy: {Math.round(location.accuracy)}m | 
                  Updated: {new Date(location.timestamp).toLocaleTimeString()}
                </Text>
              </div>
            </div>
          )}

          <Space>
            <Button 
              type={isTracking ? 'default' : 'primary'}
              onClick={isTracking ? stopTracking : startTracking}
              loading={isLoading}
            >
              {isTracking ? 'Stop Tracking' : 'Start Tracking'}
            </Button>
            
            <Button 
              onClick={getCurrentLocation}
              loading={isLoading}
            >
              Refresh Location
            </Button>
          </Space>
        </Space>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert
          message="Location Error"
          description={error.message}
          type="error"
          showIcon
          closable
        />
      )}

      {/* Geofence Validation */}
      <GeofenceValidator
        geofence={projectGeofence}
        onValidationChange={setGeofenceStatus}
        autoStart={false}
        showDetails={true}
      />

      {/* Task Actions */}
      <Card title="Task Actions">
        <Space direction="vertical" className="w-full">
          <Alert
            message={canStartTask ? 'Ready to Work' : 'Location Required'}
            description={
              canStartTask 
                ? 'You are within the project site and can perform task actions.'
                : 'Please move to the project site to start working on tasks.'
            }
            type={canStartTask ? 'success' : 'warning'}
            showIcon
          />

          <Divider />

          <div className="space-y-3">
            <div>
              <Text strong>Task: Install Ceiling Panels - Zone A</Text>
              <br />
              <Text type="secondary">Location: Zone A, Floor 3</Text>
              <br />
              <Text type="secondary">Progress: 75% Complete</Text>
            </div>

            <Space>
              <Button 
                type="primary"
                onClick={handleStartTask}
                disabled={!canStartTask || !hasLocation}
              >
                Start Task
              </Button>
              
              <Button 
                onClick={handleUpdateProgress}
                disabled={!hasLocation}
              >
                Update Progress
              </Button>
              
              <Button disabled={!hasLocation}>
                Upload Photo
              </Button>
            </Space>
          </div>
        </Space>
      </Card>

      {/* Technical Information */}
      <Card title="Technical Information">
        <div className="space-y-2">
          <div>
            <Text strong>Geofence Center: </Text>
            <Text code>
              {projectGeofence.center.latitude}, {projectGeofence.center.longitude}
            </Text>
          </div>
          <div>
            <Text strong>Geofence Radius: </Text>
            <Text>{projectGeofence.radius}m</Text>
          </div>
          {geofenceStatus && (
            <div>
              <Text strong>Distance to Center: </Text>
              <Text>{geofenceStatus.distance}m</Text>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

// Main example component with LocationProvider
const LocationTrackingExample = () => {
  return (
    <LocationProvider config={{ autoStart: false, logLocation: true }}>
      <WorkerTaskScreen />
    </LocationProvider>
  );
};

export default LocationTrackingExample;
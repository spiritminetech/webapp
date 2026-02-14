/**
 * LocationTrackingDemo - Demo component to test GPS location tracking
 * This component demonstrates the real-time GPS tracking functionality
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Divider, Tag, Alert } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import GeofenceValidator from './GeofenceValidator';
import useLocationTracking from '../hooks/useLocationTracking';

const { Title, Text, Paragraph } = Typography;

const LocationTrackingDemo = () => {
  const [demoGeofence, setDemoGeofence] = useState(null);
  const [validationResult, setValidationResult] = useState(null);

  const {
    location,
    error,
    isTracking,
    isLoading,
    permissions,
    startTracking,
    stopTracking,
    getCurrentLocation,
    hasLocation,
    isLocationAccurate,
    trackingStatus
  } = useLocationTracking({
    autoStart: false,
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 10000
  });

  // Set up demo geofence based on current location
  useEffect(() => {
    if (location && !demoGeofence) {
      setDemoGeofence({
        center: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        radius: 100, // 100 meter radius
        strictMode: true,
        allowedVariance: 10
      });
    }
  }, [location, demoGeofence]);

  /**
   * Handle validation result from GeofenceValidator
   */
  const handleValidationChange = (result) => {
    setValidationResult(result);
  };

  /**
   * Handle manual location refresh
   */
  const handleRefreshLocation = async () => {
    try {
      await getCurrentLocation();
    } catch (err) {
      console.error('Failed to refresh location:', err);
    }
  };

  /**
   * Toggle tracking
   */
  const handleToggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  /**
   * Reset demo geofence to current location
   */
  const handleResetGeofence = () => {
    if (location) {
      setDemoGeofence({
        center: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        radius: 100,
        strictMode: true,
        allowedVariance: 10
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card>
        <Title level={2}>
          <EnvironmentOutlined className="mr-2" />
          Real-time GPS Location Tracking Demo
        </Title>
        <Paragraph>
          This demo showcases the real-time GPS location tracking functionality for the worker mobile app.
          The system continuously monitors your location and validates it against project geofences.
        </Paragraph>
      </Card>

      {/* Control Panel */}
      <Card title="Control Panel">
        <Space wrap>
          <Button
            type={isTracking ? 'default' : 'primary'}
            icon={isTracking ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={handleToggleTracking}
            loading={isLoading}
          >
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </Button>
          
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefreshLocation}
            loading={isLoading}
          >
            Refresh Location
          </Button>
          
          <Button
            onClick={handleResetGeofence}
            disabled={!location}
          >
            Reset Geofence to Current Location
          </Button>
        </Space>
      </Card>

      {/* Status Information */}
      <Card title="Status Information">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Text strong>Tracking Status:</Text>
            <Tag color={isTracking ? 'green' : 'default'}>
              {isTracking ? 'Active' : 'Inactive'}
            </Tag>
          </div>
          
          <div className="flex items-center justify-between">
            <Text strong>Location Available:</Text>
            <Tag color={hasLocation ? 'green' : 'red'}>
              {hasLocation ? 'Yes' : 'No'}
            </Tag>
          </div>
          
          <div className="flex items-center justify-between">
            <Text strong>GPS Accuracy:</Text>
            <Tag color={isLocationAccurate ? 'green' : 'orange'}>
              {isLocationAccurate ? 'High' : 'Medium/Low'}
            </Tag>
          </div>
          
          <div className="flex items-center justify-between">
            <Text strong>Permissions:</Text>
            <Tag color={permissions?.state === 'granted' ? 'green' : 'red'}>
              {permissions?.state || 'Unknown'}
            </Tag>
          </div>
        </div>
      </Card>

      {/* Current Location */}
      {location && (
        <Card title="Current Location">
          <div className="space-y-2">
            <div>
              <Text strong>Coordinates: </Text>
              <Text code>
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </Text>
            </div>
            <div>
              <Text strong>Accuracy: </Text>
              <Text>{Math.round(location.accuracy)}m</Text>
            </div>
            <div>
              <Text strong>Last Update: </Text>
              <Text>{new Date(location.timestamp).toLocaleString()}</Text>
            </div>
            {location.speed !== null && (
              <div>
                <Text strong>Speed: </Text>
                <Text>{Math.round((location.speed || 0) * 3.6)} km/h</Text>
              </div>
            )}
            {location.heading !== null && (
              <div>
                <Text strong>Heading: </Text>
                <Text>{Math.round(location.heading || 0)}°</Text>
              </div>
            )}
          </div>
        </Card>
      )}

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
        geofence={demoGeofence}
        onValidationChange={handleValidationChange}
        autoStart={false}
        showDetails={true}
      />

      {/* Validation Result */}
      {validationResult && (
        <Card title="Geofence Validation Result">
          <div className="space-y-2">
            <div>
              <Text strong>Inside Geofence: </Text>
              <Tag color={validationResult.insideGeofence ? 'green' : 'red'}>
                {validationResult.insideGeofence ? 'Yes' : 'No'}
              </Tag>
            </div>
            <div>
              <Text strong>Distance to Center: </Text>
              <Text>{validationResult.distance}m</Text>
            </div>
            <div>
              <Text strong>Validation Time: </Text>
              <Text>{new Date(validationResult.timestamp).toLocaleString()}</Text>
            </div>
          </div>
        </Card>
      )}

      {/* Technical Details */}
      <Card title="Technical Details">
        <div className="space-y-2">
          <div>
            <Text strong>Service Status: </Text>
            <Text code>{JSON.stringify(trackingStatus, null, 2)}</Text>
          </div>
        </div>
      </Card>

      {/* Instructions */}
      <Card>
        <Alert
          message="How to Test"
          description={
            <div>
              <p>1. Click "Start Tracking" to begin GPS monitoring</p>
              <p>2. The system will request location permissions if needed</p>
              <p>3. Once tracking starts, your location will update automatically</p>
              <p>4. The geofence validator shows if you're within the work area</p>
              <p>5. Walk around to see real-time location updates</p>
              <p>6. The system optimizes battery usage by limiting update frequency</p>
            </div>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
        />
      </Card>
    </div>
  );
};

export default LocationTrackingDemo;
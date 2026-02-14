/**
 * GeofenceValidator - Component for real-time geofence validation
 * Displays location status, geofence validation, and distance information
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Spin, Progress, Tag, Space, Typography } from 'antd';
import {
  EnvironmentOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  CompassOutlined
} from '@ant-design/icons';
import useLocationTracking from '../hooks/useLocationTracking';

const { Text, Title } = Typography;

const GeofenceValidator = ({ 
  geofence, 
  onValidationChange, 
  autoStart = true,
  showDetails = true,
  className = ''
}) => {
  const [validationResult, setValidationResult] = useState(null);
  const [lastValidation, setLastValidation] = useState(null);

  const {
    location,
    error,
    isTracking,
    isLoading,
    permissions,
    startTracking,
    stopTracking,
    getCurrentLocation,
    validateGeofence,
    hasLocation,
    isLocationAccurate
  } = useLocationTracking({
    autoStart,
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 10000
  });

  // Validate geofence when location or geofence changes
  useEffect(() => {
    if (location && geofence) {
      const result = validateGeofence(geofence);
      setValidationResult(result);
      setLastValidation(new Date().toISOString());
      
      // Notify parent component
      if (onValidationChange) {
        onValidationChange(result);
      }
    }
  }, [location, geofence, validateGeofence, onValidationChange]);

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
   * Handle start/stop tracking
   */
  const handleToggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  /**
   * Get status color based on validation result
   */
  const getStatusColor = () => {
    if (!validationResult) return 'default';
    return validationResult.insideGeofence ? 'success' : 'error';
  };

  /**
   * Get status icon based on validation result
   */
  const getStatusIcon = () => {
    if (!validationResult) return <ExclamationCircleOutlined />;
    return validationResult.insideGeofence ? <CheckCircleOutlined /> : <CloseCircleOutlined />;
  };

  /**
   * Get status text based on validation result
   */
  const getStatusText = () => {
    if (!validationResult) return 'Unknown';
    return validationResult.insideGeofence ? 'Inside Geofence' : 'Outside Geofence';
  };

  /**
   * Get accuracy indicator
   */
  const getAccuracyIndicator = () => {
    if (!location) return null;
    
    const accuracy = location.accuracy;
    let color = 'success';
    let text = 'High';
    
    if (accuracy > 50) {
      color = 'error';
      text = 'Low';
    } else if (accuracy > 20) {
      color = 'warning';
      text = 'Medium';
    }
    
    return (
      <Tag color={color}>
        GPS Accuracy: {text} ({Math.round(accuracy)}m)
      </Tag>
    );
  };

  /**
   * Render permission error
   */
  if (permissions?.state === 'denied') {
    return (
      <Card className={className}>
        <Alert
          message="Location Permission Required"
          description="Please enable location permissions to use geofence validation. Check your browser settings and reload the page."
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          }
        />
      </Card>
    );
  }

  /**
   * Render location error
   */
  if (error) {
    return (
      <Card className={className}>
        <Alert
          message="Location Error"
          description={error.message}
          type="error"
          showIcon
          action={
            <Space>
              <Button size="small" icon={<ReloadOutlined />} onClick={handleRefreshLocation}>
                Retry
              </Button>
              <Button size="small" onClick={handleToggleTracking}>
                {isTracking ? 'Stop' : 'Start'} Tracking
              </Button>
            </Space>
          }
        />
      </Card>
    );
  }

  return (
    <Card 
      className={className}
      title={
        <Space>
          <EnvironmentOutlined />
          <span>Location Validation</span>
          {isTracking && <Tag color="green">Tracking Active</Tag>}
        </Space>
      }
      extra={
        <Space>
          <Button 
            size="small" 
            icon={<ReloadOutlined />} 
            onClick={handleRefreshLocation}
            loading={isLoading}
          >
            Refresh
          </Button>
          <Button 
            size="small" 
            type={isTracking ? 'default' : 'primary'}
            onClick={handleToggleTracking}
          >
            {isTracking ? 'Stop' : 'Start'} Tracking
          </Button>
        </Space>
      }
    >
      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-4">
          <Spin size="large" />
          <div className="mt-2">
            <Text type="secondary">Getting your location...</Text>
          </div>
        </div>
      )}

      {/* Location Status */}
      {hasLocation && (
        <div className="space-y-4">
          {/* Geofence Status */}
          <div className="flex items-center justify-between">
            <Text strong>Geofence Status:</Text>
            <Tag 
              icon={getStatusIcon()} 
              color={getStatusColor()}
              className="text-sm"
            >
              {getStatusText()}
            </Tag>
          </div>

          {/* Distance Information */}
          {validationResult && (
            <div className="flex items-center justify-between">
              <Text strong>Distance to Center:</Text>
              <Text className={validationResult.insideGeofence ? 'text-green-600' : 'text-red-600'}>
                {validationResult.distance}m
              </Text>
            </div>
          )}

          {/* Geofence Radius */}
          {geofence && (
            <div className="flex items-center justify-between">
              <Text strong>Allowed Radius:</Text>
              <Text type="secondary">{geofence.radius}m</Text>
            </div>
          )}

          {/* GPS Accuracy */}
          <div className="flex items-center justify-between">
            <Text strong>GPS Accuracy:</Text>
            {getAccuracyIndicator()}
          </div>

          {/* Visual Distance Indicator */}
          {validationResult && geofence && (
            <div>
              <Text strong className="block mb-2">Distance Progress:</Text>
              <Progress
                percent={Math.min(100, (validationResult.distance / geofence.radius) * 100)}
                status={validationResult.insideGeofence ? 'success' : 'exception'}
                strokeColor={validationResult.insideGeofence ? '#52c41a' : '#ff4d4f'}
                format={(percent) => `${validationResult.distance}m / ${geofence.radius}m`}
              />
            </div>
          )}

          {/* Detailed Location Info */}
          {showDetails && location && (
            <div className="bg-gray-50 p-3 rounded">
              <Text strong className="block mb-2">Location Details:</Text>
              <div className="space-y-1 text-sm">
                <div>
                  <Text type="secondary">Coordinates: </Text>
                  <Text code>
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </Text>
                </div>
                <div>
                  <Text type="secondary">Last Update: </Text>
                  <Text>{new Date(location.timestamp).toLocaleTimeString()}</Text>
                </div>
                {location.speed !== null && (
                  <div>
                    <Text type="secondary">Speed: </Text>
                    <Text>{Math.round(location.speed * 3.6)} km/h</Text>
                  </div>
                )}
                {location.heading !== null && (
                  <div>
                    <Text type="secondary">Heading: </Text>
                    <Text>
                      <CompassOutlined /> {Math.round(location.heading)}°
                    </Text>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Validation Status */}
          {validationResult && (
            <Alert
              message={validationResult.insideGeofence ? 'Location Validated' : 'Outside Work Area'}
              description={
                validationResult.insideGeofence
                  ? 'You are within the project site and can start tasks.'
                  : `You are ${validationResult.distance}m from the project center. Please move closer to the work area.`
              }
              type={validationResult.insideGeofence ? 'success' : 'warning'}
              showIcon
            />
          )}
        </div>
      )}

      {/* No Location State */}
      {!hasLocation && !isLoading && !error && (
        <div className="text-center py-4">
          <EnvironmentOutlined className="text-4xl text-gray-400 mb-2" />
          <div>
            <Text type="secondary">No location data available</Text>
          </div>
          <Button 
            type="primary" 
            className="mt-2"
            onClick={handleRefreshLocation}
            loading={isLoading}
          >
            Get Location
          </Button>
        </div>
      )}
    </Card>
  );
};

export default GeofenceValidator;
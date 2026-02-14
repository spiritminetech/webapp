import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Badge, Button, Spin, message, Empty, Tag, Tooltip, Avatar, Modal, List } from 'antd';
import {
  BellOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  EnvironmentOutlined,
  UserDeleteOutlined,
  ClockCircleOutlined,
  SafetyOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckOutlined,
  FireOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import appConfig from '../../config/app.config.js';
import tokenService from '../../services/TokenService.js';
import './AlertsNotifications.css';

/**
 * AlertsNotifications Component
 * 
 * Displays real-time alerts and notifications for supervisors with:
 * - Priority-based visual indicators (red/orange/blue)
 * - Alert acknowledgment functionality with count updates
 * - Alert sorting by priority and timestamp
 * - Real-time updates within 15 seconds for critical alerts
 * - Mobile-first responsive design
 * 
 * Requirements: 5.1, 5.2, 5.4, 5.5
 */
const AlertsNotifications = ({ 
  supervisorId, 
  alerts = [],
  onAlertAcknowledge,
  maxDisplayCount = 20,
  refreshInterval = 15000, // 15 seconds for critical alerts
  className = '' 
}) => {
  const { user } = useAuth();
  const [alertsList, setAlertsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  
  // Modal states
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [acknowledging, setAcknowledging] = useState(false);

  // Fetch alerts data
  const fetchAlerts = useCallback(async (isRefresh = false) => {
    if (!supervisorId) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Call real API to get alerts
      const response = await fetch(`${appConfig.api.baseURL}/api/supervisor/${supervisorId}/alerts?limit=50`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenService.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      let alertsArray = [];
      if (data.success && data.alerts) {
        // Format: { success: true, alerts: { items: [...] } }
        alertsArray = data.alerts.items || data.alerts || [];
      } else if (data.alerts) {
        // Format: { alerts: [...] }
        alertsArray = Array.isArray(data.alerts) ? data.alerts : [];
      } else if (Array.isArray(data)) {
        // Format: [...]
        alertsArray = data;
      }
      
      // Transform alerts to ensure consistent format
      const transformedAlerts = alertsArray.map(alert => ({
        ...alert,
        alertId: alert.id || alert.alertId || alert._id,
        timestamp: new Date(alert.timestamp),
        isRead: alert.isRead || false,
        priority: alert.priority || 'info',
        type: alert.type || 'general',
        message: alert.message || 'No message',
        metadata: alert.metadata || {}
      }));
      
      setAlertsList(transformedAlerts);
      setLastUpdated(new Date());
      
      if (isRefresh) {
        message.success('Alerts refreshed');
      }

      // Log for monitoring
      if (appConfig.features.enableDebug) {
        console.log(`Loaded ${transformedAlerts.length} alerts for supervisor ${supervisorId}`);
        console.log('Alerts data:', transformedAlerts);
      }

    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setError(err.message || 'Failed to load alerts');
      message.error('Failed to load alerts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supervisorId]);

  // Initial load
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Auto-refresh interval (15 seconds for critical alerts)
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(() => {
      fetchAlerts(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchAlerts, refreshInterval]);

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    fetchAlerts(true);
  }, [fetchAlerts]);

  // Get alert type configuration
  const getAlertTypeConfig = useCallback((type) => {
    const configs = {
      geofence_violation: {
        icon: <EnvironmentOutlined />,
        label: 'Geofence Violation',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      },
      worker_absence: {
        icon: <UserDeleteOutlined />,
        label: 'Worker Absence',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      },
      attendance_anomaly: {
        icon: <ClockCircleOutlined />,
        label: 'Attendance Anomaly',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      },
      safety_alert: {
        icon: <SafetyOutlined />,
        label: 'Safety Alert',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      }
    };
    return configs[type] || {
      icon: <BellOutlined />,
      label: 'Alert',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    };
  }, []);

  // Get priority configuration with distinct visual indicators
  const getPriorityConfig = useCallback((priority) => {
    const configs = {
      critical: { 
        color: 'red', 
        text: 'Critical', 
        icon: <ExclamationCircleOutlined />,
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-300',
        badgeColor: '#ff4d4f'
      },
      warning: { 
        color: 'orange', 
        text: 'Warning', 
        icon: <WarningOutlined />,
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-800',
        borderColor: 'border-orange-300',
        badgeColor: '#faad14'
      },
      info: { 
        color: 'blue', 
        text: 'Info', 
        icon: <InfoCircleOutlined />,
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-300',
        badgeColor: '#1890ff'
      }
    };
    return configs[priority] || configs.info;
  }, []);

  // Format time ago
  const formatTimeAgo = useCallback((date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  }, []);

  // Handle alert acknowledgment
  const handleAlertAcknowledge = useCallback(async (alert) => {
    try {
      setAcknowledging(true);

      // TODO: Replace with actual API call when backend endpoint is implemented (Task 8.2)
      // For now, simulate API call
      console.warn('API not ready, simulating alert acknowledgment');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Call parent handler if provided
      if (onAlertAcknowledge) {
        await onAlertAcknowledge(alert.alertId);
      }

      // Update local state to mark as read
      setAlertsList(prev => prev.map(item => 
        item.alertId === alert.alertId 
          ? { ...item, isRead: true }
          : item
      ));
      
      message.success('Alert acknowledged');

      // Close detail modal if open
      if (detailModalVisible && selectedAlert?.alertId === alert.alertId) {
        setDetailModalVisible(false);
        setSelectedAlert(null);
      }

      // Log for audit
      if (appConfig.features.enableDebug) {
        console.log('Alert acknowledged:', alert.alertId);
      }

    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
      message.error('Failed to acknowledge alert');
    } finally {
      setAcknowledging(false);
    }
  }, [onAlertAcknowledge, detailModalVisible, selectedAlert]);

  // Handle alert detail view
  const handleViewAlertDetails = useCallback((alert) => {
    setSelectedAlert(alert);
    setDetailModalVisible(true);
  }, []);

  // Processed and sorted alerts
  const processedAlerts = useMemo(() => {
    return alertsList
      .slice(0, maxDisplayCount) // Limit display count
      .sort((a, b) => {
        // Sort by priority first (critical > warning > info)
        const priorityOrder = { critical: 3, warning: 2, info: 1 };
        const aPriority = priorityOrder[a.priority] || 1;
        const bPriority = priorityOrder[b.priority] || 1;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        
        // Then by read status (unread first)
        if (a.isRead !== b.isRead) {
          return a.isRead ? 1 : -1;
        }
        
        // Finally by timestamp (newer first)
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
  }, [alertsList, maxDisplayCount]);

  // Count unread alerts by priority
  const alertCounts = useMemo(() => {
    const counts = { critical: 0, warning: 0, info: 0, total: 0 };
    alertsList.forEach(alert => {
      if (!alert.isRead) {
        counts[alert.priority] = (counts[alert.priority] || 0) + 1;
        counts.total += 1;
      }
    });
    return counts;
  }, [alertsList]);

  // Render alert details
  const renderAlertDetails = useCallback((alert) => {
    const { details, type } = alert;
    
    if (!details) return null;

    switch (type) {
      case 'geofence_violation':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Worker</p>
                <p className="text-sm text-gray-900">{details.workerName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Duration</p>
                <p className="text-sm text-gray-900">{details.violationDuration}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Location</p>
              <p className="text-sm text-gray-900">{details.distance}</p>
            </div>
            {details.reason && (
              <div>
                <p className="text-sm font-medium text-gray-700">Reason</p>
                <p className="text-sm text-gray-900">{details.reason}</p>
              </div>
            )}
          </div>
        );
      
      case 'worker_absence':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Scheduled Start</p>
                <p className="text-sm text-gray-900">{details.scheduledStartTime}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Contact Attempts</p>
                <p className="text-sm text-gray-900">{details.contactAttempts}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Last Seen</p>
              <p className="text-sm text-gray-900">{details.lastSeen}</p>
            </div>
          </div>
        );
      
      case 'attendance_anomaly':
        return (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Affected Workers</p>
              <p className="text-sm text-gray-900">{details.affectedWorkers?.join(', ')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Average Delay</p>
                <p className="text-sm text-gray-900">{details.averageDelay}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Possible Cause</p>
                <p className="text-sm text-gray-900">{details.possibleCause}</p>
              </div>
            </div>
          </div>
        );
      
      case 'safety_alert':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Alert Type</p>
                <p className="text-sm text-gray-900">{details.alertType}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Status</p>
                <p className="text-sm text-gray-900">{details.evacuationStatus || details.findings}</p>
              </div>
            </div>
            {details.workersOnSite && (
              <div>
                <p className="text-sm font-medium text-gray-700">Workers on Site</p>
                <p className="text-sm text-gray-900">{details.workersOnSite}</p>
              </div>
            )}
            {details.emergencyServices && (
              <div>
                <p className="text-sm font-medium text-gray-700">Emergency Services</p>
                <p className="text-sm text-gray-900">{details.emergencyServices}</p>
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <div className="text-sm text-gray-600">
            No additional details available
          </div>
        );
    }
  }, []);

  // Render error state
  if (error && !loading) {
    return (
      <Card 
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BellOutlined className="mr-2 text-blue-500" />
              <span>Alerts & Notifications</span>
            </div>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={refreshing}
              className="flex items-center justify-center w-10 h-10"
            />
          </div>
        }
        className={`shadow-sm ${className}`}
      >
        <div className="text-center py-6">
          <BellOutlined className="text-4xl mb-2 text-red-300" />
          <p className="text-red-600 mb-2">Failed to load alerts</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button 
            type="primary" 
            onClick={handleRefresh}
            loading={refreshing}
          >
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  // Render empty state
  if (!loading && processedAlerts.length === 0 && !error) {
    return (
      <Card 
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BellOutlined className="mr-2 text-blue-500" />
              <span>Alerts & Notifications</span>
            </div>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={refreshing}
              className="flex items-center justify-center w-10 h-10"
            />
          </div>
        }
        className={`shadow-sm ${className}`}
      >
        <Empty
          image={<BellOutlined className="text-4xl text-gray-300" />}
          description={
            <div className="text-center">
              <p className="text-gray-500 mb-2">No alerts</p>
              <p className="text-sm text-gray-400">
                All systems operating normally
              </p>
            </div>
          }
        />
      </Card>
    );
  }

  return (
    <>
      <Card 
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BellOutlined className="mr-2 text-blue-500" />
              <span>Alerts & Notifications</span>
              {alertCounts.total > 0 && (
                <Badge 
                  count={alertCounts.total} 
                  className="ml-2"
                  style={{ backgroundColor: '#ff4d4f' }}
                />
              )}
            </div>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={refreshing}
              className="flex items-center justify-center w-10 h-10"
              title="Refresh alerts"
            />
          </div>
        }
        className={`shadow-sm ${className}`}
        loading={loading}
      >
        {/* Alert Summary - Mobile Optimized */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2 bg-white rounded-lg border border-red-100">
              <div className="flex items-center justify-center mb-1">
                <ExclamationCircleOutlined className="text-red-500 mr-1" />
                <div className="text-lg font-semibold text-red-600">
                  {alertCounts.critical}
                </div>
              </div>
              <div className="text-xs text-gray-500">Critical</div>
            </div>
            <div className="p-2 bg-white rounded-lg border border-orange-100">
              <div className="flex items-center justify-center mb-1">
                <WarningOutlined className="text-orange-500 mr-1" />
                <div className="text-lg font-semibold text-orange-600">
                  {alertCounts.warning}
                </div>
              </div>
              <div className="text-xs text-gray-500">Warning</div>
            </div>
            <div className="p-2 bg-white rounded-lg border border-blue-100">
              <div className="flex items-center justify-center mb-1">
                <InfoCircleOutlined className="text-blue-500 mr-1" />
                <div className="text-lg font-semibold text-blue-600">
                  {alertCounts.info}
                </div>
              </div>
              <div className="text-xs text-gray-500">Info</div>
            </div>
          </div>
        </div>

        {/* Alerts List - Mobile Optimized */}
        <div className="space-y-3">
          {processedAlerts.map((alert) => {
            const priorityConfig = getPriorityConfig(alert.priority);
            const typeConfig = getAlertTypeConfig(alert.type);
            
            return (
              <div
                key={alert.alertId}
                className={`border rounded-xl p-4 transition-all duration-200 touch-manipulation alert-card ${
                  alert.isRead 
                    ? 'bg-gray-50 border-gray-200 opacity-75' 
                    : `${priorityConfig.bgColor} ${priorityConfig.borderColor} shadow-sm`
                } hover:shadow-lg active:scale-[0.98]`}
                style={{ minHeight: '100px' }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    {/* Alert Icon - Larger for Mobile */}
                    <div className={`p-2.5 rounded-lg ${
                      alert.isRead ? 'bg-gray-200' : priorityConfig.bgColor
                    } flex-shrink-0 shadow-sm`}>
                      {typeConfig.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Alert Message - Better Typography */}
                      <p className={`font-semibold text-base mb-2 leading-tight ${
                        alert.isRead ? 'text-gray-600' : 'text-gray-900'
                      }`}>
                        {alert.message}
                      </p>
                      
                      {/* Alert Metadata - Enhanced for Mobile */}
                      <div className="flex items-center space-x-3 text-sm text-gray-600 mb-2">
                        <div className="flex items-center">
                          <ClockCircleOutlined className="mr-1.5 text-blue-500" />
                          <span className="font-medium">{formatTimeAgo(alert.timestamp)}</span>
                        </div>
                        <div className="flex items-center">
                          {typeConfig.icon}
                          <span className="ml-1.5 hidden sm:inline">{typeConfig.label}</span>
                        </div>
                      </div>
                      
                      {/* Related Information - Mobile Optimized */}
                      {(alert.relatedWorkerId || alert.relatedProjectId) && (
                        <div className="flex flex-col sm:flex-row sm:items-center text-xs text-gray-500 space-y-1 sm:space-y-0 sm:space-x-4">
                          {alert.relatedWorkerId && (
                            <div className="flex items-center">
                              <TeamOutlined className="mr-1.5 text-blue-400" />
                              <span>Worker: {alert.relatedWorkerId}</span>
                            </div>
                          )}
                          {alert.relatedProjectId && (
                            <div className="flex items-center">
                              <EnvironmentOutlined className="mr-1.5 text-green-400" />
                              <span>Project: {alert.relatedProjectId}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end ml-3 space-y-2">
                    {/* Priority Badge - Enhanced */}
                    <Tag 
                      color={priorityConfig.color}
                      className={`text-xs px-2.5 py-1 font-medium ${
                        alert.priority === 'critical' ? 'animate-pulse' : ''
                      }`}
                    >
                      {priorityConfig.icon}
                      <span className="ml-1 hidden sm:inline">{priorityConfig.text}</span>
                      <span className="ml-1 sm:hidden">{priorityConfig.text.charAt(0)}</span>
                    </Tag>
                    
                    {/* Read Status Indicator */}
                    {alert.isRead && (
                      <Tag color="green" className="text-xs font-medium">
                        <CheckOutlined className="mr-1" />
                        <span className="hidden sm:inline">Read</span>
                        <span className="sm:hidden">✓</span>
                      </Tag>
                    )}
                  </div>
                </div>

                {/* Action Buttons - Mobile Optimized */}
                <div className="flex space-x-3 pt-3 mt-3 border-t border-gray-200">
                  <Button
                    type="text"
                    size="large"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewAlertDetails(alert)}
                    className="flex-1 font-medium touch-manipulation"
                    style={{ 
                      minHeight: '44px',
                      touchAction: 'manipulation',
                      borderRadius: '8px'
                    }}
                  >
                    <span className="hidden sm:inline">View Details</span>
                    <span className="sm:hidden">Details</span>
                  </Button>
                  
                  {!alert.isRead && (
                    <Button
                      type="primary"
                      size="large"
                      icon={<CheckOutlined />}
                      onClick={() => handleAlertAcknowledge(alert)}
                      loading={acknowledging}
                      className="flex-1 font-medium touch-manipulation"
                      style={{ 
                        minHeight: '44px',
                        touchAction: 'manipulation',
                        borderRadius: '8px'
                      }}
                    >
                      <span className="hidden sm:inline">Acknowledge</span>
                      <span className="sm:hidden">ACK</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Show More Indicator */}
        {alertsList.length > maxDisplayCount && (
          <div className="mt-4 pt-3 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Showing {maxDisplayCount} of {alertsList.length} alerts
            </p>
          </div>
        )}

        {/* Last Updated Info */}
        {lastUpdated && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        )}
      </Card>

      {/* Alert Detail Modal - Mobile Optimized */}
      <Modal
        title={
          <div className="flex items-center">
            {selectedAlert && (
              <>
                {getAlertTypeConfig(selectedAlert.type).icon}
                <span className="ml-2 text-base sm:text-lg">Alert Details</span>
                <Tag 
                  color={getPriorityConfig(selectedAlert.priority).color}
                  className="ml-2 font-medium"
                >
                  {getPriorityConfig(selectedAlert.priority).text}
                </Tag>
              </>
            )}
          </div>
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedAlert(null);
        }}
        footer={[
          <Button 
            key="close" 
            size="large"
            onClick={() => {
              setDetailModalVisible(false);
              setSelectedAlert(null);
            }}
            style={{ minHeight: '44px', touchAction: 'manipulation' }}
          >
            Close
          </Button>,
          selectedAlert && !selectedAlert.isRead && (
            <Button
              key="acknowledge"
              type="primary"
              size="large"
              icon={<CheckOutlined />}
              onClick={() => handleAlertAcknowledge(selectedAlert)}
              loading={acknowledging}
              style={{ minHeight: '44px', touchAction: 'manipulation' }}
            >
              Acknowledge Alert
            </Button>
          )
        ].filter(Boolean)}
        width="95%"
        style={{ 
          maxWidth: '600px',
          top: '10px'
        }}
        className="mobile-modal"
        bodyStyle={{ 
          padding: '16px',
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto'
        }}
      >
        {selectedAlert && (
          <div className="space-y-4">
            {/* Alert Summary - Mobile Optimized */}
            <div className={`p-4 rounded-xl ${getPriorityConfig(selectedAlert.priority).bgColor} border border-gray-100`}>
              <div className="flex items-start space-x-3">
                <div className="p-2.5 rounded-lg bg-white shadow-sm">
                  {getAlertTypeConfig(selectedAlert.type).icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 mb-2 text-base">
                    {selectedAlert.message}
                  </h4>
                  <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-600 space-y-1 sm:space-y-0">
                    <div className="flex items-center">
                      <ClockCircleOutlined className="mr-1.5" />
                      <span>{selectedAlert.timestamp.toLocaleString()}</span>
                    </div>
                    <span className="hidden sm:inline mx-2">•</span>
                    <span className="text-blue-600 font-medium">{formatTimeAgo(selectedAlert.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Alert Details - Mobile Optimized */}
            <div>
              <h5 className="font-semibold text-gray-900 mb-3 text-base">Additional Information</h5>
              <div className="bg-gray-50 p-4 rounded-xl">
                {renderAlertDetails(selectedAlert)}
              </div>
            </div>

            {/* Alert Status - Mobile Optimized */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Status:</span>
                <Tag 
                  color={selectedAlert.isRead ? 'green' : 'orange'}
                  className="font-medium px-3 py-1"
                >
                  {selectedAlert.isRead ? 'Acknowledged' : 'Pending'}
                </Tag>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default AlertsNotifications;
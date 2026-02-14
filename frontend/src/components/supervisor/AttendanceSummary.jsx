import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Badge, Button, Spin, message, Empty, Tag, Tooltip, Avatar } from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EnvironmentOutlined,
  WarningOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FireOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { FixedSizeList as List } from 'react-window';
import { useAuth } from '../../context/AuthContext';
import { attendanceService } from '../../services';
import appConfig from '../../config/app.config.js';

/**
 * AttendanceSummary Component
 * 
 * Displays real-time attendance status for all assigned workers with:
 * - Scrollable worker list with virtual rendering for performance
 * - Visual indicators for late check-ins, missing logouts, and geofence violations
 * - Overtime duration display and highlighting
 * - Worker name, check-in time, location status, and current activity
 * - Real-time updates within 30 seconds
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
const AttendanceSummary = ({ 
  supervisorId, 
  workers = [],
  onWorkerSelect,
  refreshInterval = 30000,
  className = '',
  maxHeight = 400
}) => {
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  // Fetch attendance summary data
  const fetchAttendanceSummary = useCallback(async (isRefresh = false) => {
    if (!supervisorId) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // TODO: Replace with actual API call when backend endpoint is implemented (Task 6.2)
      // For now, using mock data that demonstrates all required features
      console.warn('API not ready, using mock attendance summary data');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 600));

      // Mock data with comprehensive attendance scenarios
      const mockAttendanceRecords = [
        {
          workerId: '1',
          workerName: 'John Tan Wei Ming',
          checkInTime: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          checkOutTime: null,
          locationStatus: 'inside',
          currentActivity: 'Foundation work - Block A',
          isLate: false,
          isOvertime: false,
          overtimeDuration: 0,
          geofenceViolations: 0,
          avatar: null
        },
        {
          workerId: '2',
          workerName: 'Ahmad Rahman',
          checkInTime: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
          checkOutTime: null,
          locationStatus: 'inside',
          currentActivity: 'Steel reinforcement',
          isLate: true, // Late check-in
          isOvertime: false,
          overtimeDuration: 0,
          geofenceViolations: 0,
          avatar: null
        },
        {
          workerId: '3',
          workerName: 'Li Wei Chen',
          checkInTime: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10 hours ago
          checkOutTime: null,
          locationStatus: 'inside',
          currentActivity: 'Concrete pouring',
          isLate: false,
          isOvertime: true, // Overtime worker
          overtimeDuration: 2.5, // 2.5 hours overtime
          geofenceViolations: 0,
          avatar: null
        },
        {
          workerId: '4',
          workerName: 'Raj Kumar',
          checkInTime: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          checkOutTime: null,
          locationStatus: 'outside', // Geofence violation
          currentActivity: 'Material transport',
          isLate: false,
          isOvertime: false,
          overtimeDuration: 0,
          geofenceViolations: 2,
          avatar: null
        },
        {
          workerId: '5',
          workerName: 'David Lim',
          checkInTime: new Date(Date.now() - 9 * 60 * 60 * 1000), // 9 hours ago
          checkOutTime: null, // Missing logout - should be flagged
          locationStatus: 'unknown',
          currentActivity: 'Equipment maintenance',
          isLate: false,
          isOvertime: true,
          overtimeDuration: 1.0,
          geofenceViolations: 0,
          avatar: null
        },
        {
          workerId: '6',
          workerName: 'Maria Santos',
          checkInTime: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
          checkOutTime: null,
          locationStatus: 'inside',
          currentActivity: 'Quality inspection',
          isLate: true,
          isOvertime: false,
          overtimeDuration: 0,
          geofenceViolations: 0,
          avatar: null
        },
        {
          workerId: '7',
          workerName: 'Hassan Ali',
          checkInTime: new Date(Date.now() - 11 * 60 * 60 * 1000), // 11 hours ago
          checkOutTime: null,
          locationStatus: 'outside',
          currentActivity: 'Site survey',
          isLate: false,
          isOvertime: true,
          overtimeDuration: 3.0, // Heavy overtime
          geofenceViolations: 1,
          avatar: null
        },
        {
          workerId: '8',
          workerName: 'Jennifer Wong',
          checkInTime: new Date(Date.now() - 4.5 * 60 * 60 * 1000), // 4.5 hours ago
          checkOutTime: null,
          locationStatus: 'inside',
          currentActivity: 'Documentation',
          isLate: false,
          isOvertime: false,
          overtimeDuration: 0,
          geofenceViolations: 0,
          avatar: null
        }
      ];

      setAttendanceRecords(mockAttendanceRecords);
      setLastUpdated(new Date());
      
      if (isRefresh) {
        message.success('Attendance summary refreshed');
      }

      // Log for monitoring
      if (appConfig.features.enableDebug) {
        console.log('Attendance summary updated:', mockAttendanceRecords.length, 'workers');
      }

    } catch (err) {
      console.error('Failed to fetch attendance summary:', err);
      setError(err.message || 'Failed to load attendance summary');
      message.error('Failed to load attendance summary');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supervisorId]);

  // Initial load
  useEffect(() => {
    fetchAttendanceSummary();
  }, [fetchAttendanceSummary]);

  // Auto-refresh interval
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(() => {
      fetchAttendanceSummary(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchAttendanceSummary, refreshInterval]);

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    fetchAttendanceSummary(true);
  }, [fetchAttendanceSummary]);

  // Handle worker selection
  const handleWorkerSelect = useCallback((worker) => {
    if (onWorkerSelect) {
      onWorkerSelect(worker.workerId);
    }
  }, [onWorkerSelect]);

  // Get status indicators and colors
  const getStatusIndicators = useCallback((worker) => {
    const indicators = [];
    
    // Late check-in indicator
    if (worker.isLate) {
      indicators.push({
        type: 'late',
        icon: <ClockCircleOutlined className="text-orange-500" />,
        color: 'orange',
        text: 'Late',
        priority: 2
      });
    }
    
    // Overtime indicator
    if (worker.isOvertime) {
      indicators.push({
        type: 'overtime',
        icon: <FireOutlined className="text-purple-600" />,
        color: 'purple',
        text: `OT: ${worker.overtimeDuration}h`,
        priority: 3
      });
    }
    
    // Geofence violation indicator
    if (worker.locationStatus === 'outside' || worker.geofenceViolations > 0) {
      indicators.push({
        type: 'geofence',
        icon: <EnvironmentOutlined className="text-red-500" />,
        color: 'red',
        text: 'Outside Zone',
        priority: 4
      });
    }
    
    // Missing logout detection (after 8 hours)
    const workHours = worker.checkInTime ? 
      (Date.now() - worker.checkInTime.getTime()) / (1000 * 60 * 60) : 0;
    if (workHours > 8 && !worker.checkOutTime) {
      indicators.push({
        type: 'missing_logout',
        icon: <WarningOutlined className="text-red-600" />,
        color: 'red',
        text: 'Missing Logout',
        priority: 5
      });
    }
    
    // Present indicator (default)
    if (indicators.length === 0) {
      indicators.push({
        type: 'present',
        icon: <CheckCircleOutlined className="text-green-500" />,
        color: 'green',
        text: 'Present',
        priority: 1
      });
    }
    
    // Sort by priority (highest first)
    return indicators.sort((a, b) => b.priority - a.priority);
  }, []);

  // Get location status display
  const getLocationStatus = useCallback((locationStatus) => {
    switch (locationStatus) {
      case 'inside':
        return { color: 'green', text: 'Inside Geofence' };
      case 'outside':
        return { color: 'red', text: 'Outside Geofence' };
      case 'unknown':
        return { color: 'orange', text: 'Location Unknown' };
      default:
        return { color: 'default', text: 'No Data' };
    }
  }, []);

  // Format time display
  const formatTime = useCallback((date) => {
    if (!date) return '-';
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  }, []);

  // Calculate work duration
  const getWorkDuration = useCallback((checkInTime) => {
    if (!checkInTime) return '-';
    const hours = (Date.now() - checkInTime.getTime()) / (1000 * 60 * 60);
    return `${Math.floor(hours)}h ${Math.floor((hours % 1) * 60)}m`;
  }, []);

  // Memoized filtered and sorted workers
  const processedWorkers = useMemo(() => {
    return attendanceRecords
      .map(worker => ({
        ...worker,
        indicators: getStatusIndicators(worker),
        locationDisplay: getLocationStatus(worker.locationStatus),
        workDuration: getWorkDuration(worker.checkInTime)
      }))
      .sort((a, b) => {
        // Sort by priority: overtime > geofence violations > late > present
        const aPriority = Math.max(...a.indicators.map(i => i.priority));
        const bPriority = Math.max(...b.indicators.map(i => i.priority));
        return bPriority - aPriority;
      });
  }, [attendanceRecords, getStatusIndicators, getLocationStatus, getWorkDuration]);

  // Virtual list item renderer
  const WorkerItem = useCallback(({ index, style }) => {
    const worker = processedWorkers[index];
    const primaryIndicator = worker.indicators[0];
    
    return (
      <div style={style}>
        <div
          className="mx-2 mb-2 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150"
          onClick={() => handleWorkerSelect(worker)}
          style={{ 
            minHeight: '44px', // Touch-friendly minimum size
            touchAction: 'manipulation'
          }}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleWorkerSelect(worker);
            }
          }}
          aria-label={`View details for ${worker.workerName}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              {/* Worker Avatar */}
              <Avatar 
                size={40}
                icon={<UserOutlined />}
                className="flex-shrink-0 bg-blue-500"
              >
                {worker.workerName.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </Avatar>
              
              <div className="flex-1 min-w-0">
                {/* Worker Name */}
                <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                  {worker.workerName}
                </h4>
                
                {/* Check-in Time */}
                <div className="flex items-center text-xs text-gray-600 mb-1">
                  <ClockCircleOutlined className="mr-1 text-gray-400 flex-shrink-0" />
                  <span>In: {formatTime(worker.checkInTime)}</span>
                  <span className="mx-2">•</span>
                  <span>{worker.workDuration}</span>
                </div>
                
                {/* Current Activity */}
                <div className="text-xs text-gray-500 truncate mb-2">
                  {worker.currentActivity}
                </div>
                
                {/* Location Status */}
                <div className="flex items-center">
                  <EnvironmentOutlined 
                    className={`mr-1 text-xs ${
                      worker.locationDisplay.color === 'green' ? 'text-green-500' :
                      worker.locationDisplay.color === 'red' ? 'text-red-500' :
                      'text-orange-500'
                    }`}
                  />
                  <span className={`text-xs ${
                    worker.locationDisplay.color === 'green' ? 'text-green-600' :
                    worker.locationDisplay.color === 'red' ? 'text-red-600' :
                    'text-orange-600'
                  }`}>
                    {worker.locationDisplay.text}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end ml-3 space-y-1">
              {/* Primary Status Indicator */}
              <Tag 
                color={primaryIndicator.color}
                className="text-xs px-2 py-1 mb-1"
              >
                {primaryIndicator.icon}
                <span className="ml-1">{primaryIndicator.text}</span>
              </Tag>
              
              {/* Additional Indicators */}
              {worker.indicators.slice(1, 3).map((indicator, idx) => (
                <Tooltip key={idx} title={indicator.text}>
                  <Badge 
                    count={indicator.icon}
                    style={{ 
                      backgroundColor: 
                        indicator.color === 'red' ? '#ff4d4f' :
                        indicator.color === 'orange' ? '#faad14' :
                        indicator.color === 'purple' ? '#722ed1' :
                        '#52c41a'
                    }}
                    className="text-xs"
                  />
                </Tooltip>
              ))}
              
              {/* View Details Icon */}
              <EyeOutlined className="text-gray-400 text-xs mt-1" />
            </div>
          </div>
        </div>
      </div>
    );
  }, [processedWorkers, handleWorkerSelect, formatTime]);

  // Render error state
  if (error && !loading) {
    return (
      <Card 
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <TeamOutlined className="mr-2 text-blue-500" />
              <span>Attendance Summary</span>
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
          <TeamOutlined className="text-4xl mb-2 text-red-300" />
          <p className="text-red-600 mb-2">Failed to load attendance summary</p>
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
  if (!loading && processedWorkers.length === 0 && !error) {
    return (
      <Card 
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <TeamOutlined className="mr-2 text-blue-500" />
              <span>Attendance Summary</span>
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
          image={<TeamOutlined className="text-4xl text-gray-300" />}
          description={
            <div className="text-center">
              <p className="text-gray-500 mb-2">No attendance records found</p>
              <p className="text-sm text-gray-400">
                Workers will appear here once they check in
              </p>
            </div>
          }
        />
      </Card>
    );
  }

  return (
    <Card 
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <TeamOutlined className="mr-2 text-blue-500" />
            <span>Attendance Summary</span>
            {processedWorkers.length > 0 && (
              <Badge 
                count={processedWorkers.length} 
                className="ml-2"
                style={{ backgroundColor: '#1890ff' }}
              />
            )}
          </div>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={refreshing}
            className="flex items-center justify-center w-10 h-10"
            title="Refresh attendance summary"
          />
        </div>
      }
      className={`shadow-sm ${className}`}
      loading={loading}
    >
      {/* Summary Statistics */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-lg font-semibold text-green-600">
              {processedWorkers.filter(w => !w.isLate && !w.isOvertime && w.locationStatus === 'inside').length}
            </div>
            <div className="text-xs text-gray-500">Present</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-orange-600">
              {processedWorkers.filter(w => w.isLate).length}
            </div>
            <div className="text-xs text-gray-500">Late</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-purple-600">
              {processedWorkers.filter(w => w.isOvertime).length}
            </div>
            <div className="text-xs text-gray-500">Overtime</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-red-600">
              {processedWorkers.filter(w => w.locationStatus === 'outside' || w.geofenceViolations > 0).length}
            </div>
            <div className="text-xs text-gray-500">Violations</div>
          </div>
        </div>
      </div>

      {/* Virtual Scrollable Worker List */}
      <div className="border border-gray-200 rounded-lg">
        <List
          height={maxHeight}
          itemCount={processedWorkers.length}
          itemSize={120} // Height per item
          className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        >
          {WorkerItem}
        </List>
      </div>

      {/* Last Updated Info */}
      {lastUpdated && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      )}
    </Card>
  );
};

export default AttendanceSummary;
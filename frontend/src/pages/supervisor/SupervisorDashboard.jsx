import React, { useEffect, useState } from 'react';
import { Card, Badge, Button, Spin, message, Alert, Row, Col } from 'antd';
import {
  ReloadOutlined,
  ProjectOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  BellOutlined,
  WifiOutlined,
  DisconnectOutlined
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { tokenService } from '../../services';
import AssignedProjects from '../../components/supervisor/AssignedProjects';
import WorkforceCount from '../../components/supervisor/WorkforceCount';
import PendingApprovals from '../../components/supervisor/PendingApprovals';
import AlertsNotifications from '../../components/supervisor/AlertsNotifications';

const SupervisorDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  // Dashboard state - placeholder data for now
  const [dashboardData, setDashboardData] = useState({
    projects: [],
    workforceCount: {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      onLeave: 0,
      overtime: 0
    },
    attendanceRecords: [],
    pendingApprovals: 0,
    alerts: []
  });

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Authentication check
  useEffect(() => {
    if (!isAuthenticated || !user) {
      message.error('Authentication required');
      return;
    }

    // Get user role from token (more reliable) or user object
    const tokenUser = tokenService.getUserFromToken();
    const userRole = tokenUser?.role || user?.role || user?.company?.role;
    
    // Verify supervisor role (handle both uppercase and lowercase)
    if (userRole?.toLowerCase() !== 'supervisor') {
      message.error('Supervisor access required');
      return;
    }

    // Load dashboard data
    loadDashboardData();
  }, [isAuthenticated, user]);

  const loadDashboardData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Get supervisor ID from user data
      const supervisorId = user.id || user.employeeId;
      
      // Fetch real dashboard data from API
      const response = await fetch(`http://localhost:5001/api/supervisor/${supervisorId}/dashboard`, {
        headers: {
          'Authorization': `Bearer ${tokenService.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch dashboard data');
      }

      // Transform projects data to match AssignedProjects component format
      const transformedProjects = (result.data.projects || []).map(project => ({
        projectId: project.id || project.projectId,
        projectName: project.projectName || project.name || 'Unnamed Project',
        siteLocation: {
          address: project.address || project.location || 'No address',
          coordinates: [project.longitude || 0, project.latitude || 0]
        },
        status: project.status === 'ongoing' ? 'active' : 
                project.status === 'on_hold' ? 'paused' : 
                project.status === 'completed' ? 'completed' :
                project.status?.toLowerCase() || 'active',
        workerCount: project.workerCount || 0,
        lastUpdated: new Date()
      }));

      // Update dashboard state with real data
      setDashboardData({
        projects: transformedProjects,
        workforceCount: result.data.workforceCount || {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          onLeave: 0,
          overtime: 0
        },
        attendanceRecords: result.data.attendanceRecords || [],
        pendingApprovals: result.data.pendingApprovals?.total || result.data.pendingApprovals?.items || result.data.pendingApprovals || 0,
        alerts: result.data.alerts || result.data.alerts?.items || result.data.alerts?.alerts || []
      });
      
      // Debug logging to see what we're getting
      console.log('Dashboard API Response:', {
        projects: result.data.projects?.length || 0,
        alerts: result.data.alerts?.length || 0,
        pendingApprovals: result.data.pendingApprovals,
        rawProjects: result.data.projects
      });
      
      console.log('Transformed Projects:', transformedProjects);
      
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      message.error(`Failed to load dashboard data: ${error.message}`);
      
      // Keep existing data on error, don't reset to empty
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const handleProjectTap = (projectId) => {
    // TODO: Navigate to project details - will be implemented in later tasks
    message.info(`Navigate to project ${projectId}`);
  };

  // Handle approval actions
  const handleApproval = async (item, remarks) => {
    try {
      console.log('Approving item:', item, 'with remarks:', remarks);
      message.success('Item approved successfully');
      // Refresh dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to approve item:', error);
      message.error('Failed to approve item');
    }
  };

  const handleRejection = async (item, remarks) => {
    try {
      console.log('Rejecting item:', item, 'with remarks:', remarks);
      message.success('Item rejected successfully');
      // Refresh dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to reject item:', error);
      message.error('Failed to reject item');
    }
  };

  // Handle alert acknowledgment
  const handleAlertAcknowledge = async (alert) => {
    try {
      console.log('Acknowledging alert:', alert);
      message.success('Alert acknowledged');
      // Refresh dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      message.error('Failed to acknowledge alert');
    }
  };

  // Handle quick actions for mobile
  const handleQuickAction = (action) => {
    switch (action) {
      case 'workforce':
        // Scroll to workforce section or open modal
        document.querySelector('.workforce-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'alerts':
        // Scroll to alerts section or open modal
        document.querySelector('.alerts-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
      default:
        break;
    }
  };

  const handleApprovalsTap = () => {
    // TODO: Navigate to approvals page - will be implemented in later tasks
    message.info('Navigate to pending approvals');
  };

  const handleAlertTap = async (alertId) => {
    try {
      const supervisorId = user.id || user.employeeId;
      
      // Call backend API to acknowledge the alert
      const response = await fetch(`http://localhost:5001/api/supervisor/alert/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenService.getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          supervisorId: supervisorId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to acknowledge alert: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        message.success('Alert acknowledged successfully');
        
        // Refresh dashboard data to update alert status
        await loadDashboardData();
      } else {
        throw new Error(result.message || 'Failed to acknowledge alert');
      }
      
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      message.error(`Failed to acknowledge alert: ${error.message}`);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
            <p className="text-gray-600">Please log in to access the supervisor dashboard.</p>
          </div>
        </Card>
      </div>
    );
  }

  // Get user role from multiple possible locations
  const getUserRole = () => {
    const tokenUser = tokenService.getUserFromToken();
    return tokenUser?.role || user?.role || user?.company?.role;
  };

  if (getUserRole()?.toLowerCase() !== 'supervisor') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
            <p className="text-gray-600">Supervisor access required to view this dashboard.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Welcome, {user.name || 'Supervisor'}</p>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* Online/Offline Indicator */}
              <div className="flex items-center">
                {isOnline ? (
                  <WifiOutlined className="text-green-500 text-lg" />
                ) : (
                  <DisconnectOutlined className="text-red-500 text-lg" />
                )}
              </div>
              
              {/* Refresh Button */}
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
                className="flex items-center justify-center w-10 h-10 min-h-[44px] touch-manipulation"
                size="large"
              />
            </div>
          </div>
          
          {/* Offline Indicator */}
          {!isOnline && (
            <Alert
              message="Working Offline"
              description="Some features may be limited. Data will sync when connection is restored."
              type="warning"
              showIcon
              className="mt-2"
              closable
            />
          )}
        </div>
      </div>

      {/* Dashboard Content - Mobile Optimized Grid with Scrolling */}
      <div className="px-3 sm:px-4 py-4 pb-20 sm:pb-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spin size="large" />
          </div>
        ) : (
          <div className="space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto">
            {/* Top Row - Assigned Projects (Full Width on Mobile) */}
            <div className="w-full">
              <AssignedProjects 
                supervisorId={user?.id}
                projects={dashboardData.projects}
                loading={loading}
                lastUpdated={lastSyncTime}
                onProjectSelect={handleProjectTap}
                onRefresh={handleRefresh}
                className="mobile-optimized-card"
              />
            </div>

            {/* Second Row - Workforce and Approvals (Responsive Grid) */}
            <Row gutter={[12, 16]} className="w-full">
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <div className="workforce-section">
                  <WorkforceCount 
                    supervisorId={user?.id}
                    date={new Date()}
                    autoRefresh={true}
                    refreshInterval={30000}
                    className="mobile-optimized-card h-full"
                  />
                </div>
              </Col>
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <PendingApprovals 
                  supervisorId={user?.id}
                  items={dashboardData.pendingApprovals || []}
                  onApprove={handleApproval}
                  onReject={handleRejection}
                  refreshInterval={30000}
                  className="mobile-optimized-card h-full"
                />
              </Col>
            </Row>

            {/* Third Row - Alerts (Full Width with Scrolling) */}
            <div className="w-full alerts-section">
              <AlertsNotifications 
                supervisorId={user?.id}
                alerts={dashboardData.alerts || []}
                onAlertAcknowledge={handleAlertAcknowledge}
                maxDisplayCount={10}
                refreshInterval={15000}
                className="mobile-optimized-card"
              />
            </div>

            {/* Last Updated Indicator */}
            <div className="text-center py-2">
              <p className="text-xs text-gray-400">
                Last updated: {lastSyncTime.toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions - Mobile Floating Action Buttons */}
      <div className="fixed bottom-4 right-4 z-20 sm:hidden">
        <div className="flex flex-col space-y-2">
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={<TeamOutlined className="text-lg" />}
            onClick={() => handleQuickAction('workforce')}
            className="w-14 h-14 shadow-lg touch-manipulation flex items-center justify-center"
            title="View Workforce"
          />
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={<BellOutlined className="text-lg" />}
            onClick={() => handleQuickAction('alerts')}
            className="w-14 h-14 shadow-lg touch-manipulation flex items-center justify-center"
            title="View Alerts"
          />
        </div>
      </div>

      {/* Mobile-specific styles */}
      <style jsx>{`
        .mobile-optimized-card {
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
        }
        
        .mobile-optimized-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .mobile-optimized-card .ant-card-head {
          padding: 12px 16px;
          min-height: 48px;
        }
        
        .mobile-optimized-card .ant-card-body {
          padding: 16px;
        }
        
        /* Scrollable dashboard content */
        .dashboard-scroll-container {
          max-height: calc(100vh - 120px);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 80px; /* Space for floating buttons */
        }
        
        .dashboard-scroll-container::-webkit-scrollbar {
          width: 4px;
        }
        
        .dashboard-scroll-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 2px;
        }
        
        .dashboard-scroll-container::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 2px;
        }
        
        .dashboard-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        /* Floating action buttons */
        .floating-actions {
          position: fixed;
          bottom: 16px;
          right: 16px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .floating-btn {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          transition: all 0.2s ease;
        }
        
        .floating-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
        
        .floating-btn:active {
          transform: translateY(0);
        }
        
        @media (max-width: 576px) {
          .mobile-optimized-card .ant-card-head {
            padding: 8px 12px;
            min-height: 44px;
          }
          
          .mobile-optimized-card .ant-card-body {
            padding: 12px;
          }
          
          .dashboard-scroll-container {
            max-height: calc(100vh - 100px);
            padding-bottom: 100px;
          }
          
          .floating-actions {
            bottom: 12px;
            right: 12px;
            gap: 8px;
          }
          
          .floating-btn {
            width: 48px;
            height: 48px;
            font-size: 18px;
          }
        }
        
        /* High contrast mode */
        @media (prefers-contrast: high) {
          .mobile-optimized-card {
            border-width: 2px;
          }
          
          .floating-btn {
            border: 2px solid currentColor;
          }
        }
        
        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .mobile-optimized-card,
          .floating-btn {
            transition: none;
            transform: none;
          }
        }
        
        .touch-manipulation {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }
        
        /* Ensure icons are properly sized and clickable */
        .ant-btn .anticon {
          font-size: inherit;
          line-height: 1;
        }
        
        /* Better button touch targets */
        .ant-btn {
          min-height: 44px;
          min-width: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }
        
        /* Focus styles for accessibility */
        .floating-btn:focus,
        .mobile-optimized-card:focus {
          outline: 2px solid #1890ff;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
};

export default SupervisorDashboard;

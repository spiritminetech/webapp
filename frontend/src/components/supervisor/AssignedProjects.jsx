import React, { useState, useEffect, useCallback } from 'react';
import { Card, Badge, Button, Spin, message, Empty } from 'antd';
import {
  ProjectOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  ReloadOutlined,
  RightOutlined
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { projectService, tokenService } from '../../services';
import appConfig from '../../config/app.config.js';

/**
 * AssignedProjects Component
 * 
 * Displays all projects assigned to the supervisor with:
 * - Project name, location, status, and worker count
 * - Tap-to-navigate functionality with 2-second response requirement
 * - Pull-to-refresh mechanism
 * - Mobile-first responsive design
 * 
 * Requirements: 1.1, 1.2, 1.3
 */
const AssignedProjects = ({ 
  supervisorId, // Keep for backward compatibility
  projects: externalProjects = [],
  loading: externalLoading = false,
  onProjectSelect, 
  onRefresh,
  lastUpdated: externalLastUpdated,
  refreshInterval = 30000,
  className = '' 
}) => {
  const { user } = useAuth();
  const [internalProjects, setInternalProjects] = useState([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [internalLastUpdated, setInternalLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  // Use external projects if provided, otherwise use internal state
  const projects = externalProjects.length > 0 ? externalProjects : internalProjects;
  const loading = externalLoading || internalLoading;
  const lastUpdated = externalLastUpdated || internalLastUpdated || new Date();

  // Fetch projects data (only used when no external projects provided)
  const fetchProjects = useCallback(async (isRefresh = false) => {
    // Skip fetching if external projects are provided
    if (externalProjects.length > 0) return;
    if (!supervisorId) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setInternalLoading(true);
      }
      setError(null);

      // Use ProjectService to fetch assigned projects
      try {
        const response = await fetch(`${appConfig.api.baseURL}/api/supervisor/${supervisorId}/projects`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tokenService.getToken()}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch projects: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch projects');
        }

        // Transform projects to match expected format
        const transformedProjects = (data.data || []).map(project => ({
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

        setInternalProjects(transformedProjects);
        setInternalLastUpdated(new Date());
        
        if (isRefresh) {
          message.success('Projects refreshed');
        }

        // Log for monitoring
        if (appConfig.features.enableDebug) {
          console.log(`Loaded ${transformedProjects.length} projects for supervisor ${supervisorId}`);
          console.log('Projects data:', transformedProjects);
        }
      } catch (apiError) {
        console.error('API Error:', apiError);
        throw apiError; // Re-throw to be caught by outer try-catch
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError(err.message || 'Failed to load projects');
      message.error('Failed to load projects');
    } finally {
      setInternalLoading(false);
      setRefreshing(false);
    }
  }, [supervisorId, externalProjects.length]);

  // Initial load (only if no external projects)
  useEffect(() => {
    if (externalProjects.length === 0) {
      fetchProjects();
    }
  }, [fetchProjects, externalProjects.length]);

  // Auto-refresh interval (only if no external projects and refreshInterval provided)
  useEffect(() => {
    if (!refreshInterval || externalProjects.length > 0) return;

    const interval = setInterval(() => {
      fetchProjects(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchProjects, refreshInterval, externalProjects.length]);

  // Handle project selection with 2-second response requirement
  const handleProjectTap = useCallback((project) => {
    const startTime = Date.now();
    
    try {
      if (onProjectSelect) {
        onProjectSelect(project.projectId);
      }
      
      // Log response time for monitoring
      const responseTime = Date.now() - startTime;
      if (appConfig.features.enableDebug) {
        console.log(`Project tap response time: ${responseTime}ms`);
      }
      
      // Warn if response time exceeds 2 seconds
      if (responseTime > 2000) {
        console.warn(`Project navigation exceeded 2-second requirement: ${responseTime}ms`);
      }
    } catch (err) {
      console.error('Project navigation failed:', err);
      message.error('Failed to navigate to project');
    }
  }, [onProjectSelect]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh(); // Use parent's refresh handler
    } else {
      fetchProjects(true); // Fallback to internal refresh
    }
  }, [onRefresh]);

  // Get status color and text
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'active':
        return { color: 'processing', text: 'Active' };
      case 'paused':
        return { color: 'warning', text: 'Paused' };
      case 'completed':
        return { color: 'success', text: 'Completed' };
      default:
        return { color: 'default', text: status };
    }
  };

  // Render empty state
  if (!loading && projects.length === 0 && !error) {
    return (
      <Card 
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ProjectOutlined className="mr-2 text-blue-500" />
              <span>Assigned Projects</span>
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
          image={<ProjectOutlined className="text-4xl text-gray-300" />}
          description={
            <div className="text-center">
              <p className="text-gray-500 mb-2">No assigned projects</p>
              <p className="text-sm text-gray-400">
                Contact your administrator for project assignments
              </p>
            </div>
          }
        />
      </Card>
    );
  }

  // Render error state
  if (error && !loading) {
    return (
      <Card 
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ProjectOutlined className="mr-2 text-blue-500" />
              <span>Assigned Projects</span>
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
          <ProjectOutlined className="text-4xl mb-2 text-red-300" />
          <p className="text-red-600 mb-2">Failed to load projects</p>
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

  return (
    <Card 
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0 flex-1">
            <ProjectOutlined className="mr-2 text-blue-500 flex-shrink-0" />
            <span className="text-sm sm:text-base font-medium truncate">Assigned Projects</span>
            {projects.length > 0 && (
              <Badge 
                count={projects.length} 
                className="ml-2 flex-shrink-0"
                style={{ backgroundColor: '#1890ff' }}
              />
            )}
          </div>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={refreshing}
            className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 min-h-[44px] touch-manipulation flex-shrink-0"
            title="Pull to refresh"
            size="small"
          />
        </div>
      }
      className={`shadow-sm mobile-optimized-card ${className}`}
      loading={loading}
    >
      <div className="space-y-2 sm:space-y-3">
        {projects.map((project) => {
          const statusDisplay = getStatusDisplay(project.status);
          
          return (
            <div
              key={project.projectId}
              className="border border-gray-200 rounded-lg p-3 sm:p-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 touch-manipulation"
              onClick={() => handleProjectTap(project)}
              style={{ 
                minHeight: '72px', // Increased for better touch target
                touchAction: 'manipulation'
              }}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleProjectTap(project);
                }
              }}
              aria-label={`Navigate to ${project.projectName}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0 pr-3">
                  {/* Project Name */}
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-1 truncate leading-tight">
                    {project.projectName}
                  </h3>
                  
                  {/* Location */}
                  <div className="flex items-start text-xs sm:text-sm text-gray-600 mb-2">
                    <EnvironmentOutlined className="mr-1 mt-0.5 text-gray-400 flex-shrink-0 text-xs" />
                    <span className="line-clamp-2 leading-tight">{project.siteLocation.address}</span>
                  </div>
                  
                  {/* Bottom Row - Worker Count and Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <TeamOutlined className="mr-1 text-gray-400 flex-shrink-0 text-xs" />
                      <span>{project.workerCount} workers</span>
                    </div>
                    
                    {/* Status Badge - Mobile Optimized */}
                    <Badge 
                      status={statusDisplay.color} 
                      text={
                        <span className="text-xs sm:text-sm font-medium">
                          {statusDisplay.text}
                        </span>
                      }
                      className="flex-shrink-0"
                    />
                  </div>
                </div>
                
                {/* Navigation Arrow */}
                <div className="flex items-center justify-center w-6 h-6 flex-shrink-0">
                  <RightOutlined className="text-gray-400 text-xs" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Last Updated Info */}
      {lastUpdated && (
        <div className="mt-3 sm:mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      )}

      {/* Mobile-specific styles */}
      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .touch-manipulation {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }
        
        .mobile-optimized-card .ant-card-head {
          padding: 12px 16px;
          min-height: 48px;
        }
        
        .mobile-optimized-card .ant-card-body {
          padding: 16px;
        }
        
        @media (max-width: 576px) {
          .mobile-optimized-card .ant-card-head {
            padding: 8px 12px;
          }
          
          .mobile-optimized-card .ant-card-body {
            padding: 12px;
          }
        }
      `}</style>
    </Card>
  );
};

export default AssignedProjects;
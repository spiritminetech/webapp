import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, Button, Spin, message, Progress, Tag, Avatar, Modal } from 'antd';
import { 
  PhoneOutlined, 
  EnvironmentOutlined, 
  ClockCircleOutlined,
  PlayCircleOutlined,
  CameraOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  WifiOutlined,
  DisconnectOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
  UserOutlined,
  CheckCircleOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import WorkerMobileApiService from '../../services/WorkerMobileApiService';
import ProjectHeader from '../../components/ProjectHeader';
import './TaskDetailsScreen.css';

const TaskDetailsScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [taskData, setTaskData] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Determine current view mode based on route
  const currentView = useMemo(() => {
    const path = location.pathname;
    console.log('TaskDetailsScreen: Current path:', path);
    
    if (path.includes('/start')) return 'start';
    if (path.includes('/progress')) return 'progress';
    if (path.includes('/photo')) return 'photo';
    if (path.includes('/issue')) return 'issue';
    if (path.includes('/details')) return 'details';
    
    console.log('TaskDetailsScreen: Defaulting to list view');
    return 'list';
  }, [location.pathname]);
  
  // Get task ID from params if available
  const taskId = params.taskId;
  
  // Pull-to-refresh state
  const [pullToRefreshState, setPullToRefreshState] = useState({
    isPulling: false,
    pullDistance: 0,
    canRefresh: false,
    isRefreshing: false
  });
  
  // Refs for pull-to-refresh
  const containerRef = useRef(null);
  const startTouchY = useRef(0);
  const currentTouchY = useRef(0);
  const pullThreshold = 80; // Distance needed to trigger refresh
  const maxPullDistance = 120; // Maximum pull distance

  // Navigation handlers
  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/worker/tasks');
    }
  };

  const handleGoHome = () => {
    navigate('/worker/tasks');
  };

  const handleTaskAction = (task, action) => {
    // Prevent actions if offline for certain operations
    if (!isOnline && ['start', 'progress'].includes(action)) {
      message.warning('This action requires an internet connection');
      return;
    }

    switch (action) {
      case 'start':
        // Navigate to task start confirmation or geofence validation
        navigate(`/worker/task/${task.assignmentId}/start`, { 
          state: { task, returnTo: location.pathname } 
        });
        break;
      case 'continue':
        // Navigate to progress update screen
        navigate(`/worker/task/${task.assignmentId}/progress`, { 
          state: { task, returnTo: location.pathname } 
        });
        break;
      case 'photo':
        // Navigate to photo upload screen
        navigate(`/worker/task/${task.assignmentId}/photo`, { 
          state: { task, returnTo: location.pathname } 
        });
        break;
      case 'issue':
        // Navigate to issue reporting screen
        navigate(`/worker/task/${task.assignmentId}/issue`, { 
          state: { task, returnTo: location.pathname } 
        });
        break;
      case 'details':
        // Navigate to detailed task view
        navigate(`/worker/task/${task.assignmentId}/details`, { 
          state: { task, returnTo: location.pathname } 
        });
        break;
      default:
        console.warn('Unknown task action:', action);
    }
  };

  const handleContactSupervisor = (supervisor) => {
    // Show options for contacting supervisor
    const contactOptions = [
      {
        label: 'Call',
        action: () => window.open(`tel:${supervisor.phone}`, '_self')
      },
      {
        label: 'SMS',
        action: () => window.open(`sms:${supervisor.phone}`, '_self')
      },
      {
        label: 'Email',
        action: () => window.open(`mailto:${supervisor.email}`, '_self')
      }
    ];
    
    // For now, just call directly
    window.open(`tel:${supervisor.phone}`, '_self');
  };

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

  // Fetch today's tasks
  const fetchTasks = async (showErrorMessage = true) => {
    try {
      setLoading(true);
      setError(null);
      const response = await WorkerMobileApiService.getTodaysTasks();
      setTaskData(response.data);
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error('Error fetching tasks:', error);
      
      // Determine error type and set appropriate error state
      let errorInfo = {
        type: 'network',
        message: 'Failed to load tasks',
        details: error.message,
        canRetry: true
      };

      if (error.message.includes('timeout')) {
        errorInfo = {
          type: 'timeout',
          message: 'Request timed out',
          details: 'The server took too long to respond. Please check your connection and try again.',
          canRetry: true
        };
      } else if (error.message.includes('Network Error') || error.message.includes('fetch')) {
        errorInfo = {
          type: 'network',
          message: 'Network connection error',
          details: 'Unable to connect to the server. Please check your internet connection.',
          canRetry: true
        };
      } else if (error.response?.status === 401) {
        errorInfo = {
          type: 'auth',
          message: 'Authentication required',
          details: 'Your session has expired. Please log in again.',
          canRetry: false
        };
      } else if (error.response?.status === 403) {
        errorInfo = {
          type: 'permission',
          message: 'Access denied',
          details: 'You do not have permission to view these tasks.',
          canRetry: false
        };
      } else if (error.response?.status >= 500) {
        errorInfo = {
          type: 'server',
          message: 'Server error',
          details: 'The server is experiencing issues. Please try again later.',
          canRetry: true
        };
      } else if (error.message.includes('No task data available offline')) {
        errorInfo = {
          type: 'offline',
          message: 'No offline data available',
          details: 'You are offline and no cached task data is available. Please connect to the internet.',
          canRetry: true
        };
      }

      setError(errorInfo);
      
      if (showErrorMessage) {
        message.error(errorInfo.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Pull to refresh functionality
  const handleRefresh = async () => {
    setRefreshing(true);
    setPullToRefreshState(prev => ({ ...prev, isRefreshing: true }));
    
    try {
      await fetchTasks(false); // Don't show error message for refresh
      if (!error) {
        message.success('Tasks refreshed');
      }
    } catch (refreshError) {
      // Error is already handled in fetchTasks
      console.error('Refresh error:', refreshError);
    } finally {
      setRefreshing(false);
      setPullToRefreshState({
        isPulling: false,
        pullDistance: 0,
        canRefresh: false,
        isRefreshing: false
      });
    }
  };

  // Retry functionality with exponential backoff
  const handleRetry = async () => {
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);
    
    // Add delay for retries to prevent spam
    if (newRetryCount > 1) {
      const delay = Math.min(1000 * Math.pow(2, newRetryCount - 2), 10000); // Max 10 seconds
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    await fetchTasks();
  };

  // Touch event handlers for pull-to-refresh
  const handleTouchStart = useCallback((e) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startTouchY.current = e.touches[0].clientY;
      setPullToRefreshState(prev => ({ ...prev, isPulling: true }));
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!pullToRefreshState.isPulling || pullToRefreshState.isRefreshing) return;
    
    currentTouchY.current = e.touches[0].clientY;
    const pullDistance = Math.max(0, currentTouchY.current - startTouchY.current);
    
    if (pullDistance > 0 && containerRef.current && containerRef.current.scrollTop === 0) {
      // Prevent default scrolling when pulling down
      e.preventDefault();
      
      const normalizedDistance = Math.min(pullDistance * 0.5, maxPullDistance);
      const canRefresh = normalizedDistance >= pullThreshold;
      
      setPullToRefreshState(prev => ({
        ...prev,
        pullDistance: normalizedDistance,
        canRefresh
      }));
    }
  }, [pullToRefreshState.isPulling, pullToRefreshState.isRefreshing, pullThreshold, maxPullDistance]);

  const handleTouchEnd = useCallback(() => {
    if (pullToRefreshState.canRefresh && !pullToRefreshState.isRefreshing) {
      handleRefresh();
    } else {
      setPullToRefreshState({
        isPulling: false,
        pullDistance: 0,
        canRefresh: false,
        isRefreshing: false
      });
    }
  }, [pullToRefreshState.canRefresh, pullToRefreshState.isRefreshing]);

  // Add touch event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Handle escape key to go back
      if (event.key === 'Escape') {
        handleGoBack();
      }
      // Handle Alt+H for home
      if (event.altKey && event.key === 'h') {
        event.preventDefault();
        handleGoHome();
      }
      // Handle F5 or Ctrl+R for refresh
      if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
        event.preventDefault();
        handleRefresh();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for refresh events from TopHeader
  useEffect(() => {
    const handleRefreshFromHeader = () => {
      handleRefresh();
    };
    
    window.addEventListener('refreshTasks', handleRefreshFromHeader);
    return () => window.removeEventListener('refreshTasks', handleRefreshFromHeader);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="task-details-screen" ref={containerRef}>
        <div className="loading-state">
          <Spin size="large" />
          <div className="loading-text">
            <h3>Loading your tasks...</h3>
            <p>Please wait while we fetch your daily assignments</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="task-details-screen" ref={containerRef}>
        <div className="error-state">
          <div className="error-state-content">
            <div className="error-state-icon">
              {error.type === 'network' && '🌐'}
              {error.type === 'timeout' && '⏱️'}
              {error.type === 'auth' && '🔒'}
              {error.type === 'permission' && '🚫'}
              {error.type === 'server' && '🔧'}
              {error.type === 'offline' && '📱'}
            </div>
            <h2 className="error-state-title">{error.message}</h2>
            <p className="error-state-description">{error.details}</p>
            
            {error.canRetry && (
              <div className="error-state-actions">
                <Button 
                  type="primary" 
                  icon={<ReloadOutlined />}
                  onClick={handleRetry}
                  loading={loading}
                  className="touch-button touch-button-primary"
                >
                  {retryCount > 0 ? `Retry (${retryCount})` : 'Try Again'}
                </Button>
                
                {error.type === 'network' || error.type === 'timeout' && (
                  <Button 
                    type="default"
                    onClick={() => window.location.reload()}
                    className="touch-button"
                  >
                    Refresh Page
                  </Button>
                )}
              </div>
            )}
            
            {!error.canRetry && error.type === 'auth' && (
              <div className="error-state-actions">
                <Button 
                  type="primary"
                  onClick={() => {
                    // Redirect to login - this would be handled by your auth system
                    window.location.href = '/login';
                  }}
                  className="touch-button touch-button-primary"
                >
                  Log In Again
                </Button>
              </div>
            )}
            
            {error.type === 'offline' && (
              <div className="offline-info">
                <div className="offline-status">
                  <DisconnectOutlined className="text-red-500" />
                  <span>You are currently offline</span>
                </div>
                <p className="offline-help">
                  Connect to the internet to load your tasks. Any work you complete offline will be synced when you reconnect.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // No tasks state
  if (!taskData || !taskData.tasks || taskData.tasks.length === 0) {
    return (
      <div className="task-details-screen" ref={containerRef}>
        {/* Pull-to-refresh indicator */}
        {pullToRefreshState.isPulling && (
          <div 
            className="pull-to-refresh-indicator"
            style={{
              transform: `translateY(${pullToRefreshState.pullDistance}px)`,
              opacity: pullToRefreshState.pullDistance / pullThreshold
            }}
          >
            <div className={`pull-to-refresh-content ${pullToRefreshState.canRefresh ? 'can-refresh' : ''}`}>
              {pullToRefreshState.isRefreshing ? (
                <>
                  <Spin size="small" />
                  <span>Refreshing...</span>
                </>
              ) : pullToRefreshState.canRefresh ? (
                <>
                  <ArrowDownOutlined className="refresh-arrow release" />
                  <span>Release to refresh</span>
                </>
              ) : (
                <>
                  <ArrowDownOutlined className="refresh-arrow" />
                  <span>Pull to refresh</span>
                </>
              )}
            </div>
          </div>
        )}
        
        <div className="empty-state">
          <div className="empty-state-content">
            <div className="empty-state-icon">📋</div>
            <h2 className="empty-state-title">No Tasks Today</h2>
            <p className="empty-state-description">You don't have any tasks assigned for today.</p>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={refreshing}
              className="touch-button touch-button-primary"
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { project, supervisor, worker, tasks, dailySummary } = taskData;

  // Get current task if we're in a task-specific view
  const currentTask = taskId ? tasks.find(task => task.assignmentId.toString() === taskId) : null;

  return (
    <div className="task-details-screen" ref={containerRef}>
      {/* Pull-to-refresh indicator */}
      {pullToRefreshState.isPulling && (
        <div 
          className="pull-to-refresh-indicator"
          style={{
            transform: `translateY(${pullToRefreshState.pullDistance}px)`,
            opacity: pullToRefreshState.pullDistance / pullThreshold
          }}
        >
          <div className={`pull-to-refresh-content ${pullToRefreshState.canRefresh ? 'can-refresh' : ''}`}>
            {pullToRefreshState.isRefreshing ? (
              <>
                <Spin size="small" />
                <span>Refreshing...</span>
              </>
            ) : pullToRefreshState.canRefresh ? (
              <>
                <ArrowDownOutlined className="refresh-arrow release" />
                <span>Release to refresh</span>
              </>
            ) : (
              <>
                <ArrowDownOutlined className="refresh-arrow" />
                <span>Pull to refresh</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Content - Render different views based on route */}
      <div className="task-content">
        {currentView === 'list' && (
          <div>
            <h2>My Tasks</h2>
            <p>Loading tasks...</p>
            <TaskListView 
              project={project}
              supervisor={supervisor}
              worker={worker}
              tasks={tasks}
              dailySummary={dailySummary}
              onTaskAction={handleTaskAction}
              onContactSupervisor={handleContactSupervisor}
              isOnline={isOnline}
            />
          </div>
        )}
        
        {currentView === 'start' && currentTask && (
          <TaskStartView 
            task={currentTask}
            project={project}
            worker={worker}
            onGoBack={handleGoBack}
            isOnline={isOnline}
          />
        )}
        
        {currentView === 'progress' && currentTask && (
          <TaskProgressView 
            task={currentTask}
            onGoBack={handleGoBack}
            isOnline={isOnline}
          />
        )}
        
        {currentView === 'photo' && currentTask && (
          <TaskPhotoView 
            task={currentTask}
            onGoBack={handleGoBack}
            isOnline={isOnline}
          />
        )}
        
        {currentView === 'issue' && currentTask && (
          <TaskIssueView 
            task={currentTask}
            onGoBack={handleGoBack}
            isOnline={isOnline}
          />
        )}
        
        {currentView === 'details' && currentTask && (
          <TaskDetailsView 
            task={currentTask}
            project={project}
            onGoBack={handleGoBack}
            onTaskAction={handleTaskAction}
          />
        )}
        
        {/* Show error if task not found for task-specific views */}
        {currentView !== 'list' && !currentTask && (
          <div className="error-state">
            <div className="error-state-content">
              <div className="error-state-icon">❌</div>
              <h2 className="error-state-title">Task Not Found</h2>
              <p className="error-state-description">
                The requested task could not be found or you don't have access to it.
              </p>
              <Button 
                type="primary"
                onClick={handleGoHome}
                className="touch-button touch-button-primary"
              >
                Go to Task List
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Task List View Component - Enhanced with API integrations
const TaskListView = ({ project, supervisor, worker, tasks, dailySummary, onTaskAction, onContactSupervisor, isOnline }) => {
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [progressValue, setProgressValue] = useState(0);
  const [progressDescription, setProgressDescription] = useState('');
  const [progressNotes, setProgressNotes] = useState('');
  const [submittingProgress, setSubmittingProgress] = useState(false);

  const handleQuickProgress = (task) => {
    setSelectedTask(task);
    setProgressValue(task.progress?.percentage || 0);
    setProgressDescription('');
    setProgressNotes('');
    setProgressModalVisible(true);
  };

  const handleSubmitProgress = async () => {
    if (!selectedTask) return;

    if (progressValue <= (selectedTask.progress?.percentage || 0)) {
      message.error('Progress cannot be less than current progress');
      return;
    }

    if (!progressDescription.trim()) {
      message.error('Please provide a work description');
      return;
    }

    try {
      setSubmittingProgress(true);
      
      await WorkerMobileApiService.submitProgress({
        assignmentId: selectedTask.assignmentId,
        progressPercent: progressValue,
        description: progressDescription.trim(),
        notes: progressNotes.trim(),
        location: {
          latitude: 40.7130, // This should come from actual GPS
          longitude: -74.0058,
          accuracy: 5,
          timestamp: new Date().toISOString()
        }
      });

      message.success('Progress updated successfully');
      setProgressModalVisible(false);
      
      // Refresh task data
      window.location.reload(); // Simple refresh for now - could be improved with state management

    } catch (error) {
      console.error('Progress update error:', error);
      message.error(error.userMessage || 'Failed to update progress');
    } finally {
      setSubmittingProgress(false);
    }
  };

  const handleCallSupervisor = (phone) => {
    if (phone && phone !== 'N/A') {
      window.location.href = `tel:${phone}`;
    } else {
      message.info('Supervisor contact not available');
    }
  };

  return (
    <>
      {/* Enhanced Project Header */}
      <Card className="mb-4 rounded-xl shadow-sm border-0">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🏗️</span>
            <div className="flex-1">
              <h3 className="mb-1 text-gray-800 font-semibold">
                {project?.name || 'Project Name'}
              </h3>
              <p className="text-gray-500 text-sm">
                Code: {project?.code || 'N/A'}
              </p>
            </div>
          </div>
          
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Avatar size="small" icon={<UserOutlined />} />
                <span className="font-medium">Supervisor:</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>{supervisor?.name || 'N/A'}</span>
                {supervisor?.phone && (
                  <Button 
                    type="text" 
                    size="small"
                    icon={<PhoneOutlined />}
                    onClick={() => handleCallSupervisor(supervisor.phone)}
                    className="text-blue-600"
                  />
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <EnvironmentOutlined className="text-gray-500" />
                <span className="font-medium">Status:</span>
              </div>
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-600">Online | On Site</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-red-600">Offline</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Enhanced Task Cards */}
      <div className="space-y-3 mb-4">
        {tasks.map((task, index) => (
          <TaskCard 
            key={task.assignmentId} 
            task={task} 
            onTaskAction={onTaskAction}
            onQuickProgress={handleQuickProgress}
            isOnline={isOnline}
          />
        ))}
      </div>

      {/* Enhanced Daily Progress Summary */}
      {dailySummary && (
        <Card className="rounded-xl shadow-sm border-0 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-xl">📊</span>
              <h3 className="mb-0 text-gray-800 font-semibold">Daily Progress</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {(dailySummary.completedTasks || 0) + (dailySummary.inProgressTasks || 0)}/{dailySummary.totalTasks || 0}
                </div>
                <div className="text-sm text-gray-500">tasks</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {dailySummary.totalHoursWorked || 0}h
                </div>
                <div className="text-sm text-gray-500">worked</div>
              </div>
            </div>
            
            <Progress 
              percent={Math.round(((dailySummary?.completedTasks || 0) / (dailySummary?.totalTasks || 1)) * 100)} 
              strokeColor="#52c41a"
              className="mb-2"
            />
            
            <div className="text-center">
              <span className="text-sm text-gray-500">
                🕐 {dailySummary.totalHoursWorked || 0}h worked | {dailySummary.remainingHours || 0}h remaining
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Progress Update Modal */}
      <Modal
        title={`Update Progress - ${selectedTask?.taskName}`}
        open={progressModalVisible}
        onCancel={() => setProgressModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setProgressModalVisible(false)}>
            Cancel
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={submittingProgress}
            onClick={handleSubmitProgress}
            disabled={!progressDescription.trim() || !isOnline}
          >
            {!isOnline ? 'Offline - Cannot Update' : 'Submit Progress'}
          </Button>
        ]}
        className="rounded-xl"
      >
        <div className="space-y-4">
          <div>
            <span className="font-medium">Current Progress: {selectedTask?.progress?.percentage || 0}%</span>
            <br />
            <span className="text-gray-500">New Progress:</span>
            <input
              type="range"
              min={selectedTask?.progress?.percentage || 0}
              max="100"
              value={progressValue}
              onChange={(e) => setProgressValue(parseInt(e.target.value))}
              className="w-full mt-2"
            />
            <div className="text-center">
              <span className="font-bold text-blue-600">{progressValue}%</span>
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1">Work Description *</label>
            <textarea
              rows={3}
              value={progressDescription}
              onChange={(e) => setProgressDescription(e.target.value)}
              placeholder="Describe the work completed..."
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Notes (Optional)</label>
            <textarea
              rows={2}
              value={progressNotes}
              onChange={(e) => setProgressNotes(e.target.value)}
              placeholder="Additional notes..."
              className="w-full p-2 border rounded-lg"
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

// Task Start View Component - Shows geofence validation and start task interface
const TaskStartView = ({ task, project, worker, onGoBack, isOnline }) => {
  const [validatingLocation, setValidatingLocation] = useState(false);
  const [locationValid, setLocationValid] = useState(null);
  const [startingTask, setStartingTask] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [geofenceResult, setGeofenceResult] = useState(null);

  const validateLocation = async () => {
    setValidatingLocation(true);
    setLocationError(null);
    
    try {
      // Get current location and validate geofence
      const result = await WorkerMobileApiService.validateCurrentLocation();
      
      setGeofenceResult(result.data);
      setLocationValid(result.data.canStartTasks);
      
      if (!result.data.canStartTasks) {
        setLocationError(result.data.message || 'You are outside the project area');
      }
      
    } catch (error) {
      console.error('Location validation error:', error);
      setLocationError(error.userMessage || 'Failed to validate location');
      setLocationValid(false);
    } finally {
      setValidatingLocation(false);
    }
  };

  const handleStartTask = async () => {
    if (!isOnline) {
      message.warning('You need to be online to start a task');
      return;
    }

    if (!locationValid) {
      message.error('Please validate your location first');
      return;
    }

    setStartingTask(true);
    try {
      await WorkerMobileApiService.startTask(task.assignmentId);
      
      message.success('Task started successfully');
      onGoBack(); // Navigate back to task list
      
    } catch (error) {
      console.error('Start task error:', error);
      message.error(error.userMessage || 'Failed to start task');
    } finally {
      setStartingTask(false);
    }
  };

  useEffect(() => {
    validateLocation();
  }, []);

  return (
    <div className="space-y-4">
      {/* Task Info Card */}
      <Card className="task-card">
        <div className="space-y-3">
          <div className="task-header-section">
            <div className="task-status-icon">🎯</div>
            <div className="task-info">
              <h3 className="task-name">{task.taskName}</h3>
              <p className="task-location">{task.workArea}, {task.floor}</p>
            </div>
          </div>
          
          <div className="task-details">
            <div className="task-detail-row">
              <span className="task-detail-label">Target:</span>
              <span className="task-detail-value">{task.dailyTarget?.description}</span>
            </div>
            <div className="task-detail-row">
              <span className="task-detail-label">Estimated Time:</span>
              <span className="task-detail-value">
                {Math.round((task.timeEstimate?.estimated || 0) / 60)}h
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Location Validation Card */}
      <Card className="task-card">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">📍 Location Validation</h3>
          
          {validatingLocation ? (
            <div className="text-center py-4">
              <Spin size="large" />
              <p className="mt-2">Validating your location...</p>
            </div>
          ) : (
            <div className="location-validation-result">
              {locationValid ? (
                <div className="validation-success">
                  <div className="text-green-600 text-center py-4">
                    <div className="text-4xl mb-2">✅</div>
                    <h4 className="text-lg font-semibold">Location Verified</h4>
                    <p>You are within the project site boundary</p>
                    {geofenceResult && (
                      <p className="text-sm mt-2">
                        Distance from center: {Math.round(geofenceResult.distance || 0)}m
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="validation-error">
                  <div className="text-red-600 text-center py-4">
                    <div className="text-4xl mb-2">❌</div>
                    <h4 className="text-lg font-semibold">Location Issue</h4>
                    <p>{locationError || 'Unable to validate location'}</p>
                    {geofenceResult && geofenceResult.distance && (
                      <p className="text-sm mt-2">
                        Distance from project: {Math.round(geofenceResult.distance)}m
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              <Button
                type="default"
                icon={<ReloadOutlined />}
                onClick={validateLocation}
                className="w-full mt-3"
                loading={validatingLocation}
              >
                Refresh Location
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          type="primary"
          size="large"
          className="w-full"
          disabled={!locationValid || !isOnline}
          loading={startingTask}
          onClick={handleStartTask}
        >
          {!isOnline ? 'Offline - Cannot Start' : 
           !locationValid ? 'Location Required' : 
           'Start Task'}
        </Button>
        
        <Button
          type="default"
          size="large"
          className="w-full"
          onClick={onGoBack}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

// Task Progress View Component - Shows progress update interface
const TaskProgressView = ({ task, onGoBack, isOnline }) => {
  const [progress, setProgress] = useState(task.progress?.percentage || 0);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitProgress = async () => {
    if (!isOnline) {
      message.warning('You need to be online to update progress');
      return;
    }

    if (progress <= task.progress?.percentage) {
      message.error('Progress cannot be less than current progress');
      return;
    }

    if (!description.trim()) {
      message.error('Please provide a work description');
      return;
    }

    setSubmitting(true);
    try {
      await WorkerMobileApiService.submitProgress({
        assignmentId: task.assignmentId,
        progressPercent: progress,
        description: description.trim(),
        notes: notes.trim(),
        location: {
          latitude: 40.7130, // This should come from actual GPS
          longitude: -74.0058,
          accuracy: 5,
          timestamp: new Date().toISOString()
        }
      });

      message.success('Progress updated successfully');
      onGoBack();
    } catch (error) {
      console.error('Progress update error:', error);
      message.error(error.userMessage || 'Failed to update progress');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Task Info */}
      <Card className="task-card">
        <div className="space-y-3">
          <h3 className="task-name">{task.taskName}</h3>
          <p className="text-gray-600">{task.workArea}, {task.floor}</p>
          <div className="current-progress">
            <span className="text-sm text-gray-500">Current Progress:</span>
            <span className="font-semibold ml-2">{task.progress?.percentage || 0}%</span>
          </div>
        </div>
      </Card>

      {/* Progress Update Form */}
      <Card className="task-card">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Update Progress</h3>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              New Progress: {progress}%
            </label>
            <input
              type="range"
              min={task.progress?.percentage || 0}
              max="100"
              value={progress}
              onChange={(e) => setProgress(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Work Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the work completed..."
              className="w-full p-3 border rounded-lg"
              rows="3"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes or issues..."
              className="w-full p-3 border rounded-lg"
              rows="2"
            />
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          type="primary"
          size="large"
          className="w-full"
          disabled={!description.trim() || !isOnline}
          loading={submitting}
          onClick={handleSubmitProgress}
        >
          {!isOnline ? 'Offline - Cannot Update' : 'Submit Progress'}
        </Button>
        
        <Button
          type="default"
          size="large"
          className="w-full"
          onClick={onGoBack}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

// Task Photo View Component - Shows photo upload interface
const TaskPhotoView = ({ task, onGoBack, isOnline }) => {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      setCameraStream(stream);
      setShowCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera access error:', error);
      if (error.name === 'NotAllowedError') {
        message.error('Camera permission denied. Please allow camera access and try again.');
      } else if (error.name === 'NotFoundError') {
        message.error('No camera found on this device.');
      } else {
        message.error('Failed to access camera. Please try again.');
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `camera-photo-${timestamp}.jpg`, { type: 'image/jpeg' });
        
        const photoData = {
          file,
          preview: URL.createObjectURL(blob),
          caption: '',
          timestamp: new Date().toISOString()
        };
        
        setPhotos(prev => [...prev, photoData]);
        message.success('Photo captured successfully');
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  };

  const selectFromGallery = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    
    if (photos.length + files.length > 5) {
      message.error('Maximum 5 photos allowed per task');
      return;
    }

    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        message.error(`${file.name} is not an image file`);
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        message.error(`${file.name} is too large. Maximum size is 10MB`);
        return;
      }

      const photoData = {
        file,
        preview: URL.createObjectURL(file),
        caption: '',
        timestamp: new Date().toISOString()
      };
      
      setPhotos(prev => [...prev, photoData]);
    });

    // Reset file input
    event.target.value = '';
  };

  const removePhoto = (index) => {
    setPhotos(prev => {
      const newPhotos = [...prev];
      // Revoke object URL to free memory
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  const updatePhotoCaption = (index, caption) => {
    setPhotos(prev => {
      const newPhotos = [...prev];
      newPhotos[index].caption = caption;
      return newPhotos;
    });
  };

  const handlePhotoUpload = async () => {
    if (!isOnline) {
      message.warning('You need to be online to upload photos');
      return;
    }

    if (photos.length === 0) {
      message.error('Please select at least one photo');
      return;
    }

    setUploading(true);
    try {
      const photoFiles = photos.map(photo => photo.file);
      const captions = photos.map(photo => photo.caption);
      
      // Get current location if available
      let location = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: true
            });
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          console.warn('Could not get location for photo upload:', error);
        }
      }

      await WorkerMobileApiService.uploadTaskPhotos(
        task.assignmentId,
        photoFiles,
        captions,
        location,
        (progress) => {
          // Could show upload progress here
          console.log('Upload progress:', progress);
        }
      );

      message.success('Photos uploaded successfully');
      
      // Clean up preview URLs
      photos.forEach(photo => URL.revokeObjectURL(photo.preview));
      setPhotos([]);
      
      onGoBack();
    } catch (error) {
      console.error('Photo upload error:', error);
      message.error(error.userMessage || 'Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Task Info */}
      <Card className="task-card">
        <div className="space-y-3">
          <h3 className="task-name">{task.taskName}</h3>
          <p className="text-gray-600">{task.workArea}, {task.floor}</p>
        </div>
      </Card>

      {/* Photo Upload Interface */}
      <Card className="task-card">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">📷 Add Photos</h3>
          
          {!showCamera ? (
            <div className="photo-upload-area border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <CameraOutlined className="text-4xl text-gray-400 mb-2" />
              <p className="text-gray-600 mb-4">Take photos or select from gallery</p>
              <div className="space-y-2">
                <Button 
                  type="primary" 
                  className="w-full"
                  onClick={startCamera}
                  disabled={!navigator.mediaDevices}
                >
                  📷 Take Photo
                </Button>
                <Button 
                  type="default" 
                  className="w-full"
                  onClick={selectFromGallery}
                >
                  🖼️ Select from Gallery
                </Button>
              </div>
            </div>
          ) : (
            <div className="camera-interface">
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg"
                  style={{ maxHeight: '400px' }}
                />
                <canvas
                  ref={canvasRef}
                  style={{ display: 'none' }}
                />
              </div>
              <div className="flex space-x-2 mt-4">
                <Button
                  type="primary"
                  size="large"
                  className="flex-1"
                  onClick={capturePhoto}
                >
                  📸 Capture
                </Button>
                <Button
                  type="default"
                  size="large"
                  onClick={stopCamera}
                >
                  ❌ Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Hidden file input for gallery selection */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          {photos.length > 0 && (
            <div className="photo-preview">
              <h4 className="font-medium mb-2">Selected Photos ({photos.length}/5)</h4>
              <div className="grid grid-cols-2 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="photo-item border rounded-lg p-2 relative">
                    <div className="aspect-square bg-gray-100 rounded mb-2 overflow-hidden">
                      <img
                        src={photo.preview}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Photo caption..."
                      value={photo.caption}
                      onChange={(e) => updatePhotoCaption(index, e.target.value)}
                      className="w-full text-sm border rounded px-2 py-1 mb-2"
                    />
                    <Button
                      type="text"
                      size="small"
                      danger
                      className="absolute top-1 right-1 bg-white bg-opacity-80"
                      onClick={() => removePhoto(index)}
                    >
                      ❌
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          type="primary"
          size="large"
          className="w-full"
          disabled={photos.length === 0 || !isOnline}
          loading={uploading}
          onClick={handlePhotoUpload}
        >
          {!isOnline ? 'Offline - Cannot Upload' : 
           photos.length === 0 ? 'Select Photos First' : 
           `Upload ${photos.length} Photo${photos.length > 1 ? 's' : ''}`}
        </Button>
        
        <Button
          type="default"
          size="large"
          className="w-full"
          onClick={onGoBack}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

// Task Issue View Component - Shows issue reporting interface
const TaskIssueView = ({ task, onGoBack, isOnline }) => {
  const [issueType, setIssueType] = useState('');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const issueTypes = [
    { value: 'material_shortage', label: 'Material Shortage' },
    { value: 'tool_malfunction', label: 'Tool Malfunction' },
    { value: 'safety_concern', label: 'Safety Concern' },
    { value: 'quality_issue', label: 'Quality Issue' },
    { value: 'weather_delay', label: 'Weather Delay' },
    { value: 'technical_problem', label: 'Technical Problem' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmitIssue = async () => {
    if (!isOnline) {
      message.warning('You need to be online to report issues');
      return;
    }

    if (!issueType || !description.trim()) {
      message.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      // Get current location if available
      let location = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: true
            });
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            workArea: task.workArea || 'Unknown'
          };
        } catch (error) {
          console.warn('Could not get location for issue report:', error);
        }
      }

      await WorkerMobileApiService.reportIssue({
        assignmentId: task.assignmentId,
        issueType,
        priority,
        description: description.trim(),
        location
      });

      message.success('Issue reported successfully');
      onGoBack();
    } catch (error) {
      console.error('Issue report error:', error);
      message.error(error.userMessage || 'Failed to report issue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Task Info */}
      <Card className="task-card">
        <div className="space-y-3">
          <h3 className="task-name">{task.taskName}</h3>
          <p className="text-gray-600">{task.workArea}, {task.floor}</p>
        </div>
      </Card>

      {/* Issue Report Form */}
      <Card className="task-card">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">⚠️ Report Issue</h3>
          
          <div>
            <label className="block text-sm font-medium mb-2">Issue Type *</label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full p-3 border rounded-lg"
              required
            >
              <option value="">Select issue type...</option>
              {issueTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full p-3 border rounded-lg"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              className="w-full p-3 border rounded-lg"
              rows="4"
              required
            />
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          type="primary"
          size="large"
          className="w-full"
          disabled={!issueType || !description.trim() || !isOnline}
          loading={submitting}
          onClick={handleSubmitIssue}
        >
          {!isOnline ? 'Offline - Cannot Report' : 'Submit Issue Report'}
        </Button>
        
        <Button
          type="default"
          size="large"
          className="w-full"
          onClick={onGoBack}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

// Task Details View Component - Shows detailed task information
const TaskDetailsView = ({ task, project, onGoBack, onTaskAction }) => {
  return (
    <div className="space-y-4">
      {/* Task Header */}
      <Card className="task-card">
        <div className="space-y-3">
          <div className="task-header-section">
            <div className="task-status-icon">
              {task.status === 'completed' ? '✅' : 
               task.status === 'in_progress' ? '🔄' : 
               task.status === 'queued' ? '⏳' : '⏸️'}
            </div>
            <div className="task-info">
              <h3 className="task-name">{task.taskName}</h3>
              <p className="task-location">{task.workArea}, {task.floor}</p>
            </div>
            <Tag color={task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'orange' : 'green'}>
              {task.priority}
            </Tag>
          </div>
          
          {task.progress?.percentage > 0 && (
            <div className="progress-section">
              <div className="progress-header">
                <span className="progress-label">Progress</span>
                <span className="progress-value">{task.progress.percentage}%</span>
              </div>
              <Progress 
                percent={task.progress.percentage} 
                strokeColor={task.status === 'completed' ? 'green' : 'blue'}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Task Details */}
      <Card className="task-card">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">📋 Task Details</h3>
          
          <div className="task-detail-row">
            <span className="task-detail-label">Description:</span>
            <span className="task-detail-value">{task.description}</span>
          </div>
          
          <div className="task-detail-row">
            <span className="task-detail-label">Target:</span>
            <span className="task-detail-value">{task.dailyTarget?.description}</span>
          </div>
          
          <div className="task-detail-row">
            <span className="task-detail-label">Estimated Time:</span>
            <span className="task-detail-value">
              {Math.round(task.timeEstimate?.estimated / 60)}h
            </span>
          </div>
          
          {task.supervisorInstructions && (
            <div className="supervisor-instructions">
              <h4 className="font-medium text-gray-700 mb-2">📝 Supervisor Instructions:</h4>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                {task.supervisorInstructions}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Tools and Materials */}
      {(task.tools || task.materials) && (
        <Card className="task-card">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">🔧 Tools & Materials</h3>
            
            {task.tools && (
              <div>
                <h4 className="font-medium mb-2">Tools Required:</h4>
                <ul className="space-y-1">
                  {task.tools.map((tool, index) => (
                    <li key={index} className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      {tool.name} ({tool.quantity}x)
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {task.materials && (
              <div>
                <h4 className="font-medium mb-2">Materials Required:</h4>
                <ul className="space-y-1">
                  {task.materials.map((material, index) => (
                    <li key={index} className="flex justify-between">
                      <span>{material.name}</span>
                      <span className="text-gray-500">
                        {material.used || 0}/{material.quantity} {material.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {task.status === 'queued' && task.canStart && (
          <Button
            type="primary"
            size="large"
            className="w-full"
            onClick={() => onTaskAction(task, 'start')}
          >
            Start Task
          </Button>
        )}
        
        {task.status === 'in_progress' && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="primary"
              size="large"
              onClick={() => onTaskAction(task, 'continue')}
            >
              Update Progress
            </Button>
            <Button
              type="default"
              size="large"
              onClick={() => onTaskAction(task, 'photo')}
            >
              Add Photos
            </Button>
          </div>
        )}
        
        <Button
          type="default"
          size="large"
          className="w-full"
          onClick={() => onTaskAction(task, 'issue')}
        >
          Report Issue
        </Button>
        
        <Button
          type="default"
          size="large"
          className="w-full"
          onClick={onGoBack}
        >
          Back to Tasks
        </Button>
      </div>
    </div>
  );
};

// Task Card Component
const TaskCard = ({ task, onTaskAction }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'green';
      case 'in_progress': return 'blue';
      case 'queued': return 'orange';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'queued': return '⏳';
      default: return '⏸️';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  return (
    <Card className="task-item">
      <div className="space-y-3">
        {/* Task Header */}
        <div className="task-header-section">
          <div className="task-status-icon">{getStatusIcon(task.status)}</div>
          <div className="task-info">
            <h4 className="task-name">
              {task.taskName}
            </h4>
            <p className="task-location">
              {task.workArea}, {task.floor}
            </p>
          </div>
          <Tag color={getPriorityColor(task.priority)} className="task-priority">
            {task.priority}
          </Tag>
        </div>

        {/* Task Details */}
        <div className="task-details">
          <div className="task-detail-row">
            <span className="task-detail-label">Target:</span>
            <span className="task-detail-value">
              {task.dailyTarget?.description}
            </span>
          </div>
          
          {task.progress?.percentage > 0 && (
            <div className="progress-section">
              <div className="progress-header">
                <span className="progress-label">Progress</span>
                <span className="progress-value">{task.progress.percentage}%</span>
              </div>
              <Progress 
                percent={task.progress.percentage} 
                size="small"
                strokeColor={getStatusColor(task.status)}
              />
            </div>
          )}
          
          <div className="time-estimate">
            <ClockCircleOutlined />
            <span>
              {task.timeEstimate?.remaining 
                ? `${Math.round(task.timeEstimate.remaining / 60)}h remaining`
                : `${Math.round(task.timeEstimate?.estimated / 60)}h estimated`
              }
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="task-actions">
          {task.status === 'queued' && task.canStart && (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              className="action-button-primary"
              onClick={() => onTaskAction(task, 'start')}
            >
              Start Task
            </Button>
          )}
          
          {task.status === 'in_progress' && (
            <>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                className="action-button-primary"
                onClick={() => onTaskAction(task, 'continue')}
              >
                Continue
              </Button>
              <Button
                icon={<CameraOutlined />}
                className="action-button-secondary"
                onClick={() => onTaskAction(task, 'photo')}
                aria-label="Add photo"
              />
            </>
          )}
          
          {task.status === 'queued' && !task.canStart && (
            <Button
              disabled
              className="action-button-primary"
            >
              Waiting
            </Button>
          )}
          
          <Button
            icon={<ExclamationCircleOutlined />}
            className="action-button-secondary"
            onClick={() => onTaskAction(task, 'issue')}
            aria-label="Report issue"
          />
          
          <Button
            type="link"
            onClick={() => onTaskAction(task, 'details')}
            className="action-button-link"
          >
            Details
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TaskDetailsScreen;
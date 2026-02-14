// src/components/Tasks.jsx
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  List, 
  Tag, 
  Button, 
  Spin, 
  Alert,
  Typography,
  Badge,
  Space,
  Avatar
} from 'antd';
import { 
  CheckCircleOutlined, 
  SyncOutlined, 
  ClockCircleOutlined, 
  CarOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  CalendarOutlined,
  DashboardOutlined,
  ReloadOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  FileDoneOutlined,
  PlayCircleOutlined,
  FlagOutlined,
  UserSwitchOutlined,
  ProjectOutlined,
  IdcardOutlined,
  ThunderboltOutlined,
  UserOutlined,
  PhoneOutlined
} from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text } = Typography;

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchTasks();
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (err) {
      console.error('Error parsing user data:', err);
    }
  }, []);

  // Listen for refresh events from TopHeader
  useEffect(() => {
    const handleRefreshEvent = () => {
      fetchTasks();
    };
    
    window.addEventListener('refreshDriverTasks', handleRefreshEvent);
    window.addEventListener('refreshDriverPage', handleRefreshEvent);
    window.addEventListener('refreshPage', handleRefreshEvent);
    
    return () => {
      window.removeEventListener('refreshDriverTasks', handleRefreshEvent);
      window.removeEventListener('refreshDriverPage', handleRefreshEvent);
      window.removeEventListener('refreshPage', handleRefreshEvent);
    };
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/driver/tasks/today');
      
      let tasksData = [];
      
      if (Array.isArray(response.data)) {
        tasksData = response.data;
      } else if (response.data && Array.isArray(response.data.tasks)) {
        tasksData = response.data.tasks;
      } else if (response.data && Array.isArray(response.data.data)) {
        tasksData = response.data.data;
      } else if (response.data && response.data.success && Array.isArray(response.data.data)) {
        tasksData = response.data.data;
      } else {
        console.warn('Unexpected response structure:', response.data);
        const allKeys = Object.keys(response.data || {});
        const arrayKey = allKeys.find(key => Array.isArray(response.data[key]));
        if (arrayKey) {
          tasksData = response.data[arrayKey];
        }
      }

      if (tasksData && Array.isArray(tasksData)) {
        setTasks(tasksData);
      } else {
        setError('No tasks data received from server');
        setTasks([]);
      }
      
    } catch (err) {
      console.error('Error fetching tasks:', err);
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Failed to load tasks';
      setError(errorMessage);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Safe statistics calculation
  const stats = {
    total: tasks.length,
    pending: tasks.filter(task => task.status === 'PLANNED' || task.status === 'PENDING').length,
    completed: tasks.filter(task => task.status === 'COMPLETED' || task.status === 'DONE').length,
    inProgress: tasks.filter(task => task.status === 'ONGOING' || task.status === 'IN_PROGRESS').length,
  };

  const getStatusConfig = (status) => {
    const configs = {
      PLANNED: { color: 'blue', icon: <ScheduleOutlined />, text: 'Scheduled' },
      PENDING: { color: 'blue', icon: <ClockCircleOutlined />, text: 'Pending' },
      ONGOING: { color: 'orange', icon: <PlayCircleOutlined spin />, text: 'In Progress' },
      IN_PROGRESS: { color: 'orange', icon: <SyncOutlined spin />, text: 'In Progress' },
      COMPLETED: { color: 'green', icon: <SafetyCertificateOutlined />, text: 'Completed' },
      DONE: { color: 'green', icon: <FileDoneOutlined />, text: 'Completed' },
      CANCELLED: { color: 'red', icon: <FlagOutlined />, text: 'Cancelled' }
    };
    return configs[status] || { color: 'default', icon: null, text: status || 'Unknown' };
  };

  const getTaskTime = (task) => {
    return {
      start: task.startTime || task.scheduledStart || 'N/A',
      end: task.endTime || task.scheduledEnd || 'N/A'
    };
  };

  const getTaskDetails = (task) => {
    return {
      projectName: task.projectName || task.project?.name || 'Unnamed Task',
      vehicleNumber: task.vehicleNumber || task.vehicle?.number || 'N/A',
      passengers: task.passengers || task.passengerCount || task.employeeCount || 0,
      pickupLocation: task.pickupLocation || task.pickupAddress || 'Not specified',
      dropLocation: task.dropLocation || task.dropAddress || 'Not specified',
      taskId: task.taskId || task.id || task._id || 'unknown',
      driverName: task.driverName || 'Unknown Driver',
      driverPhone: task.driverPhone || 'Not available',
      driverPhoto: task.driverPhoto || null,
      employeeId: task.employeeId || null,
      driverId: task.driverId || 'N/A'
    };
  };

  const handleViewDetails = (taskId) => {
    if (taskId && taskId !== 'unknown') {
      window.location.href = `/driver/tasks/${taskId}`;
    } else {
      console.error('Cannot view details: invalid task ID');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spin size="large" indicator={<RocketOutlined spin />} />
          <Text className="block mt-4 text-gray-600">Loading your trips...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-4 pt-6">
      <div className="max-w-7xl mx-auto">
        {/* Consistent Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div className="flex items-center mb-4 lg:mb-0">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl mr-4">
                <ThunderboltOutlined className="text-white text-2xl" />
              </div>
              <div>
                <Title level={2} className="m-0 text-gray-800">My Tasks</Title>
                <Text className="text-gray-600">Today's scheduled trips and assignments</Text>
              </div>
            </div>
            
            <Button 
              type="primary" 
              onClick={fetchTasks}
              icon={<ReloadOutlined />}
              loading={loading}
              size="large"
              className="bg-gradient-to-r from-blue-500 to-purple-600 border-0"
            >
              Refresh Tasks
            </Button>
          </div>

          {/* Statistics with Professional Icons */}
          <Row gutter={16} className="mt-6">
            <Col xs={12} sm={6}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
                <Statistic
                  title="Total Tasks"
                  value={stats.total}
                  prefix={<ProjectOutlined className="text-blue-500" />}
                  valueStyle={{ color: '#3b82f6' }}
                  suffix={<RocketOutlined className="text-gray-400" />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
                <Statistic
                  title="Pending"
                  value={stats.pending}
                  prefix={<ScheduleOutlined className="text-blue-400" />}
                  valueStyle={{ color: '#3b82f6' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
                <Statistic
                  title="In Progress"
                  value={stats.inProgress}
                  prefix={<PlayCircleOutlined className="text-orange-500" />}
                  valueStyle={{ color: '#f59e0b' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
                <Statistic
                  title="Completed"
                  value={stats.completed}
                  prefix={<SafetyCertificateOutlined className="text-green-500" />}
                  valueStyle={{ color: '#10b981' }}
                />
              </Card>
            </Col>
          </Row>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert
            message="Error Loading Tasks"
            description={error}
            type="error"
            showIcon
            icon={<FlagOutlined />}
            closable
            className="mb-6 rounded-xl border-0 shadow-sm"
            onClose={() => setError('')}
          />
        )}

        {/* Tasks List */}
        <Card 
          title={
            <div className="flex items-center">
              <CalendarOutlined className="text-blue-600 mr-3 text-lg" />
              <span className="text-lg font-semibold">Today's Tasks</span>
              <Badge 
                count={tasks.length} 
                showZero 
                className="ml-3"
                style={{ backgroundColor: '#3b82f6' }}
              />
            </div>
          }
          className="rounded-2xl shadow-sm border-0"
          extra={
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchTasks}
              loading={loading}
              size="middle"
              type="text"
            >
              Refresh
            </Button>
          }
        >
          {tasks.length === 0 && !loading ? (
            <div className="text-center py-16">
              <ScheduleOutlined style={{ fontSize: '64px', color: '#d1d5db' }} />
              <Title level={4} className="text-gray-500 mt-6 mb-2">
                No tasks scheduled for today
              </Title>
              <Text type="secondary" className="text-base">
                You're all caught up! Check back later for new assignments.
              </Text>
              <br />
              <Button 
                type="primary" 
                onClick={fetchTasks} 
                className="mt-4"
                icon={<ReloadOutlined />}
              >
                Check Again
              </Button>
            </div>
          ) : (
            <List
              dataSource={tasks}
              renderItem={(task, index) => {
                const statusConfig = getStatusConfig(task.status);
                const time = getTaskTime(task);
                const details = getTaskDetails(task);
                
                return (
                  <List.Item key={task.id || task._id || index}>
                    <Card 
                      className="w-full border-0 shadow-sm hover:shadow-lg transition-all duration-300"
                      bodyStyle={{ padding: '24px' }}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                        {/* Left Section */}
                        <div className="flex-1 mb-4 lg:mb-0">
                          <div className="flex items-center mb-4 flex-wrap gap-3">
                            <div className="flex items-center bg-blue-50 px-3 py-1 rounded-full">
                              <ScheduleOutlined className="text-blue-600 mr-2" />
                              <Text strong className="text-blue-800">
                                {time.start} → {time.end}
                              </Text>
                            </div>
                            <Tag 
                              color={statusConfig.color} 
                              icon={statusConfig.icon}
                              className="font-semibold px-3 py-1 rounded-full"
                            >
                              {statusConfig.text}
                            </Tag>
                          </div>

                          <div className="flex items-center mb-4">
                            <ProjectOutlined className="text-purple-600 mr-3 text-lg" />
                            <Title level={4} className="m-0 text-gray-800">
                              {details.projectName}
                            </Title>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Vehicle & Passengers Info */}
                            <div className="space-y-3">
                              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                <CarOutlined className="text-blue-500 mr-3 text-lg" />
                                <div>
                                  <Text strong className="text-gray-700 block text-sm">Vehicle Number</Text>
                                  <Text className="text-gray-900 font-semibold text-sm">{details.vehicleNumber}</Text>
                                </div>
                              </div>
                              
                              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                                <TeamOutlined className="text-green-500 mr-3 text-lg" />
                                <div>
                                  <Text strong className="text-gray-700 block text-sm">Passengers</Text>
                                  <Text className="text-gray-900 font-semibold text-sm">{details.passengers} people</Text>
                                </div>
                              </div>
                            </div>

                            {/* Driver Info - Professional Format */}
                            <div className="space-y-3">
                              <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <UserOutlined className="text-blue-600 mr-3 text-lg" />
                                <div>
                                  <Text strong className="text-blue-700 block text-sm">Driver</Text>
                                  <Text className="text-gray-900 font-semibold text-sm">
                                    {details.driverName} {details.driverId && details.driverId !== 'N/A' && `(${details.driverId})`}
                                  </Text>
                                </div>
                              </div>
                              
                              <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
                                <PhoneOutlined className="text-green-600 mr-3 text-lg" />
                                <div>
                                  <Text strong className="text-green-700 block text-sm">Driver Contact</Text>
                                  <Text className="text-gray-900 font-semibold text-sm">{details.driverPhone}</Text>
                                </div>
                              </div>
                            </div>

                            {/* Location Info */}
                            <div className="space-y-3">
                              <div className="flex items-start p-3 bg-green-50 rounded-lg border border-green-200">
                                <EnvironmentOutlined className="text-green-600 mr-3 mt-1 text-lg" />
                                <div>
                                  <Text strong className="text-green-700 block text-sm">Pickup Location</Text>
                                  <Text className="text-gray-700 text-sm">{details.pickupLocation}</Text>
                                </div>
                              </div>
                              
                              <div className="flex items-start p-3 bg-orange-50 rounded-lg border border-orange-200">
                                <EnvironmentOutlined className="text-orange-600 mr-3 mt-1 text-lg" />
                                <div>
                                  <Text strong className="text-orange-700 block text-sm">Drop-off Location</Text>
                                  <Text className="text-gray-700 text-sm">{details.dropLocation}</Text>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Section - Action Button */}
                        <div className="lg:pl-6 lg:border-l lg:border-gray-200 flex items-center justify-center lg:justify-start mt-4 lg:mt-0">
                          <Button
                            type="primary"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewDetails(details.taskId)}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0 shadow-md"
                            size="large"
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </List.Item>
                );
              }}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default Tasks;
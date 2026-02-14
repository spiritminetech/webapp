// src/pages/driver/TodayTasks.jsx
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  List, 
  Tag, 
  Spin, 
  Alert, 
  Button, 
  Empty,
  Typography,
  Badge,
  Row,
  Col,
  Statistic,
  Avatar
} from 'antd';
import { 
  ClockCircleOutlined, 
  CarOutlined, 
  TeamOutlined, 
  EyeOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  RocketOutlined,
  ProjectOutlined,
  ScheduleOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  UserOutlined,
  PhoneOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const TodayTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [driverInfo, setDriverInfo] = useState({}); // Store driver info by employee id

  useEffect(() => {
    fetchTodaysTasks();
  }, []);

  // Listen for refresh events from TopHeader
  useEffect(() => {
    const handleRefreshEvent = () => {
      fetchTodaysTasks();
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

  const fetchDriverInfo = async (employeeId) => {
    try {
      // If we already have this driver's info, don't fetch again
      if (driverInfo[employeeId]) {
        return driverInfo[employeeId];
      }

      console.log(`🔄 Fetching driver info for employee ID: ${employeeId}`);
      const response = await api.get(`/employees/${employeeId}`);
      
      if (response.data && response.data.success) {
        const driverData = response.data.data;
        const newDriverInfo = {
          ...driverInfo,
          [employeeId]: {
            fullName: driverData.fullName || 'Unknown Driver',
            phone: driverData.phone || 'Not available',
            photo_url: driverData.photo_url || null
          }
        };
        setDriverInfo(newDriverInfo);
        return newDriverInfo[employeeId];
      }
    } catch (err) {
      console.error(`❌ Error fetching driver info for ${employeeId}:`, err);
      return {
        fullName: 'Unknown Driver',
        phone: 'Not available',
        photo_url: null
      };
    }
  };

  const fetchTodaysTasks = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('🔄 Fetching today\'s tasks...');

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
        console.warn('⚠️ Unexpected response structure:', response.data);
        const allKeys = Object.keys(response.data || {});
        const arrayKey = allKeys.find(key => Array.isArray(response.data[key]));
        if (arrayKey) {
          tasksData = response.data[arrayKey];
        }
      }

      if (tasksData && Array.isArray(tasksData)) {
        setTasks(tasksData);
        
        // Fetch driver info for all unique employee IDs in tasks
        const uniqueEmployeeIds = [...new Set(tasksData
          .map(task => task.driver_id || task.driverId || task.employee_id || task.employeeId)
          .filter(Boolean)
        )];
        
        console.log('👥 Fetching driver info for employee IDs:', uniqueEmployeeIds);
        
        // Fetch driver info for all unique IDs
        await Promise.all(
          uniqueEmployeeIds.map(employeeId => fetchDriverInfo(employeeId))
        );
      } else {
        setError('No tasks data received from server');
        setTasks([]);
      }
      
    } catch (err) {
      console.error('❌ Error fetching tasks:', err);
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Failed to load today\'s tasks';
      setError(errorMessage);
      setTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTodaysTasks();
  };

  const getStatusConfig = (status) => {
    const configs = {
      PLANNED: { color: 'blue', icon: <ScheduleOutlined />, text: 'Scheduled' },
      PENDING: { color: 'blue', icon: <ClockCircleOutlined />, text: 'Pending' },
      ONGOING: { color: 'orange', icon: <PlayCircleOutlined />, text: 'In Progress' },
      IN_PROGRESS: { color: 'orange', icon: <PlayCircleOutlined />, text: 'In Progress' },
      COMPLETED: { color: 'green', icon: <SafetyCertificateOutlined />, text: 'Completed' },
      DONE: { color: 'green', icon: <CheckCircleOutlined />, text: 'Completed' },
      CANCELLED: { color: 'red', icon: <ClockCircleOutlined />, text: 'Cancelled' }
    };
    return configs[status] || { color: 'default', icon: null, text: status || 'Unknown' };
  };

  const getTaskTime = (task) => {
    return {
      start: task.start_time || task.startTime || task.scheduled_start || task.time || 'Not set',
      end: task.end_time || task.endTime || task.scheduled_end || 'Not set'
    };
  };

  const getTaskDetails = (task) => {
    const employeeId = task.driver_id || task.driverId || task.employee_id || task.employeeId;
    const driverDetails = driverInfo[employeeId] || {
      fullName: 'Unknown Driver',
      phone: 'Not available',
      photo_url: null
    };

    return {
      projectName: task.projectName|| task.projectName || task.project?. || 'Unnamed Trip',
      vehicleNumber: task.vehicle_number || task.vehicleNumber || task.vehicle?.number || 'Not assigned',
      passengers: task.passengers || task.passenger_count || task.employee_count || 0,
      pickupLocation: task.pickup_location || task.pickupLocation || task.pickup_address || 'Not specified',
      dropLocation: task.drop_location || task.dropLocation || task.drop_address || 'Not specified',
      taskId: task.task_id || task.id || task._id || 'unknown',
      driverName: driverDetails.fullName,
      driverPhone: driverDetails.phone,
      driverPhoto: driverDetails.photo_url,
      employeeId: employeeId
    };
  };

  const handleViewDetails = (taskId) => {
    if (taskId && taskId !== 'unknown') {
      window.location.href = `/driver/tasks/${taskId}`;
    } else {
      console.error('Cannot view details: invalid task ID');
    }
  };

  const stats = {
    total: tasks.length,
    planned: tasks.filter(task => task.status === 'PLANNED' || task.status === 'PENDING').length,
    ongoing: tasks.filter(task => task.status === 'ONGOING' || task.status === 'IN_PROGRESS').length,
    completed: tasks.filter(task => task.status === 'COMPLETED' || task.status === 'DONE').length
  };

  if (loading && !refreshing) {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
            <div className="flex items-center mb-4 lg:mb-0">
              <div className="bg-blue-100 p-3 rounded-xl mr-4">
                <CalendarOutlined className="text-blue-600 text-2xl" />
              </div>
              <div>
                <Title level={2} className="m-0 text-gray-800">My Trips Today</Title>
                <Text className="text-gray-600 text-lg">
                  {dayjs().format('dddd, MMMM D, YYYY')}
                </Text>
              </div>
            </div>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />} 
              onClick={handleRefresh}
              loading={refreshing}
              className="bg-blue-600 hover:bg-blue-700 border-blue-600 h-12 px-6 rounded-xl font-semibold shadow-sm"
            >
              Refresh
            </Button>
          </div>

          {tasks.length > 0 && (
            <Row gutter={16} className="mt-4">
              <Col xs={12} sm={6}>
                <Statistic
                  title="Total Trips"
                  value={stats.total}
                  valueStyle={{ color: '#3b82f6' }}
                  prefix={<CalendarOutlined />}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Scheduled"
                  value={stats.planned}
                  valueStyle={{ color: '#3b82f6' }}
                  prefix={<ScheduleOutlined />}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="In Progress"
                  value={stats.ongoing}
                  valueStyle={{ color: '#f59e0b' }}
                  prefix={<PlayCircleOutlined />}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Completed"
                  value={stats.completed}
                  valueStyle={{ color: '#10b981' }}
                  prefix={<SafetyCertificateOutlined />}
                />
              </Col>
            </Row>
          )}
        </div>

        {error && (
          <Alert
            message="Error Loading Trips"
            description={error}
            type="error"
            showIcon
            closable
            action={
              <Button size="small" onClick={handleRefresh}>
                Retry
              </Button>
            }
            className="mb-6 rounded-xl"
            onClose={() => setError('')}
          />
        )}

        <div className="space-y-4">
          {tasks.length === 0 && !loading ? (
            <Card className="rounded-2xl shadow-sm border-0">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div className="text-center">
                    <Text className="text-gray-600 text-lg block mb-2">
                      No trips scheduled for today
                    </Text>
                    <Text type="secondary">
                      You're all caught up! Check back later for new assignments.
                    </Text>
                  </div>
                }
              />
            </Card>
          ) : (
            <>
              {tasks.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-200">
                  <Text className="text-gray-600 font-medium">
                    <ThunderboltOutlined className="mr-2" />
                    Found {tasks.length} trip{tasks.length !== 1 ? 's' : ''} for today
                  </Text>
                </div>
              )}
              
              <List
                grid={{ gutter: 16, xs: 1, sm: 1, md: 1, lg: 1, xl: 1 }}
                dataSource={tasks}
                renderItem={(task, index) => {
                  const statusConfig = getStatusConfig(task.status);
                  const time = getTaskTime(task);
                  const details = getTaskDetails(task);
                  
                  return (
                    <List.Item key={task.id || task._id || index}>
                      <Card 
                        className="rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border-0 overflow-hidden"
                        bodyStyle={{ padding: 0 }}
                      >
                        <div className="p-6">
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
                            <div className="flex items-start space-x-4 mb-4 lg:mb-0">
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <ClockCircleOutlined className="text-blue-600 text-xl" />
                              </div>
                              <div>
                                <div className="flex items-center space-x-3 mb-2 flex-wrap gap-2">
                                  <span className="text-xl font-bold text-gray-800">
                                    {time.start} → {time.end}
                                  </span>
                                  <Tag
                                    color={statusConfig.color}
                                    icon={statusConfig.icon}
                                    className="font-semibold"
                                  >
                                    {statusConfig.text}
                                  </Tag>
                                </div>
                                <Title level={4} className="m-0 text-gray-800">
                                  <ProjectOutlined className="mr-2" />
                                  {details.projectName}
                                </Title>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                            {/* Vehicle & Passengers Info */}
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                <CarOutlined className="text-gray-600 text-lg" />
                                <div>
                                  <Text className="text-gray-600 text-sm block">Vehicle</Text>
                                  <Text strong className="text-gray-800">{details.vehicleNumber}</Text>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                <TeamOutlined className="text-gray-600 text-lg" />
                                <div>
                                  <Text className="text-gray-600 text-sm block">Passengers</Text>
                                  <Text strong className="text-gray-800">{details.passengers} people</Text>
                                </div>
                              </div>
                            </div>

                            {/* Driver Info */}
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                <Avatar 
                                  src={details.driverPhoto} 
                                  icon={<UserOutlined />}
                                  className="bg-purple-100 text-purple-600"
                                />
                                <div>
                                  <Text className="text-purple-700 text-sm font-medium block">Driver</Text>
                                  <Text strong className="text-gray-800">{details.driverName}</Text>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                <PhoneOutlined className="text-purple-600 text-lg" />
                                <div>
                                  <Text className="text-purple-700 text-sm font-medium block">Driver Phone</Text>
                                  <Text strong className="text-gray-800">{details.driverPhone}</Text>
                                </div>
                              </div>
                            </div>

                            {/* Location Info */}
                            <div className="space-y-3">
                              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                <EnvironmentOutlined className="text-green-600 text-lg mt-1" />
                                <div>
                                  <Text className="text-green-700 text-sm font-medium block">Pickup Location</Text>
                                  <Text className="text-gray-800">{details.pickupLocation}</Text>
                                </div>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                <EnvironmentOutlined className="text-amber-600 text-lg mt-1" />
                                <div>
                                  <Text className="text-amber-700 text-sm font-medium block">Drop-off Location</Text>
                                  <Text className="text-gray-800">{details.dropLocation}</Text>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-center pt-4 border-t border-gray-200">
                            <Button
                              type="primary"
                              icon={<EyeOutlined />}
                              onClick={() => handleViewDetails(details.taskId)}
                              className="bg-blue-600 hover:bg-blue-700 border-blue-600 h-12 px-8 rounded-xl font-semibold text-lg shadow-sm hover:shadow-md transition-all duration-300"
                              size="large"
                            >
                              View Trip Details
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </List.Item>
                  );
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TodayTasks;
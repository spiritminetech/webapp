// src/pages/driver/TaskDetails.jsx
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Descriptions, 
  Tag, 
  Button, 
  Spin, 
  Alert, 
  Typography,
  Space,
  Row,
  Col,
  Statistic,
  Progress,
  Steps,
  Divider
} from 'antd';
import { 
  PlayCircleOutlined, 
  ClockCircleOutlined,
  CarOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  MessageOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined,
  RocketOutlined,
  ProjectOutlined,
  IdcardOutlined,
  ThunderboltOutlined,
  ScheduleOutlined,
  FileDoneOutlined,
  FlagOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Step } = Steps;

const TaskDetails = () => {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startingTrip, setStartingTrip] = useState(false);
  
  const { taskId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get(`/driver/tasks/${taskId}`);
      
      if (response.data) {
        setTask(response.data);
      } else {
        setError('No task data received');
      }
      
    } catch (err) {
      console.error('Error fetching task details:', err);
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Failed to load task details';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrip = async () => {
    try {
      setStartingTrip(true);
      navigate(`/driver/tasks/${taskId}/pickup`);
    } catch (err) {
      console.error('Error starting trip:', err);
      setError('Failed to start trip');
    } finally {
      setStartingTrip(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      PLANNED: { 
        color: '#1890ff', 
        bgColor: '#e6f7ff',
        text: 'SCHEDULED', 
        icon: <ScheduleOutlined />,
        step: 0
      },
      ONGOING: { 
        color: '#fa8c16', 
        bgColor: '#fff7e6',
        text: 'IN PROGRESS', 
        icon: <PlayCircleOutlined />,
        step: 1
      },
      COMPLETED: { 
        color: '#52c41a', 
        bgColor: '#f6ffed',
        text: 'COMPLETED', 
        icon: <SafetyCertificateOutlined />,
        step: 2
      },
      CANCELLED: { 
        color: '#ff4d4f', 
        bgColor: '#fff2f0',
        text: 'CANCELLED', 
        icon: <FlagOutlined />,
        step: 0
      }
    };
    return configs[status] || { color: '#d9d9d9', text: status, icon: null, step: 0 };
  };

  const formatTimeIST = (dateString) => {
    if (!dateString) return 'N/A';
    return dayjs(dateString).format('h:mm A');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return dayjs(dateString).format('DD MMM YYYY');
  };

  const renderProgressSteps = () => {
    const statusConfig = getStatusConfig(task.status);
    
    return (
      <div className="pt-2">
        <Steps current={statusConfig.step} size="small">
          <Step 
            title="Scheduled" 
            description="Trip planned"
            icon={task.status === 'COMPLETED' || task.status === 'ONGOING' ? 
              <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
              null
            }
          />
          <Step 
            title="In Progress" 
            description="On the way"
            icon={task.status === 'COMPLETED' ? 
              <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
              null
            }
          />
          <Step 
            title="Completed" 
            description="Trip finished"
            icon={task.status === 'COMPLETED' ? 
              <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
              null
            }
          />
        </Steps>
      </div>
    );
  };

  const renderActualTimes = () => {
    if (task.status === 'PLANNED') {
      return null;
    }

    if (task.status === 'ONGOING') {
      return (
        <div className="space-y-3">
          {task.actualStartTime && (
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <ClockCircleOutlined className="text-blue-600" />
              <div>
                <Text className="text-gray-600 text-sm block">Pickup Time</Text>
                <Text strong className="text-gray-900">{formatTimeIST(task.actualStartTime)}</Text>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (task.status === 'COMPLETED') {
      return (
        <div className="space-y-3">
          {task.actualStartTime && (
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <ClockCircleOutlined className="text-blue-600" />
              <div>
                <Text className="text-gray-600 text-sm block">Pickup Time</Text>
                <Text strong className="text-gray-900">{formatTimeIST(task.actualStartTime)}</Text>
              </div>
            </div>
          )}
          {task.actualEndTime && (
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <CheckCircleOutlined className="text-green-600" />
              <div>
                <Text className="text-gray-600 text-sm block">Drop Time</Text>
                <Text strong className="text-gray-900">{formatTimeIST(task.actualEndTime)}</Text>
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spin size="large" indicator={<RocketOutlined spin />} />
          <Text className="block mt-4 text-gray-600">Loading trip details...</Text>
        </div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <Alert
            message="Unable to Load Trip"
            description={error}
            type="error"
            showIcon
            icon={<FlagOutlined />}
            className="mb-4"
          />
          <Button 
            onClick={() => navigate('/driver/tasks')}
            className="w-full"
            size="large"
            icon={<ThunderboltOutlined />}
          >
            Back to Trips
          </Button>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <Title level={3} className="text-gray-700">Trip Not Found</Title>
          <Text type="secondary">The requested trip could not be found.</Text>
          <br />
          <Button 
            onClick={() => navigate('/driver/tasks')}
            className="mt-4"
            size="large"
            icon={<ThunderboltOutlined />}
          >
            Back to Trips
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(task.status);
  const totalPassengers = task.passengers?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex-1">
            <Text className="text-gray-600 text-sm block">Trip Details</Text>
            <Text strong className="text-gray-900">{task.projectName}</Text>
          </div>
          <Tag 
            color={statusConfig.color}
            style={{ 
              backgroundColor: statusConfig.bgColor,
              color: statusConfig.color,
              border: 'none',
              fontWeight: 600
            }}
            icon={statusConfig.icon}
          >
            {statusConfig.text}
          </Tag>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card className="bg-white border-0 shadow-sm rounded-lg">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-50 p-2 rounded-lg">
                <CarOutlined className="text-blue-600 text-lg" />
              </div>
              <div>
                <Text className="text-gray-600 text-sm">Vehicle</Text>
                <Text strong className="text-gray-900 block">{task.vehicleNo}</Text>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="bg-green-50 p-2 rounded-lg">
                <CalendarOutlined className="text-green-600 text-lg" />
              </div>
              <div>
                <Text className="text-gray-600 text-sm">Date</Text>
                <Text strong className="text-gray-900">{formatDate(task.startTime)}</Text>
              </div>
            </div>

            {renderProgressSteps()}
          </div>
        </Card>

        <Card 
          title={
            <div className="flex items-center space-x-2">
              <EnvironmentOutlined className="text-green-600" />
              <span>Trip Details</span>
            </div>
          }
          className="bg-white border-0 shadow-sm rounded-lg"
        >
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="bg-green-50 p-2 rounded-lg mt-1">
                  <EnvironmentOutlined className="text-green-600" />
                </div>
                <div className="flex-1">
                  <Text className="text-gray-600 text-sm block">Pickup Location</Text>
                  <Text strong className="text-gray-900">{task.pickupLocation}</Text>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-orange-50 p-2 rounded-lg mt-1">
                  <EnvironmentOutlined className="text-orange-600" />
                </div>
                <div className="flex-1">
                  <Text className="text-gray-600 text-sm block">Drop-off Location</Text>
                  <Text strong className="text-gray-900">{task.dropLocation}</Text>
                </div>
              </div>
            </div>

            {renderActualTimes() && (
              <>
                <Divider className="my-4" />
                {renderActualTimes()}
              </>
            )}
          </div>
        </Card>

        {task.status !== 'COMPLETED' && (
          <Card className="bg-white border-0 shadow-sm rounded-lg">
            <div className="flex space-x-2">
              <Button 
                icon={<PhoneOutlined />}
                className="flex-1 h-12 border-gray-200 text-gray-700"
                size="large"
              >
                Call
              </Button>
              <Button 
                icon={<MessageOutlined />}
                className="flex-1 h-12 border-gray-200 text-gray-700"
                size="large"
              >
                Message
              </Button>
              <Button 
                icon={<SafetyCertificateOutlined />}
                className="flex-1 h-12 border-gray-200 text-gray-700"
                size="large"
              >
                Report
              </Button>
            </div>
          </Card>
        )}

        {task.status !== 'COMPLETED' && (
          <div className="space-y-3">
            {task.status === 'PLANNED' && (
              <div className="sticky bottom-4">
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  loading={startingTrip}
                  onClick={handleStartTrip}
                  className="w-full h-12 text-base font-semibold shadow-lg"
                  size="large"
                >
                  {startingTrip ? 'STARTING TRIP...' : 'START TRIP'}
                </Button>
              </div>
            )}

            {task.status === 'ONGOING' && (
              <div className="sticky bottom-4">
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => navigate(`/driver/tasks/${taskId}/drop`)}
                  className="w-full h-12 text-base font-semibold shadow-lg bg-green-600"
                  size="large"
                >
                  CONFIRM DROP
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetails;
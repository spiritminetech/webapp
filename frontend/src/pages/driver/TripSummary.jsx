import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Row, Col, Button, Spin, Alert, Typography, Divider 
} from 'antd';
import { 
  CheckCircleOutlined, TeamOutlined, UserOutlined, ClockCircleOutlined,
  CarOutlined, EnvironmentOutlined, ArrowLeftOutlined, CalendarOutlined,
  IdcardOutlined, RocketOutlined, ProjectOutlined, SafetyCertificateOutlined,
  FlagOutlined
} from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text } = Typography;

const TripSummary = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { taskId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTripSummary();
  }, [taskId]);

  // 🧭 Safe Date Formatter
  const formatTaskDate = (dateInput) => {
    if (!dateInput) return 'N/A';
    try {
      let date;
      if (typeof dateInput === 'string') {
        if (/^(\d{1,2})\s+[A-Za-z]+\s+\d{4}$/.test(dateInput)) return dateInput;
        if (/^\d+$/.test(dateInput)) date = new Date(parseInt(dateInput));
        else date = new Date(dateInput);
      } else if (typeof dateInput === 'number') {
        date = new Date(dateInput);
      } else {
        return 'N/A';
      }
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC'
      });
    } catch {
      return 'Date Error';
    }
  };

  // 📡 Fetch Trip Summary
  const fetchTripSummary = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/driver/tasks/${taskId}/summary`);
      if (response.data) {
        setSummary(response.data);
      } else {
        setError('No summary data received.');
      }
    } catch (err) {
      console.error('Error fetching trip summary:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load trip summary';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 🌀 Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spin size="large" indicator={<RocketOutlined spin />} />
          <Text className="block mt-4 text-gray-600">Loading trip summary...</Text>
        </div>
      </div>
    );
  }

  // ❌ Error State
  if (error && !summary) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <Alert
            message="Unable to Load Trip Summary"
            description={error}
            type="error"
            showIcon
            icon={<FlagOutlined />}
            className="mb-4"
          />
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/driver/tasks')}
            className="w-full"
            size="large"
          >
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  // 🚫 Empty Summary
  if (!summary) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <Title level={3} className="text-gray-700">Summary Not Found</Title>
          <Text type="secondary">Trip summary could not be found.</Text>
          <br />
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/driver/tasks')}
            className="mt-4"
            size="large"
          >
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  // ✅ Main Content
  const safeDriverName = summary.driverName && summary.driverName !== 'Unknown Driver'
    ? summary.driverName
    : 'Driver Info Not Available';

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="bg-green-50 p-4 rounded-lg inline-flex items-center justify-center w-16 h-16 mb-4">
          <SafetyCertificateOutlined className="text-green-600 text-2xl" />
        </div>
        <Title level={2} className="text-green-700 mb-2">Trip Completed ✅</Title>
        <Text className="text-gray-600">
          <CalendarOutlined className="mr-2" />
          Your trip on {formatTaskDate(summary.task_date)} has been successfully completed
        </Text>
      </div>

      {/* Summary Cards */}
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Project + Driver Info */}
        <Card className="bg-white border-0 shadow-sm rounded-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <ProjectOutlined className="text-blue-600" />
                </div>
                <div>
                  <Text className="text-gray-600 text-sm">Project</Text>
                  <Text strong className="text-gray-900 block">{summary.projectName || 'N/A'}</Text>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-purple-50 p-2 rounded-lg">
                  <CalendarOutlined className="text-purple-600" />
                </div>
                <div className="text-right">
                  <Text className="text-gray-600 text-sm">Task Date</Text>
                  <Text strong className="text-gray-900 block">
                    {formatTaskDate(summary.taskDate)}
                  </Text>
                </div>
              </div>
            </div>

            <Divider className="my-3" />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-orange-50 p-2 rounded-lg">
                  <CarOutlined className="text-orange-600" />
                </div>
                <div>
                  <Text className="text-gray-600 text-sm">Vehicle</Text>
                  <Text strong className="text-gray-900 block">{summary.vehicleNo || 'N/A'}</Text>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-green-50 p-2 rounded-lg">
                  <IdcardOutlined className="text-green-600" />
                </div>
                <div className="text-right">
                  <Text className="text-gray-600 text-sm">Driver</Text>
                  <Text strong className="text-gray-900 block">{safeDriverName}</Text>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Passenger Stats */}
        <Card className="bg-white border-0 shadow-sm rounded-lg">
          <Row gutter={16}>
            <Col span={12} className="mb-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <TeamOutlined className="text-blue-600 text-xl mb-2" />
                <Text className="text-gray-600 text-sm block">Total Passengers</Text>
                <Text strong className="text-gray-900 text-2xl">{summary.totalPassengers || 0}</Text>
              </div>
            </Col>
            <Col span={12} className="mb-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <UserOutlined className="text-green-600 text-xl mb-2" />
                <Text className="text-gray-600 text-sm block">Picked Up</Text>
                <Text strong className="text-gray-900 text-2xl">{summary.pickedUp || 0}</Text>
              </div>
            </Col>
            <Col span={12}>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <CheckCircleOutlined className="text-orange-600 text-xl mb-2" />
                <Text className="text-gray-600 text-sm block">Dropped</Text>
                <Text strong className="text-gray-900 text-2xl">{summary.dropped || 0}</Text>
              </div>
            </Col>
            <Col span={12}>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <UserOutlined className="text-red-600 text-xl mb-2" />
                <Text className="text-gray-600 text-sm block">Missed</Text>
                <Text strong className="text-gray-900 text-2xl">{summary.missed || 0}</Text>
              </div>
            </Col>
          </Row>

          <Divider />

          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg">
              <ClockCircleOutlined className="text-gray-600" />
              <Text className="text-gray-600">Trip Duration:</Text>
              <Text strong className="text-gray-900">{summary.duration_minutes || 0} minutes</Text>
            </div>
          </div>
        </Card>

        {/* Route Info */}
        <Card 
          title={
            <div className="flex items-center space-x-2">
              <EnvironmentOutlined className="text-green-600" />
              <span>Route Details</span>
            </div>
          }
          className="bg-white border-0 shadow-sm rounded-lg"
        >
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="bg-green-50 p-2 rounded-lg mt-1">
                <EnvironmentOutlined className="text-green-600" />
              </div>
              <div className="flex-1">
                <Text className="text-gray-600 text-sm block">Pickup Location</Text>
                <Text strong className="text-gray-900">{summary.pickupLocation || 'N/A'}</Text>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-orange-50 p-2 rounded-lg mt-1">
                <EnvironmentOutlined className="text-orange-600" />
              </div>
              <div className="flex-1">
                <Text className="text-gray-600 text-sm block">Drop-off Location</Text>
                <Text strong className="text-gray-900">{summary.dropLocation || 'N/A'}</Text>
              </div>
            </div>
          </div>
        </Card>

        {/* Back Button */}
        <div className="sticky bottom-4">
          <Button
            type="primary"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/driver/tasks')}
            className="w-full h-12 text-base font-semibold shadow-lg bg-blue-600"
            size="large"
          >
            BACK TO TASKS
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TripSummary;

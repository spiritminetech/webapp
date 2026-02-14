// src/pages/driver/TripHistory.jsx
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
  DatePicker,
  Row,
  Col,
  Statistic
} from 'antd';
import { 
  ClockCircleOutlined, 
  CarOutlined, 
  TeamOutlined, 
  EyeOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  HistoryOutlined,
  SyncOutlined,
  RocketOutlined,
  ScheduleOutlined,
  SafetyCertificateOutlined,
  FlagOutlined,
  ProjectOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../services/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const TripHistory = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState([dayjs().subtract(7, 'day'), dayjs()]);

  const navigate = useNavigate();

  useEffect(() => {
    fetchTripHistory();
  }, []);

  const fetchTripHistory = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('/driver/trips/history', {
        params: {
          startDate: dateRange[0].format('YYYY-MM-DD'),
          endDate: dateRange[1].format('YYYY-MM-DD')
        }
      });
      
      if (response.data && Array.isArray(response.data.trips)) {
        setTrips(response.data.trips);
      } else {
        setError('No trip history data received');
        setTrips([]);
      }
      
    } catch (err) {
      console.error('Error fetching trip history:', err);
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Failed to load trip history';
      setError(errorMessage);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      PLANNED: { color: 'blue', icon: <ScheduleOutlined />, text: 'SCHEDULED' },
      ONGOING: { color: 'orange', icon: <PlayCircleOutlined />, text: 'IN PROGRESS' },
      COMPLETED: { color: 'green', icon: <SafetyCertificateOutlined />, text: 'COMPLETED' },
      CANCELLED: { color: 'red', icon: <FlagOutlined />, text: 'CANCELLED' }
    };
    return configs[status] || { color: 'default', icon: null, text: status || 'Unknown' };
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  const handleSearch = () => {
    fetchTripHistory();
  };

  const handleViewSummary = (taskId) => {
    if (taskId) {
      navigate(`/driver/tasks/${taskId}/summary`);
    }
  };

  const stats = {
    total: trips.length,
    completed: trips.filter(trip => trip.status === 'COMPLETED').length,
    ongoing: trips.filter(trip => trip.status === 'ONGOING').length,
    planned: trips.filter(trip => trip.status === 'PLANNED').length,
    cancelled: trips.filter(trip => trip.status === 'CANCELLED').length
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const time = dayjs(dateString);
    return time.isValid() ? time.format('hh:mm A') : 'N/A';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = dayjs(dateString);
    return date.isValid() ? date.format('YYYY-MM-DD') : 'N/A';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spin size="large" indicator={<RocketOutlined spin />} />
          <Text className="block mt-4 text-gray-600">Loading trip history...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div className="flex items-center mb-4 lg:mb-0">
              <div className="bg-blue-100 p-3 rounded-xl mr-4">
                <HistoryOutlined className="text-blue-600 text-2xl" />
              </div>
              <div>
                <Title level={2} className="m-0 text-gray-800">Trip History</Title>
                <Text className="text-gray-600">View all your trips - completed, ongoing, and scheduled</Text>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <RangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                className="w-full sm:w-auto"
              />
              <Button 
                type="primary" 
                icon={<SearchOutlined />}
                onClick={handleSearch}
                loading={loading}
              >
                Search
              </Button>
              <Button 
                onClick={fetchTripHistory}
                icon={<SyncOutlined />}
                loading={loading}
              >
                Refresh
              </Button>
            </div>
          </div>

          <Row gutter={16} className="mt-6">
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
                title="Completed"
                value={stats.completed}
                valueStyle={{ color: '#10b981' }}
                prefix={<SafetyCertificateOutlined />}
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
                title="Scheduled"
                value={stats.planned}
                valueStyle={{ color: '#3b82f6' }}
                prefix={<ScheduleOutlined />}
              />
            </Col>
          </Row>
        </div>

        {error && (
          <Alert
            message="Error Loading Trip History"
            description={error}
            type="error"
            showIcon
            icon={<FlagOutlined />}
            closable
            className="mb-6 rounded-xl"
            onClose={() => setError('')}
          />
        )}

        <div className="space-y-4">
          {trips.length === 0 ? (
            <Card className="rounded-2xl shadow-sm border-0">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div className="text-center">
                    <Text className="text-gray-600 text-lg block mb-2">
                      No trips found for selected period
                    </Text>
                    <Text type="secondary">
                      Try adjusting your date range or check back later.
                    </Text>
                  </div>
                }
              />
            </Card>
          ) : (
            trips.map((trip, index) => {
              const statusConfig = getStatusConfig(trip.status);
              const tripDate = formatDate(trip.taskDate || trip.startTime);
              const startTime = formatTime(trip.startTime);
              const endTime = formatTime(trip.endTime);

              return (
                <Card 
                  key={trip.id || trip._id || index}
                  className="rounded-2xl shadow-sm border-0 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <CalendarOutlined className="text-gray-500" />
                        <Text strong className="text-gray-700">Date: {tripDate}</Text>
                      </div>
                      <Tag 
                        color={statusConfig.color}
                        className="font-semibold"
                        icon={statusConfig.icon}
                      >
                        {statusConfig.text}
                      </Tag>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <ClockCircleOutlined className="text-blue-500" />
                        <Text strong className="text-gray-800">
                          {startTime} → {endTime}
                        </Text>
                      </div>

                      <div className="flex items-center space-x-2">
                        <ProjectOutlined className="text-green-500" />
                        <Text strong className="text-gray-700">Project: </Text>
                        <Text className="text-gray-800">{trip.projectName || 'Unnamed Trip'}</Text>
                      </div>

                      <div className="flex items-center space-x-2">
                        <CarOutlined className="text-orange-500" />
                        <Text strong className="text-gray-700">Vehicle: </Text>
                        <Text className="text-gray-800">{trip.vehicleNumber || 'N/A'}</Text>
                      </div>

                      <div className="flex items-center space-x-2">
                        <TeamOutlined className="text-purple-500" />
                        <Text strong className="text-gray-700">Passengers: </Text>
                        <Text className="text-gray-800">{trip.passengers || 0}</Text>
                      </div>

                      <div className="flex items-start space-x-2">
                        <EnvironmentOutlined className="text-green-500 mt-1" />
                        <div>
                          <Text strong className="text-gray-700">Pickup: </Text>
                          <Text className="text-gray-800">{trip.pickupLocation || 'Not specified'}</Text>
                        </div>
                      </div>

                      <div className="flex items-start space-x-2">
                        <EnvironmentOutlined className="text-orange-500 mt-1" />
                        <div>
                          <Text strong className="text-gray-700">Drop: </Text>
                          <Text className="text-gray-800">{trip.dropLocation || 'Not specified'}</Text>
                        </div>
                      </div>
                    </div>

                    {trip.status === 'COMPLETED' && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <Button
                          type="primary"
                          icon={<EyeOutlined />}
                          onClick={() => handleViewSummary(trip.taskId || trip.id)}
                          className="bg-green-600 hover:bg-green-700 border-green-600 w-full"
                          size="large"
                        >
                          VIEW SUMMARY
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default TripHistory;
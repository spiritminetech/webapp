// src/pages/worker/TodayTrip.jsx
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Tag, 
  Spin, 
  Alert, 
  Button, 
  Empty,
  Typography,
  Divider,
  Row,
  Col,
  Badge,
  Statistic,
  Avatar,
  Space,
  Progress,
  Tooltip,
  notification,
  Timeline,
  Steps,
  Descriptions,
  Image,
  Grid,
  Collapse
} from 'antd';
import { 
  ClockCircleOutlined, 
  ProjectOutlined,
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  CarOutlined,
  TeamOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  RocketOutlined,
  FireOutlined,
  TrophyOutlined,
  InfoCircleOutlined,
  CompassOutlined,
  HomeOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  ArrowRightOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
  StarOutlined,
  BellOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  SendOutlined,
  GlobalOutlined,
  ScheduleOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';

dayjs.extend(relativeTime);
dayjs.extend(duration);

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { useBreakpoint } = Grid;
const { Panel } = Collapse;

const TodayTrip = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [statistics, setStatistics] = useState({
    totalTrips: 0,
    completedTrips: 0,
    upcomingTrips: 0,
    totalPassengers: 0,
    averageRating: 0
  });
  
  // Responsive breakpoints
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isSmallMobile = !screens.sm;

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchTodayTrip();
  }, []);

  // Calculate statistics from trips data
  const calculateStatistics = (tripsData) => {
    const totalTrips = tripsData.length;
    const completedTrips = tripsData.filter(trip => 
      ['COMPLETED', 'DONE'].includes(trip.status?.toUpperCase())
    ).length;
    const upcomingTrips = tripsData.filter(trip => 
      ['PLANNED', 'PENDING', 'ONGOING', 'IN_PROGRESS'].includes(trip.status?.toUpperCase())
    ).length;
    const totalPassengers = tripsData.reduce((sum, trip) => 
      sum + (parseInt(trip.passengerCount) || 0), 0
    );
    
    // Mock average rating - in real app, this would come from API
    const averageRating = totalTrips > 0 ? 4.8 : 0;

    setStatistics({
      totalTrips,
      completedTrips,
      upcomingTrips,
      totalPassengers,
      averageRating
    });
  };

  const fetchTodayTrip = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('/worker/today-trip');
      
      if (response.data && response.data.success) {
        const tripsData = Array.isArray(response.data.data) 
          ? response.data.data 
          : response.data.data ? [response.data.data] : [];
        
        setTrips(tripsData);
        calculateStatistics(tripsData);
        
        if (tripsData.length > 0) {
          notification.success({
            message: 'Schedule Updated',
            description: `Found ${tripsData.length} trip${tripsData.length > 1 ? 's' : ''} for today`,
            placement: 'topRight',
            duration: 3
          });
        }
      } else {
        setError(response.data?.message || 'No trip data received from server');
        setTrips([]);
        calculateStatistics([]);
      }
      
    } catch (err) {
      console.error('❌ Error fetching today trip:', err);
      if (err.response?.status === 404) {
        setError(err.response.data?.message || 'No trip assigned for today');
        setTrips([]);
        calculateStatistics([]);
      } else {
        const errorMessage = err.response?.data?.message || 
                            err.message || 
                            'Failed to load today\'s trip';
        setError(errorMessage);
        setTrips([]);
        calculateStatistics([]);
        
        notification.error({
          message: 'Failed to Load Trips',
          description: errorMessage,
          placement: 'topRight'
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTodayTrip();
  };

  // Handle contact driver button click - show phone number directly
  const handleContactDriver = (trip) => {
    if (trip.driverContact && trip.driverContact !== 'N/A') {
      window.location.href = `tel:${trip.driverContact}`;
      notification.info({
        message: 'Calling Driver',
        description: `Connecting you to ${trip.driverName}...`,
        placement: 'topRight',
        duration: 2
      });
    } else {
      notification.warning({
        message: 'Contact Unavailable',
        description: 'Driver contact information is not available',
        placement: 'topRight'
      });
    }
  };

  // Handle get directions button click
  const handleGetDirections = (trip) => {
    if (!trip.pickupLocation || trip.pickupLocation === 'N/A') {
      notification.warning({
        message: 'Location Unavailable',
        description: 'Pickup location information is not available',
        placement: 'topRight'
      });
      return;
    }

    // Encode the location for URL
    const encodedLocation = encodeURIComponent(trip.pickupLocation);
    
    // Try to detect the user's platform and open appropriate maps app
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    let mapsUrl;
    
    if (/android/i.test(userAgent)) {
      // Android - try Google Maps app first, fallback to web
      mapsUrl = `geo:0,0?q=${encodedLocation}`;
      
      // Fallback to Google Maps web if app not available
      const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
      
      // Try to open the app, fallback to web
      const link = document.createElement('a');
      link.href = mapsUrl;
      link.click();
      
      // If app doesn't open, open web version after a short delay
      setTimeout(() => {
        window.open(fallbackUrl, '_blank');
      }, 1000);
      
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      // iOS - try Apple Maps first, fallback to Google Maps web
      mapsUrl = `maps://maps.apple.com/?q=${encodedLocation}`;
      
      const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
      
      // Try to open Apple Maps
      window.location.href = mapsUrl;
      
      // Fallback to Google Maps web if Apple Maps not available
      setTimeout(() => {
        window.open(fallbackUrl, '_blank');
      }, 1000);
      
    } else {
      // Desktop or other platforms - open Google Maps web
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
      window.open(mapsUrl, '_blank');
    }
    
    notification.success({
      message: 'Opening Directions',
      description: `Getting directions to ${trip.pickupLocation}`,
      placement: 'topRight',
      duration: 3
    });
  };

  const getStatusConfig = (status) => {
    const configs = {
      PLANNED: { 
        color: 'blue', 
        text: 'SCHEDULED', 
        icon: <ClockCircleOutlined />,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-700'
      },
      PENDING: { 
        color: 'orange', 
        text: 'PENDING', 
        icon: <ClockCircleOutlined />,
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-700'
      },
      ONGOING: { 
        color: 'green', 
        text: 'IN PROGRESS', 
        icon: <RocketOutlined />,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-700'
      },
      IN_PROGRESS: { 
        color: 'green', 
        text: 'IN PROGRESS', 
        icon: <RocketOutlined />,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-700'
      },
      COMPLETED: { 
        color: 'purple', 
        text: 'COMPLETED', 
        icon: <TrophyOutlined />,
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        textColor: 'text-purple-700'
      },
      DONE: { 
        color: 'purple', 
        text: 'COMPLETED', 
        icon: <TrophyOutlined />,
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        textColor: 'text-purple-700'
      },
      CANCELLED: { 
        color: 'red', 
        text: 'CANCELLED', 
        icon: <ExclamationCircleOutlined />,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-700'
      }
    };
    return configs[status] || { 
      color: 'default', 
      text: status || 'UNKNOWN', 
      icon: <ExclamationCircleOutlined />,
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-700'
    };
  };

  const formatTime = (timeString) => {
    if (!timeString || timeString === 'N/A') return 'Not scheduled';
    try {
      return dayjs(timeString).format('hh:mm A');
    } catch (error) {
      return timeString;
    }
  };

  // Format phone number for display
  const formatPhoneNumber = (phone) => {
    if (!phone || phone === 'N/A') return 'Not available';
    
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Calculate time until next trip
  const getTimeUntilTrip = (startTime) => {
    if (!startTime) return null;
    const tripTime = dayjs(startTime);
    const now = currentTime;
    
    if (tripTime.isBefore(now)) {
      return { 
        type: 'passed', 
        text: 'Departure time passed',
        color: 'orange',
        urgency: 'high'
      };
    }
    
    const diffMinutes = tripTime.diff(now, 'minute');
    if (diffMinutes < 15) {
      return { 
        type: 'urgent', 
        text: `Departs in ${diffMinutes} min`,
        color: 'red',
        urgency: 'critical'
      };
    } else if (diffMinutes < 60) {
      return { 
        type: 'soon', 
        text: `Departs in ${diffMinutes} min`,
        color: 'orange',
        urgency: 'high'
      };
    }
    
    const diffHours = tripTime.diff(now, 'hour');
    return { 
      type: 'later', 
      text: `Departs in ${diffHours} hr`,
      color: 'blue',
      urgency: 'normal'
    };
  };

  // Get completion percentage for the day
  const getCompletionPercentage = () => {
    if (statistics.totalTrips === 0) return 0;
    return Math.round((statistics.completedTrips / statistics.totalTrips) * 100);
  };

  // Get priority level for trip
  const getTripPriority = (trip) => {
    const timeInfo = getTimeUntilTrip(trip.startTime);
    if (timeInfo?.urgency === 'critical') return 'high';
    if (timeInfo?.urgency === 'high') return 'medium';
    return 'normal';
  };

  // Responsive title level
  const getTitleLevel = () => {
    if (isSmallMobile) return 5;
    if (isMobile) return 4;
    return 2;
  };

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative">
            <Spin size="large" className="mb-6" />
            <div className="absolute inset-0 animate-ping">
              <div className="w-12 h-12 bg-blue-400 rounded-full opacity-20 mx-auto"></div>
            </div>
          </div>
          <Title level={isMobile ? 4 : 3} className="text-slate-800 mb-3">
            Loading Your Schedule
          </Title>
          <Text className="text-slate-600 text-lg">
            Preparing your trips for today...
          </Text>
          <div className="mt-4 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Title level={isMobile ? 3 : 2} className="text-slate-800 mb-2">
                Today's Schedule
              </Title>
              <Text className="text-slate-600 text-lg">
                Smart trip management for your day
              </Text>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">
                {currentTime.format('dddd, MMMM D, YYYY')}
              </div>
              <div className="text-lg font-semibold text-slate-700">
                {currentTime.format('h:mm:ss A')}
              </div>
            </div>
          </div>

          {/* Statistics Dashboard */}
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={12} sm={6}>
              <Card className="text-center shadow-lg rounded-2xl border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <CalendarOutlined className="text-2xl" />
                  </div>
                </div>
                <Statistic
                  value={statistics.totalTrips}
                  valueStyle={{ color: 'white', fontSize: isMobile ? '20px' : '24px' }}
                  suffix=""
                />
                <Text className="text-blue-100 text-sm font-medium">
                  Total Trips
                </Text>
              </Card>
            </Col>
            
            <Col xs={12} sm={6}>
              <Card className="text-center shadow-lg rounded-2xl border-0 bg-gradient-to-br from-green-500 to-green-600 text-white">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <TrophyOutlined className="text-2xl" />
                  </div>
                </div>
                <Statistic
                  value={statistics.completedTrips}
                  valueStyle={{ color: 'white', fontSize: isMobile ? '20px' : '24px' }}
                  suffix=""
                />
                <Text className="text-green-100 text-sm font-medium">
                  Completed
                </Text>
              </Card>
            </Col>
            
            <Col xs={12} sm={6}>
              <Card className="text-center shadow-lg rounded-2xl border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <RocketOutlined className="text-2xl" />
                  </div>
                </div>
                <Statistic
                  value={statistics.upcomingTrips}
                  valueStyle={{ color: 'white', fontSize: isMobile ? '20px' : '24px' }}
                  suffix=""
                />
                <Text className="text-orange-100 text-sm font-medium">
                  Upcoming
                </Text>
              </Card>
            </Col>
            
            <Col xs={12} sm={6}>
              <Card className="text-center shadow-lg rounded-2xl border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <TeamOutlined className="text-2xl" />
                  </div>
                </div>
                <Statistic
                  value={statistics.totalPassengers}
                  valueStyle={{ color: 'white', fontSize: isMobile ? '20px' : '24px' }}
                  suffix=""
                />
                <Text className="text-purple-100 text-sm font-medium">
                  Passengers
                </Text>
              </Card>
            </Col>
          </Row>

          {/* Progress Overview */}
          {statistics.totalTrips > 0 && (
            <Card className="shadow-lg rounded-2xl border-0 mb-6">
              <div className="flex items-center justify-between mb-4">
                <Title level={4} className="mb-0">Daily Progress</Title>
                <Badge 
                  count={`${getCompletionPercentage()}%`} 
                  style={{ 
                    backgroundColor: getCompletionPercentage() >= 80 ? '#52c41a' : 
                                   getCompletionPercentage() >= 50 ? '#faad14' : '#ff4d4f'
                  }}
                />
              </div>
              <Progress 
                percent={getCompletionPercentage()} 
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                trailColor="#f0f0f0"
                strokeWidth={12}
                className="mb-2"
              />
              <div className="flex justify-between text-sm text-slate-600">
                <span>{statistics.completedTrips} of {statistics.totalTrips} trips completed</span>
                <span>{statistics.upcomingTrips} remaining</span>
              </div>
            </Card>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert
            message="Unable to Load Trips"
            description={error}
            type="error"
            showIcon
            closable
            className="mb-6 rounded-2xl border-0 shadow-lg"
            onClose={() => setError('')}
            action={
              <Button size="small" type="primary" onClick={handleRefresh}>
                Try Again
              </Button>
            }
          />
        )}

        {/* No Trips Found */}
        {trips.length === 0 && !loading && !error && (
          <Card className="rounded-2xl shadow-lg border-0 text-center py-12">
            <div className="mb-6">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarOutlined className="text-4xl text-blue-500" />
              </div>
              <Title level={isMobile ? 4 : 3} className="text-slate-700 mb-3">
                No Trips Scheduled
              </Title>
              <Paragraph className="text-slate-500 text-lg max-w-md mx-auto">
                You're all caught up! Enjoy your day off or check back later for new assignments.
              </Paragraph>
            </div>
            <Space size="middle">
              <Button 
                type="primary" 
                size="large"
                onClick={handleRefresh}
                className="rounded-xl px-8 h-12"
                icon={<ReloadOutlined />}
              >
                Refresh Schedule
              </Button>
              <Button 
                size="large"
                className="rounded-xl px-8 h-12"
                icon={<HomeOutlined />}
              >
                Go to Dashboard
              </Button>
            </Space>
          </Card>
        )}

        {/* Trip List */}
        {trips.length > 0 && (
          <div className="space-y-6">
            <Row gutter={[16, 16]}>
              {trips.map((trip, index) => {
                const statusConfig = getStatusConfig(trip.status);
                const timeInfo = getTimeUntilTrip(trip.startTime);
                const priority = getTripPriority(trip);
                
                return (
                  <Col xs={24} key={index}>
                    <Card 
                      className={`rounded-2xl shadow-lg border-0 hover:shadow-xl transition-all duration-300 ${
                        priority === 'high' ? 'ring-2 ring-red-200 bg-red-50/30' :
                        priority === 'medium' ? 'ring-2 ring-orange-200 bg-orange-50/30' :
                        'hover:ring-2 hover:ring-blue-200'
                      }`}
                      bodyStyle={{ padding: 0 }}
                    >
                      <Collapse 
                        defaultActiveKey={trips.length === 1 ? ['0'] : []}
                        expandIconPosition="end"
                        className="border-0"
                        size="large"
                      >
                        <Panel 
                          key={index}
                          header={
                            <div className="flex items-center justify-between w-full pr-4">
                              <div className="flex items-center space-x-4 flex-1 min-w-0">
                                <div className={`flex items-center justify-center w-14 h-14 ${statusConfig.bgColor} ${statusConfig.borderColor} border-2 rounded-2xl flex-shrink-0`}>
                                  <div className="text-center">
                                    <div className={`text-2xl ${statusConfig.textColor} mb-1`}>
                                      {statusConfig.icon}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <Title level={4} className="mb-0 text-slate-800">
                                      Trip {index + 1}
                                    </Title>
                                    <Tag 
                                      color={statusConfig.color}
                                      icon={statusConfig.icon}
                                      className="font-semibold px-3 py-1 rounded-lg"
                                    >
                                      {statusConfig.text}
                                    </Tag>
                                    {priority === 'high' && (
                                      <Tag color="red" icon={<FireOutlined />} className="animate-pulse">
                                        URGENT
                                      </Tag>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2 text-slate-600">
                                    <ProjectOutlined />
                                    <Text className="text-base font-medium truncate">
                                      {trip.projectName}
                                    </Text>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right flex-shrink-0 ml-4">
                                <div className="flex items-center space-x-2 mb-2 justify-end">
                                  <ClockCircleOutlined className="text-blue-500" />
                                  <Text strong className="text-lg">
                                    {formatTime(trip.startTime)}
                                  </Text>
                                </div>
                                {timeInfo && (
                                  <Tag 
                                    color={timeInfo.color}
                                    className={`text-sm rounded-full font-medium ${
                                      timeInfo.urgency === 'critical' ? 'animate-pulse' : ''
                                    }`}
                                  >
                                    {timeInfo.text}
                                  </Tag>
                                )}
                              </div>
                            </div>
                          }
                          className="border-0"
                        >
                          {/* Trip Details */}
                          <div className="p-6 space-y-6">
                            
                            {/* Quick Stats Row */}
                            <Row gutter={[12, 12]}>
                              <Col xs={12} sm={6}>
                                <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                                  <ClockCircleOutlined className="text-blue-500 mb-2 text-xl" />
                                  <Text strong className="block text-base">{formatTime(trip.startTime)}</Text>
                                  <Text type="secondary" className="text-xs">Pickup Time</Text>
                                </div>
                              </Col>
                              <Col xs={12} sm={6}>
                                <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-200">
                                  <ClockCircleOutlined className="text-orange-500 mb-2 text-xl" />
                                  <Text strong className="block text-base">{formatTime(trip.dropTime)}</Text>
                                  <Text type="secondary" className="text-xs">Drop Time</Text>
                                </div>
                              </Col>
                              <Col xs={12} sm={6}>
                                <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                                  <CarOutlined className="text-green-500 mb-2 text-xl" />
                                  <Text strong className="block text-base truncate">{trip.vehicleNumber}</Text>
                                  <Text type="secondary" className="text-xs">Vehicle</Text>
                                </div>
                              </Col>
                              <Col xs={12} sm={6}>
                                <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-200">
                                  <TeamOutlined className="text-purple-500 mb-2 text-xl" />
                                  <Text strong className="block text-base">{trip.passengerCount}</Text>
                                  <Text type="secondary" className="text-xs">Passengers</Text>
                                </div>
                              </Col>
                            </Row>

                            <Divider className="my-6" />

                            {/* Detailed Information */}
                            <Row gutter={[24, 24]}>
                              <Col xs={24} lg={12}>
                                <Card size="small" className="rounded-xl border-0 bg-slate-50 shadow-sm">
                                  <Title level={5} className="mb-4 text-slate-700 flex items-center">
                                    <InfoCircleOutlined className="mr-2" />
                                    Trip Details
                                  </Title>
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                                      <div className="flex items-center">
                                        <ProjectOutlined className="text-slate-500 mr-3" />
                                        <Text strong>Project</Text>
                                      </div>
                                      <Text className="font-semibold text-right max-w-xs truncate">
                                        {trip.projectName}
                                      </Text>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                                      <div className="flex items-center">
                                        <UserOutlined className="text-slate-500 mr-3" />
                                        <Text strong>Driver</Text>
                                      </div>
                                      <Text className="font-semibold text-right">
                                        {trip.driverName}
                                      </Text>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                                      <div className="flex items-center">
                                        <CarOutlined className="text-slate-500 mr-3" />
                                        <Text strong>Vehicle Type</Text>
                                      </div>
                                      <Text className="font-semibold text-right">
                                        {trip.vehicleType}
                                      </Text>
                                    </div>
                                  </div>
                                </Card>
                              </Col>

                              <Col xs={24} lg={12}>
                                <div className="space-y-4">
                                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                                    <div className="flex items-start">
                                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                                        <CompassOutlined className="text-green-600" />
                                      </div>
                                      <div className="flex-1">
                                        <Text strong className="block text-green-800 text-sm mb-2">
                                          PICKUP LOCATION
                                        </Text>
                                        <Text className="text-sm font-medium break-words text-green-700">
                                          {trip.pickupLocation}
                                        </Text>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-200">
                                    <div className="flex items-start">
                                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                                        <EnvironmentOutlined className="text-orange-600" />
                                      </div>
                                      <div className="flex-1">
                                        <Text strong className="block text-orange-800 text-sm mb-2">
                                          DROP LOCATION
                                        </Text>
                                        <Text className="text-sm font-medium break-words text-orange-700">
                                          {trip.dropLocation}
                                        </Text>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </Col>
                            </Row>

                            <Divider className="my-6" />

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3">
                              {trip.driverContact && trip.driverContact !== 'N/A' && (
                                <Button 
                                  type="primary" 
                                  size="large"
                                  className="flex-1 rounded-xl font-semibold h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-0 shadow-lg"
                                  icon={<PhoneOutlined />}
                                  onClick={() => handleContactDriver(trip)}
                                >
                                  CALL DRIVER NOW
                                </Button>
                              )}
                              
                              <Tooltip title="Get directions to pickup location">
                                <Button 
                                  size="large"
                                  className="flex-1 rounded-xl font-semibold h-12 border-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                                  icon={<CompassOutlined />}
                                  onClick={() => handleGetDirections(trip)}
                                >
                                  GET DIRECTIONS
                                </Button>
                              </Tooltip>
                            </div>
                          </div>
                        </Panel>
                      </Collapse>
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {/* Refresh Button */}
            <div className="text-center pt-6">
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleRefresh}
                loading={refreshing}
                size="large"
                className="rounded-xl px-8 h-12 border-slate-300 text-slate-600 hover:border-blue-500 hover:text-blue-600 font-medium"
              >
                {refreshing ? 'Updating Schedule...' : 'Refresh Schedule'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodayTrip;
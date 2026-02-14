import React, { useState, useEffect } from "react";
import { 
  Card, 
  Typography, 
  message, 
  Spin, 
  Row, 
  Col, 
  Statistic, 
  DatePicker, 
  Select, 
  Button, 
  Table, 
  Tag, 
  Progress, 
  Timeline, 
  Avatar, 
  Tooltip, 
  Space, 
  Divider,
  Badge,
  Alert,
  Empty
} from "antd";
import { 
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  EnvironmentFilled,
  CalendarOutlined,
  ArrowRightOutlined,
  UserOutlined,
  TrophyOutlined,
  FireOutlined,
  ThunderboltOutlined,
  FilterOutlined,
  ReloadOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  HomeOutlined,
  TeamOutlined
} from "@ant-design/icons";
import dayjs from 'dayjs';
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import appConfig from "../../config/app.config.js";
import "./AttendanceHistory.css";

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const AttendanceHistoryUI = () => {
  const { user, currentProject } = useAuth();
  const employeeId = user?.employeeId;
  const projectId = currentProject?.id;

  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'day'), dayjs()]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [statistics, setStatistics] = useState({
    totalDays: 0,
    presentDays: 0,
    lateDays: 0,
    absentDays: 0,
    averageHours: 0,
    totalHours: 0
  });

  const BASE_URL = appConfig.api.baseURL;

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAttendanceHistory = async () => {
    if (!employeeId || !projectId) return;
    
    setLoading(true);
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      
      const res = await api.get(`${BASE_URL}/api/attendance/history`, {
        params: { 
          employeeId: Number(employeeId), 
          projectId: Number(projectId),
          startDate,
          endDate
        }
      });

      const formatted = res.data.records.map((rec) => {
        const date = rec.date ? new Date(rec.date) : new Date();
        const checkIn = rec.checkIn ? new Date(rec.checkIn) : null;
        const checkOut = rec.checkOut ? new Date(rec.checkOut) : null;

        let status = "completed";
        let workHours = 0;

        if (!rec.checkIn) {
          status = "absent";
        } else if (rec.pendingCheckout) {
          status = "pending";
        } else if (rec.insideGeofenceAtCheckout === false) {
          status = "outside";
        } else if (checkIn && checkOut) {
          workHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
          status = "completed";
        }

        // Determine if late (assuming 9 AM start time)
        const isLate = checkIn && checkIn.getHours() > 9;

        return {
          id: rec._id,
          date,
          checkIn,
          checkOut,
          status,
          workHours,
          isLate,
          notes: rec.notes || '',
        };
      });

      setAttendanceHistory(formatted);
      calculateStatistics(formatted);
    } catch (err) {
      console.error("Fetch error:", err);
      message.error("Failed to fetch attendance history");
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (records) => {
    const totalDays = records.length;
    const presentDays = records.filter(r => r.status !== 'absent').length;
    const lateDays = records.filter(r => r.isLate).length;
    const absentDays = records.filter(r => r.status === 'absent').length;
    const totalHours = records.reduce((sum, r) => sum + (r.workHours || 0), 0);
    const averageHours = presentDays > 0 ? totalHours / presentDays : 0;

    setStatistics({
      totalDays,
      presentDays,
      lateDays,
      absentDays,
      totalHours: Math.round(totalHours * 10) / 10,
      averageHours: Math.round(averageHours * 10) / 10
    });
  };

  useEffect(() => {
    if (employeeId && projectId) {
      fetchAttendanceHistory();
    }
  }, [employeeId, projectId, dateRange]);

  // Listen for refresh events from TopHeader
  useEffect(() => {
    const handleRefreshEvent = () => {
      if (employeeId && projectId) {
        fetchAttendanceHistory();
      }
    };
    
    window.addEventListener('refreshAttendanceHistory', handleRefreshEvent);
    
    return () => {
      window.removeEventListener('refreshAttendanceHistory', handleRefreshEvent);
    };
  }, [employeeId, projectId]);

  const getStatusConfig = (status, isLate = false) => {
    const configs = {
      completed: {
        icon: <CheckCircleFilled className="text-green-500" />,
        bg: "bg-green-50",
        color: "text-green-700",
        border: "border-green-200",
        label: "Present",
        tagColor: "success"
      },
      pending: {
        icon: <ClockCircleFilled className="text-amber-500" />,
        bg: "bg-amber-50",
        color: "text-amber-700",
        border: "border-amber-200",
        label: "In Progress",
        tagColor: "warning"
      },
      outside: {
        icon: <EnvironmentFilled className="text-rose-500" />,
        bg: "bg-rose-50",
        color: "text-rose-700",
        border: "border-rose-200",
        label: "Outside Zone",
        tagColor: "error"
      },
      absent: {
        icon: <CloseCircleFilled className="text-slate-400" />,
        bg: "bg-slate-50",
        color: "text-slate-600",
        border: "border-slate-200",
        label: "Absent",
        tagColor: "default"
      },
    };
    
    const config = configs[status] || configs.completed;
    
    if (isLate && status === 'completed') {
      return {
        ...config,
        label: "Late",
        tagColor: "warning",
        icon: <WarningOutlined className="text-orange-500" />
      };
    }
    
    return config;
  };

  const filteredHistory = attendanceHistory.filter(item => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'late') return item.isLate;
    return item.status === statusFilter;
  });

  const formatTime = (d) =>
    d instanceof Date && !isNaN(d) ?
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) :
      "-";

  const formatDate = (date) => {
    if (!date || isNaN(date)) return "Invalid Date";
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  };

  const formatFullDate = (date) => {
    if (!date || isNaN(date)) return "Invalid Date";
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  };

  const calculateDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return "";
    const diff = checkOut.getTime() - checkIn.getTime();
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const getAttendanceRate = () => {
    if (statistics.totalDays === 0) return 0;
    return Math.round((statistics.presentDays / statistics.totalDays) * 100);
  };

  const getPunctualityRate = () => {
    if (statistics.presentDays === 0) return 100;
    return Math.round(((statistics.presentDays - statistics.lateDays) / statistics.presentDays) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Title level={2} className="mb-2 text-slate-800">
                Attendance History
              </Title>
              <Text className="text-slate-600 text-lg">
                Comprehensive attendance tracking and analytics
              </Text>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              <div className="text-lg font-semibold text-slate-700">
                {currentTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Project Info */}
        {currentProject && (
          <Card className="mb-6 shadow-lg rounded-2xl border-0 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 -m-6 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <HomeOutlined className="text-white text-lg" />
                </div>
                <div>
                  <Text className="text-white font-medium text-lg">
                    {currentProject.projectName}
                  </Text>
                  <div className="text-indigo-100 text-sm">
                    Attendance Records • Project ID: {currentProject.id}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Filters and Controls */}
        <Card className="mb-6 shadow-lg rounded-2xl border-0">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <Text className="block mb-2 font-medium text-slate-700">Date Range</Text>
                <RangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  format="MMM DD, YYYY"
                  className="w-full sm:w-auto"
                />
              </div>
              <div>
                <Text className="block mb-2 font-medium text-slate-700">Status Filter</Text>
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  className="w-full sm:w-40"
                >
                  <Option value="all">All Records</Option>
                  <Option value="completed">Present</Option>
                  <Option value="absent">Absent</Option>
                  <Option value="late">Late Arrivals</Option>
                  <Option value="pending">In Progress</Option>
                  <Option value="outside">Outside Zone</Option>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchAttendanceHistory}
                disabled={loading}
              >
                Refresh
              </Button>
            </div>
          </div>
        </Card>

        <Row gutter={[24, 24]}>
          {/* Left Column - Statistics */}
          <Col xs={24} lg={8}>
            
            {/* Overview Statistics */}
            <Card className="mb-6 shadow-lg rounded-2xl border-0">
              <div className="flex items-center justify-between mb-4">
                <Title level={4} className="mb-0">Overview</Title>
                <Badge count={statistics.totalDays} showZero color="#1890ff" />
              </div>
              
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {statistics.presentDays}
                    </div>
                    <div className="text-sm text-green-700">Present Days</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="text-center p-4 bg-red-50 rounded-xl border border-red-200">
                    <div className="text-2xl font-bold text-red-600 mb-1">
                      {statistics.absentDays}
                    </div>
                    <div className="text-sm text-red-700">Absent Days</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <div className="text-2xl font-bold text-orange-600 mb-1">
                      {statistics.lateDays}
                    </div>
                    <div className="text-sm text-orange-700">Late Days</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {statistics.totalHours}h
                    </div>
                    <div className="text-sm text-blue-700">Total Hours</div>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Performance Metrics */}
            <Card className="mb-6 shadow-lg rounded-2xl border-0">
              <Title level={4} className="mb-4">Performance</Title>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Text className="font-medium">Attendance Rate</Text>
                    <Text className="font-bold text-green-600">{getAttendanceRate()}%</Text>
                  </div>
                  <Progress 
                    percent={getAttendanceRate()} 
                    strokeColor="#52c41a"
                    trailColor="#f0f0f0"
                    size="small"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Text className="font-medium">Punctuality Rate</Text>
                    <Text className="font-bold text-blue-600">{getPunctualityRate()}%</Text>
                  </div>
                  <Progress 
                    percent={getPunctualityRate()} 
                    strokeColor="#1890ff"
                    trailColor="#f0f0f0"
                    size="small"
                  />
                </div>
                
                <Divider />
                
                <div className="flex justify-between items-center">
                  <Text className="font-medium">Average Hours/Day</Text>
                  <Text className="font-bold text-purple-600">{statistics.averageHours}h</Text>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-lg rounded-2xl border-0">
              <Title level={4} className="mb-4">Quick Actions</Title>
              <Space direction="vertical" className="w-full">
                <Button 
                  block 
                  icon={<CalendarOutlined />}
                  onClick={() => setDateRange([dayjs().subtract(7, 'day'), dayjs()])}
                >
                  Last 7 Days
                </Button>
                <Button 
                  block 
                  icon={<CalendarOutlined />}
                  onClick={() => setDateRange([dayjs().subtract(30, 'day'), dayjs()])}
                >
                  Last 30 Days
                </Button>
                <Button 
                  block 
                  icon={<TrophyOutlined />}
                  onClick={() => setStatusFilter('completed')}
                >
                  Perfect Attendance
                </Button>
              </Space>
            </Card>
          </Col>

          {/* Right Column - Attendance Records */}
          <Col xs={24} lg={16}>
            <Card className="shadow-lg rounded-2xl border-0">
              <div className="flex items-center justify-between mb-6">
                <Title level={4} className="mb-0">
                  Attendance Records
                  <Badge 
                    count={filteredHistory.length} 
                    showZero 
                    color="#1890ff" 
                    className="ml-2"
                  />
                </Title>
                <Text className="text-slate-500">
                  {dateRange[0].format('MMM DD')} - {dateRange[1].format('MMM DD, YYYY')}
                </Text>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Spin size="large" />
                  <p className="mt-4 text-slate-500">Loading attendance records...</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span className="text-slate-500">
                      No attendance records found for the selected period
                    </span>
                  }
                >
                  <Button 
                    type="primary" 
                    onClick={() => {
                      setDateRange([dayjs().subtract(30, 'day'), dayjs()]);
                      setStatusFilter('all');
                    }}
                  >
                    Reset Filters
                  </Button>
                </Empty>
              ) : (
                <div className="space-y-4">
                  {filteredHistory.map((item, index) => {
                    const statusCfg = getStatusConfig(item.status, item.isLate);
                    const duration = calculateDuration(item.checkIn, item.checkOut);

                    return (
                      <div
                        key={item.id}
                        className="p-6 border border-slate-200 rounded-xl hover:shadow-md transition-all duration-200 bg-white"
                      >
                        {/* Mobile Layout */}
                        <div className="lg:hidden">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusCfg.bg} ${statusCfg.border} border`}>
                                {statusCfg.icon}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-800">
                                  {formatFullDate(item.date)}
                                </div>
                                <Tag color={statusCfg.tagColor} className="mt-1">
                                  {statusCfg.label}
                                </Tag>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-slate-50 rounded-lg">
                              <div className="text-xs text-slate-500 mb-1">Check In</div>
                              <div className="font-semibold text-slate-800">
                                {formatTime(item.checkIn)}
                              </div>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-lg">
                              <div className="text-xs text-slate-500 mb-1">Check Out</div>
                              <div className="font-semibold text-slate-800">
                                {formatTime(item.checkOut)}
                              </div>
                            </div>
                          </div>
                          
                          {duration && (
                            <div className="mt-4 text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="text-xs text-blue-600 mb-1">Total Hours</div>
                              <div className="font-bold text-blue-700">{duration}</div>
                            </div>
                          )}
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden lg:flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusCfg.bg} ${statusCfg.border} border`}>
                              {statusCfg.icon}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800 text-lg">
                                {formatDate(item.date)}
                              </div>
                              <div className="text-slate-500 text-sm">
                                {formatFullDate(item.date)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-8">
                            <div className="text-center">
                              <div className="text-xs text-slate-500 mb-1">Check In</div>
                              <div className="font-semibold text-slate-800">
                                {formatTime(item.checkIn)}
                              </div>
                            </div>

                            {item.checkOut && (
                              <>
                                <ArrowRightOutlined className="text-slate-300" />
                                <div className="text-center">
                                  <div className="text-xs text-slate-500 mb-1">Check Out</div>
                                  <div className="font-semibold text-slate-800">
                                    {formatTime(item.checkOut)}
                                  </div>
                                </div>
                              </>
                            )}

                            {duration && (
                              <>
                                <ArrowRightOutlined className="text-slate-300" />
                                <div className="text-center">
                                  <div className="text-xs text-slate-500 mb-1">Duration</div>
                                  <div className="font-semibold text-blue-600">{duration}</div>
                                </div>
                              </>
                            )}

                            <div className="ml-8">
                              <Tag color={statusCfg.tagColor} className="px-3 py-1">
                                {statusCfg.label}
                              </Tag>
                            </div>
                          </div>
                        </div>

                        {item.notes && (
                          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                            <Text className="text-slate-600 text-sm">
                              <InfoCircleOutlined className="mr-2" />
                              {item.notes}
                            </Text>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default AttendanceHistoryUI;

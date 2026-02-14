import React, { useState, useEffect } from "react";
import { 
  Button, 
  Card, 
  Typography, 
  Spin, 
  Table, 
  Tag, 
  Radio, 
  Alert, 
  Space, 
  Divider,
  Progress,
  Statistic,
  Row,
  Col,
  Badge,
  Tooltip,
  notification
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  CalendarOutlined,
  HomeOutlined,
  ReloadOutlined,
  LoginOutlined,
  LogoutOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  DashboardOutlined,
  TeamOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { getProjects } from "../../api/attendanceApi";
import appConfig from "../../config/app.config.js";
import "./GeoFenceAttendance.css";

const { Title, Text, Paragraph } = Typography;

const GeoFenceAttendance = () => {
  const { user, currentProject, selectProject } = useAuth();
  const navigate = useNavigate();
  const empId = user?.employeeId;
  const projId = currentProject?.id;

  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [insideGeofence, setInsideGeofence] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [currentStatus, setCurrentStatus] = useState("Not Checked In");
  const [outsideDuration, setOutsideDuration] = useState(0);
  const [lastInsideTime, setLastInsideTime] = useState(new Date());
  
  // Project selection states
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [showProjectSelection, setShowProjectSelection] = useState(!currentProject);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayStats, setTodayStats] = useState({
    hoursWorked: 0,
    zoneCompliance: 0,
    checkInTime: null,
    totalLocationLogs: 0,
    insideGeofenceLogs: 0
  });

  const BASE_URL = appConfig.api.baseURL;

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch available projects
  const fetchProjects = async () => {
    if (!empId) return;
    
    setProjectsLoading(true);
    try {
      const res = await getProjects(empId);
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setProjectsLoading(false);
    }
  };

  // Handle project selection
  const handleProjectSelect = () => {
    if (selectedProject) {
      selectProject(selectedProject);
      setShowProjectSelection(false);
    }
  };

  // Get current location
  const getLocation = () => {
    if (!navigator.geolocation) {
      notification.error({
        message: 'Location Not Supported',
        description: 'Your browser does not support geolocation services.',
        placement: 'topRight'
      });
      return;
    }
    
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        
        setLatitude(lat);
        setLongitude(lon);
        setLocationAccuracy(accuracy);
        setLastLocationUpdate(new Date());
        
        validateGeofence(lat, lon);
        
        notification.success({
          message: 'Location Updated',
          description: `Location fetched with ${Math.round(accuracy)}m accuracy`,
          placement: 'topRight',
          duration: 3
        });
      },
      (error) => {
        setLoading(false);
        let errorMessage = 'Unable to fetch location';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        
        notification.error({
          message: 'Location Error',
          description: errorMessage,
          placement: 'topRight'
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // Validate geofence
  const validateGeofence = async (lat, lon) => {
    if (!empId || !projId) return;
    
    try {
      const res = await api.post(`${BASE_URL}/api/attendance/log-location`, {
        employeeId: Number(empId),
        projectId: Number(projId),
        latitude: lat,
        longitude: lon,
      });

      const wasInside = insideGeofence;
      const nowInside = res.data.insideGeofence;
      
      setInsideGeofence(nowInside);

      if (nowInside) {
        setLastInsideTime(new Date());
        setOutsideDuration(0);
        
        if (!wasInside) {
          notification.success({
            message: 'Welcome Back!',
            description: 'You are now inside the work area geofence.',
            placement: 'topRight',
            icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
          });
        }
      } else if (wasInside && !nowInside) {
        notification.warning({
          message: 'Outside Work Area',
          description: 'You have moved outside the designated work area.',
          placement: 'topRight',
          icon: <WarningOutlined style={{ color: '#faad14' }} />
        });
      }
    } catch (err) {
      console.error(err);
      notification.error({
        message: 'Geofence Check Failed',
        description: 'Unable to validate your location against the work area.',
        placement: 'topRight'
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate today's statistics
  const calculateTodayStats = (records) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's attendance record
    const todayRecord = records.find((rec) => {
      const recDate = new Date(rec.date);
      recDate.setHours(0, 0, 0, 0);
      return recDate.getTime() === today.getTime();
    });

    let hoursWorked = 0;
    let checkInTime = null;

    if (todayRecord) {
      checkInTime = todayRecord.checkIn ? new Date(todayRecord.checkIn) : null;
      
      if (todayRecord.checkIn && todayRecord.checkOut) {
        // Both check-in and check-out exist
        const checkIn = new Date(todayRecord.checkIn);
        const checkOut = new Date(todayRecord.checkOut);
        hoursWorked = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      } else if (todayRecord.checkIn && !todayRecord.checkOut && currentStatus === "Checked In") {
        // Only check-in exists and user is still checked in
        const checkIn = new Date(todayRecord.checkIn);
        const now = new Date();
        hoursWorked = (now.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      }
    }

    // Calculate zone compliance based on current status and work time
    let zoneCompliance = 0; // Start with 0% compliance
    
    if (currentStatus === "Not Checked In") {
      // If not checked in, compliance should be based on location only
      zoneCompliance = insideGeofence ? 100 : 0;
    } else if (hoursWorked === 0) {
      // If checked in but no work time yet, base on current location
      zoneCompliance = insideGeofence ? 100 : 50; // 50% if outside when just checked in
    } else {
      // If actively working, calculate based on time spent inside vs outside
      if (outsideDuration > 0) {
        const totalMinutesWorked = hoursWorked * 60;
        zoneCompliance = Math.max(0, Math.round(((totalMinutesWorked - outsideDuration) / totalMinutesWorked) * 100));
      } else {
        // No time outside recorded
        zoneCompliance = insideGeofence ? 100 : 85; // 85% if currently outside but no duration tracked
      }
    }

    setTodayStats({
      hoursWorked: Math.round(hoursWorked * 10) / 10, // Round to 1 decimal
      zoneCompliance,
      checkInTime,
      totalLocationLogs: 0, // Would be fetched from backend in real implementation
      insideGeofenceLogs: 0 // Would be fetched from backend in real implementation
    });
  };

  // Fetch attendance history
  const fetchAttendanceHistory = async () => {
    if (!empId || !projId) return;
    
    try {
      const res = await api.get(
        `${BASE_URL}/api/attendance/history?employeeId=${Number(
          empId
        )}&projectId=${Number(projId)}`
      );

      const formatted = res.data.records.map((rec) => ({
        key: rec._id,
        date: new Date(rec.date).toLocaleDateString(),
        checkIn: rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString() : "-",
        checkOut: rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString() : "-",
        notes: !rec.checkIn
          ? "Not Checked In"
          : rec.pendingCheckout
          ? "Pending Checkout"
          : rec.insideGeofenceAtCheckout === false
          ? "Outside alert sent"
          : "-",
      }));

      setAttendanceHistory(formatted);

      // Calculate today's statistics
      calculateTodayStats(res.data.records);

      // Update current status
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayRecord = res.data.records.find((rec) => {
        const recDate = new Date(rec.date);
        recDate.setHours(0, 0, 0, 0);
        return recDate.getTime() === today.getTime();
      });

      if (!todayRecord) setCurrentStatus("Not Checked In");
      else if (todayRecord.checkIn && !todayRecord.checkOut) setCurrentStatus("Checked In");
      else if (todayRecord.checkIn && todayRecord.checkOut) setCurrentStatus("Checked Out");
    } catch (err) {
      console.error(err);
    }
  };

  // Submit attendance
  const submitAttendance = async () => {
    if (latitude === null || longitude === null || !empId || !projId) return;
    const session = currentStatus === "Not Checked In" ? "checkin" : "checkout";

    setLoading(true);
    try {
      await api.post(`${BASE_URL}/api/attendance/submit`, {
        employeeId: Number(empId),
        projectId: Number(projId),
        session,
        latitude,
        longitude,
      });

      // Refresh attendance history and update current status
      await fetchAttendanceHistory();
      const newStatus = session === "checkin" ? "Checked In" : "Checked Out";
      setCurrentStatus(newStatus);
      
      notification.success({
        message: `${session === "checkin" ? "Check-in" : "Check-out"} Successful`,
        description: `You have successfully ${session === "checkin" ? "checked in" : "checked out"} at ${new Date().toLocaleTimeString()}.`,
        placement: 'topRight',
        icon: session === "checkin" ? 
          <LoginOutlined style={{ color: '#52c41a' }} /> : 
          <LogoutOutlined style={{ color: '#1890ff' }} />
      });
    } catch (err) {
      console.error(err);
      notification.error({
        message: 'Attendance Submission Failed',
        description: 'Unable to submit your attendance. Please try again.',
        placement: 'topRight'
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto log location every 1 minute
  useEffect(() => {
    if (!empId || !projId || !latitude || !longitude) return;
    
    const interval = setInterval(() => {
      api
        .post(`${BASE_URL}/api/attendance/log-location`, {
          employeeId: Number(empId),
          projectId: Number(projId),
          latitude,
          longitude,
        })
        .catch(console.error);
    }, 60000);

    return () => clearInterval(interval);
  }, [latitude, longitude, empId, projId, BASE_URL]);

  // Update outside duration every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (!insideGeofence && latitude && longitude) {
        const duration = Math.floor((new Date() - lastInsideTime) / 1000 / 60);
        setOutsideDuration(duration);
        
        // Recalculate zone compliance when outside duration changes
        let zoneCompliance = 0;
        
        if (currentStatus === "Not Checked In") {
          zoneCompliance = 0; // Outside and not checked in = 0%
        } else if (todayStats.hoursWorked === 0) {
          zoneCompliance = 50; // Just checked in but outside = 50%
        } else if (todayStats.hoursWorked > 0) {
          const totalMinutesWorked = todayStats.hoursWorked * 60;
          zoneCompliance = Math.max(0, Math.round(((totalMinutesWorked - duration) / totalMinutesWorked) * 100));
        }
        
        setTodayStats(prev => ({ ...prev, zoneCompliance }));
      } else if (insideGeofence) {
        // If back inside geofence, update compliance
        let zoneCompliance = 100;
        
        if (currentStatus === "Not Checked In") {
          zoneCompliance = 100; // Inside and not checked in = 100%
        } else if (outsideDuration > 0 && todayStats.hoursWorked > 0) {
          const totalMinutesWorked = todayStats.hoursWorked * 60;
          zoneCompliance = Math.max(0, Math.round(((totalMinutesWorked - outsideDuration) / totalMinutesWorked) * 100));
        }
        
        setTodayStats(prev => ({ ...prev, zoneCompliance }));
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [insideGeofence, lastInsideTime, latitude, longitude, todayStats.hoursWorked, currentStatus, outsideDuration]);

  // Initial fetch and project check
  useEffect(() => {
    if (!currentProject && empId) {
      fetchProjects();
    } else if (currentProject) {
      setShowProjectSelection(false);
      fetchAttendanceHistory();
    }
  }, [currentProject, empId]);

  // Update project selection visibility when currentProject changes
  useEffect(() => {
    setShowProjectSelection(!currentProject);
  }, [currentProject]);

  // Listen for refresh events from TopHeader
  useEffect(() => {
    const handleRefreshEvent = () => {
      if (currentProject) {
        fetchAttendanceHistory();
        // Also refresh location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setLatitude(position.coords.latitude);
              setLongitude(position.coords.longitude);
              setLocationAccuracy(position.coords.accuracy);
              setLastLocationUpdate(new Date());
            },
            (error) => console.error("Error getting location:", error),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
          );
        }
      }
    };
    
    window.addEventListener('refreshAttendance', handleRefreshEvent);
    
    return () => {
      window.removeEventListener('refreshAttendance', handleRefreshEvent);
    };
  }, [currentProject]);

  // Show project selection if no project is selected
  if (showProjectSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-xl rounded-2xl border-0 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 -m-6 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <TeamOutlined className="text-2xl text-white" />
                </div>
                <div>
                  <Title level={3} className="text-white mb-0">
                    Project Selection
                  </Title>
                  <Text className="text-blue-100">
                    Choose your project to continue with attendance
                  </Text>
                </div>
              </div>
            </div>
            
            {!empId ? (
              <Alert
                message="Authentication Error"
                description="Employee ID not found. Please login again to continue."
                type="error"
                showIcon
                className="mb-6"
                action={
                  <Button type="primary" size="small" onClick={() => navigate('/login')}>
                    Go to Login
                  </Button>
                }
              />
            ) : projectsLoading ? (
              <div className="text-center py-12">
                <Spin size="large" />
                <div className="mt-4 text-gray-600">Loading available projects...</div>
              </div>
            ) : projects.length === 0 ? (
              <Alert
                message="No Projects Available"
                description="No projects are currently assigned to you. Please contact your supervisor for project assignment."
                type="warning"
                showIcon
                className="mb-6"
              />
            ) : (
              <>
                <div className="mb-6">
                  <Text className="text-gray-600">
                    Please select a project from the list below to continue:
                  </Text>
                </div>
                <Radio.Group
                  className="w-full"
                  onChange={(e) => setSelectedProject(e.target.value)}
                  value={selectedProject}
                >
                  <div className="space-y-3">
                    {projects.map((proj) => (
                      <div key={proj.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50/50 transition-all">
                        <Radio value={proj} className="w-full">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{proj.projectName}</div>
                              <div className="text-sm text-gray-500">Project ID: {proj.id}</div>
                            </div>
                            <HomeOutlined className="text-gray-400" />
                          </div>
                        </Radio>
                      </div>
                    ))}
                  </div>
                </Radio.Group>
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                  <Button 
                    icon={<DashboardOutlined />}
                    onClick={() => navigate('/worker/tasks')}
                  >
                    Back to Dashboard
                  </Button>
                  <Button 
                    type="primary" 
                    size="large"
                    icon={<CheckCircleOutlined />}
                    onClick={handleProjectSelect} 
                    disabled={!selectedProject}
                  >
                    Continue to Attendance
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "Checked In": return { color: "#52c41a", bg: "#f6ffed", border: "#b7eb8f" };
      case "Checked Out": return { color: "#1890ff", bg: "#e6f7ff", border: "#91d5ff" };
      default: return { color: "#ff4d4f", bg: "#fff2f0", border: "#ffccc7" };
    }
  };

  const statusConfig = getStatusColor(currentStatus);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Title level={2} className="mb-2 text-slate-800">
                Geofence Attendance System
              </Title>
              <Text className="text-slate-600 text-lg">
                Smart location-based attendance tracking
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

        <Row gutter={[24, 24]}>
          {/* Left Column - Main Controls */}
          <Col xs={24} lg={14}>
            
            {/* Project Info Card */}
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
                        Active Project • ID: {currentProject.id}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Status Overview Card */}
            <Card className="mb-6 shadow-lg rounded-2xl border-0">
              <div className="flex items-center justify-between mb-6">
                <Title level={4} className="mb-0">Attendance Status</Title>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={getLocation}
                  disabled={loading}
                  type="text"
                  className="text-slate-500"
                >
                  Refresh
                </Button>
              </div>
              
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <div 
                    className="p-4 rounded-xl border-2 text-center"
                    style={{ 
                      backgroundColor: statusConfig.bg, 
                      borderColor: statusConfig.border 
                    }}
                  >
                    <div className="mb-2">
                      {currentStatus === "Checked In" ? (
                        <CheckCircleOutlined className="text-2xl" style={{ color: statusConfig.color }} />
                      ) : currentStatus === "Checked Out" ? (
                        <ClockCircleOutlined className="text-2xl" style={{ color: statusConfig.color }} />
                      ) : (
                        <CloseCircleOutlined className="text-2xl" style={{ color: statusConfig.color }} />
                      )}
                    </div>
                    <div className="font-semibold" style={{ color: statusConfig.color }}>
                      {currentStatus}
                    </div>
                  </div>
                </Col>
                
                <Col xs={24} sm={8}>
                  <div className={`p-4 rounded-xl border-2 text-center ${
                    insideGeofence 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="mb-2">
                      {insideGeofence ? (
                        <CheckCircleOutlined className="text-2xl text-green-600" />
                      ) : (
                        <WarningOutlined className="text-2xl text-red-600" />
                      )}
                    </div>
                    <div className={`font-semibold ${
                      insideGeofence ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {insideGeofence ? 'Inside Zone' : 'Outside Zone'}
                    </div>
                  </div>
                </Col>
                
                <Col xs={24} sm={8}>
                  <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50 text-center">
                    <div className="mb-2">
                      <EnvironmentOutlined className="text-2xl text-blue-600" />
                    </div>
                    <div className="font-semibold text-blue-700">
                      {latitude && longitude ? 'Located' : 'No Location'}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Location Details Card */}
            <Card className="mb-6 shadow-lg rounded-2xl border-0">
              <Title level={4} className="mb-4">Location Information</Title>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <EnvironmentOutlined className="text-slate-500" />
                    <span className="font-medium text-slate-700">Coordinates</span>
                  </div>
                  <div className="text-slate-600 font-mono text-sm">
                    {latitude && longitude
                      ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                      : "Not available"}
                  </div>
                </div>
                
                {locationAccuracy && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <InfoCircleOutlined className="text-slate-500" />
                      <span className="font-medium text-slate-700">Accuracy</span>
                    </div>
                    <div className="text-slate-600">
                      ±{Math.round(locationAccuracy)}m
                    </div>
                  </div>
                )}
                
                {lastLocationUpdate && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <ClockCircleOutlined className="text-slate-500" />
                      <span className="font-medium text-slate-700">Last Update</span>
                    </div>
                    <div className="text-slate-600">
                      {lastLocationUpdate.toLocaleTimeString()}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Action Buttons */}
            <Card className="shadow-lg rounded-2xl border-0">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="large"
                  icon={<EnvironmentOutlined />}
                  onClick={getLocation}
                  disabled={loading}
                  className="flex-1 h-12"
                >
                  {loading ? <Spin /> : "Update Location"}
                </Button>
                
                <Button
                  type="primary"
                  size="large"
                  icon={currentStatus === "Not Checked In" ? <LoginOutlined /> : <LogoutOutlined />}
                  onClick={submitAttendance}
                  disabled={loading || latitude === null || longitude === null || !currentProject}
                  className="flex-1 h-12"
                >
                  {loading ? <Spin /> : 
                    currentStatus === "Not Checked In" ? "Check In" : "Check Out"}
                </Button>
              </div>
              
              {!insideGeofence && outsideDuration > 0 && (
                <Alert
                  message="Outside Work Area"
                  description={`You have been outside the designated work area for ${outsideDuration} minute(s). Please return to the work zone.`}
                  type="warning"
                  showIcon
                  className="mt-4"
                />
              )}
            </Card>
          </Col>

          {/* Right Column - Statistics & History */}
          <Col xs={24} lg={10}>
            
            {/* Quick Stats */}
            <Card className="mb-6 shadow-lg rounded-2xl border-0">
              <Title level={4} className="mb-4">Today's Summary</Title>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="Hours Worked"
                    value={todayStats.hoursWorked}
                    precision={1}
                    suffix="hrs"
                    valueStyle={{ color: '#1890ff' }}
                  />
                  {currentStatus === "Checked In" && (
                    <div className="text-xs text-blue-500 mt-1">
                      🔴 Live tracking
                    </div>
                  )}
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Zone Compliance"
                    value={todayStats.zoneCompliance}
                    suffix="%"
                    valueStyle={{ 
                      color: todayStats.zoneCompliance >= 95 ? '#52c41a' : 
                             todayStats.zoneCompliance >= 80 ? '#faad14' : '#ff4d4f'
                    }}
                  />
                  <div className="text-xs text-slate-500 mt-1">
                    {todayStats.zoneCompliance >= 95 ? '✅ Excellent' : 
                     todayStats.zoneCompliance >= 80 ? '⚠️ Good' : '❌ Needs improvement'}
                  </div>
                </Col>
              </Row>
              
              {/* Additional Info */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Check-in Time:</span>
                  <span>
                    {todayStats.checkInTime 
                      ? new Date(todayStats.checkInTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Not checked in'
                    }
                  </span>
                </div>
                {outsideDuration > 0 && (
                  <div className="flex justify-between text-sm text-orange-600 mt-2">
                    <span>Time Outside Zone:</span>
                    <span>{outsideDuration} minutes</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Attendance History */}
            <Card className="shadow-lg rounded-2xl border-0">
              <div className="flex items-center justify-between mb-4">
                <Title level={4} className="mb-0">Recent History</Title>
                <Badge count={attendanceHistory.length} showZero color="#1890ff" />
              </div>
              
              <Table 
                columns={[
                  { 
                    title: "Date", 
                    dataIndex: "date", 
                    key: "date",
                    width: 100
                  },
                  { 
                    title: "Check In", 
                    dataIndex: "checkIn", 
                    key: "checkIn",
                    width: 80
                  },
                  { 
                    title: "Check Out", 
                    dataIndex: "checkOut", 
                    key: "checkOut",
                    width: 80
                  },
                  {
                    title: "Status",
                    dataIndex: "notes",
                    key: "notes",
                    render: (note) => {
                      const tagProps = {
                        "Pending Checkout": { color: "orange", icon: <ClockCircleOutlined /> },
                        "Outside alert sent": { color: "red", icon: <WarningOutlined /> },
                        "Not Checked In": { color: "default", icon: <CloseCircleOutlined /> },
                      };
                      
                      const props = tagProps[note] || { color: "green", icon: <CheckCircleOutlined /> };
                      
                      return (
                        <Tag color={props.color} icon={props.icon}>
                          {note === "-" ? "Completed" : note}
                        </Tag>
                      );
                    },
                  },
                ]} 
                dataSource={attendanceHistory} 
                pagination={{ 
                  pageSize: 5, 
                  size: "small",
                  showSizeChanger: false
                }}
                size="small"
                className="rounded-lg"
              />
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default GeoFenceAttendance;

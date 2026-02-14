import React, { useEffect, useState, useRef } from 'react';
import { 
  Card, 
  Button, 
  Spin, 
  Alert, 
  Typography, 
  Divider,
  Avatar,
  Row,
  Col,
  Input,
  message,
  Modal,
  Tag
} from 'antd';
import { 
  UserOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ClockCircleOutlined,
  CarOutlined,
  TeamOutlined,
  CalendarOutlined,
  ArrowLeftOutlined,
  ProjectOutlined,
  ScheduleOutlined,
  CameraOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const PickupConfirmation = () => {
  const [task, setTask] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pickupPhotos, setPickupPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [previewImage, setPreviewImage] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');

  const { taskId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Construct full photo URL
  const getPhotoUrl = (photoUrl) => {
    if (!photoUrl) return '';
    if (photoUrl.startsWith('http')) return photoUrl;
    const cleanUrl = photoUrl.startsWith('/') ? photoUrl.slice(1) : photoUrl;
    return `${process.env.REACT_APP_API_URL}/${cleanUrl}`;
  };

  // Enhanced time formatting function that handles both formatted strings and UTC dates
  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      // If it's already a formatted time string like "12:00 AM", return as is
      if (typeof dateString === 'string' && /^\d{1,2}:\d{2} (AM|PM)$/i.test(dateString)) {
        return dateString;
      }
      
      // If it's a UTC date string, parse and format it
      const date = dayjs(dateString);
      
      if (!date.isValid()) {
        return 'Invalid time';
      }
      
      // Format to 12-hour format with AM/PM
      return date.format('hh:mm A');
    } catch (error) {
      console.error('Error formatting time:', error, dateString);
      return 'N/A';
    }
  };

  // Fetch task details and existing photos
  useEffect(() => {
    const fetchTaskAndPhotos = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Fetch task details - use the same API as Today Tasks
        const taskResponse = await api.get(`/driver/tasks/${taskId}`);
        if (taskResponse.data) {
          console.log('Task data for pickup confirmation:', {
            startTime: taskResponse.data.startTime,
            endTime: taskResponse.data.endTime,
            formattedStart: formatTime(taskResponse.data.startTime),
            formattedEnd: formatTime(taskResponse.data.endTime)
          });
          setTask(taskResponse.data);
          const initializedPassengers = taskResponse.data.passengers?.map(p => ({
            ...p,
            pickupStatus: 'pending'
          })) || [];
          setPassengers(initializedPassengers);
        }

        // Fetch existing photos for this task from fleet tasks API
        const photosResponse = await api.get(`/fleet-tasks/${taskId}/photos?photoType=pickup`);
        if (photosResponse.data.success) {
          setPickupPhotos(photosResponse.data.data || []);
        }
      } catch (err) {
        console.error('Error fetching task or photos:', err);
        setError('Failed to load task details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTaskAndPhotos();
  }, [taskId]);

  const togglePassengerStatus = (index) => {
    setPassengers(prev => prev.map((p, i) => {
      if (i === index) {
        const statusCycle = { 'pending': 'present', 'present': 'absent', 'absent': 'pending' };
        return { ...p, pickupStatus: statusCycle[p.pickupStatus] };
      }
      return p;
    }));
  };

  const handleCapturePhoto = () => fileInputRef.current.click();

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);

      const formData = new FormData();
      formData.append('photo', file);
      formData.append('photoType', 'pickup');
      formData.append('driverId', task?.driverId?.toString() || '1');
      formData.append('companyId', task?.companyId?.toString() || '1');
      formData.append('remarks', remarks);

      const response = await api.post(`/fleet-tasks/${taskId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        // Refresh photos list to include the newly uploaded one
        const photosResponse = await api.get(`/fleet-tasks/${taskId}/photos?photoType=pickup`);
        if (photosResponse.data.success) {
          setPickupPhotos(photosResponse.data.data || []);
        }
        message.success('Photo captured successfully!');
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      message.error('Failed to capture photo');
    } finally {
      setUploadingPhoto(false);
      event.target.value = '';
    }
  };

  const handleRemovePhoto = async (photoId) => {
    try {
      await api.delete(`/fleet-tasks/photos/${photoId}`);
      // Refresh photos list after deletion
      const photosResponse = await api.get(`/fleet-tasks/${taskId}/photos?photoType=pickup`);
      if (photosResponse.data.success) {
        setPickupPhotos(photosResponse.data.data || []);
      }
      message.success('Photo removed successfully');
    } catch (err) {
      console.error('Error removing photo:', err);
      message.error('Failed to remove photo');
    }
  };

  const handlePreview = (photo) => {
    const photoUrl = getPhotoUrl(photo.photoUrl);
    setPreviewImage(photoUrl);
    setPreviewTitle(photo.photoUrl?.split('/').pop() || 'Pickup Proof');
    setPreviewVisible(true);
  };

  const handleConfirmPickups = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const confirmedIds = passengers.filter(p => p.pickupStatus === 'present').map(p => p.id);
      const missedIds = passengers.filter(p => p.pickupStatus === 'absent').map(p => p.id);
      const photoIds = pickupPhotos.map(photo => photo._id);

      const response = await api.post(`/fleet-tasks/${taskId}/pickup`, {
        confirmed: confirmedIds,
        missed: missedIds,
        remarks,
        photoIds
      });

      if (response.data.success) {
        setSuccess('Pickup confirmed successfully! Redirecting to drop confirmation...');
        setTimeout(() => navigate(`/driver/tasks/${taskId}/drop`), 1500);
      }
    } catch (err) {
      console.error('Error confirming pickups:', err);
      setError(err.response?.data?.message || 'Failed to confirm pickups');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      present: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      absent: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      pending: <ScheduleOutlined style={{ color: '#faad14' }} />
    };
    return icons[status] || icons.pending;
  };

  const getStatusText = (status) => {
    const texts = { present: 'Present', absent: 'Absent', pending: 'Pending' };
    return texts[status] || texts.pending;
  };

  const getStatusColor = (status) => {
    const colors = { present: 'green', absent: 'red', pending: 'orange' };
    return colors[status] || colors.pending;
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <Spin size="large" />
      <Text className="mt-4">Loading pickup details...</Text>
    </div>
  );

  if (error && !task) return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Alert message="Error Loading Task" description={error} type="error" showIcon className="mb-4"/>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/driver/tasks')}>Back to Tasks</Button>
    </div>
  );

  const presentCount = passengers.filter(p => p.pickupStatus === 'present').length;
  const absentCount = passengers.filter(p => p.pickupStatus === 'absent').length;
  const pendingCount = passengers.filter(p => p.pickupStatus === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="text-center mb-6">
        <Title level={3}>📍 Pickup Confirmation</Title>
        <Text type="secondary">Tap passengers to mark Present ✅ or Absent ❌</Text>
      </div>

      {success && <Alert message={success} type="success" showIcon closable className="mb-4" />}
      {error && <Alert message={error} type="error" showIcon closable className="mb-4" />}

      {/* Task Info */}
      <Card className="bg-white border-0 shadow-sm rounded-lg mb-4 text-center">
        <div className="space-y-2">
          <div className="flex justify-center items-center space-x-2">
            <ProjectOutlined className="text-blue-600" />
            <Text strong>{task?.projectName}</Text>
          </div>
          <div className="flex justify-center items-center space-x-2">
            <CarOutlined className="text-green-600" />
            <Text strong>{task?.vehicleNo}</Text>
          </div>
          <div className="flex justify-center items-center space-x-2">
            <ClockCircleOutlined className="text-orange-600" />
            <Text strong>{formatTime(task?.startTime)} → {formatTime(task?.endTime)}</Text>
          </div>
        </div>
      </Card>

      {/* Photo Capture */}
      <Card className="bg-white border-0 shadow-sm rounded-lg mb-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <CameraOutlined className="text-blue-600 text-xl" />
              <div>
                <Text strong>Capture Photo</Text>
                <Text type="secondary" className="text-sm">Opens camera for photo capture</Text>
              </div>
            </div>
            <Button 
              icon={<CameraOutlined />} 
              loading={uploadingPhoto}
              onClick={handleCapturePhoto}
              type="primary"
            >
              Capture
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
          </div>

          {/* Preview Section - Now shows ALL photos from server */}
          {pickupPhotos.length > 0 && (
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <EyeOutlined className="text-green-600 text-xl" />
                <div>
                  <Text strong>All Pickup Photos ({pickupPhotos.length})</Text>
                  <Text type="secondary" className="text-sm">Click to preview captured photos</Text>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {pickupPhotos.map(photo => (
                  <div key={photo._id} className="relative group bg-white p-2 rounded-lg border border-gray-200">
                    <div className="cursor-pointer" onClick={() => handlePreview(photo)}>
                      <img 
                        src={getPhotoUrl(photo.photoUrl)}
                        alt="Pickup proof"
                        className="rounded-lg object-cover h-20 w-full border"
                        onError={(e) => { 
                          e.target.src = 'https://via.placeholder.com/150?text=Image+Error'; 
                          e.target.alt = 'Image failed to load';
                        }}
                      />
                      <div className="mt-1 text-xs text-gray-500 truncate">
                        {dayjs(photo.createdAt).format('HH:mm')}
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center space-x-1 rounded-lg">
                      <Button 
                        icon={<EyeOutlined />} 
                        size="small" 
                        type="primary" 
                        ghost 
                        onClick={() => handlePreview(photo)} 
                      />
                      <Button 
                        icon={<DeleteOutlined />} 
                        size="small" 
                        danger 
                        ghost 
                        onClick={() => handleRemovePhoto(photo._id)} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remarks */}
          <div className="p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center space-x-3 mb-2">
              <CalendarOutlined className="text-orange-600 text-xl" />
              <Text strong>Remarks</Text>
            </div>
            <TextArea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add pickup remarks..."
              rows={3}
              showCount
              maxLength={500}
            />
          </div>
        </div>
      </Card>

      <Divider />

      {/* Passengers */}
      <Card title={<div className="flex items-center space-x-2"><TeamOutlined className="text-blue-600"/>Passengers ({passengers.length})</div>} className="bg-white border-0 shadow-sm rounded-lg mb-4">
        {passengers.map((p, i) => (
          <div key={p.id || i} onClick={() => togglePassengerStatus(i)} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer mb-2 transition-all ${p.pickupStatus === 'present' ? 'bg-green-50 border-green-200' : p.pickupStatus === 'absent' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200 hover:bg-blue-50'}`}>
            <div className="flex items-center space-x-3">
              <Avatar icon={<UserOutlined />} className={`${p.pickupStatus === 'present' ? 'bg-green-500' : p.pickupStatus === 'absent' ? 'bg-red-500' : 'bg-gray-400'} text-white`} />
              <div>
                <Text strong>{p.name || `Passenger ${i+1}`}</Text>
                <Text type="secondary" className="text-sm">{p.pickupPoint || 'Location not specified'}</Text>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Tag color={getStatusColor(p.pickupStatus)}>{getStatusText(p.pickupStatus)}</Tag>
              {getStatusIcon(p.pickupStatus)}
            </div>
          </div>
        ))}
      </Card>

      {/* Stats */}
      <Row gutter={16} className="mb-6">
        <Col span={6}><div className="text-center p-3 bg-blue-50 rounded-lg"><TeamOutlined className="text-blue-600 text-2xl mb-2"/><div className="text-blue-600 text-2xl font-bold">{passengers.length}</div><Text>Total</Text></div></Col>
        <Col span={6}><div className="text-center p-3 bg-green-50 rounded-lg"><CheckCircleOutlined className="text-green-600 text-2xl mb-2"/><div className="text-green-600 text-2xl font-bold">{presentCount}</div><Text>Present</Text></div></Col>
        <Col span={6}><div className="text-center p-3 bg-red-50 rounded-lg"><CloseCircleOutlined className="text-red-600 text-2xl mb-2"/><div className="text-red-600 text-2xl font-bold">{absentCount}</div><Text>Absent</Text></div></Col>
        <Col span={6}><div className="text-center p-3 bg-orange-50 rounded-lg"><ScheduleOutlined className="text-orange-600 text-2xl mb-2"/><div className="text-orange-600 text-2xl font-bold">{pendingCount}</div><Text>Pending</Text></div></Col>
      </Row>

      {pendingCount > 0 && <Alert message="Action Required" description="Please mark all passengers before confirming." type="warning" showIcon className="mb-4" />}

      {/* Confirm Button */}
      <div className="sticky bottom-4 space-y-2">
        <Button type="primary" size="large" loading={submitting} onClick={handleConfirmPickups} disabled={pendingCount>0 || passengers.length===0 || submitting} className="w-full bg-green-600 hover:bg-green-700">
          {submitting ? 'CONFIRMING PICKUPS...' : `Confirm Pickup (${presentCount + absentCount}/${passengers.length})`}
        </Button>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/driver/tasks/${taskId}`)} className="w-full">Back to Task</Button>
      </div>

      {/* Preview Modal */}
      <Modal
        visible={previewVisible}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width="80vw"
        style={{ top: 20 }}
        bodyStyle={{ padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}
      >
        <div style={{ width: '100%', height: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <img 
            alt="Preview" 
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} 
            src={previewImage} 
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
              e.target.alt = 'Image not available';
            }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default PickupConfirmation;
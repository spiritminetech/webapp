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
  Image,
  Input,
  message,
  Modal,
  Tag
} from 'antd';
import { 
  UserOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  CarOutlined,
  TeamOutlined,
  ArrowLeftOutlined,
  ProjectOutlined,
  CameraOutlined,
  EyeOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  ScheduleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const DropConfirmation = () => {
  const [task, setTask] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dropoffPhotos, setDropoffPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [previewImage, setPreviewImage] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');

  const { taskId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Fixed: Better photo URL handling
  const getPhotoUrl = (photoUrl) => {
    if (!photoUrl) return '';
    
    // Remove leading slash if present
    const cleanUrl = photoUrl.startsWith('/') ? photoUrl.slice(1) : photoUrl;
    
    // Check if it's already a full URL
    if (photoUrl.startsWith('http')) {
      return photoUrl;
    }
    
    // Construct full URL
    return `${process.env.REACT_APP_API_URL}/${cleanUrl}`;
  };

  // Format time function
  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return dayjs(dateString).format('HH:mm A');
  };

  useEffect(() => {
    const fetchTask = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await api.get(`/driver/tasks/${taskId}`);
        
        if (response.data) {
          setTask(response.data);
          const initializedPassengers = response.data.passengers?.map(p => ({
            ...p,
            dropStatus: 'pending'
          })) || [];
          setPassengers(initializedPassengers);
        }
      } catch (err) {
        console.error('Error fetching task:', err);
        setError('Failed to load task details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTask();
  }, [taskId]);

  const togglePassengerStatus = (passengerIndex) => {
    setPassengers(prev => 
      prev.map((passenger, index) => {
        if (index === passengerIndex) {
          const statusCycle = {
            'pending': 'present',
            'present': 'absent', 
            'absent': 'pending'
          };
          return {
            ...passenger,
            dropStatus: statusCycle[passenger.dropStatus]
          };
        }
        return passenger;
      })
    );
  };

  const handleCapturePhoto = () => {
    fileInputRef.current.click();
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        setUploadingPhoto(true);
        
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('photoType', 'dropoff');
        formData.append('driverId', task?.driverId?.toString() || '1');
        formData.append('companyId', task?.companyId?.toString() || '1');
        formData.append('remarks', remarks);

        const response = await api.post(`/fleet-tasks/${taskId}/photos`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data.success) {
          setDropoffPhotos(prev => [...prev, response.data.data]);
          message.success('Photo captured successfully!');
        }
      } catch (error) {
        console.error('Error uploading photo:', error);
        message.error('Failed to capture photo');
      } finally {
        setUploadingPhoto(false);
        event.target.value = '';
      }
    }
  };

  const handleRemovePhoto = async (photoId) => {
    try {
      await api.delete(`/fleet-tasks/photos/${photoId}`);
      setDropoffPhotos(prev => prev.filter(photo => photo._id !== photoId));
      message.success('Photo removed successfully');
    } catch (error) {
      console.error('Error removing photo:', error);
      message.error('Failed to remove photo');
    }
  };

  // Fixed: Better preview handling
  const handlePreview = (photo) => {
    const photoUrl = getPhotoUrl(photo.photoUrl);
    console.log('Preview URL:', photoUrl); // Debug log
    setPreviewImage(photoUrl);
    setPreviewTitle(photo.photoUrl?.split('/').pop() || 'Drop-off Proof');
    setPreviewVisible(true);
  };

  const handleConfirmDropoffs = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const confirmedIds = passengers
        .filter(p => p.dropStatus === 'present')
        .map(p => p.id);

      const missedIds = passengers
        .filter(p => p.dropStatus === 'absent')
        .map(p => p.id);

      const photoIds = dropoffPhotos.map(photo => photo._id);

      const response = await api.post(`/fleet-tasks/${taskId}/drop`, {
        confirmed: confirmedIds,
        missed: missedIds,
        remarks: remarks,
        photoIds: photoIds
      });

      if (response.data.success) {
        setSuccess('Drop-off confirmed successfully! Redirecting to trip summary...');
        
        setTimeout(() => {
          navigate(`/driver/tasks/${taskId}/summary`);
        }, 1500);
      }
    } catch (err) {
      console.error('Error confirming drop-offs:', err);
      setError(err.response?.data?.message || 'Failed to confirm drop-offs');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      'present': <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      'absent': <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      'pending': <ScheduleOutlined style={{ color: '#faad14' }} />
    };
    return icons[status] || icons.pending;
  };

  const getStatusText = (status) => {
    const texts = { 
      present: 'Present', 
      absent: 'Absent', 
      pending: 'Pending' 
    };
    return texts[status] || texts.pending;
  };

  const getStatusColor = (status) => {
    const colors = {
      'present': 'green',
      'absent': 'red',
      'pending': 'orange'
    };
    return colors[status] || colors.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Spin size="large" />
        <Text className="mt-4">Loading drop details...</Text>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Alert message="Error Loading Task" description={error} type="error" showIcon className="mb-4"/>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/driver/tasks')}>
          Back to Tasks
        </Button>
      </div>
    );
  }

  const presentCount = passengers.filter(p => p.dropStatus === 'present').length;
  const absentCount = passengers.filter(p => p.dropStatus === 'absent').length;
  const pendingCount = passengers.filter(p => p.dropStatus === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="text-center mb-6">
        <Title level={3}>📍 Drop Confirmation</Title>
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

          {/* Preview Section - Fixed */}
          {dropoffPhotos.length > 0 && (
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <EyeOutlined className="text-green-600 text-xl" />
                <div>
                  <Text strong>Uploaded Photos ({dropoffPhotos.length})</Text>
                  <Text type="secondary" className="text-sm">Click to preview captured photos</Text>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {dropoffPhotos.map((photo) => (
                  <div key={photo._id} className="relative group bg-white p-2 rounded-lg border border-gray-200">
                    <div 
                      className="cursor-pointer"
                      onClick={() => handlePreview(photo)}
                    >
                      <img
                        src={getPhotoUrl(photo.photoUrl)}
                        alt="Drop-off proof"
                        className="rounded-lg object-cover h-20 w-full border"
                        onError={(e) => {
                          console.error('Image failed to load:', getPhotoUrl(photo.photoUrl));
                          e.target.src = 'https://via.placeholder.com/150?text=Image+Error';
                        }}
                      />
                      <div className="mt-1 text-xs text-gray-500 truncate">
                        {photo.photoUrl?.split('/').pop()}
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center space-x-1 rounded-lg">
                      <Button
                        icon={<EyeOutlined />}
                        size="small"
                        type="primary"
                        ghost
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handlePreview(photo)}
                      />
                      <Button
                        icon={<DeleteOutlined />}
                        size="small"
                        danger
                        ghost
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
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
              placeholder="Add dropoff remarks..."
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
          <div key={p.id || i} onClick={() => togglePassengerStatus(i)} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer mb-2 transition-all ${p.dropStatus === 'present' ? 'bg-green-50 border-green-200' : p.dropStatus === 'absent' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200 hover:bg-blue-50'}`}>
            <div className="flex items-center space-x-3">
              <Avatar icon={<UserOutlined />} className={`${p.dropStatus === 'present' ? 'bg-green-500' : p.dropStatus === 'absent' ? 'bg-red-500' : 'bg-gray-400'} text-white`} />
              <div>
                <Text strong>{p.name || `Passenger ${i+1}`}</Text>
                <Text type="secondary" className="text-sm">{p.dropPoint || p.pickupPoint || 'Location not specified'}</Text>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Tag color={getStatusColor(p.dropStatus)}>{getStatusText(p.dropStatus)}</Tag>
              {getStatusIcon(p.dropStatus)}
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
        <Button type="primary" size="large" loading={submitting} onClick={handleConfirmDropoffs} disabled={pendingCount>0 || passengers.length===0 || submitting} className="w-full bg-green-600 hover:bg-green-700">
          {submitting ? 'CONFIRMING DROPOFFS...' : `Confirm Dropoff (${presentCount + absentCount}/${passengers.length})`}
        </Button>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/driver/tasks/${taskId}`)} className="w-full">Back to Task</Button>
      </div>

      {/* Fixed: Better Preview Modal */}
      <Modal
        visible={previewVisible}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width="80vw"
        style={{ top: 20 }}
        bodyStyle={{ 
          padding: 0, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: '#f0f0f0'
        }}
      >
        <div style={{ width: '100%', height: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <img 
            alt="Preview" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%', 
              objectFit: 'contain',
              borderRadius: '8px'
            }} 
            src={previewImage} 
            onError={(e) => {
              console.error('Preview image failed to load:', previewImage);
              e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
              e.target.alt = 'Image not available';
            }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default DropConfirmation;
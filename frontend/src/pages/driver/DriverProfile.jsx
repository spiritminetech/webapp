import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { 
  Card, 
  Button, 
  Spin, 
  Alert, 
  Typography, 
  Row, 
  Col, 
  Avatar,
  Form,
  Input,
  message
} from 'antd';
import { 
  UserOutlined,
  CameraOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  UploadOutlined,
  IdcardOutlined,
  RocketOutlined,
  BankOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const DriverProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);

  const [messageText, setMessageText] = useState("");
  const [error, setError] = useState("");

  const [form] = Form.useForm();

  const token = localStorage.getItem("token");
   const API_BASE_URL = `${process.env.REACT_APP_API_BASE_URL}/api`;

  // Update localStorage with profile data
  const updateLocalStorageUserData = (profileData) => {
    try {
      // Get current user data or create empty object
      const currentUserData = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Update with profile data - note: API response has {success: true, profile: {...}}
      const actualProfileData = profileData.profile || profileData;
      
      const updatedUserData = {
        ...currentUserData,
        id: actualProfileData.id,
        name: actualProfileData.name,
        email: actualProfileData.email,
        avatar: getPhotoUrl(actualProfileData.photo_url),
        role: actualProfileData.role,
        companyName: actualProfileData.companyName,
        phoneNumber: actualProfileData.phoneNumber
      };
      
      localStorage.setItem('user', JSON.stringify(updatedUserData));
      
      // Dispatch custom event for TopHeader to listen to
      window.dispatchEvent(new CustomEvent('userDataUpdated', {
        detail: updatedUserData
      }));
      
      // Also dispatch storage event
      window.dispatchEvent(new Event('storage'));
      
    } catch (error) {
      console.error("Error updating localStorage:", error);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      const res = await axios.get(`${API_BASE_URL}/driver/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.data.success && res.data.profile) {
        setProfile(res.data.profile);
        setError("");
        
        // Update localStorage with the correct data structure
        updateLocalStorageUserData(res.data);
      } else {
        throw new Error("Invalid profile data structure");
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      setError("Error fetching profile data");
      
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      navigate("/login");
      setLoading(false);
    }
  }, [token, navigate]);

  const handlePasswordChange = async (values) => {
    const { oldPassword, newPassword, confirmPassword } = values;
    
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    try {
      const res = await axios.put(
        `${API_BASE_URL}/api/driver/profile/password`,
        { oldPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessageText(res.data.message || "Password updated successfully");
      setError("");
      setShowPasswordForm(false);
      form.resetFields();
      message.success("Password updated successfully!");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Error updating password";
      setError(errorMsg);
      setMessageText("");
      message.error(errorMsg);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError("Please select a valid image file");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("Image size should be less than 5MB");
        return;
      }

      setPhoto(file);
      setPreview(URL.createObjectURL(file));
      setError("");
    }
  };

  const handlePhotoUpload = async () => {
    if (!photo) {
      setError("Please select an image first");
      return;
    }

    setUploading(true);
    setError("");
    setMessageText("");

    const formData = new FormData();
    formData.append("photo", photo);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/driver/profile/photo`,
        formData, 
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Refresh profile data
      await fetchProfile();
      
      setMessageText("Profile photo updated successfully");
      setPhoto(null);
      setPreview(null);
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      
      message.success("Profile photo updated successfully!");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Error uploading photo";
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return "N/A";
    const cleaned = phoneNumber.toString().replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+91-${cleaned.substring(0, 5)}-${cleaned.substring(5)}`;
    }
    return phoneNumber;
  };

  // Fixed photo URL function
  const getPhotoUrl = (photoUrl) => {
    if (!photoUrl) return null;
    
    // If it's already a full URL, return as is with cache busting
    if (photoUrl.startsWith('http')) {
      return `${photoUrl}?t=${new Date().getTime()}`;
    }
    
    // If it starts with /uploads, prepend API base URL
    if (photoUrl.startsWith('/uploads/')) {
      return `${API_BASE_URL}${photoUrl}?t=${new Date().getTime()}`;
    }
    
    // If it's just a filename, construct the full path
    return `${API_BASE_URL}/uploads/drivers/${photoUrl}?t=${new Date().getTime()}`;
  };

  const handleCancelPasswordChange = () => {
    setShowPasswordForm(false);
    setError("");
    setMessageText("");
    form.resetFields();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spin size="large" indicator={<RocketOutlined spin />} />
          <Text className="block mt-4 text-gray-600">Loading profile...</Text>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600 mb-4">Unable to load profile data</p>
          <button
            onClick={() => fetchProfile()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <Title level={2} className="text-gray-800">
              <IdcardOutlined className="mr-3" />
              Profile
            </Title>
            <Text className="text-gray-600">Manage your profile information and security settings</Text>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Photo Upload Section */}
            <div className="lg:col-span-1">
              <Card className="rounded-xl shadow-sm border border-gray-200">
                <div className="flex flex-col items-center">
                  <div className="relative mb-6">
                    <Avatar
                      size={128}
                      src={preview || getPhotoUrl(profile.photo_url)}
                      icon={<UserOutlined />}
                      className="border-4 border-white shadow-lg"
                    />
                    {preview && (
                      <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
                        <Text className="text-white text-sm font-medium">Preview</Text>
                      </div>
                    )}
                  </div>

                  <div className="w-full mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <CameraOutlined className="mr-2" />
                      Upload New Photo
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>

                  <Button
                    onClick={handlePhotoUpload}
                    disabled={!photo || uploading}
                    icon={<UploadOutlined />}
                    className="w-full"
                    type="primary"
                    loading={uploading}
                  >
                    {uploading ? "Uploading..." : "Upload Photo"}
                  </Button>

                  <div className="mt-4 text-xs text-gray-500 text-center">
                    <Text>Supported: JPG, PNG, GIF</Text>
                    <br />
                    <Text>Max size: 5MB</Text>
                  </div>
                </div>
              </Card>
            </div>

            {/* Profile Information Section */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="rounded-xl shadow-sm border border-gray-200">
                <Title level={4} className="text-gray-800 mb-6">
                  <UserOutlined className="mr-2" />
                  Profile Information
                </Title>
                
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <UserOutlined className="text-blue-600" />
                      <div>
                        <Text className="text-gray-600 text-sm block">Full Name</Text>
                        <Text strong className="text-gray-900">{profile.name || "N/A"}</Text>
                      </div>
                    </div>
                  </Col>
                  
                  <Col xs={24} sm={12}>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <MailOutlined className="text-green-600" />
                      <div>
                        <Text className="text-gray-600 text-sm block">Email Address</Text>
                        <Text strong className="text-gray-900">{profile.email || "N/A"}</Text>
                      </div>
                    </div>
                  </Col>
                  
                  <Col xs={24} sm={12}>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <PhoneOutlined className="text-orange-600" />
                      <div>
                        <Text className="text-gray-600 text-sm block">Phone Number</Text>
                        <Text strong className="text-gray-900">
                          {formatPhoneNumber(profile.phoneNumber)}
                        </Text>
                      </div>
                    </div>
                  </Col>
                  
                  <Col xs={24} sm={12}>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <BankOutlined className="text-purple-600" />
                      <div>
                        <Text className="text-gray-600 text-sm block">Company Name</Text>
                        <Text strong className="text-gray-900">
                          {profile.companyName || "N/A"}
                        </Text>
                      </div>
                    </div>
                  </Col>
                  
                  <Col xs={24} sm={12}>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <SafetyCertificateOutlined className="text-red-600" />
                      <div>
                        <Text className="text-gray-600 text-sm block">Role</Text>
                        <Text strong className="text-gray-900 capitalize">{profile.role || "Driver"}</Text>
                      </div>
                    </div>
                  </Col>
                  
                  <Col xs={24} sm={12}>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <CalendarOutlined className="text-cyan-600" />
                      <div>
                        <Text className="text-gray-600 text-sm block">Member Since</Text>
                        <Text strong className="text-gray-900">
                          {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A"}
                        </Text>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* Security Settings Section */}
              <Card className="rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                  <Title level={4} className="text-gray-800">
                    <LockOutlined className="mr-2" />
                    Security Settings
                  </Title>
                  <Button
                    onClick={() => {
                      if (showPasswordForm) {
                        handleCancelPasswordChange();
                      } else {
                        setShowPasswordForm(true);
                        setError("");
                        setMessageText("");
                      }
                    }}
                    icon={showPasswordForm ? <CloseOutlined /> : <EditOutlined />}
                    type={showPasswordForm ? "default" : "primary"}
                  >
                    {showPasswordForm ? "Cancel" : "Change Password"}
                  </Button>
                </div>

                {showPasswordForm && (
                  <Form 
                    form={form}
                    onFinish={handlePasswordChange}
                    layout="vertical"
                  >
                    <Form.Item 
                      name="oldPassword"
                      label="Current Password" 
                      rules={[
                        { required: true, message: 'Please enter your current password' }
                      ]}
                    >
                      <Input.Password
                        placeholder="Enter your current password"
                        prefix={<LockOutlined />}
                      />
                    </Form.Item>

                    <Form.Item 
                      name="newPassword"
                      label="New Password" 
                      rules={[
                        { required: true, message: 'Please enter new password' },
                        { min: 6, message: 'Password must be at least 6 characters' }
                      ]}
                    >
                      <Input.Password
                        placeholder="Enter new password"
                        prefix={<LockOutlined />}
                      />
                    </Form.Item>

                    <Form.Item 
                      name="confirmPassword"
                      label="Confirm New Password" 
                      dependencies={['newPassword']}
                      rules={[
                        { required: true, message: 'Please confirm your new password' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('newPassword') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('The two passwords do not match'));
                          },
                        }),
                      ]}
                    >
                      <Input.Password
                        placeholder="Confirm new password"
                        prefix={<LockOutlined />}
                      />
                    </Form.Item>

                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      className="w-full"
                    >
                      Update Password
                    </Button>
                  </Form>
                )}

                {!showPasswordForm && (
                  <div className="text-sm text-gray-600">
                    <Text className="mb-2 block">
                      <SafetyCertificateOutlined className="mr-2" />
                      Password security tips:
                    </Text>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Use at least 6 characters</li>
                      <li>Include numbers and special characters</li>
                      <li>Avoid common words or phrases</li>
                    </ul>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Messages and Errors */}
          <div className="mt-6">
            {messageText && (
              <Alert
                message={messageText}
                type="success"
                showIcon
                closable
                className="mb-4"
              />
            )}

            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                closable
                className="mb-4"
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DriverProfile;
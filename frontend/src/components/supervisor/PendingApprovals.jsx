import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Badge, Button, Spin, message, Empty, Tag, Modal, Input, Tooltip, Avatar, Divider } from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  CloseOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
  ToolOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { leaveService } from '../../services';
import appConfig from '../../config/app.config.js';
import tokenService from '../../services/TokenService.js';
import './PendingApprovals.css';

const { TextArea } = Input;

/**
 * PendingApprovals Component
 * 
 * Displays and manages pending approval requests for supervisors with:
 * - Categorized approval lists with type badges
 * - Approve/reject modal with mandatory remarks field
 * - Real-time pending count updates
 * - Priority-based sorting and visual indicators
 * - Mobile-first responsive design
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
const PendingApprovals = ({ 
  supervisorId, 
  items = [],
  onApprove,
  onReject,
  refreshInterval = 30000,
  className = '' 
}) => {
  const { user } = useAuth();
  const [approvalItems, setApprovalItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(null); // 'approve' or 'reject'
  const [selectedItem, setSelectedItem] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  // Fetch pending approvals data
  const fetchPendingApprovals = useCallback(async (isRefresh = false) => {
    if (!supervisorId) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Call real API to get pending approvals
      const response = await fetch(`${appConfig.api.baseURL}/api/supervisor/${supervisorId}/approvals`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenService.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pending approvals: ${response.status}`);
      }

      const data = await response.json();
      const approvals = data.approvals || [];
      
      setApprovalItems(approvals);
      setLastUpdated(new Date());
      
      if (isRefresh) {
        message.success('Pending approvals refreshed');
      }

      // Log for monitoring
      if (appConfig.features.enableDebug) {
        console.log(`Loaded ${approvals.length} pending approvals for supervisor ${supervisorId}`);
      }

    } catch (err) {
      console.error('Failed to fetch pending approvals:', err);
      setError(err.message || 'Failed to load pending approvals');
      message.error('Failed to load pending approvals');
      setApprovalItems([]); // Clear approvals on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supervisorId]);

  // Initial load
  useEffect(() => {
    fetchPendingApprovals();
  }, [fetchPendingApprovals]);

  // Auto-refresh interval
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(() => {
      fetchPendingApprovals(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchPendingApprovals, refreshInterval]);

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    fetchPendingApprovals(true);
  }, [fetchPendingApprovals]);

  // Get approval type configuration
  const getApprovalTypeConfig = useCallback((type) => {
    const configs = {
      leave: {
        icon: <CalendarOutlined />,
        color: 'blue',
        label: 'Leave Request',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      },
      advance_payment: {
        icon: <DollarOutlined />,
        color: 'green',
        label: 'Advance Payment',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      },
      material_request: {
        icon: <ToolOutlined />,
        color: 'orange',
        label: 'Material Request',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      },
      attendance_correction: {
        icon: <ClockCircleOutlined />,
        color: 'purple',
        label: 'Attendance Correction',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
      }
    };
    return configs[type] || {
      icon: <FileTextOutlined />,
      color: 'default',
      label: 'Request',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    };
  }, []);

  // Get priority configuration
  const getPriorityConfig = useCallback((priority) => {
    const configs = {
      high: { color: 'red', text: 'High Priority', icon: <ExclamationCircleOutlined /> },
      medium: { color: 'orange', text: 'Medium Priority', icon: <ClockCircleOutlined /> },
      low: { color: 'blue', text: 'Low Priority', icon: <FileTextOutlined /> }
    };
    return configs[priority] || configs.medium;
  }, []);

  // Format time ago
  const formatTimeAgo = useCallback((date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  }, []);

  // Handle approval action
  const handleApprovalAction = useCallback((item, action) => {
    setSelectedItem(item);
    setModalType(action);
    setModalVisible(true);
    setRemarks('');
  }, []);

  // Process approval decision
  const processApprovalDecision = useCallback(async () => {
    if (!selectedItem || !modalType) return;

    // Validate mandatory remarks
    if (!remarks.trim()) {
      message.error('Please provide remarks for this decision');
      return;
    }

    try {
      setProcessing(true);

      // TODO: Replace with actual API call when backend endpoint is implemented (Task 7.2)
      // For now, simulate API call
      console.warn('API not ready, simulating approval decision processing');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const decision = modalType === 'approve' ? 'approved' : 'rejected';
      
      // Call parent handlers if provided
      if (modalType === 'approve' && onApprove) {
        await onApprove(selectedItem.approvalId, remarks);
      } else if (modalType === 'reject' && onReject) {
        await onReject(selectedItem.approvalId, remarks);
      }

      // Remove processed item from local state
      setApprovalItems(prev => prev.filter(item => item.approvalId !== selectedItem.approvalId));
      
      message.success(`Request ${decision} successfully`);
      
      // Close modal
      setModalVisible(false);
      setSelectedItem(null);
      setModalType(null);
      setRemarks('');

      // Log for audit
      if (appConfig.features.enableDebug) {
        console.log(`Approval decision processed:`, {
          approvalId: selectedItem.approvalId,
          decision,
          remarks: remarks.substring(0, 50) + '...'
        });
      }

    } catch (err) {
      console.error('Failed to process approval decision:', err);
      message.error(`Failed to ${modalType} request`);
    } finally {
      setProcessing(false);
    }
  }, [selectedItem, modalType, remarks, onApprove, onReject]);

  // Render approval details - Mobile Optimized
  const renderApprovalDetails = useCallback((item) => {
    const { details, type } = item;
    
    switch (type) {
      case 'leave':
        return (
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-700 font-medium">
              <CalendarOutlined className="mr-2 text-blue-500" />
              <span>{details.leaveType} • {details.duration}</span>
            </div>
            <div className="text-sm text-gray-600 pl-6">
              {new Date(details.fromDate).toLocaleDateString()} - {new Date(details.toDate).toLocaleDateString()}
            </div>
            {details.reason && (
              <div className="text-sm text-gray-600 italic pl-6 bg-gray-50 p-2 rounded">
                "{details.reason}"
              </div>
            )}
          </div>
        );
      
      case 'advance_payment':
        return (
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-700 font-medium">
              <DollarOutlined className="mr-2 text-green-500" />
              <span className="font-semibold">{details.currency} {details.amount}</span>
            </div>
            <div className="text-sm text-gray-600 pl-6">{details.reason}</div>
            <div className="text-xs text-gray-500 pl-6 bg-gray-50 p-2 rounded">
              {details.repaymentPlan}
            </div>
          </div>
        );
      
      case 'material_request':
        return (
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-700 font-medium">
              <ToolOutlined className="mr-2 text-orange-500" />
              <span>{details.materials?.length || 0} items • SGD {details.estimatedCost}</span>
            </div>
            <div className="text-sm text-gray-600 pl-6">{details.project}</div>
            {details.urgency && (
              <div className="text-sm text-orange-600 font-medium pl-6 bg-orange-50 p-2 rounded">
                {details.urgency}
              </div>
            )}
          </div>
        );
      
      case 'attendance_correction':
        return (
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-700 font-medium">
              <ClockCircleOutlined className="mr-2 text-purple-500" />
              <span>{details.originalCheckIn} → {details.requestedCheckIn}</span>
            </div>
            <div className="text-sm text-gray-600 pl-6">
              Date: {new Date(details.date).toLocaleDateString()}
            </div>
            <div className="text-sm text-gray-600 italic pl-6 bg-gray-50 p-2 rounded">
              "{details.reason}"
            </div>
          </div>
        );
      
      default:
        return (
          <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
            No additional details available
          </div>
        );
    }
  }, []);

  // Categorized and sorted approval items
  const categorizedItems = useMemo(() => {
    const categories = {
      leave: [],
      advance_payment: [],
      material_request: [],
      attendance_correction: []
    };

    approvalItems.forEach(item => {
      if (categories[item.type]) {
        categories[item.type].push(item);
      }
    });

    // Sort each category by priority and submission date
    Object.keys(categories).forEach(key => {
      categories[key].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 2;
        const bPriority = priorityOrder[b.priority] || 2;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        
        return new Date(b.submittedDate) - new Date(a.submittedDate); // Newer first
      });
    });

    return categories;
  }, [approvalItems]);

  // Total pending count
  const totalPendingCount = approvalItems.length;

  // Render error state
  if (error && !loading) {
    return (
      <Card 
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BellOutlined className="mr-2 text-blue-500" />
              <span>Pending Approvals</span>
            </div>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={refreshing}
              className="flex items-center justify-center w-10 h-10"
            />
          </div>
        }
        className={`shadow-sm ${className}`}
      >
        <div className="text-center py-6">
          <BellOutlined className="text-4xl mb-2 text-red-300" />
          <p className="text-red-600 mb-2">Failed to load pending approvals</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button 
            type="primary" 
            onClick={handleRefresh}
            loading={refreshing}
          >
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  // Render empty state
  if (!loading && totalPendingCount === 0 && !error) {
    return (
      <Card 
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BellOutlined className="mr-2 text-blue-500" />
              <span>Pending Approvals</span>
            </div>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={refreshing}
              className="flex items-center justify-center w-10 h-10"
            />
          </div>
        }
        className={`shadow-sm ${className}`}
      >
        <Empty
          image={<BellOutlined className="text-4xl text-gray-300" />}
          description={
            <div className="text-center">
              <p className="text-gray-500 mb-2">No pending approvals</p>
              <p className="text-sm text-gray-400">
                All requests have been processed
              </p>
            </div>
          }
        />
      </Card>
    );
  }

  return (
    <>
      <Card 
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BellOutlined className="mr-2 text-blue-500" />
              <span>Pending Approvals</span>
              {totalPendingCount > 0 && (
                <Badge 
                  count={totalPendingCount} 
                  className="ml-2"
                  style={{ backgroundColor: '#ff4d4f' }}
                />
              )}
            </div>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={refreshing}
              className="flex items-center justify-center w-10 h-10"
              title="Refresh pending approvals"
            />
          </div>
        }
        className={`shadow-sm ${className}`}
        loading={loading}
      >
        {/* Category Summary - Mobile Optimized */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg category-summary">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-2">
            {Object.entries(categorizedItems).map(([type, items]) => {
              const config = getApprovalTypeConfig(type);
              return (
                <div key={type} className="text-center p-2 sm:p-1">
                  <div className="flex items-center justify-center mb-1 sm:mb-0">
                    <div className={`p-1.5 rounded-full ${config.bgColor} mr-2 sm:mr-0 sm:mb-1`}>
                      {config.icon}
                    </div>
                    <div className="text-lg font-semibold text-gray-800 sm:text-base">
                      {items.length}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 leading-tight">
                    {config.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Approval Items by Category */}
        <div className="space-y-4">
          {Object.entries(categorizedItems).map(([type, items]) => {
            if (items.length === 0) return null;
            
            const config = getApprovalTypeConfig(type);
            
            return (
              <div key={type}>
                {/* Category Header - Mobile Optimized */}
                <div className="flex items-center mb-3 p-2 bg-white rounded-lg border border-gray-100 category-header">
                  <div className={`p-2.5 rounded-lg ${config.bgColor} mr-3 flex-shrink-0`}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 text-base truncate">{config.label}</h3>
                    <p className="text-sm text-gray-500">{items.length} pending</p>
                  </div>
                  <Badge 
                    count={items.length} 
                    className="flex-shrink-0"
                    style={{ backgroundColor: config.color === 'blue' ? '#1890ff' : config.color === 'green' ? '#52c41a' : config.color === 'orange' ? '#fa8c16' : '#722ed1' }}
                  />
                </div>

                {/* Category Items - Mobile Optimized */}
                <div className="space-y-3 mb-6">
                  {items.map((item) => {
                    const priorityConfig = getPriorityConfig(item.priority);
                    
                    return (
                      <div
                        key={item.approvalId}
                        className={`border rounded-xl p-4 ${config.borderColor} ${config.bgColor} hover:shadow-lg transition-all duration-200 active:scale-[0.98] touch-manipulation approval-card`}
                        style={{ minHeight: '120px' }}
                      >
                        {/* Mobile-First Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start space-x-3 flex-1 min-w-0">
                            {/* Larger Avatar for Mobile */}
                            <Avatar 
                              size={44}
                              icon={<UserOutlined />}
                              className="flex-shrink-0 bg-blue-500 shadow-sm"
                            >
                              {item.requesterName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              {/* Requester Name - Larger for Mobile */}
                              <h4 className="font-semibold text-gray-900 text-base mb-1 truncate">
                                {item.requesterName}
                              </h4>
                              
                              {/* Submission Time - More Prominent */}
                              <div className="flex items-center text-sm text-gray-600 mb-2">
                                <ClockCircleOutlined className="mr-1.5 text-blue-500" />
                                <span className="font-medium">Submitted {formatTimeAgo(item.submittedDate)}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Priority Badge - Repositioned for Mobile */}
                          <Tag 
                            color={priorityConfig.color}
                            className="text-xs px-2.5 py-1 font-medium flex-shrink-0"
                          >
                            {priorityConfig.icon}
                            <span className="ml-1 hidden sm:inline">{priorityConfig.text}</span>
                            <span className="ml-1 sm:hidden">{priorityConfig.text.split(' ')[0]}</span>
                          </Tag>
                        </div>

                        {/* Approval Details - Better Spacing */}
                        <div className="mb-4 pl-14 sm:pl-0">
                          {renderApprovalDetails(item)}
                        </div>

                        {/* Action Buttons - Mobile Optimized */}
                        <div className="flex space-x-3 pt-3 border-t border-gray-200 approval-actions">
                          <Button
                            type="primary"
                            size="large"
                            icon={<CheckOutlined />}
                            onClick={() => handleApprovalAction(item, 'approve')}
                            className="bg-green-600 hover:bg-green-700 border-green-600 hover:border-green-700 flex-1 font-medium touch-manipulation"
                            style={{ 
                              minHeight: '48px',
                              touchAction: 'manipulation',
                              borderRadius: '8px'
                            }}
                          >
                            <span className="hidden sm:inline">Approve</span>
                            <span className="sm:hidden">✓</span>
                          </Button>
                          <Button
                            danger
                            size="large"
                            icon={<CloseOutlined />}
                            onClick={() => handleApprovalAction(item, 'reject')}
                            className="flex-1 font-medium touch-manipulation"
                            style={{ 
                              minHeight: '48px',
                              touchAction: 'manipulation',
                              borderRadius: '8px'
                            }}
                          >
                            <span className="hidden sm:inline">Reject</span>
                            <span className="sm:hidden">✗</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Category Divider */}
                <Divider className="my-4" />
              </div>
            );
          })}
        </div>

        {/* Last Updated Info */}
        {lastUpdated && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        )}
      </Card>

      {/* Approval Decision Modal - Mobile Optimized */}
      <Modal
        title={
          <div className="flex items-center">
            {modalType === 'approve' ? (
              <CheckOutlined className="mr-2 text-green-600" />
            ) : (
              <CloseOutlined className="mr-2 text-red-600" />
            )}
            <span className="text-base sm:text-lg">
              {modalType === 'approve' ? 'Approve' : 'Reject'} Request
            </span>
          </div>
        }
        open={modalVisible}
        onOk={processApprovalDecision}
        onCancel={() => {
          setModalVisible(false);
          setSelectedItem(null);
          setModalType(null);
          setRemarks('');
        }}
        okText={modalType === 'approve' ? 'Approve' : 'Reject'}
        okButtonProps={{ 
          danger: modalType === 'reject',
          type: modalType === 'approve' ? 'primary' : 'default',
          className: modalType === 'approve' ? 'bg-green-600 hover:bg-green-700 border-green-600 hover:border-green-700' : '',
          size: 'large',
          style: { minHeight: '48px', touchAction: 'manipulation' }
        }}
        cancelButtonProps={{
          size: 'large',
          style: { minHeight: '48px', touchAction: 'manipulation' }
        }}
        confirmLoading={processing}
        width="95%"
        style={{ 
          maxWidth: '600px',
          top: '10px'
        }}
        className="mobile-modal"
        bodyStyle={{ 
          padding: '16px',
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto'
        }}
      >
        {selectedItem && (
          <div className="space-y-4">
            {/* Request Summary - Mobile Optimized */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center mb-3">
                <Avatar 
                  size={40}
                  icon={<UserOutlined />}
                  className="mr-3 bg-blue-500 shadow-sm"
                >
                  {selectedItem.requesterName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-base truncate">{selectedItem.requesterName}</h4>
                  <p className="text-sm text-gray-600">
                    {getApprovalTypeConfig(selectedItem.type).label}
                  </p>
                </div>
                <Tag 
                  color={getPriorityConfig(selectedItem.priority).color}
                  className="text-xs px-2 py-1 font-medium"
                >
                  {getPriorityConfig(selectedItem.priority).text}
                </Tag>
              </div>
              
              {/* Request Details */}
              <div className="mt-3 p-3 bg-white rounded-lg">
                {renderApprovalDetails(selectedItem)}
              </div>
            </div>

            {/* Mandatory Remarks Field - Mobile Optimized */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Remarks <span className="text-red-500">*</span>
              </label>
              <TextArea
                rows={4}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={`Please provide your ${modalType === 'approve' ? 'approval' : 'rejection'} remarks...`}
                className="resize-none text-base"
                style={{ 
                  minHeight: '120px',
                  fontSize: '16px', // Prevents zoom on iOS
                  touchAction: 'manipulation'
                }}
                maxLength={500}
                showCount
              />
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Remarks are mandatory and will be recorded for audit purposes.
              </p>
            </div>

            {/* Warning for rejection - Mobile Optimized */}
            {modalType === 'reject' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start">
                  <ExclamationCircleOutlined className="text-red-500 mr-3 mt-1 text-lg flex-shrink-0" />
                  <div className="text-sm text-red-700">
                    <p className="font-semibold mb-1">Rejection Notice</p>
                    <p className="leading-relaxed">This request will be rejected and the requester will be notified with your remarks.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default PendingApprovals;
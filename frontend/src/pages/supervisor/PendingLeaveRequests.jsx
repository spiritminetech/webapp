import React, { useEffect, useState } from 'react';
import { Card, Button, Modal, Input, message, Empty, Spin, Tag } from 'antd';
import { CheckOutlined, CloseOutlined, UserOutlined, CalendarOutlined, FileTextOutlined } from '@ant-design/icons';
import {
  getPendingLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest
} from '../../api/leaveRequest/leaveRequestApi';
import ApprovalConfirmation from '../../components/ApprovalConfirmation/ApprovalConfirmation';
import dayjs from 'dayjs';

const { TextArea } = Input;

const PendingLeaveRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalConfirmation, setApprovalConfirmation] = useState(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await getPendingLeaveRequests();
      setRequests(res.data);
    } catch (error) {
      message.error('Failed to load pending requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const approve = async (request) => {
    try {
      setActionLoading(request.id);
      await approveLeaveRequest(request.id);
      
      // Show approval confirmation
      setApprovalConfirmation({
        worker: request.employeeName,
        fromDate: dayjs(request.fromDate).format('DD MMM'),
        toDate: dayjs(request.toDate).format('DD MMM')
      });
      
      message.success('Leave request approved successfully');
      loadRequests();
    } catch (error) {
      message.error('Failed to approve request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setRejectModalVisible(true);
    setRejectionReason('');
  };

  const confirmReject = async () => {
    if (!rejectionReason.trim()) {
      message.error('Please provide a rejection reason');
      return;
    }

    try {
      setActionLoading(selectedRequest.id);
      await rejectLeaveRequest(selectedRequest.id, { remarks: rejectionReason });
      message.success('Leave request rejected');
      setRejectModalVisible(false);
      setSelectedRequest(null);
      setRejectionReason('');
      loadRequests();
    } catch (error) {
      message.error('Failed to reject request');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDateRange = (fromDate, toDate) => {
    const from = dayjs(fromDate);
    const to = dayjs(toDate);
    
    if (from.year() === to.year()) {
      return `${from.format('DD MMM')} – ${to.format('DD MMM')}`;
    }
    return `${from.format('DD MMM YYYY')} – ${to.format('DD MMM YYYY')}`;
  };

  const getLeaveTypeColor = (type) => {
    const colors = {
      'ANNUAL': 'blue',
      'MEDICAL': 'red',
      'EMERGENCY': 'orange'
    };
    return colors[type] || 'default';
  };

  if (approvalConfirmation) {
    return (
      <ApprovalConfirmation
        worker={approvalConfirmation.worker}
        fromDate={approvalConfirmation.fromDate}
        toDate={approvalConfirmation.toDate}
        onClose={() => setApprovalConfirmation(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Pending Requests</h1>
          <p className="text-gray-600">Review and approve leave requests from your team</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Spin size="large" />
          </div>
        ) : requests.length === 0 ? (
          <Card className="text-center py-12">
            <Empty
              description="No pending leave requests"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <Card
                key={req.id}
                className="shadow-sm hover:shadow-md transition-shadow duration-200"
                bodyStyle={{ padding: '20px' }}
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserOutlined className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 text-lg">
                          Request From: {req.employeeName}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-600">Type:</span>
                          <Tag color={getLeaveTypeColor(req.leaveType)}>
                            {req.leaveType || 'Leave'}
                          </Tag>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <CalendarOutlined className="text-gray-500" />
                      <span className="text-sm text-gray-600">Dates:</span>
                      <span className="font-medium text-gray-800">
                        {formatDateRange(req.fromDate, req.toDate)}
                      </span>
                    </div>
                  </div>

                  {req.reason && (
                    <div className="flex items-start space-x-2">
                      <FileTextOutlined className="text-gray-500 mt-1" />
                      <div>
                        <span className="text-sm text-gray-600">Reason:</span>
                        <p className="text-gray-800 mt-1">{req.reason}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4 border-t border-gray-100">
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={() => approve(req)}
                      loading={actionLoading === req.id}
                      className="bg-green-600 hover:bg-green-700 border-green-600 hover:border-green-700"
                    >
                      Approve
                    </Button>
                    <Button
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => handleReject(req)}
                      loading={actionLoading === req.id}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Rejection Modal */}
        <Modal
          title="Reject Leave Request"
          open={rejectModalVisible}
          onOk={confirmReject}
          onCancel={() => {
            setRejectModalVisible(false);
            setSelectedRequest(null);
            setRejectionReason('');
          }}
          okText="Reject"
          okButtonProps={{ danger: true }}
          confirmLoading={actionLoading === selectedRequest?.id}
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Please provide a reason for rejecting this leave request:
            </p>
            <TextArea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="resize-none"
            />
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default PendingLeaveRequests;

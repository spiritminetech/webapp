import React, { useState, useEffect } from 'react';
import { Select, DatePicker, Button, Upload, Input, Form, Card, message } from 'antd';
import { UploadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { createLeaveRequest } from '../../../api/leaveRequest/leaveRequestApi';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

const LeaveRequestForm = () => {
  const [form] = Form.useForm();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Listen for refresh events from TopHeader
  useEffect(() => {
    const handleRefreshEvent = () => {
      // Reset form and state
      form.resetFields();
      setDocuments([]);
      setSuccess(false);
      setLoading(false);
    };
    
    window.addEventListener('refreshLeaveRequest', handleRefreshEvent);
    window.addEventListener('refreshPage', handleRefreshEvent);
    
    return () => {
      window.removeEventListener('refreshLeaveRequest', handleRefreshEvent);
      window.removeEventListener('refreshPage', handleRefreshEvent);
    };
  }, [form]);

  const handleFileChange = ({ fileList }) => {
    setDocuments(fileList);
  };

  const handleSubmit = async (values) => {
    setLoading(true);

    const formData = new FormData();
    formData.append('leaveType', values.leaveType);
    formData.append('fromDate', values.fromDate.format('YYYY-MM-DD'));
    formData.append('toDate', values.toDate.format('YYYY-MM-DD'));
    formData.append('reason', values.reason || '');

    documents.forEach((file) => {
      if (file.originFileObj) {
        formData.append('documents', file.originFileObj);
      }
    });

    try {
      await createLeaveRequest(formData);
      setSuccess(true);
      message.success('Leave request submitted successfully!');
    } catch (err) {
      message.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <div className="py-8">
            <CheckCircleOutlined className="text-6xl text-green-500 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Leave Request Submitted ✔
            </h2>
            <p className="text-gray-600 mb-6">
              Your request has been submitted successfully and is pending approval.
            </p>
            <Button 
              type="primary" 
              size="large"
              onClick={() => setSuccess(false)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Submit Another Request
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card 
          title={
            <h2 className="text-2xl font-semibold text-gray-800">
              Raise Request
            </h2>
          }
          className="shadow-lg"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="space-y-4"
          >
            {/* Request Type */}
            <Form.Item
              label={<span className="text-sm font-medium text-gray-700">Request Type</span>}
            >
              <Select
                value="LEAVE"
                disabled
                size="large"
                className="w-full"
              >
                <Option value="LEAVE">Leave</Option>
              </Select>
            </Form.Item>

            {/* Leave Type */}
            <Form.Item
              label={<span className="text-sm font-medium text-gray-700">Leave Type</span>}
              name="leaveType"
              rules={[{ required: true, message: 'Please select leave type' }]}
            >
              <Select
                placeholder="Select leave type"
                size="large"
                className="w-full"
              >
                <Option value="ANNUAL">Annual</Option>
                <Option value="MEDICAL">Medical</Option>
                <Option value="EMERGENCY">Emergency</Option>
              </Select>
            </Form.Item>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                label={<span className="text-sm font-medium text-gray-700">From Date</span>}
                name="fromDate"
                rules={[{ required: true, message: 'Please select from date' }]}
              >
                <DatePicker
                  size="large"
                  className="w-full"
                  format="DD/MM/YYYY"
                  placeholder="DD/MM/YYYY"
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>

              <Form.Item
                label={<span className="text-sm font-medium text-gray-700">To Date</span>}
                name="toDate"
                rules={[
                  { required: true, message: 'Please select to date' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const fromDate = getFieldValue('fromDate');
                      if (!value || !fromDate || value.isAfter(fromDate) || value.isSame(fromDate)) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('To date must be after from date'));
                    },
                  }),
                ]}
              >
                <DatePicker
                  size="large"
                  className="w-full"
                  format="DD/MM/YYYY"
                  placeholder="DD/MM/YYYY"
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            </div>

            {/* Reason */}
            <Form.Item
              label={<span className="text-sm font-medium text-gray-700">Reason</span>}
              name="reason"
            >
              <TextArea
                rows={4}
                placeholder="Enter reason for leave request..."
                className="resize-none"
              />
            </Form.Item>

            {/* Upload Document */}
            <Form.Item
              label={<span className="text-sm font-medium text-gray-700">Upload Document (Optional)</span>}
            >
              <Upload
                fileList={documents}
                onChange={handleFileChange}
                beforeUpload={() => false}
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="w-full"
              >
                <Button 
                  icon={<UploadOutlined />} 
                  size="large"
                  className="w-full h-12 border-dashed border-2 border-gray-300 hover:border-blue-400"
                >
                  Click to Upload File
                </Button>
              </Upload>
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 5MB each)
              </p>
            </Form.Item>

            {/* Submit Button */}
            <Form.Item className="mb-0 pt-4">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default LeaveRequestForm;

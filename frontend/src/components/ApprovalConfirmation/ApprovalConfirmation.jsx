import React from 'react';
import { Card, Button } from 'antd';
import { CheckCircleOutlined, UserOutlined, CalendarOutlined } from '@ant-design/icons';

const ApprovalConfirmation = ({ worker, fromDate, toDate, onClose }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <div className="py-8">
          {/* Success Icon */}
          <div className="mb-6">
            <CheckCircleOutlined className="text-6xl text-green-500" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Leave Approved ✔
          </h2>

          {/* Details */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-center space-x-2">
              <UserOutlined className="text-gray-500" />
              <span className="text-sm text-gray-600">Worker:</span>
              <span className="font-medium text-gray-800">{worker}</span>
            </div>

            <div className="flex items-center justify-center space-x-2">
              <CalendarOutlined className="text-gray-500" />
              <span className="text-sm text-gray-600">Dates:</span>
              <span className="font-medium text-gray-800">
                {fromDate} – {toDate}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <Button 
            type="primary" 
            size="large"
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 px-8"
          >
            OK
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ApprovalConfirmation;
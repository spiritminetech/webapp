import React from 'react';
import { Result, Button, Space } from 'antd';
import { HomeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Result
          status="404"
          title={
            <span className="text-4xl font-bold text-gray-800">
              404
            </span>
          }
          subTitle={
            <div className="space-y-2">
              <p className="text-lg text-gray-600">
                Oops! The page you're looking for doesn't exist.
              </p>
              <p className="text-sm text-gray-500">
                It might have been moved, deleted, or you entered the wrong URL.
              </p>
            </div>
          }
          extra={
            <Space size="middle" className="flex flex-col sm:flex-row gap-3">
              <Button 
                type="primary" 
                size="large"
                icon={<HomeOutlined />}
                onClick={handleGoHome}
                className="bg-blue-600 hover:bg-blue-700 border-blue-600 hover:border-blue-700 px-8 py-2 h-auto"
              >
                Go to Homepage
              </Button>
              <Button 
                size="large"
                icon={<ArrowLeftOutlined />}
                onClick={handleGoBack}
                className="px-8 py-2 h-auto"
              >
                Go Back
              </Button>
            </Space>
          }
          className="bg-white rounded-lg shadow-lg p-8 mx-4"
        />
      </div>
    </div>
  );
}

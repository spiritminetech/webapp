import React from 'react';
import { Card, Button, Tag, Avatar, Dropdown } from 'antd';
import { 
  PhoneOutlined, 
  EnvironmentOutlined,
  WifiOutlined,
  DisconnectOutlined,
  MailOutlined,
  MessageOutlined,
  DownOutlined
} from '@ant-design/icons';

/**
 * ProjectHeader Component
 * 
 * Displays project information including:
 * - Project name, code, and location
 * - Supervisor contact information
 * - Online/offline status indicators
 * - Geofence status display
 */
const ProjectHeader = ({ 
  project, 
  supervisor, 
  worker, 
  isOnline, 
  onContactSupervisor 
}) => {
  if (!project) {
    return null;
  }

  return (
    <Card className="task-card project-header">
      <div className="space-y-3">
        {/* Project Information */}
        <div className="project-info">
          <div className="project-icon">🏗️</div>
          <div className="project-details">
            <h3 className="project-name">
              {project.name}
            </h3>
            <p className="project-code">Code: {project.code}</p>
            <div className="project-location">
              <EnvironmentOutlined className="text-gray-400 text-xs" />
              <span className="truncate">{project.location}</span>
            </div>
          </div>
        </div>
        
        {/* Supervisor Information */}
        {supervisor && (
          <div className="supervisor-section">
            <div className="supervisor-info">
              <Avatar size="small" className="bg-blue-500">
                {supervisor.name?.charAt(0)}
              </Avatar>
              <div className="supervisor-details">
                <span className="supervisor-name">
                  {supervisor.name}
                </span>
                {supervisor.phone && (
                  <span className="supervisor-contact">
                    📞 {supervisor.phone}
                  </span>
                )}
              </div>
            </div>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'call',
                    label: 'Call',
                    icon: <PhoneOutlined />,
                    onClick: () => window.open(`tel:${supervisor.phone}`, '_self'),
                    disabled: !supervisor.phone
                  },
                  {
                    key: 'sms',
                    label: 'SMS',
                    icon: <MessageOutlined />,
                    onClick: () => window.open(`sms:${supervisor.phone}`, '_self'),
                    disabled: !supervisor.phone
                  },
                  {
                    key: 'email',
                    label: 'Email',
                    icon: <MailOutlined />,
                    onClick: () => window.open(`mailto:${supervisor.email}`, '_self'),
                    disabled: !supervisor.email
                  }
                ]
              }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button
                type="text"
                icon={<PhoneOutlined />}
                className="touch-button text-blue-500"
                aria-label={`Contact ${supervisor.name}`}
              >
                <DownOutlined className="text-xs" />
              </Button>
            </Dropdown>
          </div>
        )}
        
        {/* Status Indicators */}
        <div className="status-section">
          <div className="status-tags">
            <Tag color={isOnline ? 'green' : 'red'}>
              {isOnline ? (
                <>
                  <WifiOutlined className="mr-1" />
                  Online
                </>
              ) : (
                <>
                  <DisconnectOutlined className="mr-1" />
                  Offline
                </>
              )}
            </Tag>
            <Tag color={worker?.currentLocation?.insideGeofence ? 'green' : 'orange'}>
              {worker?.currentLocation?.insideGeofence ? (
                <>
                  📍 On Site
                </>
              ) : (
                <>
                  📍 Off Site
                </>
              )}
            </Tag>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProjectHeader;
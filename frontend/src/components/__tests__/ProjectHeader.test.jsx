import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectHeader from '../ProjectHeader';

// Mock antd components
jest.mock('antd', () => ({
  Card: ({ children, className }) => <div className={className}>{children}</div>,
  Button: ({ children, onClick, icon, className, ...props }) => (
    <button className={className} onClick={onClick} {...props}>
      {icon}
      {children}
    </button>
  ),
  Tag: ({ children, color }) => <span className={`tag-${color}`}>{children}</span>,
  Avatar: ({ children, className }) => <div className={className}>{children}</div>,
  Dropdown: ({ children, menu, trigger, placement }) => (
    <div className="dropdown-wrapper">
      {children}
      <div className="dropdown-menu" style={{ display: 'none' }}>
        {menu.items.map(item => (
          <div key={item.key} onClick={item.onClick} className="dropdown-item">
            {item.icon} {item.label}
          </div>
        ))}
      </div>
    </div>
  ),
}));

// Mock antd icons
jest.mock('@ant-design/icons', () => ({
  PhoneOutlined: () => <span>📞</span>,
  EnvironmentOutlined: () => <span>📍</span>,
  WifiOutlined: () => <span>📶</span>,
  DisconnectOutlined: () => <span>📵</span>,
  MailOutlined: () => <span>📧</span>,
  MessageOutlined: () => <span>💬</span>,
  DownOutlined: () => <span>⬇️</span>,
}));

describe('ProjectHeader Component', () => {
  const mockProject = {
    id: 1,
    name: 'Metro Construction Project',
    code: 'MCP-2024-001',
    location: 'Downtown Site A',
  };

  const mockSupervisor = {
    id: 5,
    name: 'John Smith',
    phone: '+1-555-0123',
    email: 'john.smith@company.com',
  };

  const mockWorker = {
    id: 25,
    name: 'Mike Johnson',
    currentLocation: {
      insideGeofence: true,
    },
  };

  const mockOnContactSupervisor = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders project name, code, and location correctly', () => {
    render(
      <ProjectHeader 
        project={mockProject}
        supervisor={mockSupervisor}
        worker={mockWorker}
        isOnline={true}
        onContactSupervisor={mockOnContactSupervisor}
      />
    );

    // Check project name
    expect(screen.getByText('Metro Construction Project')).toBeInTheDocument();
    
    // Check project code
    expect(screen.getByText('Code: MCP-2024-001')).toBeInTheDocument();
    
    // Check project location
    expect(screen.getByText('Downtown Site A')).toBeInTheDocument();
  });

  test('renders supervisor information when provided', () => {
    render(
      <ProjectHeader 
        project={mockProject}
        supervisor={mockSupervisor}
        worker={mockWorker}
        isOnline={true}
        onContactSupervisor={mockOnContactSupervisor}
      />
    );

    // Check supervisor name
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    
    // Check supervisor phone number
    expect(screen.getByText('📞 +1-555-0123')).toBeInTheDocument();
    
    // Check supervisor avatar (first letter)
    expect(screen.getByText('J')).toBeInTheDocument();
    
    // Check contact button
    const contactButton = screen.getByRole('button', { name: /contact john smith/i });
    expect(contactButton).toBeInTheDocument();
  });

  test('handles supervisor contact button click', () => {
    // Mock window.open
    const mockWindowOpen = jest.fn();
    Object.defineProperty(window, 'open', {
      value: mockWindowOpen,
      writable: true
    });

    render(
      <ProjectHeader 
        project={mockProject}
        supervisor={mockSupervisor}
        worker={mockWorker}
        isOnline={true}
        onContactSupervisor={mockOnContactSupervisor}
      />
    );

    const contactButton = screen.getByRole('button', { name: /contact john smith/i });
    fireEvent.click(contactButton);

    // The dropdown should be rendered (though hidden in our mock)
    expect(screen.getByText('Call')).toBeInTheDocument();
    expect(screen.getByText('SMS')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  test('displays online status correctly', () => {
    render(
      <ProjectHeader 
        project={mockProject}
        supervisor={mockSupervisor}
        worker={mockWorker}
        isOnline={true}
        onContactSupervisor={mockOnContactSupervisor}
      />
    );

    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('📶')).toBeInTheDocument();
  });

  test('displays offline status correctly', () => {
    render(
      <ProjectHeader 
        project={mockProject}
        supervisor={mockSupervisor}
        worker={mockWorker}
        isOnline={false}
        onContactSupervisor={mockOnContactSupervisor}
      />
    );

    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('📵')).toBeInTheDocument();
  });

  test('displays on-site status when worker is inside geofence', () => {
    render(
      <ProjectHeader 
        project={mockProject}
        supervisor={mockSupervisor}
        worker={mockWorker}
        isOnline={true}
        onContactSupervisor={mockOnContactSupervisor}
      />
    );

    expect(screen.getByText('📍 On Site')).toBeInTheDocument();
  });

  test('displays off-site status when worker is outside geofence', () => {
    const workerOffSite = {
      ...mockWorker,
      currentLocation: {
        insideGeofence: false,
      },
    };

    render(
      <ProjectHeader 
        project={mockProject}
        supervisor={mockSupervisor}
        worker={workerOffSite}
        isOnline={true}
        onContactSupervisor={mockOnContactSupervisor}
      />
    );

    expect(screen.getByText('📍 Off Site')).toBeInTheDocument();
  });

  test('renders without supervisor when not provided', () => {
    render(
      <ProjectHeader 
        project={mockProject}
        supervisor={null}
        worker={mockWorker}
        isOnline={true}
        onContactSupervisor={mockOnContactSupervisor}
      />
    );

    // Project info should still be there
    expect(screen.getByText('Metro Construction Project')).toBeInTheDocument();
    
    // Supervisor info should not be there
    expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /contact/i })).not.toBeInTheDocument();
  });

  test('returns null when no project is provided', () => {
    const { container } = render(
      <ProjectHeader 
        project={null}
        supervisor={mockSupervisor}
        worker={mockWorker}
        isOnline={true}
        onContactSupervisor={mockOnContactSupervisor}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  test('handles missing worker location gracefully', () => {
    const workerWithoutLocation = {
      ...mockWorker,
      currentLocation: null,
    };

    render(
      <ProjectHeader 
        project={mockProject}
        supervisor={mockSupervisor}
        worker={workerWithoutLocation}
        isOnline={true}
        onContactSupervisor={mockOnContactSupervisor}
      />
    );

    // Should still render project info
    expect(screen.getByText('Metro Construction Project')).toBeInTheDocument();
    
    // Should show off-site status when location is unknown
    expect(screen.getByText('📍 Off Site')).toBeInTheDocument();
  });

  test('does not call onContactSupervisor when callback is not provided', () => {
    render(
      <ProjectHeader 
        project={mockProject}
        supervisor={mockSupervisor}
        worker={mockWorker}
        isOnline={true}
        onContactSupervisor={null}
      />
    );

    const contactButton = screen.getByRole('button', { name: /contact john smith/i });
    fireEvent.click(contactButton);

    // Should not throw error and should render dropdown options
    expect(mockOnContactSupervisor).not.toHaveBeenCalled();
    expect(screen.getByText('Call')).toBeInTheDocument();
  });

  test('applies correct CSS classes', () => {
    const { container } = render(
      <ProjectHeader 
        project={mockProject}
        supervisor={mockSupervisor}
        worker={mockWorker}
        isOnline={true}
        onContactSupervisor={mockOnContactSupervisor}
      />
    );

    // Check main container has correct classes
    expect(container.querySelector('.task-card.project-header')).toBeInTheDocument();
  });

  test('handles supervisor name with special characters', () => {
    const supervisorWithSpecialName = {
      ...mockSupervisor,
      name: 'José María García-López',
    };

    render(
      <ProjectHeader 
        project={mockProject}
        supervisor={supervisorWithSpecialName}
        worker={mockWorker}
        isOnline={true}
        onContactSupervisor={mockOnContactSupervisor}
      />
    );

    expect(screen.getByText('José María García-López')).toBeInTheDocument();
    expect(screen.getByText('J')).toBeInTheDocument(); // First letter for avatar
  });

  test('handles long project names with truncation', () => {
    const projectWithLongName = {
      ...mockProject,
      name: 'Very Long Metro Construction Project Name That Should Be Handled Properly',
      location: 'Very Long Downtown Site Location Address That Might Need Truncation',
    };

    render(
      <ProjectHeader 
        project={projectWithLongName}
        supervisor={mockSupervisor}
        worker={mockWorker}
        isOnline={true}
        onContactSupervisor={mockOnContactSupervisor}
      />
    );

    expect(screen.getByText('Very Long Metro Construction Project Name That Should Be Handled Properly')).toBeInTheDocument();
    expect(screen.getByText('Very Long Downtown Site Location Address That Might Need Truncation')).toBeInTheDocument();
  });

  test('displays supervisor contact information correctly', () => {
    render(
      <ProjectHeader 
        project={mockProject}
        supervisor={mockSupervisor}
        worker={mockWorker}
        isOnline={true}
        onContactSupervisor={mockOnContactSupervisor}
      />
    );

    // Check supervisor name is displayed
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    
    // Check supervisor phone number is displayed
    expect(screen.getByText('📞 +1-555-0123')).toBeInTheDocument();
    
    // Check contact dropdown options are available
    expect(screen.getByText('Call')).toBeInTheDocument();
    expect(screen.getByText('SMS')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  test('handles supervisor without phone number', () => {
    const supervisorWithoutPhone = {
      ...mockSupervisor,
      phone: null,
    };

    render(
      <ProjectHeader 
        project={mockProject}
        supervisor={supervisorWithoutPhone}
        worker={mockWorker}
        isOnline={true}
        onContactSupervisor={mockOnContactSupervisor}
      />
    );

    // Should still show supervisor name
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    
    // Should not show phone number
    expect(screen.queryByText(/📞/)).not.toBeInTheDocument();
    
    // Contact button should still be there
    const contactButton = screen.getByRole('button', { name: /contact john smith/i });
    expect(contactButton).toBeInTheDocument();
  });

  test('handles supervisor without email', () => {
    const supervisorWithoutEmail = {
      ...mockSupervisor,
      email: null,
    };

    render(
      <ProjectHeader 
        project={mockProject}
        supervisor={supervisorWithoutEmail}
        worker={mockWorker}
        isOnline={true}
        onContactSupervisor={mockOnContactSupervisor}
      />
    );

    // Should still show supervisor name and phone
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('📞 +1-555-0123')).toBeInTheDocument();
    
    // Email option should be disabled (still present in our mock)
    expect(screen.getByText('Email')).toBeInTheDocument();
  });
});
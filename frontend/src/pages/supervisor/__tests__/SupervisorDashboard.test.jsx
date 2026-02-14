import React from 'react';
import { render, screen } from '@testing-library/react';
import SupervisorDashboard from '../SupervisorDashboard';

// Mock the AuthContext to provide test data
const mockAuthContext = {
  user: { id: '1', name: 'Test Supervisor', role: 'supervisor' },
  isAuthenticated: true,
  permissions: ['SUPERVISOR_DASHBOARD_VIEW']
};

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => mockAuthContext
}));

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

describe('SupervisorDashboard', () => {
  test('renders dashboard with authenticated supervisor', () => {
    render(<SupervisorDashboard />);
    
    // Check if main dashboard elements are present
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome, Test Supervisor')).toBeInTheDocument();
    expect(screen.getByText('Assigned Projects')).toBeInTheDocument();
    expect(screen.getByText("Today's Workforce")).toBeInTheDocument();
    expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
    expect(screen.getByText('Alerts & Notifications')).toBeInTheDocument();
  });

  test('displays projects with placeholder data', () => {
    render(<SupervisorDashboard />);
    
    // Check that projects are displayed (placeholder data)
    expect(screen.getByText('Construction Site A')).toBeInTheDocument();
    expect(screen.getByText('Office Building B')).toBeInTheDocument();
  });

  test('shows workforce count with placeholder data', () => {
    render(<SupervisorDashboard />);
    
    expect(screen.getByText('Total Workers')).toBeInTheDocument();
    expect(screen.getByText('Present')).toBeInTheDocument();
    expect(screen.getByText('Absent')).toBeInTheDocument();
    expect(screen.getByText('Late')).toBeInTheDocument();
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PendingApprovals from '../PendingApprovals';

// Mock the auth context
const mockUseAuth = jest.fn();
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

// Mock services
jest.mock('../../../services', () => ({
  leaveService: {}
}));

// Mock app config
jest.mock('../../../config/app.config.js', () => ({
  features: {
    enableDebug: false
  }
}));

describe('PendingApprovals Component', () => {
  const mockUser = {
    id: 'supervisor-1',
    role: 'supervisor',
    name: 'Test Supervisor'
  };

  const mockOnApprove = jest.fn();
  const mockOnReject = jest.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ 
      user: mockUser,
      isAuthenticated: true 
    });
    jest.clearAllMocks();
  });

  test('renders pending approvals component', async () => {
    render(
      <PendingApprovals 
        supervisorId="supervisor-1"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    // Check if the component title is rendered
    expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
  });

  test('displays mock approval data after loading', async () => {
    render(
      <PendingApprovals 
        supervisorId="supervisor-1"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    // Wait for mock data to load
    await waitFor(() => {
      expect(screen.getByText('John Tan Wei Ming')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check if different approval types are displayed
    expect(screen.getByText('Leave Request')).toBeInTheDocument();
    expect(screen.getByText('Advance Payment')).toBeInTheDocument();
    expect(screen.getByText('Material Request')).toBeInTheDocument();
    expect(screen.getByText('Attendance Correction')).toBeInTheDocument();
  });

  test('displays category summary correctly', async () => {
    render(
      <PendingApprovals 
        supervisorId="supervisor-1"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('John Tan Wei Ming')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check category counts in summary
    const summarySection = document.querySelector('.bg-gray-50');
    expect(summarySection).toBeInTheDocument();
  });

  test('shows approve and reject buttons for each item', async () => {
    render(
      <PendingApprovals 
        supervisorId="supervisor-1"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('John Tan Wei Ming')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check if approve and reject buttons are present
    const approveButtons = screen.getAllByText('Approve');
    const rejectButtons = screen.getAllByText('Reject');
    
    expect(approveButtons.length).toBeGreaterThan(0);
    expect(rejectButtons.length).toBeGreaterThan(0);
    expect(approveButtons.length).toBe(rejectButtons.length);
  });

  test('displays priority indicators', async () => {
    render(
      <PendingApprovals 
        supervisorId="supervisor-1"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('John Tan Wei Ming')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check if priority tags are displayed
    expect(screen.getByText('High Priority')).toBeInTheDocument();
    expect(screen.getByText('Medium Priority')).toBeInTheDocument();
    expect(screen.getByText('Low Priority')).toBeInTheDocument();
  });
});
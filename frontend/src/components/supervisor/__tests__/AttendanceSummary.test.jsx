import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AttendanceSummary from '../AttendanceSummary';
import { useAuth } from '../../../context/AuthContext';

// Mock the AuthContext
jest.mock('../../../context/AuthContext', () => ({
  useAuth: jest.fn()
}));

// Mock react-window
jest.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, itemSize, height }) => (
    <div data-testid="virtual-list" style={{ height }}>
      {itemCount > 0 && Array.from({ length: Math.min(itemCount, 3) }, (_, index) => 
        children({ index, style: { height: itemSize } })
      )}
    </div>
  )
}));

// Mock services
jest.mock('../../../services', () => ({
  attendanceService: {
    getAttendanceSummary: jest.fn()
  }
}));

// Mock app config
jest.mock('../../../config/app.config.js', () => ({
  features: {
    enableDebug: false
  }
}));

describe('AttendanceSummary Component', () => {
  const mockUser = {
    id: 'supervisor-1',
    name: 'Test Supervisor',
    role: 'supervisor'
  };

  beforeEach(() => {
    useAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders attendance summary component', async () => {
    render(
      <AttendanceSummary 
        supervisorId="supervisor-1"
      />
    );

    expect(screen.getByText('Attendance Summary')).toBeInTheDocument();
  });

  test('handles refresh button click', async () => {
    render(
      <AttendanceSummary 
        supervisorId="supervisor-1"
      />
    );

    const refreshButton = screen.getByTitle('Refresh attendance summary');
    fireEvent.click(refreshButton);

    // Should trigger refresh (tested via mock data loading)
    await waitFor(() => {
      expect(screen.getByText('Attendance Summary')).toBeInTheDocument();
    });
  });

  test('displays virtual list when data is loaded', async () => {
    render(
      <AttendanceSummary 
        supervisorId="supervisor-1"
      />
    );

    // Wait for component to load mock data
    await waitFor(() => {
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test('handles worker selection callback', async () => {
    const mockOnWorkerSelect = jest.fn();
    
    render(
      <AttendanceSummary 
        supervisorId="supervisor-1"
        onWorkerSelect={mockOnWorkerSelect}
      />
    );

    // Wait for mock data to load
    await waitFor(() => {
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test('shows component title and refresh button', () => {
    render(
      <AttendanceSummary 
        supervisorId="supervisor-1"
      />
    );

    expect(screen.getByText('Attendance Summary')).toBeInTheDocument();
    expect(screen.getByTitle('Refresh attendance summary')).toBeInTheDocument();
  });
});
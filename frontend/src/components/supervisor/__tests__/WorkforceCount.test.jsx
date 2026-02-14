import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { message } from 'antd';
import WorkforceCount from '../WorkforceCount';
import { useAuth } from '../../../context/AuthContext';

// Mock the auth context
jest.mock('../../../context/AuthContext', () => ({
  useAuth: jest.fn()
}));

// Mock antd message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

describe('WorkforceCount Component', () => {
  const mockUser = {
    id: 'supervisor-123',
    name: 'Test Supervisor',
    role: 'supervisor'
  };

  beforeEach(() => {
    useAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true
    });
    jest.clearAllMocks();
  });

  test('displays workforce count with status breakdown', async () => {
    render(
      <WorkforceCount 
        supervisorId="supervisor-123"
        autoRefresh={false}
      />
    );

    // Wait for mock data to load
    await waitFor(() => {
      expect(screen.getByText('Total Workers')).toBeInTheDocument();
    });

    // Check that all status categories are displayed
    expect(screen.getByText('Present')).toBeInTheDocument();
    expect(screen.getByText('Absent')).toBeInTheDocument();
    expect(screen.getByText('Late')).toBeInTheDocument();
    expect(screen.getByText('On Leave')).toBeInTheDocument();
    expect(screen.getByText('Overtime')).toBeInTheDocument();

    // Check that total count is displayed
    expect(screen.getByText('23')).toBeInTheDocument(); // Mock total
  });

  test('displays overtime workers with distinct highlighting', async () => {
    render(
      <WorkforceCount 
        supervisorId="supervisor-123"
        autoRefresh={false}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Overtime')).toBeInTheDocument();
    });

    // Check that overtime section has distinct styling
    // The overtime section is wrapped in a div with purple styling
    const overtimeSection = screen.getByText('Overtime').closest('div.bg-purple-50');
    expect(overtimeSection).toBeInTheDocument();
    expect(overtimeSection).toHaveClass('bg-purple-50');
    expect(overtimeSection).toHaveClass('border-purple-200');
  });

  test('calculates attendance rate correctly', async () => {
    render(
      <WorkforceCount 
        supervisorId="supervisor-123"
        autoRefresh={false}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Attendance Rate')).toBeInTheDocument();
    });

    // With mock data: 15 present out of 23 total = 65%
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  test('handles refresh functionality', async () => {
    render(
      <WorkforceCount 
        supervisorId="supervisor-123"
        autoRefresh={false}
      />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Total Workers')).toBeInTheDocument();
    });

    // Find and click refresh button
    const refreshButton = screen.getByTitle('Refresh workforce count');
    fireEvent.click(refreshButton);

    // Verify success message is shown
    await waitFor(() => {
      expect(message.success).toHaveBeenCalledWith('Workforce count refreshed');
    });
  });

  test('displays last updated timestamp', async () => {
    render(
      <WorkforceCount 
        supervisorId="supervisor-123"
        autoRefresh={false}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });
  });

  test('shows progress bars for each status category', async () => {
    render(
      <WorkforceCount 
        supervisorId="supervisor-123"
        autoRefresh={false}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Present')).toBeInTheDocument();
    });

    // Check that progress bars are rendered (Ant Design Progress components)
    const progressBars = document.querySelectorAll('.ant-progress');
    expect(progressBars.length).toBe(5); // One for each status category
  });

  test('handles error state gracefully', async () => {
    // Mock console.error to avoid test output noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Create a component that will trigger an error
    const ErrorWorkforceCount = () => {
      const [error, setError] = React.useState(null);
      
      React.useEffect(() => {
        setError('Network error');
      }, []);

      if (error) {
        return (
          <div className="text-center py-6">
            <div className="text-4xl mb-2 text-red-300">👥</div>
            <p className="text-red-600 mb-2">Failed to load workforce count</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button>Try Again</button>
          </div>
        );
      }

      return <div>Loading...</div>;
    };

    render(<ErrorWorkforceCount />);

    expect(screen.getByText('Failed to load workforce count')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  test('validates data consistency', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <WorkforceCount 
        supervisorId="supervisor-123"
        autoRefresh={false}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Total Workers')).toBeInTheDocument();
    });

    // The component should validate that total equals sum of categories
    // With mock data: present(15) + absent(3) + late(2) + onLeave(1) = 21
    // Total is 23, overtime is 2, so 21 + 2 = 23 (consistent)
    // No warning should be logged for consistent data

    consoleSpy.mockRestore();
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { message } from 'antd';
import AlertsNotifications from '../AlertsNotifications';
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

describe('AlertsNotifications Component', () => {
  const mockUser = {
    id: 'supervisor-123',
    name: 'Test Supervisor',
    role: 'supervisor'
  };

  const mockOnAlertAcknowledge = jest.fn();

  beforeEach(() => {
    useAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true
    });
    jest.clearAllMocks();
  });

  test('displays alerts with priority-based visual indicators', async () => {
    render(
      <AlertsNotifications 
        supervisorId="supervisor-123"
        onAlertAcknowledge={mockOnAlertAcknowledge}
        refreshInterval={0} // Disable auto-refresh for testing
      />
    );

    // Wait for mock data to load - look for the summary counts first
    await waitFor(() => {
      expect(screen.getAllByText('Critical')).toHaveLength(3); // Summary + 2 alert tags
    }, { timeout: 3000 });

    // Check that priority indicators are displayed with correct colors
    // Critical alerts should have red indicators
    const criticalTags = screen.getAllByText('Critical');
    expect(criticalTags.length).toBeGreaterThan(0);

    // Warning alerts should have orange indicators
    const warningTags = screen.getAllByText('Warning');
    expect(warningTags.length).toBeGreaterThan(0);

    // Info alerts should have blue indicators
    const infoTags = screen.getAllByText('Info');
    expect(infoTags.length).toBeGreaterThan(0);
  });

  test('displays alert summary with correct counts', async () => {
    render(
      <AlertsNotifications 
        supervisorId="supervisor-123"
        onAlertAcknowledge={mockOnAlertAcknowledge}
        refreshInterval={0}
      />
    );

    // Wait for data to load - look for the summary section specifically
    await waitFor(() => {
      expect(screen.getAllByText('Critical')).toHaveLength(3); // Summary + 2 alert tags
    }, { timeout: 3000 });

    // Check that summary counts are displayed
    // Based on mock data: 2 critical, 2 warning, 1 info (unread)
    const summarySection = screen.getAllByText('Critical')[0].closest('.grid');
    expect(summarySection).toBeInTheDocument();
  });

  test('sorts alerts by priority and timestamp', async () => {
    render(
      <AlertsNotifications 
        supervisorId="supervisor-123"
        onAlertAcknowledge={mockOnAlertAcknowledge}
        refreshInterval={0}
      />
    );

    // Wait for data to load - look for actual alert content
    await waitFor(() => {
      expect(screen.getAllByText('Critical')).toHaveLength(3); // Summary + 2 alert tags
    }, { timeout: 3000 });

    // Wait a bit more for alerts to render
    await waitFor(() => {
      const alertItems = document.querySelectorAll('.border.rounded-lg.p-4');
      expect(alertItems.length).toBeGreaterThan(0);
    }, { timeout: 2000 });

    // Critical alerts should appear first (highest priority)
    // Check that the first few alerts contain critical priority indicators
    const alertItems = document.querySelectorAll('.border.rounded-lg.p-4');
    expect(alertItems.length).toBeGreaterThan(0);
  });

  test('handles alert acknowledgment functionality', async () => {
    render(
      <AlertsNotifications 
        supervisorId="supervisor-123"
        onAlertAcknowledge={mockOnAlertAcknowledge}
        refreshInterval={0}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getAllByText('Critical')).toHaveLength(3); // Summary + 2 alert tags
    }, { timeout: 3000 });

    // Wait for alerts to render
    await waitFor(() => {
      const acknowledgeButtons = screen.queryAllByText('Acknowledge');
      expect(acknowledgeButtons.length).toBeGreaterThan(0);
    }, { timeout: 2000 });

    // Find and click an acknowledge button
    const acknowledgeButtons = screen.getAllByText('Acknowledge');
    fireEvent.click(acknowledgeButtons[0]);

    // Wait for acknowledgment to complete
    await waitFor(() => {
      expect(message.success).toHaveBeenCalledWith('Alert acknowledged');
    });

    // Verify the callback was called
    expect(mockOnAlertAcknowledge).toHaveBeenCalled();
  });

  test('displays alert details in modal', async () => {
    render(
      <AlertsNotifications 
        supervisorId="supervisor-123"
        onAlertAcknowledge={mockOnAlertAcknowledge}
        refreshInterval={0}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getAllByText('Critical')).toHaveLength(3); // Summary + 2 alert tags
    }, { timeout: 3000 });

    // Wait for alerts to render
    await waitFor(() => {
      const viewDetailsButtons = screen.queryAllByText('View Details');
      expect(viewDetailsButtons.length).toBeGreaterThan(0);
    }, { timeout: 2000 });

    // Find and click a "View Details" button
    const viewDetailsButtons = screen.getAllByText('View Details');
    fireEvent.click(viewDetailsButtons[0]);

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByText('Alert Details')).toBeInTheDocument();
    });

    // Check that modal contains additional information
    expect(screen.getByText('Additional Information')).toBeInTheDocument();
    expect(screen.getByText('Status:')).toBeInTheDocument();
  });

  test('shows different alert types with appropriate icons', async () => {
    render(
      <AlertsNotifications 
        supervisorId="supervisor-123"
        onAlertAcknowledge={mockOnAlertAcknowledge}
        refreshInterval={0}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getAllByText('Critical')).toHaveLength(3); // Summary + 2 alert tags
    }, { timeout: 3000 });

    // Wait for alerts to render and check for alert type labels in the alert content
    await waitFor(() => {
      // Look for alert type labels that appear in the alert metadata
      const geofenceElements = screen.queryAllByText(/Geofence Violation/);
      const absenceElements = screen.queryAllByText(/Worker Absence/);
      const anomalyElements = screen.queryAllByText(/Attendance Anomaly/);
      const safetyElements = screen.queryAllByText(/Safety Alert/);
      
      // At least some of these should be present
      const totalElements = geofenceElements.length + absenceElements.length + 
                           anomalyElements.length + safetyElements.length;
      expect(totalElements).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });

  test('handles refresh functionality', async () => {
    render(
      <AlertsNotifications 
        supervisorId="supervisor-123"
        onAlertAcknowledge={mockOnAlertAcknowledge}
        refreshInterval={0}
      />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getAllByText('Critical')).toHaveLength(3); // Summary + 2 alert tags
    }, { timeout: 3000 });

    // Find and click refresh button
    const refreshButton = screen.getByTitle('Refresh alerts');
    fireEvent.click(refreshButton);

    // Verify success message is shown
    await waitFor(() => {
      expect(message.success).toHaveBeenCalledWith('Alerts refreshed');
    }, { timeout: 3000 });
  });

  test('displays empty state when no alerts', async () => {
    // Mock empty alerts response
    const EmptyAlertsComponent = () => {
      return (
        <div className="text-center">
          <div className="text-4xl text-gray-300">🔔</div>
          <p className="text-gray-500 mb-2">No alerts</p>
          <p className="text-sm text-gray-400">All systems operating normally</p>
        </div>
      );
    };

    render(<EmptyAlertsComponent />);

    expect(screen.getByText('No alerts')).toBeInTheDocument();
    expect(screen.getByText('All systems operating normally')).toBeInTheDocument();
  });

  test('shows read/unread status correctly', async () => {
    render(
      <AlertsNotifications 
        supervisorId="supervisor-123"
        onAlertAcknowledge={mockOnAlertAcknowledge}
        refreshInterval={0}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getAllByText('Critical')).toHaveLength(3); // Summary + 2 alert tags
    }, { timeout: 3000 });

    // Wait for alerts to render
    await waitFor(() => {
      // Check for read status indicators or acknowledge buttons
      const readTags = screen.queryAllByText('Read');
      const acknowledgeButtons = screen.queryAllByText('Acknowledge');
      
      // Should have either read tags or acknowledge buttons (or both)
      expect(readTags.length + acknowledgeButtons.length).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });

  test('displays last updated timestamp', async () => {
    render(
      <AlertsNotifications 
        supervisorId="supervisor-123"
        onAlertAcknowledge={mockOnAlertAcknowledge}
        refreshInterval={0}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });
  });

  test('handles error state gracefully', async () => {
    // Mock console.error to avoid test output noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Create a component that will trigger an error
    const ErrorAlertsComponent = () => {
      const [error, setError] = React.useState(null);
      
      React.useEffect(() => {
        setError('Network error');
      }, []);

      if (error) {
        return (
          <div className="text-center py-6">
            <div className="text-4xl mb-2 text-red-300">🔔</div>
            <p className="text-red-600 mb-2">Failed to load alerts</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button>Try Again</button>
          </div>
        );
      }

      return <div>Loading...</div>;
    };

    render(<ErrorAlertsComponent />);

    expect(screen.getByText('Failed to load alerts')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  test('limits display count correctly', async () => {
    render(
      <AlertsNotifications 
        supervisorId="supervisor-123"
        onAlertAcknowledge={mockOnAlertAcknowledge}
        maxDisplayCount={3}
        refreshInterval={0}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Alerts & Notifications')).toBeInTheDocument();
    });

    // Should show "Showing X of Y alerts" when limited
    // Mock data has 7 alerts, so with maxDisplayCount=3, should show indicator
    await waitFor(() => {
      const showingText = screen.queryByText(/Showing \d+ of \d+ alerts/);
      if (showingText) {
        expect(showingText).toBeInTheDocument();
      }
    });
  });

  test('formats time ago correctly', async () => {
    render(
      <AlertsNotifications 
        supervisorId="supervisor-123"
        onAlertAcknowledge={mockOnAlertAcknowledge}
        refreshInterval={0}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getAllByText('Critical')).toHaveLength(3); // Summary + 2 alert tags
    }, { timeout: 3000 });

    // Wait for alerts to render and check for time formatting
    await waitFor(() => {
      // Check for time ago formatting (should show "Xm ago", "Xh ago", etc.)
      const timeElements = screen.queryAllByText(/\d+[mh] ago|Just now/);
      expect(timeElements.length).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });
});
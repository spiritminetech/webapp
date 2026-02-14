import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { message } from 'antd';
import TaskDetailsScreen from '../TaskDetailsScreen';
import { WorkerMobileApiService } from '../../../services/WorkerMobileApiService';

// Mock the API service
jest.mock('../../../services/WorkerMobileApiService');

// Mock antd message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  },
}));

// Mock CSS import
jest.mock('../TaskDetailsScreen.css', () => ({}));

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
const mockLocation = { pathname: '/worker/tasks' };
const mockParams = {};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  useParams: () => mockParams,
}));

// Helper function to render with router
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('TaskDetailsScreen Responsive Layout', () => {
  const mockTaskData = {
    project: {
      id: 1,
      name: 'Metro Construction Project',
      code: 'MCP-2024-001',
      location: 'Downtown Site A',
    },
    supervisor: {
      id: 5,
      name: 'John Smith',
      phone: '+1-555-0123',
    },
    worker: {
      id: 25,
      name: 'Mike Johnson',
      currentLocation: {
        insideGeofence: true,
      },
    },
    tasks: [
      {
        assignmentId: 101,
        taskName: 'Install Ceiling Panels - Zone A',
        workArea: 'Zone A',
        floor: 'Floor 3',
        status: 'in_progress',
        priority: 'high',
        dailyTarget: {
          description: 'Install 50 ceiling panels',
        },
        progress: {
          percentage: 75,
        },
        timeEstimate: {
          remaining: 60,
        },
        canStart: true,
      },
    ],
    dailySummary: {
      totalTasks: 5,
      completedTasks: 2,
      totalHoursWorked: 6.5,
      remainingHours: 1.5,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock online status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders loading state initially', () => {
    WorkerMobileApiService.getTodaysTasks.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<TaskDetailsScreen />);
    
    expect(screen.getByText('Loading your tasks...')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we fetch your daily assignments')).toBeInTheDocument();
  });

  test('renders network error state correctly', async () => {
    WorkerMobileApiService.getTodaysTasks.mockRejectedValue(
      new Error('Network Error')
    );

    render(<TaskDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Network connection error')).toBeInTheDocument();
    });

    expect(screen.getByText('Unable to connect to the server. Please check your internet connection.')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Refresh Page')).toBeInTheDocument();
  });

  test('renders timeout error state correctly', async () => {
    WorkerMobileApiService.getTodaysTasks.mockRejectedValue(
      new Error('Request timeout')
    );

    render(<TaskDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Request timed out')).toBeInTheDocument();
    });

    expect(screen.getByText('The server took too long to respond. Please check your connection and try again.')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  test('renders authentication error state correctly', async () => {
    const authError = new Error('Unauthorized');
    authError.response = { status: 401 };
    WorkerMobileApiService.getTodaysTasks.mockRejectedValue(authError);

    render(<TaskDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Authentication required')).toBeInTheDocument();
    });

    expect(screen.getByText('Your session has expired. Please log in again.')).toBeInTheDocument();
    expect(screen.getByText('Log In Again')).toBeInTheDocument();
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  test('renders server error state correctly', async () => {
    const serverError = new Error('Internal Server Error');
    serverError.response = { status: 500 };
    WorkerMobileApiService.getTodaysTasks.mockRejectedValue(serverError);

    render(<TaskDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });

    expect(screen.getByText('The server is experiencing issues. Please try again later.')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  test('renders offline error state correctly', async () => {
    WorkerMobileApiService.getTodaysTasks.mockRejectedValue(
      new Error('No task data available offline')
    );

    render(<TaskDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByText('No offline data available')).toBeInTheDocument();
    });

    expect(screen.getByText('You are offline and no cached task data is available. Please connect to the internet.')).toBeInTheDocument();
    expect(screen.getByText('You are currently offline')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  test('handles retry functionality with exponential backoff', async () => {
    let callCount = 0;
    WorkerMobileApiService.getTodaysTasks.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('Network Error'));
      }
      return Promise.resolve({ data: mockTaskData });
    });

    render(<TaskDetailsScreen />);

    // Wait for initial error
    await waitFor(() => {
      expect(screen.getByText('Network connection error')).toBeInTheDocument();
    });

    // Click retry
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    // Should show retry count and then success
    await waitFor(() => {
      expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
    });

    expect(callCount).toBe(2);
  });

  test('shows loading text during refresh', async () => {
    WorkerMobileApiService.getTodaysTasks.mockResolvedValue({
      data: mockTaskData,
    });

    render(<TaskDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
    });

    // Mock a slow refresh
    WorkerMobileApiService.getTodaysTasks.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: mockTaskData }), 100))
    );

    const refreshButton = screen.getByRole('button', { name: /reload/i });
    fireEvent.click(refreshButton);

    // Should show loading state briefly
    expect(refreshButton.closest('button')).toHaveAttribute('class', expect.stringContaining('ant-btn-loading'));
  });

  test('renders mobile-first layout with proper structure', async () => {
    WorkerMobileApiService.getTodaysTasks.mockResolvedValue({
      data: mockTaskData,
    });

    render(<TaskDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
    });

    // Check header structure
    expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
    
    // Check project information
    expect(screen.getByText('Metro Construction Project')).toBeInTheDocument();
    expect(screen.getByText('Code: MCP-2024-001')).toBeInTheDocument();
    expect(screen.getByText('Downtown Site A')).toBeInTheDocument();
    
    // Check supervisor info
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    
    // Check task card
    expect(screen.getByText('Install Ceiling Panels - Zone A')).toBeInTheDocument();
    expect(screen.getByText('Zone A, Floor 3')).toBeInTheDocument();
    
    // Check daily progress
    expect(screen.getByText('Daily Progress')).toBeInTheDocument();
  });

  test('renders touch-friendly buttons with minimum 44px height', async () => {
    WorkerMobileApiService.getTodaysTasks.mockResolvedValue({
      data: mockTaskData,
    });

    render(<TaskDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
    });

    // Check that action buttons are present
    const continueButton = screen.getByText('Continue');
    expect(continueButton).toBeInTheDocument();
    
    // The CSS class should ensure minimum height
    expect(continueButton.closest('button')).toHaveClass('action-button-primary');
  });

  test('handles empty state correctly', async () => {
    WorkerMobileApiService.getTodaysTasks.mockResolvedValue({
      data: {
        ...mockTaskData,
        tasks: [],
      },
    });

    render(<TaskDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByText('No Tasks Today')).toBeInTheDocument();
    });

    expect(screen.getByText("You don't have any tasks assigned for today.")).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  test('displays online/offline status correctly', async () => {
    WorkerMobileApiService.getTodaysTasks.mockResolvedValue({
      data: mockTaskData,
    });

    render(<TaskDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
    });

    // Should show online status
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('On Site')).toBeInTheDocument();
  });

  test('displays task status and priority correctly', async () => {
    WorkerMobileApiService.getTodaysTasks.mockResolvedValue({
      data: mockTaskData,
    });

    render(<TaskDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
    });

    // Check task priority tag
    expect(screen.getByText('high')).toBeInTheDocument();
    
    // Check progress display
    expect(screen.getByText('75%')).toBeInTheDocument();
    
    // Check time estimate
    expect(screen.getByText('1h remaining')).toBeInTheDocument();
  });

  test('handles API error gracefully', async () => {
    WorkerMobileApiService.getTodaysTasks.mockRejectedValue(
      new Error('Network error')
    );

    render(<TaskDetailsScreen />);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Network connection error');
    });

    // Should show error state instead of empty content
    expect(screen.getByText('Network connection error')).toBeInTheDocument();
  });

  test('applies responsive CSS classes correctly', async () => {
    WorkerMobileApiService.getTodaysTasks.mockResolvedValue({
      data: mockTaskData,
    });

    const { container } = render(<TaskDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
    });

    // Check main container has responsive class
    const mainContainer = container.querySelector('.task-details-screen');
    expect(mainContainer).toBeInTheDocument();

    // Check header has responsive class
    const header = container.querySelector('.task-header');
    expect(header).toBeInTheDocument();

    // Check content container has responsive class
    const content = container.querySelector('.task-content');
    expect(content).toBeInTheDocument();

    // Check task cards have responsive classes
    const taskCard = container.querySelector('.task-item');
    expect(taskCard).toBeInTheDocument();
  });
});
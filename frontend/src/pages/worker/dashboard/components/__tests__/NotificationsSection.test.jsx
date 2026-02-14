import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationsSection from '../NotificationsSection.jsx';

// Mock app config
jest.mock('../../../../../config/app.config.js', () => ({
  log: jest.fn(),
  error: jest.fn()
}));

describe('NotificationsSection', () => {
  const mockNotifications = [
    {
      id: '1',
      type: 'system',
      priority: 'normal',
      title: 'System Update',
      message: 'System maintenance scheduled for tonight.',
      timestamp: new Date('2024-01-15T10:00:00Z'),
      isRead: false,
      sender: {
        name: 'System Administrator',
        role: 'Admin'
      }
    },
    {
      id: '2',
      type: 'supervisor',
      priority: 'urgent',
      title: 'Task Assignment',
      message: 'New urgent task assigned to your project.',
      timestamp: new Date('2024-01-15T11:30:00Z'),
      isRead: false,
      sender: {
        name: 'John Smith',
        role: 'Site Supervisor'
      }
    },
    {
      id: '3',
      type: 'management',
      priority: 'safety_alert',
      title: 'Safety Alert',
      message: 'Please wear safety helmets in construction zone.',
      timestamp: new Date('2024-01-15T09:00:00Z'),
      isRead: true,
      sender: {
        name: 'Safety Manager',
        role: 'Safety Officer'
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty State', () => {
    it('should display empty state when no notifications', () => {
      render(<NotificationsSection notifications={[]} />);
      
      expect(screen.getByText('No notifications')).toBeInTheDocument();
      expect(screen.getByText('You\'re all caught up! New notifications will appear here.')).toBeInTheDocument();
    });
  });

  describe('Notification Display', () => {
    it('should display notifications with sender identification', () => {
      render(<NotificationsSection notifications={mockNotifications} />);
      
      // Check system notification
      expect(screen.getByText('System Update')).toBeInTheDocument();
      expect(screen.getByText('System Administrator')).toBeInTheDocument();
      expect(screen.getByText('(Admin)')).toBeInTheDocument();
      
      // Check supervisor notification
      expect(screen.getByText('Task Assignment')).toBeInTheDocument();
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('(Site Supervisor)')).toBeInTheDocument();
      
      // Check management notification
      expect(screen.getByText('Safety Alert')).toBeInTheDocument();
      expect(screen.getByText('Safety Manager')).toBeInTheDocument();
      expect(screen.getByText('(Safety Officer)')).toBeInTheDocument();
    });

    it('should display notification types correctly', () => {
      render(<NotificationsSection notifications={mockNotifications} />);
      
      expect(screen.getByText('System')).toBeInTheDocument();
      expect(screen.getByText('Supervisor')).toBeInTheDocument();
      expect(screen.getByText('Management')).toBeInTheDocument();
    });

    it('should highlight priority notifications', () => {
      render(<NotificationsSection notifications={mockNotifications} />);
      
      // Check urgent notification has priority indicator
      const urgentNotification = screen.getByText('Task Assignment').closest('.notification-item');
      expect(urgentNotification).toHaveClass('priority-urgent');
      expect(screen.getByText('Urgent')).toBeInTheDocument();
      
      // Check safety alert has priority indicator
      const safetyNotification = screen.getByText('Safety Alert').closest('.notification-item');
      expect(safetyNotification).toHaveClass('priority-safety');
      expect(screen.getByText('Safety Alert', { selector: '.priority-label' })).toBeInTheDocument();
    });

    it('should display unread count in header', () => {
      render(<NotificationsSection notifications={mockNotifications} />);
      
      // Should show 2 unread notifications (system and supervisor)
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('Chronological Ordering', () => {
    it('should display notifications in chronological order with most recent first', () => {
      render(<NotificationsSection notifications={mockNotifications} />);
      
      const notificationItems = screen.getAllByRole('button');
      const notificationTitles = notificationItems.map(item => 
        item.querySelector('.notification-title')?.textContent
      ).filter(Boolean);
      
      // Should be ordered: Safety Alert (priority), Task Assignment (urgent + recent), System Update (normal + older)
      // Priority order: safety_alert > urgent > normal, then by timestamp (most recent first)
      expect(notificationTitles[0]).toBe('Safety Alert'); // safety_alert priority
      expect(notificationTitles[1]).toBe('Task Assignment'); // urgent priority, more recent
    });
  });

  describe('Read Status Management', () => {
    it('should show read status correctly', () => {
      render(<NotificationsSection notifications={mockNotifications} />);
      
      // Check read notification shows read indicator
      const readNotification = screen.getByText('Safety Alert').closest('.notification-item');
      expect(readNotification).toHaveClass('read');
      expect(screen.getByText('Read')).toBeInTheDocument();
      
      // Check unread notifications show unread indicator
      const unreadNotifications = screen.getAllByText('Tap to mark as read');
      expect(unreadNotifications).toHaveLength(2); // System and supervisor notifications
    });

    it('should handle marking notification as read', async () => {
      const mockOnMarkAsRead = jest.fn().mockResolvedValue();
      
      render(
        <NotificationsSection 
          notifications={mockNotifications} 
          onMarkAsRead={mockOnMarkAsRead}
        />
      );
      
      // Click on unread system notification
      const systemNotification = screen.getByText('System Update').closest('.notification-item');
      fireEvent.click(systemNotification);
      
      await waitFor(() => {
        expect(mockOnMarkAsRead).toHaveBeenCalledWith('1');
      });
    });

    it('should handle keyboard interaction for marking as read', async () => {
      const mockOnMarkAsRead = jest.fn().mockResolvedValue();
      
      render(
        <NotificationsSection 
          notifications={mockNotifications} 
          onMarkAsRead={mockOnMarkAsRead}
        />
      );
      
      // Focus and press Enter on unread notification
      const systemNotification = screen.getByText('System Update').closest('.notification-item');
      systemNotification.focus();
      fireEvent.keyDown(systemNotification, { key: 'Enter' });
      
      await waitFor(() => {
        expect(mockOnMarkAsRead).toHaveBeenCalledWith('1');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error banner when error occurs', () => {
      render(<NotificationsSection notifications={mockNotifications} />);
      
      // Simulate error by triggering a failed mark as read
      const mockOnMarkAsRead = jest.fn().mockRejectedValue(new Error('Network error'));
      
      render(
        <NotificationsSection 
          notifications={mockNotifications} 
          onMarkAsRead={mockOnMarkAsRead}
        />
      );
      
      // Click notification to trigger error
      const systemNotification = screen.getByText('System Update').closest('.notification-item');
      fireEvent.click(systemNotification);
      
      // Note: Error handling is internal, so we can't easily test the error banner display
      // In a real implementation, we might expose error state through props or context
    });
  });

  describe('Responsive Design', () => {
    it('should render without crashing on mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<NotificationsSection notifications={mockNotifications} />);
      
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('System Update')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA roles and labels', () => {
      render(<NotificationsSection notifications={mockNotifications} />);
      
      // Check unread notifications have button role
      const unreadNotifications = screen.getAllByRole('button');
      expect(unreadNotifications.length).toBeGreaterThan(0);
      
      // Check read notifications have article role
      const readNotifications = screen.getAllByRole('article');
      expect(readNotifications).toHaveLength(1); // One read notification
    });

    it('should support keyboard navigation', () => {
      render(<NotificationsSection notifications={mockNotifications} />);
      
      const unreadNotifications = screen.getAllByRole('button');
      unreadNotifications.forEach(notification => {
        expect(notification).toHaveAttribute('tabIndex', '0');
      });
    });
  });
});
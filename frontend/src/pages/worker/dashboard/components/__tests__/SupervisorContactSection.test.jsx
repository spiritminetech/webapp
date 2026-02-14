import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SupervisorContactSection from '../SupervisorContactSection.jsx';

// Mock window.location.href
delete window.location;
window.location = { href: '' };

// Mock alert function
global.alert = jest.fn();

describe('SupervisorContactSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.location.href = '';
  });

  describe('No Supervisor Assigned Edge Case', () => {
    test('displays "Contact Site Manager" when no supervisor assigned', () => {
      render(<SupervisorContactSection supervisorInfo={null} />);

      expect(screen.getByText('Supervisor Contact')).toBeInTheDocument();
      expect(screen.getByText('No supervisor assigned for today')).toBeInTheDocument();
      expect(screen.getByText('Contact Site Manager')).toBeInTheDocument();
    });

    test('handles contact site manager button click', () => {
      render(<SupervisorContactSection supervisorInfo={null} />);

      const contactButton = screen.getByText('Contact Site Manager');
      fireEvent.click(contactButton);

      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Site Manager Contact')
      );
    });
  });

  describe('Supervisor Information Display', () => {
    const mockSupervisor = {
      supervisorId: 'sup-123',
      name: 'John Smith',
      phoneNumber: '+65-9123-4567',
      isAvailableForCall: true,
      isAvailableForMessaging: true
    };

    test('displays supervisor name and phone number', () => {
      render(<SupervisorContactSection supervisorInfo={mockSupervisor} />);

      expect(screen.getByText('Supervisor Contact')).toBeInTheDocument();
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('+65-9123-4567')).toBeInTheDocument();
    });

    test('shows call button when supervisor is available for calls', () => {
      render(<SupervisorContactSection supervisorInfo={mockSupervisor} />);

      expect(screen.getByText('Call')).toBeInTheDocument();
    });

    test('shows message button when supervisor is available for messaging', () => {
      render(<SupervisorContactSection supervisorInfo={mockSupervisor} />);

      expect(screen.getByText('Message')).toBeInTheDocument();
    });
  });

  describe('Call Initiation Functionality', () => {
    const mockSupervisor = {
      supervisorId: 'sup-123',
      name: 'John Smith',
      phoneNumber: '+65-9123-4567',
      isAvailableForCall: true,
      isAvailableForMessaging: false
    };

    test('initiates phone call when call button is clicked', async () => {
      const onCallInitiated = jest.fn();
      render(
        <SupervisorContactSection 
          supervisorInfo={mockSupervisor} 
          onCallInitiated={onCallInitiated}
        />
      );

      const callButton = screen.getByText('Call');
      fireEvent.click(callButton);

      expect(window.location.href).toBe('tel:+65-9123-4567');
      expect(onCallInitiated).toHaveBeenCalledWith(mockSupervisor);

      // Check for loading state
      expect(screen.getByText('Calling...')).toBeInTheDocument();
    });

    test('handles call error gracefully', async () => {
      // Mock window.location.href to throw error
      Object.defineProperty(window, 'location', {
        value: {
          get href() {
            throw new Error('Navigation failed');
          },
          set href(value) {
            throw new Error('Navigation failed');
          }
        },
        writable: true
      });

      render(<SupervisorContactSection supervisorInfo={mockSupervisor} />);

      const callButton = screen.getByText('Call');
      fireEvent.click(callButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          expect.stringContaining('Unable to initiate call')
        );
      });
    });

    test('prevents multiple simultaneous calls', () => {
      render(<SupervisorContactSection supervisorInfo={mockSupervisor} />);

      const callButton = screen.getByText('Call');
      
      // Click multiple times rapidly
      fireEvent.click(callButton);
      fireEvent.click(callButton);
      fireEvent.click(callButton);

      // Should only set href once
      expect(window.location.href).toBe('tel:+65-9123-4567');
    });
  });

  describe('In-App Messaging Integration', () => {
    const mockSupervisor = {
      supervisorId: 'sup-123',
      name: 'John Smith',
      phoneNumber: '+65-9123-4567',
      isAvailableForCall: false,
      isAvailableForMessaging: true
    };

    test('initiates messaging when message button is clicked', async () => {
      const onMessageInitiated = jest.fn();
      render(
        <SupervisorContactSection 
          supervisorInfo={mockSupervisor} 
          onMessageInitiated={onMessageInitiated}
        />
      );

      const messageButton = screen.getByText('Message');
      fireEvent.click(messageButton);

      expect(onMessageInitiated).toHaveBeenCalledWith(mockSupervisor);
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Opening message to John Smith')
      );

      // Check for loading state
      expect(screen.getByText('Opening...')).toBeInTheDocument();
    });

    test('prevents multiple simultaneous message attempts', () => {
      render(<SupervisorContactSection supervisorInfo={mockSupervisor} />);

      const messageButton = screen.getByText('Message');
      
      // Click multiple times rapidly
      fireEvent.click(messageButton);
      fireEvent.click(messageButton);
      fireEvent.click(messageButton);

      // Should only call alert once
      expect(global.alert).toHaveBeenCalledTimes(1);
    });
  });

  describe('No Contact Options Available', () => {
    const mockSupervisorNoContact = {
      supervisorId: 'sup-123',
      name: 'John Smith',
      phoneNumber: '+65-9123-4567',
      isAvailableForCall: false,
      isAvailableForMessaging: false
    };

    test('shows fallback contact when no options available', () => {
      render(<SupervisorContactSection supervisorInfo={mockSupervisorNoContact} />);

      expect(screen.getByText('Contact options not available')).toBeInTheDocument();
      expect(screen.getByText('Contact Site Manager')).toBeInTheDocument();
    });

    test('does not show call button when not available', () => {
      render(<SupervisorContactSection supervisorInfo={mockSupervisorNoContact} />);

      expect(screen.queryByText('Call')).not.toBeInTheDocument();
    });

    test('does not show message button when not available', () => {
      render(<SupervisorContactSection supervisorInfo={mockSupervisorNoContact} />);

      expect(screen.queryByText('Message')).not.toBeInTheDocument();
    });
  });

  describe('Component Props and Styling', () => {
    const mockSupervisor = {
      supervisorId: 'sup-123',
      name: 'John Smith',
      phoneNumber: '+65-9123-4567',
      isAvailableForCall: true,
      isAvailableForMessaging: true
    };

    test('applies custom className', () => {
      const { container } = render(
        <SupervisorContactSection 
          supervisorInfo={mockSupervisor} 
          className="custom-class"
        />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    test('renders with default className when none provided', () => {
      const { container } = render(
        <SupervisorContactSection supervisorInfo={mockSupervisor} />
      );

      expect(container.querySelector('.supervisor-contact-section')).toBeInTheDocument();
    });
  });
});
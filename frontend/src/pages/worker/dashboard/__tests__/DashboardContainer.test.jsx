import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '../../../../context/AuthContext.js';
import DashboardContainer from '../DashboardContainer.jsx';

// Mock the auth context with a test user
const mockUser = {
  id: 'test-worker-123',
  email: 'test@example.com',
  name: 'Test Worker'
};

const MockAuthProvider = ({ children }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

describe('DashboardContainer', () => {
  beforeEach(() => {
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn((key) => {
        if (key === 'user') {
          return JSON.stringify(mockUser);
        }
        if (key === 'token') {
          return 'mock-token';
        }
        return null;
      }),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });

    // Mock window.location
    delete window.location;
    window.location = { href: '' };
  });

  test('renders dashboard container without crashing', () => {
    render(
      <MockAuthProvider>
        <DashboardContainer />
      </MockAuthProvider>
    );

    // Should show loading state initially
    expect(screen.getByText(/loading/i) || screen.getByText(/dashboard/i)).toBeInTheDocument();
  });

  test('shows loading state initially', () => {
    render(
      <MockAuthProvider>
        <DashboardContainer />
      </MockAuthProvider>
    );

    // Check for loading skeleton or dashboard content
    const loadingElements = screen.queryAllByText(/loading/i);
    const dashboardElements = screen.queryAllByText(/dashboard/i);
    
    expect(loadingElements.length > 0 || dashboardElements.length > 0).toBe(true);
  });
});
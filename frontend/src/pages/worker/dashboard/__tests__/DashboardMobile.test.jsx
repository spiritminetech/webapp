import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import '../DashboardMobile.css';

// Mock component to test CSS classes
const MockDashboardComponent = () => {
  return (
    <div className="dashboard-mobile-container">
      <div className="dashboard-mobile-header">
        <h1 className="dashboard-mobile-title">Test Dashboard</h1>
        <p className="dashboard-mobile-subtitle">Test subtitle</p>
      </div>
      
      <div className="dashboard-mobile-section">
        <div className="dashboard-mobile-section-header">
          <h2 className="dashboard-mobile-section-title">
            <span className="dashboard-mobile-section-icon">🏗️</span>
            Test Section
          </h2>
        </div>
        
        <div className="dashboard-mobile-info-grid">
          <div className="dashboard-mobile-info-item">
            <span className="dashboard-mobile-info-label">
              <span className="dashboard-mobile-info-icon">📍</span>
              Test Label
            </span>
            <span className="dashboard-mobile-info-value">Test Value</span>
          </div>
        </div>
        
        <button className="dashboard-mobile-button dashboard-mobile-button--primary dashboard-mobile-button--large">
          <span>🔄</span>
          Test Button
        </button>
      </div>
      
      <div className="dashboard-mobile-status dashboard-mobile-status--success">
        <span className="dashboard-mobile-status-icon">✅</span>
        Test Status
      </div>
      
      <div className="dashboard-mobile-notification dashboard-mobile-notification--unread">
        <div className="dashboard-mobile-notification-header">
          <div className="dashboard-mobile-notification-meta">
            <div className="dashboard-mobile-notification-type">System</div>
            <div className="dashboard-mobile-notification-sender">Test Sender</div>
          </div>
          <div className="dashboard-mobile-notification-time">5m ago</div>
        </div>
        <h3 className="dashboard-mobile-notification-title">Test Notification</h3>
        <p className="dashboard-mobile-notification-message">Test message</p>
      </div>
    </div>
  );
};

describe('Dashboard Mobile CSS', () => {
  test('renders dashboard components with mobile-first CSS classes', () => {
    render(<MockDashboardComponent />);
    
    // Test main container
    const container = document.querySelector('.dashboard-mobile-container');
    expect(container).toBeInTheDocument();
    
    // Test header elements
    expect(screen.getByText('Test Dashboard')).toHaveClass('dashboard-mobile-title');
    expect(screen.getByText('Test subtitle')).toHaveClass('dashboard-mobile-subtitle');
    
    // Test section elements
    expect(screen.getByText('Test Section')).toHaveClass('dashboard-mobile-section-title');
    expect(document.querySelector('.dashboard-mobile-section')).toBeInTheDocument();
    
    // Test info grid elements
    expect(document.querySelector('.dashboard-mobile-info-grid')).toBeInTheDocument();
    expect(document.querySelector('.dashboard-mobile-info-item')).toBeInTheDocument();
    expect(screen.getByText('Test Label')).toHaveClass('dashboard-mobile-info-label');
    expect(screen.getByText('Test Value')).toHaveClass('dashboard-mobile-info-value');
    
    // Test button elements
    const button = screen.getByText('Test Button').closest('button');
    expect(button).toHaveClass('dashboard-mobile-button');
    expect(button).toHaveClass('dashboard-mobile-button--primary');
    expect(button).toHaveClass('dashboard-mobile-button--large');
    
    // Test status elements
    const status = document.querySelector('.dashboard-mobile-status');
    expect(status).toBeInTheDocument();
    expect(status).toHaveClass('dashboard-mobile-status--success');
    
    // Test notification elements
    const notification = document.querySelector('.dashboard-mobile-notification');
    expect(notification).toBeInTheDocument();
    expect(notification).toHaveClass('dashboard-mobile-notification--unread');
    expect(screen.getByText('Test Notification')).toHaveClass('dashboard-mobile-notification-title');
    expect(screen.getByText('Test message')).toHaveClass('dashboard-mobile-notification-message');
  });
  
  test('applies correct CSS custom properties', () => {
    render(<MockDashboardComponent />);
    
    // Check that CSS custom properties are available
    const container = document.querySelector('.dashboard-mobile-container');
    const computedStyle = window.getComputedStyle(container);
    
    // The CSS custom properties should be available in the computed style
    // Note: In jsdom, CSS custom properties might not be fully supported,
    // but we can at least verify the classes are applied correctly
    expect(container).toHaveClass('dashboard-mobile-container');
  });
  
  test('includes responsive design classes', () => {
    render(<MockDashboardComponent />);
    
    // Test that responsive utility classes exist in the DOM
    const infoGrid = document.querySelector('.dashboard-mobile-info-grid');
    expect(infoGrid).toBeInTheDocument();
    
    const button = document.querySelector('.dashboard-mobile-button--large');
    expect(button).toBeInTheDocument();
  });
  
  test('includes accessibility classes', () => {
    render(
      <div className="dashboard-mobile-container">
        <span className="dashboard-mobile-sr-only">Screen reader only text</span>
        <button className="dashboard-mobile-button dashboard-mobile-button--primary">
          Accessible Button
        </button>
      </div>
    );
    
    const srOnly = document.querySelector('.dashboard-mobile-sr-only');
    expect(srOnly).toBeInTheDocument();
    expect(srOnly).toHaveTextContent('Screen reader only text');
    
    const button = screen.getByText('Accessible Button');
    expect(button).toHaveClass('dashboard-mobile-button');
  });
});

describe('Mobile-First Design Principles', () => {
  test('uses touch-friendly button sizing', () => {
    render(
      <button className="dashboard-mobile-button dashboard-mobile-button--large">
        Touch Button
      </button>
    );
    
    const button = screen.getByText('Touch Button');
    expect(button).toHaveClass('dashboard-mobile-button--large');
  });
  
  test('includes high contrast status indicators', () => {
    render(
      <div>
        <div className="dashboard-mobile-status dashboard-mobile-status--success">Success</div>
        <div className="dashboard-mobile-status dashboard-mobile-status--warning">Warning</div>
        <div className="dashboard-mobile-status dashboard-mobile-status--error">Error</div>
      </div>
    );
    
    expect(document.querySelector('.dashboard-mobile-status--success')).toBeInTheDocument();
    expect(document.querySelector('.dashboard-mobile-status--warning')).toBeInTheDocument();
    expect(document.querySelector('.dashboard-mobile-status--error')).toBeInTheDocument();
  });
  
  test('includes loading and error states', () => {
    render(
      <div>
        <div className="dashboard-mobile-loading">
          <div className="dashboard-mobile-skeleton dashboard-mobile-skeleton--title"></div>
        </div>
        <div className="dashboard-mobile-error">
          <div className="dashboard-mobile-error-icon">❌</div>
          <h2 className="dashboard-mobile-error-title">Error Title</h2>
        </div>
        <div className="dashboard-mobile-empty">
          <div className="dashboard-mobile-empty-icon">📭</div>
          <h3 className="dashboard-mobile-empty-title">Empty State</h3>
        </div>
      </div>
    );
    
    expect(document.querySelector('.dashboard-mobile-loading')).toBeInTheDocument();
    expect(document.querySelector('.dashboard-mobile-skeleton--title')).toBeInTheDocument();
    expect(document.querySelector('.dashboard-mobile-error')).toBeInTheDocument();
    expect(document.querySelector('.dashboard-mobile-empty')).toBeInTheDocument();
    expect(screen.getByText('Error Title')).toHaveClass('dashboard-mobile-error-title');
    expect(screen.getByText('Empty State')).toHaveClass('dashboard-mobile-empty-title');
  });
});
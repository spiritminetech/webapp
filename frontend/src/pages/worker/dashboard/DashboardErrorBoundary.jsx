import React from 'react';
import appConfig from '../../../config/app.config.js';
import errorLoggingService from '../../../services/ErrorLoggingService.js';
import errorRecoveryService from '../../../services/ErrorRecoveryService.js';

/**
 * Enhanced Error Boundary for Dashboard Components
 * Catches JavaScript errors anywhere in the dashboard component tree
 * Provides comprehensive error handling, logging, and recovery options
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null,
      recoveryOptions: [],
      troubleshootingGuide: null,
      supportInfo: null,
      isRecovering: false,
      recoveryAttempted: false
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  async componentDidCatch(error, errorInfo) {
    // Log error details
    appConfig.error('Dashboard Error Boundary caught an error:', error, errorInfo);
    
    // Create error context
    const errorContext = {
      type: 'component',
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      workerId: this.props.workerId,
      supervisorInfo: this.props.supervisorInfo,
      projectInfo: this.props.projectInfo,
      reloadComponent: this.handleRetry
    };

    // Log error with comprehensive logging service - Requirement 10.5
    const errorId = errorLoggingService.logComponentError(error, errorInfo, 'DashboardErrorBoundary');
    
    // Get recovery options and troubleshooting guidance - Requirements 10.1, 10.2, 10.3
    const recoveryOptions = errorRecoveryService.getRecoveryOptions(error, errorContext);
    const troubleshootingGuide = errorRecoveryService.getTroubleshootingGuidance(error, errorContext);
    const supportInfo = errorRecoveryService.getSupportInfo('component', errorContext);

    this.setState({
      error,
      errorInfo,
      errorId,
      recoveryOptions,
      troubleshootingGuide,
      supportInfo
    });
  }

  handleRetry = async () => {
    this.setState({ isRecovering: true });
    
    try {
      // Attempt automatic recovery first
      const recoveryResult = await errorRecoveryService.attemptRecovery(
        this.state.error, 
        {
          type: 'component',
          workerId: this.props.workerId,
          supervisorInfo: this.props.supervisorInfo,
          reloadComponent: () => {
            this.setState({ 
              hasError: false, 
              error: null, 
              errorInfo: null,
              errorId: null,
              recoveryOptions: [],
              troubleshootingGuide: null,
              supportInfo: null,
              isRecovering: false,
              recoveryAttempted: true
            });
          }
        }
      );

      if (recoveryResult.recovered) {
        // Recovery successful
        appConfig.log('Error boundary recovery successful');
      } else {
        // Recovery failed, just reset the error boundary
        this.setState({ 
          hasError: false, 
          error: null, 
          errorInfo: null,
          errorId: null,
          recoveryOptions: [],
          troubleshootingGuide: null,
          supportInfo: null,
          isRecovering: false,
          recoveryAttempted: true
        });
      }
    } catch (recoveryError) {
      appConfig.error('Error boundary recovery failed:', recoveryError);
      
      // Just reset the error boundary as fallback
      this.setState({ 
        hasError: false, 
        error: null, 
        errorInfo: null,
        errorId: null,
        recoveryOptions: [],
        troubleshootingGuide: null,
        supportInfo: null,
        isRecovering: false,
        recoveryAttempted: true
      });
    }
  };

  handleRecoveryOption = async (option) => {
    this.setState({ isRecovering: true });
    
    try {
      const result = await option.execute();
      
      if (result.recovered) {
        appConfig.log('Recovery option succeeded:', option.name);
        
        // If it's a page refresh or redirect, don't update state
        if (option.id === 'refresh_page' || option.id === 'redirect_login') {
          return;
        }
        
        // Reset error boundary
        this.setState({ 
          hasError: false, 
          error: null, 
          errorInfo: null,
          errorId: null,
          recoveryOptions: [],
          troubleshootingGuide: null,
          supportInfo: null,
          isRecovering: false,
          recoveryAttempted: true
        });
      } else {
        appConfig.error('Recovery option failed:', option.name, result.message);
        this.setState({ isRecovering: false });
      }
    } catch (error) {
      appConfig.error('Recovery option error:', option.name, error);
      this.setState({ isRecovering: false });
    }
  };

  handleContactSupport = (contactOption) => {
    // Log support contact attempt - Requirement 10.4
    errorLoggingService.logError(
      new Error('Support contact requested'),
      {
        type: 'support_contact',
        errorId: this.state.errorId,
        contactType: contactOption.type,
        contactName: contactOption.name,
        originalError: this.state.error?.message
      },
      'medium'
    );

    if (contactOption.type === 'supervisor' && contactOption.phone) {
      // Attempt to initiate phone call
      try {
        window.location.href = `tel:${contactOption.phone}`;
      } catch (error) {
        // Fallback to showing contact info
        alert(`Contact your supervisor: ${contactOption.name}\nPhone: ${contactOption.phone}\n\nError ID: ${this.state.errorId}`);
      }
    } else {
      // Show contact information
      const message = `Please contact support for assistance:\n\n` +
        `Contact: ${contactOption.name}\n` +
        `Error ID: ${this.state.errorId}\n` +
        `Time: ${new Date().toLocaleString()}\n\n` +
        `Error: ${this.state.error?.message || 'Unknown error'}`;
      
      alert(message);
    }
  };

  handleShowTroubleshooting = () => {
    this.setState(prevState => ({
      showTroubleshooting: !prevState.showTroubleshooting
    }));
  };

  render() {
    if (this.state.hasError) {
      const { 
        error, 
        errorId, 
        recoveryOptions, 
        troubleshootingGuide, 
        supportInfo, 
        isRecovering,
        showTroubleshooting 
      } = this.state;

      // Fallback UI with comprehensive error handling
      return (
        <div className="dashboard-error-boundary">
          <div className="error-container">
            <div className="error-header">
              <div className="error-icon">
                {troubleshootingGuide?.icon || '⚠️'}
              </div>
              <h2 className="error-title">
                {troubleshootingGuide?.title || 'Something went wrong'}
              </h2>
              <p className="error-message">
                {troubleshootingGuide?.description || 
                 'The dashboard encountered an unexpected error. This has been logged for review.'}
              </p>
              {errorId && (
                <p className="error-id">Error ID: {errorId}</p>
              )}
            </div>
            
            {/* Recovery Options - Requirements 10.1, 10.2 */}
            <div className="error-actions">
              <div className="primary-actions">
                <button 
                  className="retry-button"
                  onClick={this.handleRetry}
                  disabled={isRecovering}
                  type="button"
                >
                  {isRecovering ? '🔄 Recovering...' : '🔄 Try Again'}
                </button>
                
                {recoveryOptions.length > 0 && (
                  <div className="recovery-options">
                    {recoveryOptions.slice(0, 2).map((option, index) => (
                      <button
                        key={option.id}
                        className="recovery-button"
                        onClick={() => this.handleRecoveryOption(option)}
                        disabled={isRecovering}
                        type="button"
                      >
                        {option.icon} {option.userFriendly}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="secondary-actions">
                <button 
                  className="troubleshooting-button"
                  onClick={this.handleShowTroubleshooting}
                  type="button"
                >
                  {showTroubleshooting ? '📖 Hide Help' : '📖 Show Help'}
                </button>
              </div>
            </div>

            {/* Troubleshooting Guide - Requirement 10.3 */}
            {showTroubleshooting && troubleshootingGuide && (
              <div className="troubleshooting-section">
                <h3>Troubleshooting Steps</h3>
                <ol className="troubleshooting-steps">
                  {troubleshootingGuide.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Support Contact Information - Requirement 10.4 */}
            {supportInfo && supportInfo.contactOptions.length > 0 && (
              <div className="support-section">
                <h3>Need Help?</h3>
                <div className="support-contacts">
                  {supportInfo.contactOptions.map((contact, index) => (
                    <button
                      key={index}
                      className={`support-button ${contact.primary ? 'primary' : 'secondary'}`}
                      onClick={() => this.handleContactSupport(contact)}
                      disabled={!contact.available}
                      type="button"
                    >
                      {contact.type === 'supervisor' && '👨‍💼'}
                      {contact.type === 'site_manager' && '🏗️'}
                      {contact.type === 'technical' && '🔧'}
                      {' '}Contact {contact.name}
                      {contact.phone && contact.phone !== 'Contact through supervisor' && (
                        <span className="phone-number"> ({contact.phone})</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Development Error Details */}
            {appConfig.app.isDevelopment && error && (
              <details className="error-details">
                <summary>Error Details (Development Only)</summary>
                <div className="error-stack">
                  <h4>Error Message:</h4>
                  <pre>{error.toString()}</pre>
                  
                  <h4>Stack Trace:</h4>
                  <pre>{error.stack}</pre>
                  
                  {this.state.errorInfo?.componentStack && (
                    <>
                      <h4>Component Stack:</h4>
                      <pre>{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
                  
                  <h4>Recovery Options:</h4>
                  <pre>{JSON.stringify(recoveryOptions, null, 2)}</pre>
                </div>
              </details>
            )}
          </div>

          <style jsx>{`
            .dashboard-error-boundary {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              padding: 20px;
              background-color: #f5f5f5;
            }

            .error-container {
              background: white;
              border-radius: 12px;
              padding: 32px;
              text-align: center;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
              max-width: 600px;
              width: 100%;
            }

            .error-header {
              margin-bottom: 32px;
            }

            .error-icon {
              font-size: 64px;
              margin-bottom: 16px;
            }

            .error-title {
              color: #d32f2f;
              margin-bottom: 16px;
              font-size: 28px;
              font-weight: 600;
            }

            .error-message {
              color: #666;
              margin-bottom: 16px;
              line-height: 1.6;
              font-size: 16px;
            }

            .error-id {
              color: #999;
              font-size: 14px;
              font-family: monospace;
              background: #f5f5f5;
              padding: 8px 12px;
              border-radius: 4px;
              display: inline-block;
            }

            .error-actions {
              margin-bottom: 32px;
            }

            .primary-actions {
              margin-bottom: 16px;
            }

            .recovery-options {
              display: flex;
              gap: 12px;
              justify-content: center;
              flex-wrap: wrap;
              margin-top: 16px;
            }

            .retry-button, .recovery-button, .troubleshooting-button, .support-button {
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
              min-width: 140px;
            }

            .retry-button {
              background-color: #1976d2;
              color: white;
              font-size: 18px;
              padding: 16px 32px;
            }

            .retry-button:hover:not(:disabled) {
              background-color: #1565c0;
              transform: translateY(-1px);
            }

            .retry-button:disabled {
              background-color: #ccc;
              cursor: not-allowed;
            }

            .recovery-button {
              background-color: #4caf50;
              color: white;
            }

            .recovery-button:hover:not(:disabled) {
              background-color: #45a049;
            }

            .recovery-button:disabled {
              background-color: #ccc;
              cursor: not-allowed;
            }

            .troubleshooting-button {
              background-color: #ff9800;
              color: white;
            }

            .troubleshooting-button:hover {
              background-color: #f57c00;
            }

            .support-button {
              background-color: #f5f5f5;
              color: #333;
              border: 2px solid #ddd;
              margin: 8px;
            }

            .support-button.primary {
              background-color: #2196f3;
              color: white;
              border-color: #2196f3;
            }

            .support-button:hover:not(:disabled) {
              background-color: #eeeeee;
              border-color: #bbb;
            }

            .support-button.primary:hover:not(:disabled) {
              background-color: #1976d2;
            }

            .support-button:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }

            .phone-number {
              font-size: 14px;
              opacity: 0.8;
            }

            .troubleshooting-section, .support-section {
              background: #f9f9f9;
              border-radius: 8px;
              padding: 24px;
              margin: 24px 0;
              text-align: left;
            }

            .troubleshooting-section h3, .support-section h3 {
              color: #333;
              margin-bottom: 16px;
              font-size: 20px;
            }

            .troubleshooting-steps {
              margin: 0;
              padding-left: 20px;
            }

            .troubleshooting-steps li {
              margin-bottom: 12px;
              line-height: 1.5;
            }

            .support-contacts {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }

            .error-details {
              margin-top: 32px;
              text-align: left;
              background: #f5f5f5;
              border-radius: 8px;
              padding: 16px;
            }

            .error-details summary {
              cursor: pointer;
              font-weight: 500;
              margin-bottom: 16px;
              color: #666;
            }

            .error-stack {
              font-size: 12px;
            }

            .error-stack h4 {
              color: #333;
              margin: 16px 0 8px 0;
              font-size: 14px;
            }

            .error-stack pre {
              background-color: #fff;
              padding: 12px;
              border-radius: 4px;
              overflow-x: auto;
              white-space: pre-wrap;
              word-break: break-word;
              border: 1px solid #ddd;
              margin-bottom: 12px;
            }

            @media (max-width: 768px) {
              .error-container {
                padding: 24px;
                margin: 10px;
              }

              .error-title {
                font-size: 24px;
              }

              .recovery-options {
                flex-direction: column;
              }

              .retry-button, .recovery-button, .troubleshooting-button, .support-button {
                width: 100%;
                min-width: auto;
              }

              .support-contacts {
                align-items: stretch;
              }
            }

            @media (max-width: 480px) {
              .dashboard-error-boundary {
                padding: 10px;
              }

              .error-container {
                padding: 20px;
              }

              .error-icon {
                font-size: 48px;
              }

              .error-title {
                font-size: 20px;
              }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DashboardErrorBoundary;
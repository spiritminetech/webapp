import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Error Display Component for Worker Mobile Dashboard
 * Displays errors with recovery options and troubleshooting guidance
 * Requirements: 10.1, 10.2, 10.3, 10.4 - Error display with recovery options and support info
 */
const ErrorDisplay = ({
  error,
  recoveryOptions = [],
  troubleshootingGuide = null,
  supportInfo = null,
  isRecovering = false,
  onRetry = null,
  onRecoveryOption = null,
  onContactSupport = null,
  onDismiss = null,
  variant = 'full', // 'full', 'compact', 'inline'
  showTroubleshooting = true,
  showSupport = true,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showTroubleshootingDetails, setShowTroubleshootingDetails] = useState(false);

  if (!error) {
    return null;
  }

  const errorMessage = error.error?.message || error.message || 'An unexpected error occurred';
  const errorId = error.id || error.errorId || 'unknown';

  const handleContactSupport = (contactOption) => {
    if (onContactSupport) {
      onContactSupport(contactOption);
    } else {
      // Default contact behavior
      if (contactOption.phone && contactOption.phone !== 'Contact through supervisor') {
        try {
          window.location.href = `tel:${contactOption.phone}`;
        } catch (err) {
          alert(`Contact: ${contactOption.name}\nPhone: ${contactOption.phone}\nError ID: ${errorId}`);
        }
      } else {
        alert(`Contact: ${contactOption.name}\nError ID: ${errorId}\nTime: ${new Date().toLocaleString()}`);
      }
    }
  };

  // Compact variant for inline errors
  if (variant === 'compact') {
    return (
      <div className={`error-display compact ${className}`}>
        <div className="error-content">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{errorMessage}</span>
          {onRetry && (
            <button
              className="retry-button-compact"
              onClick={onRetry}
              disabled={isRecovering}
              type="button"
            >
              {isRecovering ? '🔄' : '↻'}
            </button>
          )}
          {onDismiss && (
            <button
              className="dismiss-button"
              onClick={onDismiss}
              type="button"
            >
              ✕
            </button>
          )}
        </div>

        <style jsx>{`
          .error-display.compact {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 12px;
            margin: 8px 0;
            font-size: 14px;
          }

          .error-content {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .error-icon {
            font-size: 16px;
            flex-shrink: 0;
          }

          .error-message {
            flex: 1;
            color: #856404;
          }

          .retry-button-compact, .dismiss-button {
            background: none;
            border: none;
            font-size: 16px;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            color: #856404;
          }

          .retry-button-compact:hover, .dismiss-button:hover {
            background: rgba(133, 100, 4, 0.1);
          }

          .retry-button-compact:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    );
  }

  // Inline variant for form errors
  if (variant === 'inline') {
    return (
      <div className={`error-display inline ${className}`}>
        <span className="error-icon">⚠️</span>
        <span className="error-message">{errorMessage}</span>
        {onRetry && (
          <button
            className="retry-link"
            onClick={onRetry}
            disabled={isRecovering}
            type="button"
          >
            {isRecovering ? 'Retrying...' : 'Try again'}
          </button>
        )}

        <style jsx>{`
          .error-display.inline {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #d32f2f;
            font-size: 14px;
            margin: 4px 0;
          }

          .error-icon {
            font-size: 14px;
          }

          .error-message {
            flex: 1;
          }

          .retry-link {
            background: none;
            border: none;
            color: #1976d2;
            text-decoration: underline;
            cursor: pointer;
            font-size: 14px;
          }

          .retry-link:hover:not(:disabled) {
            color: #1565c0;
          }

          .retry-link:disabled {
            color: #999;
            cursor: not-allowed;
            text-decoration: none;
          }
        `}</style>
      </div>
    );
  }

  // Full variant with all features
  return (
    <div className={`error-display full ${className}`}>
      <div className="error-header">
        <div className="error-icon-large">
          {troubleshootingGuide?.icon || '⚠️'}
        </div>
        <div className="error-info">
          <h3 className="error-title">
            {troubleshootingGuide?.title || 'Error Occurred'}
          </h3>
          <p className="error-message">
            {troubleshootingGuide?.description || errorMessage}
          </p>
          {errorId && errorId !== 'unknown' && (
            <p className="error-id">Error ID: {errorId}</p>
          )}
        </div>
        {onDismiss && (
          <button
            className="dismiss-button-large"
            onClick={onDismiss}
            type="button"
          >
            ✕
          </button>
        )}
      </div>

      {/* Primary Actions */}
      <div className="error-actions">
        {onRetry && (
          <button
            className="retry-button-primary"
            onClick={onRetry}
            disabled={isRecovering}
            type="button"
          >
            {isRecovering ? '🔄 Retrying...' : '🔄 Try Again'}
          </button>
        )}

        {recoveryOptions.length > 0 && (
          <div className="recovery-options">
            {recoveryOptions.slice(0, 2).map((option, index) => (
              <button
                key={option.id}
                className="recovery-button"
                onClick={() => onRecoveryOption && onRecoveryOption(option)}
                disabled={isRecovering}
                type="button"
              >
                {option.icon} {option.userFriendly}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Troubleshooting Section */}
      {showTroubleshooting && troubleshootingGuide && (
        <div className="troubleshooting-section">
          <button
            className="section-toggle"
            onClick={() => setShowTroubleshootingDetails(!showTroubleshootingDetails)}
            type="button"
          >
            {showTroubleshootingDetails ? '📖 Hide Help' : '📖 Show Help'}
          </button>

          {showTroubleshootingDetails && (
            <div className="troubleshooting-content">
              <h4>What you can try:</h4>
              <ol className="troubleshooting-steps">
                {troubleshootingGuide.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Support Section */}
      {showSupport && supportInfo && supportInfo.contactOptions.length > 0 && (
        <div className="support-section">
          <h4>Need help?</h4>
          <div className="support-contacts">
            {supportInfo.contactOptions.map((contact, index) => (
              <button
                key={index}
                className={`support-button ${contact.primary ? 'primary' : 'secondary'}`}
                onClick={() => handleContactSupport(contact)}
                disabled={!contact.available}
                type="button"
              >
                {contact.type === 'supervisor' && '👨‍💼'}
                {contact.type === 'site_manager' && '🏗️'}
                {contact.type === 'technical' && '🔧'}
                {' '}Contact {contact.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Details (Development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="error-details">
          <button
            className="details-toggle"
            onClick={() => setShowDetails(!showDetails)}
            type="button"
          >
            {showDetails ? 'Hide Details' : 'Show Details'} (Dev)
          </button>

          {showDetails && (
            <div className="details-content">
              <h5>Error Details:</h5>
              <pre>{JSON.stringify(error, null, 2)}</pre>
              
              {recoveryOptions.length > 0 && (
                <>
                  <h5>Recovery Options:</h5>
                  <pre>{JSON.stringify(recoveryOptions, null, 2)}</pre>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .error-display.full {
          background: white;
          border: 1px solid #f5c6cb;
          border-radius: 8px;
          padding: 20px;
          margin: 16px 0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .error-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
        }

        .error-icon-large {
          font-size: 32px;
          flex-shrink: 0;
        }

        .error-info {
          flex: 1;
        }

        .error-title {
          color: #d32f2f;
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
        }

        .error-message {
          color: #666;
          margin: 0 0 8px 0;
          line-height: 1.5;
        }

        .error-id {
          color: #999;
          font-size: 12px;
          font-family: monospace;
          background: #f5f5f5;
          padding: 4px 8px;
          border-radius: 4px;
          display: inline-block;
          margin: 0;
        }

        .dismiss-button-large {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #999;
          padding: 4px;
          border-radius: 4px;
        }

        .dismiss-button-large:hover {
          background: #f5f5f5;
          color: #666;
        }

        .error-actions {
          margin-bottom: 20px;
        }

        .recovery-options {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .retry-button-primary {
          background-color: #1976d2;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .retry-button-primary:hover:not(:disabled) {
          background-color: #1565c0;
        }

        .retry-button-primary:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .recovery-button {
          background-color: #4caf50;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .recovery-button:hover:not(:disabled) {
          background-color: #45a049;
        }

        .recovery-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .troubleshooting-section, .support-section {
          background: #f9f9f9;
          border-radius: 6px;
          padding: 16px;
          margin: 16px 0;
        }

        .section-toggle, .details-toggle {
          background: #ff9800;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 14px;
          cursor: pointer;
          margin-bottom: 12px;
        }

        .section-toggle:hover, .details-toggle:hover {
          background: #f57c00;
        }

        .troubleshooting-content h4, .support-section h4 {
          color: #333;
          margin: 0 0 12px 0;
          font-size: 16px;
        }

        .troubleshooting-steps {
          margin: 0;
          padding-left: 20px;
        }

        .troubleshooting-steps li {
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .support-contacts {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .support-button {
          background: #f5f5f5;
          color: #333;
          border: 2px solid #ddd;
          border-radius: 6px;
          padding: 10px 16px;
          font-size: 14px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }

        .support-button.primary {
          background: #2196f3;
          color: white;
          border-color: #2196f3;
        }

        .support-button:hover:not(:disabled) {
          background: #eeeeee;
          border-color: #bbb;
        }

        .support-button.primary:hover:not(:disabled) {
          background: #1976d2;
        }

        .support-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-details {
          border-top: 1px solid #eee;
          padding-top: 16px;
          margin-top: 16px;
        }

        .details-content {
          background: #f5f5f5;
          border-radius: 4px;
          padding: 12px;
          margin-top: 8px;
        }

        .details-content h5 {
          color: #333;
          margin: 12px 0 8px 0;
          font-size: 14px;
        }

        .details-content pre {
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 8px;
          font-size: 11px;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-word;
        }

        @media (max-width: 768px) {
          .error-display.full {
            padding: 16px;
            margin: 12px 0;
          }

          .error-header {
            gap: 12px;
          }

          .error-icon-large {
            font-size: 28px;
          }

          .error-title {
            font-size: 18px;
          }

          .recovery-options {
            flex-direction: column;
          }

          .retry-button-primary, .recovery-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

ErrorDisplay.propTypes = {
  error: PropTypes.object,
  recoveryOptions: PropTypes.array,
  troubleshootingGuide: PropTypes.object,
  supportInfo: PropTypes.object,
  isRecovering: PropTypes.bool,
  onRetry: PropTypes.func,
  onRecoveryOption: PropTypes.func,
  onContactSupport: PropTypes.func,
  onDismiss: PropTypes.func,
  variant: PropTypes.oneOf(['full', 'compact', 'inline']),
  showTroubleshooting: PropTypes.bool,
  showSupport: PropTypes.bool,
  className: PropTypes.string
};

export default ErrorDisplay;
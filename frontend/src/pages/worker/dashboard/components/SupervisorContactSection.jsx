import React, { useState } from 'react';
import appConfig from '../../../../config/app.config.js';

/**
 * SupervisorContactSection Component
 * Displays supervisor contact information and communication options
 * 
 * @param {Object} props
 * @param {import('../types.js').SupervisorInfo} [props.supervisorInfo] - Supervisor information
 * @param {string} [props.className] - Additional CSS classes
 * @param {Function} [props.onCallInitiated] - Callback when call is initiated
 * @param {Function} [props.onMessageInitiated] - Callback when messaging is initiated
 */
const SupervisorContactSection = ({ 
  supervisorInfo, 
  className = '',
  onCallInitiated,
  onMessageInitiated
}) => {
  const [isCallInProgress, setIsCallInProgress] = useState(false);
  const [isMessageInProgress, setIsMessageInProgress] = useState(false);

  /**
   * Handles call initiation to supervisor
   */
  const handleCallSupervisor = async () => {
    if (!supervisorInfo?.phoneNumber || isCallInProgress) {
      return;
    }

    try {
      setIsCallInProgress(true);
      
      // Log the call attempt
      appConfig.log('Initiating call to supervisor:', {
        supervisorId: supervisorInfo.supervisorId,
        name: supervisorInfo.name,
        phoneNumber: supervisorInfo.phoneNumber
      });

      // Create tel: URL for phone call
      const telUrl = `tel:${supervisorInfo.phoneNumber}`;
      
      // Attempt to initiate call
      window.location.href = telUrl;
      
      // Call the callback if provided
      if (onCallInitiated) {
        onCallInitiated(supervisorInfo);
      }

      // Reset state after a short delay
      setTimeout(() => {
        setIsCallInProgress(false);
      }, 2000);

    } catch (error) {
      appConfig.log('Error initiating call:', error);
      setIsCallInProgress(false);
      
      // Show error to user
      alert('Unable to initiate call. Please dial manually: ' + supervisorInfo.phoneNumber);
    }
  };

  /**
   * Handles in-app messaging initiation
   */
  const handleMessageSupervisor = async () => {
    if (!supervisorInfo || isMessageInProgress) {
      return;
    }

    try {
      setIsMessageInProgress(true);
      
      // Log the messaging attempt
      appConfig.log('Initiating message to supervisor:', {
        supervisorId: supervisorInfo.supervisorId,
        name: supervisorInfo.name
      });

      // In a real implementation, this would open the messaging interface
      // For now, we'll show a placeholder
      alert(`Opening message to ${supervisorInfo.name}...\n\nThis feature will be available in the messaging system.`);
      
      // Call the callback if provided
      if (onMessageInitiated) {
        onMessageInitiated(supervisorInfo);
      }

      // Reset state after a short delay
      setTimeout(() => {
        setIsMessageInProgress(false);
      }, 1000);

    } catch (error) {
      appConfig.log('Error initiating message:', error);
      setIsMessageInProgress(false);
      
      // Show error to user
      alert('Unable to open messaging. Please try again later.');
    }
  };

  /**
   * Handles contact site manager when no supervisor assigned
   */
  const handleContactSiteManager = () => {
    appConfig.log('Contact site manager requested');
    
    // In a real implementation, this would show site manager contact info
    alert('Site Manager Contact:\n\nPlease contact the site office for assistance.\n\nThis information will be provided by your site administrator.');
  };

  // Render no supervisor assigned case
  if (!supervisorInfo) {
    return (
      <div className={`supervisor-contact-section no-supervisor ${className}`}>
        <div className="section-header">
          <h2 className="section-title">
            <span className="title-icon">👤</span>
            Supervisor Contact
          </h2>
        </div>

        <div className="section-content">
          <div className="no-supervisor-message">
            <div className="no-supervisor-icon">🏢</div>
            <p className="no-supervisor-text">
              No supervisor assigned for today
            </p>
            <button 
              className="contact-site-manager-button"
              onClick={handleContactSiteManager}
              type="button"
            >
              <span className="button-icon">📞</span>
              Contact Site Manager
            </button>
          </div>
        </div>

        <style jsx>{`
          .supervisor-contact-section {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
          }

          .section-header {
            margin-bottom: 16px;
          }

          .section-title {
            color: #333;
            font-size: 18px;
            font-weight: 600;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 8px;
          }

          .title-icon {
            font-size: 20px;
          }

          .section-content {
            color: #666;
          }

          .no-supervisor-message {
            text-align: center;
            padding: 20px 0;
          }

          .no-supervisor-icon {
            font-size: 48px;
            margin-bottom: 16px;
          }

          .no-supervisor-text {
            color: #999;
            font-style: italic;
            margin-bottom: 20px;
            font-size: 16px;
          }

          .contact-site-manager-button {
            background-color: #1976d2;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 12px 20px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0 auto;
            min-width: 160px;
            justify-content: center;
          }

          .contact-site-manager-button:hover {
            background-color: #1565c0;
          }

          .contact-site-manager-button:active {
            background-color: #0d47a1;
          }

          .button-icon {
            font-size: 16px;
          }

          @media (max-width: 480px) {
            .supervisor-contact-section {
              padding: 16px;
            }

            .section-title {
              font-size: 16px;
            }

            .no-supervisor-icon {
              font-size: 40px;
            }

            .no-supervisor-text {
              font-size: 14px;
            }

            .contact-site-manager-button {
              width: 100%;
              padding: 14px 20px;
            }
          }
        `}</style>
      </div>
    );
  }

  // Render supervisor information
  return (
    <div className={`supervisor-contact-section ${className}`}>
      <div className="section-header">
        <h2 className="section-title">
          <span className="title-icon">👤</span>
          Supervisor Contact
        </h2>
      </div>

      <div className="section-content">
        <div className="supervisor-info">
          <div className="supervisor-details">
            <div className="supervisor-name">
              <span className="detail-label">Supervisor:</span>
              <span className="detail-value">{supervisorInfo.name}</span>
            </div>
            
            <div className="supervisor-phone">
              <span className="detail-label">Phone:</span>
              <span className="detail-value">{supervisorInfo.phoneNumber}</span>
            </div>
          </div>

          <div className="contact-actions">
            {/* Call Button */}
            {supervisorInfo.isAvailableForCall && (
              <button 
                className={`contact-button call-button ${isCallInProgress ? 'in-progress' : ''}`}
                onClick={handleCallSupervisor}
                disabled={isCallInProgress}
                type="button"
              >
                <span className="button-icon">📞</span>
                {isCallInProgress ? 'Calling...' : 'Call'}
              </button>
            )}

            {/* Message Button */}
            {supervisorInfo.isAvailableForMessaging && (
              <button 
                className={`contact-button message-button ${isMessageInProgress ? 'in-progress' : ''}`}
                onClick={handleMessageSupervisor}
                disabled={isMessageInProgress}
                type="button"
              >
                <span className="button-icon">💬</span>
                {isMessageInProgress ? 'Opening...' : 'Message'}
              </button>
            )}

            {/* Fallback when no contact options available */}
            {!supervisorInfo.isAvailableForCall && !supervisorInfo.isAvailableForMessaging && (
              <div className="no-contact-options">
                <p className="no-contact-text">
                  Contact options not available
                </p>
                <button 
                  className="contact-site-manager-button"
                  onClick={handleContactSiteManager}
                  type="button"
                >
                  <span className="button-icon">📞</span>
                  Contact Site Manager
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .supervisor-contact-section {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        }

        .section-header {
          margin-bottom: 16px;
        }

        .section-title {
          color: #333;
          font-size: 18px;
          font-weight: 600;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 8px;
        }

        .title-icon {
          font-size: 20px;
        }

        .section-content {
          color: #666;
        }

        .supervisor-info {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .supervisor-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .supervisor-name,
        .supervisor-phone {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .detail-label {
          font-weight: 500;
          color: #555;
        }

        .detail-value {
          color: #333;
          font-weight: 600;
        }

        .contact-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .contact-button {
          flex: 1;
          min-width: 120px;
          padding: 12px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .call-button {
          background-color: #4caf50;
          color: white;
        }

        .call-button:hover:not(:disabled) {
          background-color: #45a049;
        }

        .call-button:active:not(:disabled) {
          background-color: #3d8b40;
        }

        .message-button {
          background-color: #2196f3;
          color: white;
        }

        .message-button:hover:not(:disabled) {
          background-color: #1976d2;
        }

        .message-button:active:not(:disabled) {
          background-color: #1565c0;
        }

        .contact-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .contact-button.in-progress {
          animation: pulse 1.5s infinite;
        }

        .button-icon {
          font-size: 16px;
        }

        .no-contact-options {
          text-align: center;
          padding: 16px 0;
        }

        .no-contact-text {
          color: #999;
          font-style: italic;
          margin-bottom: 16px;
        }

        .contact-site-manager-button {
          background-color: #1976d2;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 auto;
          min-width: 160px;
          justify-content: center;
        }

        .contact-site-manager-button:hover {
          background-color: #1565c0;
        }

        .contact-site-manager-button:active {
          background-color: #0d47a1;
        }

        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
          100% {
            opacity: 1;
          }
        }

        @media (max-width: 480px) {
          .supervisor-contact-section {
            padding: 16px;
          }

          .section-title {
            font-size: 16px;
          }

          .supervisor-name,
          .supervisor-phone {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }

          .contact-actions {
            flex-direction: column;
          }

          .contact-button {
            width: 100%;
            min-width: unset;
            padding: 14px 16px;
          }

          .contact-site-manager-button {
            width: 100%;
            padding: 14px 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default SupervisorContactSection;
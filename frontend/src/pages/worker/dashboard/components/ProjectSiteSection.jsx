import React, { useState, useEffect } from 'react';
import appConfig from '../../../../config/app.config.js';

/**
 * Map Component for displaying site location
 * Simple implementation that can be enhanced with actual map service later
 */
const SiteMap = ({ siteLocation, siteName, className = '' }) => {
  const [mapError, setMapError] = useState(null);

  if (!siteLocation || !siteLocation.latitude || !siteLocation.longitude) {
    return (
      <div className={`site-map-placeholder ${className}`}>
        <div className="map-placeholder-content">
          <div className="map-icon">📍</div>
          <p className="map-placeholder-text">Location not available</p>
        </div>
      </div>
    );
  }

  const { latitude, longitude } = siteLocation;

  // Create Google Maps URL for static map or link
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=300x200&markers=color:red%7C${latitude},${longitude}&key=YOUR_API_KEY`;

  const handleMapClick = () => {
    try {
      // Open in Google Maps app or web
      window.open(googleMapsUrl, '_blank');
    } catch (error) {
      appConfig.error('Failed to open map:', error);
      setMapError('Unable to open map');
    }
  };

  return (
    <div className={`site-map ${className}`}>
      <div className="map-container" onClick={handleMapClick}>
        {mapError ? (
          <div className="map-error">
            <div className="map-icon">⚠️</div>
            <p className="map-error-text">{mapError}</p>
          </div>
        ) : (
          <div className="map-placeholder">
            <div className="map-icon">🗺️</div>
            <p className="map-coordinates">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </p>
            <p className="map-hint">Tap to open in maps</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .site-map {
          margin-top: 16px;
        }

        .site-map-placeholder,
        .map-container {
          background-color: #f8f9fa;
          border: 2px dashed #dee2e6;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .map-container:hover {
          background-color: #e9ecef;
          border-color: #1976d2;
        }

        .map-placeholder-content,
        .map-placeholder,
        .map-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .map-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .map-placeholder-text,
        .map-error-text {
          color: #6c757d;
          font-size: 14px;
          margin: 0;
        }

        .map-coordinates {
          color: #495057;
          font-size: 14px;
          font-family: monospace;
          margin: 0;
        }

        .map-hint {
          color: #1976d2;
          font-size: 12px;
          margin: 0;
        }

        @media (max-width: 480px) {
          .map-container,
          .site-map-placeholder {
            padding: 16px;
            min-height: 100px;
          }

          .map-icon {
            font-size: 28px;
          }

          .map-coordinates {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Project Site Section Component
 * Displays project name, site name, address, and location map
 * Handles no assignment edge case with clear messaging
 */
const ProjectSiteSection = ({ projectInfo, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle no assignment case
  if (!projectInfo || !projectInfo.projectName) {
    return (
      <div className={`dashboard-mobile-section ${className}`}>
        <div className="dashboard-mobile-section-header">
          <h2 className="dashboard-mobile-section-title">
            <span className="dashboard-mobile-section-icon">🏗️</span>
            Project Assignment
          </h2>
        </div>
        
        <div className="dashboard-mobile-empty">
          <div className="dashboard-mobile-empty-icon">📋</div>
          <h3 className="dashboard-mobile-empty-title">No Assignment</h3>
          <p className="dashboard-mobile-empty-message">
            You don't have any project assigned for today. Please contact your supervisor if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  const {
    projectName,
    siteName,
    siteAddress,
    siteLocation
  } = projectInfo;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`dashboard-mobile-section ${className}`}>
      <div className="dashboard-mobile-section-header">
        <h2 className="dashboard-mobile-section-title">
          <span className="dashboard-mobile-section-icon">🏗️</span>
          Project Assignment
        </h2>
      </div>
      
      <div className="dashboard-mobile-info-grid">
        <div className="dashboard-mobile-info-item">
          <span className="dashboard-mobile-info-label">
            <span className="dashboard-mobile-info-icon">🏗️</span>
            Project
          </span>
          <span className="dashboard-mobile-info-value">{projectName}</span>
        </div>
        
        {siteName && siteName !== projectName && (
          <div className="dashboard-mobile-info-item">
            <span className="dashboard-mobile-info-label">
              <span className="dashboard-mobile-info-icon">📍</span>
              Site
            </span>
            <span className="dashboard-mobile-info-value">{siteName}</span>
          </div>
        )}
        
        {siteAddress && (
          <div className="dashboard-mobile-info-item" style={{ gridColumn: '1 / -1' }}>
            <span className="dashboard-mobile-info-label">
              <span className="dashboard-mobile-info-icon">🏠</span>
              Address
            </span>
            <span className="dashboard-mobile-info-value">{siteAddress}</span>
          </div>
        )}
      </div>

      {siteLocation && (
        <div className="location-section">
          <button 
            className={`dashboard-mobile-button dashboard-mobile-button--secondary dashboard-mobile-button--full ${isExpanded ? 'expanded' : ''}`}
            onClick={toggleExpanded}
            type="button"
          >
            <span className="dashboard-mobile-info-icon">📍</span>
            <span className="location-text">
              {isExpanded ? 'Hide Location' : 'Show Location'}
            </span>
            <span className={`toggle-arrow ${isExpanded ? 'expanded' : ''}`}>
              ▼
            </span>
          </button>
          
          {isExpanded && (
            <SiteMap 
              siteLocation={siteLocation}
              siteName={siteName || projectName}
              className="site-location-map"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectSiteSection;
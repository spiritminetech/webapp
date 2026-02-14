import React, { Suspense, lazy } from 'react';
import performanceService from '../../../../services/PerformanceService.js';
import appConfig from '../../../../config/app.config.js';

/**
 * Lazy-loaded dashboard components for performance optimization
 * Each section is loaded only when needed to reduce initial bundle size
 */

// Lazy load dashboard sections
const ProjectSiteSection = lazy(() => {
  const measurementId = performanceService.startComponentRender('ProjectSiteSection');
  return import('./ProjectSiteSection.jsx').then(module => {
    performanceService.endComponentRender(measurementId, { 
      component: 'ProjectSiteSection',
      loadType: 'lazy' 
    });
    return module;
  });
});

const SupervisorContactSection = lazy(() => {
  const measurementId = performanceService.startComponentRender('SupervisorContactSection');
  return import('./SupervisorContactSection.jsx').then(module => {
    performanceService.endComponentRender(measurementId, { 
      component: 'SupervisorContactSection',
      loadType: 'lazy' 
    });
    return module;
  });
});

const WorkingHoursSection = lazy(() => {
  const measurementId = performanceService.startComponentRender('WorkingHoursSection');
  return import('./WorkingHoursSection.jsx').then(module => {
    performanceService.endComponentRender(measurementId, { 
      component: 'WorkingHoursSection',
      loadType: 'lazy' 
    });
    return module;
  });
});

const AttendanceStatusSection = lazy(() => {
  const measurementId = performanceService.startComponentRender('AttendanceStatusSection');
  return import('./AttendanceStatusSection.jsx').then(module => {
    performanceService.endComponentRender(measurementId, { 
      component: 'AttendanceStatusSection',
      loadType: 'lazy' 
    });
    return module;
  });
});

const NotificationsSection = lazy(() => {
  const measurementId = performanceService.startComponentRender('NotificationsSection');
  return import('./NotificationsSection.jsx').then(module => {
    performanceService.endComponentRender(measurementId, { 
      component: 'NotificationsSection',
      loadType: 'lazy' 
    });
    return module;
  });
});

/**
 * Loading fallback component for lazy-loaded sections
 */
const SectionLoadingFallback = ({ sectionName }) => (
  <div className="dashboard-mobile-section">
    <div className="dashboard-mobile-loading">
      <div className="dashboard-mobile-skeleton dashboard-mobile-skeleton--section"></div>
    </div>
  </div>
);

/**
 * Error boundary for lazy-loaded sections
 */
class LazyLoadErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    appConfig.error('Lazy load error in dashboard section:', error, errorInfo);
    
    // Report error to performance service
    performanceService.storeMetric('lazy_load_error', {
      sectionName: this.props.sectionName,
      error: error.message,
      stack: error.stack,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="dashboard-mobile-section">
          <div className="dashboard-mobile-error">
            <div className="dashboard-mobile-error-icon">⚠️</div>
            <h3 className="dashboard-mobile-error-title">Section Load Failed</h3>
            <p className="dashboard-mobile-error-message">
              Failed to load {this.props.sectionName}. Please refresh the page.
            </p>
            <button 
              className="dashboard-mobile-button dashboard-mobile-button--secondary"
              onClick={() => window.location.reload()}
              type="button"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Lazy Project Site Section with error boundary and loading fallback
 */
export const LazyProjectSiteSection = ({ projectInfo, className }) => (
  <LazyLoadErrorBoundary sectionName="Project Site">
    <Suspense fallback={<SectionLoadingFallback sectionName="Project Site" />}>
      <ProjectSiteSection projectInfo={projectInfo} className={className} />
    </Suspense>
  </LazyLoadErrorBoundary>
);

/**
 * Lazy Supervisor Contact Section with error boundary and loading fallback
 */
export const LazySupervisorContactSection = ({ supervisorInfo, className }) => (
  <LazyLoadErrorBoundary sectionName="Supervisor Contact">
    <Suspense fallback={<SectionLoadingFallback sectionName="Supervisor Contact" />}>
      <SupervisorContactSection supervisorInfo={supervisorInfo} className={className} />
    </Suspense>
  </LazyLoadErrorBoundary>
);

/**
 * Lazy Working Hours Section with error boundary and loading fallback
 */
export const LazyWorkingHoursSection = ({ shiftInfo, className }) => (
  <LazyLoadErrorBoundary sectionName="Working Hours">
    <Suspense fallback={<SectionLoadingFallback sectionName="Working Hours" />}>
      <WorkingHoursSection shiftInfo={shiftInfo} className={className} />
    </Suspense>
  </LazyLoadErrorBoundary>
);

/**
 * Lazy Attendance Status Section with error boundary and loading fallback
 */
export const LazyAttendanceStatusSection = ({ attendanceStatus, enableRealTimeUpdates, className }) => (
  <LazyLoadErrorBoundary sectionName="Attendance Status">
    <Suspense fallback={<SectionLoadingFallback sectionName="Attendance Status" />}>
      <AttendanceStatusSection 
        attendanceStatus={attendanceStatus}
        enableRealTimeUpdates={enableRealTimeUpdates}
        className={className}
      />
    </Suspense>
  </LazyLoadErrorBoundary>
);

/**
 * Lazy Notifications Section with error boundary and loading fallback
 */
export const LazyNotificationsSection = ({ notifications, onMarkAsRead, enableRealTimeUpdates, className }) => (
  <LazyLoadErrorBoundary sectionName="Notifications">
    <Suspense fallback={<SectionLoadingFallback sectionName="Notifications" />}>
      <NotificationsSection 
        notifications={notifications}
        onMarkAsRead={onMarkAsRead}
        enableRealTimeUpdates={enableRealTimeUpdates}
        className={className}
      />
    </Suspense>
  </LazyLoadErrorBoundary>
);

/**
 * Progressive loading hook for dashboard sections
 * Loads sections in priority order to optimize perceived performance
 */
export const useDashboardProgressiveLoading = (data) => {
  const [loadedSections, setLoadedSections] = React.useState(new Set());
  const [loadingOrder] = React.useState([
    'project', // Most important - shows current assignment
    'attendance', // Second priority - current status
    'hours', // Third priority - shift information
    'supervisor', // Fourth priority - contact info
    'notifications' // Last priority - can be delayed
  ]);

  React.useEffect(() => {
    if (!data) return;

    // Progressive loading with delays to spread the load
    const loadSections = async () => {
      for (let i = 0; i < loadingOrder.length; i++) {
        const section = loadingOrder[i];
        
        // Add small delay between sections to prevent blocking
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        setLoadedSections(prev => new Set([...prev, section]));
        
        appConfig.log(`Dashboard: Progressively loaded section ${section}`);
      }
    };

    loadSections();
  }, [data, loadingOrder]);

  return {
    shouldLoadSection: (sectionName) => loadedSections.has(sectionName),
    loadedSections: Array.from(loadedSections),
    totalSections: loadingOrder.length,
    loadingProgress: (loadedSections.size / loadingOrder.length) * 100
  };
};

export default {
  LazyProjectSiteSection,
  LazySupervisorContactSection,
  LazyWorkingHoursSection,
  LazyAttendanceStatusSection,
  LazyNotificationsSection,
  useDashboardProgressiveLoading
};
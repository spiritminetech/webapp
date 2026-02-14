/**
 * Dashboard Data Models
 * JSDoc type definitions for Worker Mobile Dashboard
 */

/**
 * @typedef {Object} ProjectInfo
 * @property {string} projectId - Unique project identifier
 * @property {string} projectName - Name of the project
 * @property {string} siteName - Name of the construction site
 * @property {string} siteAddress - Complete address of the site
 * @property {LocationCoordinates} siteLocation - GPS coordinates of the site
 * @property {GeofenceData} geofence - Geofence boundary information
 */

/**
 * @typedef {Object} LocationCoordinates
 * @property {number} latitude - Latitude coordinate
 * @property {number} longitude - Longitude coordinate
 */

/**
 * @typedef {Object} GeofenceData
 * @property {LocationCoordinates} center - Center point of geofence
 * @property {number} radius - Radius in meters
 */

/**
 * @typedef {Object} SupervisorInfo
 * @property {string} supervisorId - Unique supervisor identifier
 * @property {string} name - Full name of supervisor
 * @property {string} phoneNumber - Contact phone number
 * @property {boolean} isAvailableForCall - Whether supervisor accepts calls
 * @property {boolean} isAvailableForMessaging - Whether supervisor accepts messages
 */

/**
 * @typedef {Object} ShiftInfo
 * @property {string} shiftId - Unique shift identifier
 * @property {string} startTime - Shift start time in HH:MM format
 * @property {string} endTime - Shift end time in HH:MM format
 * @property {LunchBreak} lunchBreak - Lunch break timing
 * @property {'active'|'inactive'} overtimeStatus - Overtime authorization status
 * @property {boolean} overtimeAuthorized - Whether overtime is authorized
 */

/**
 * @typedef {Object} LunchBreak
 * @property {string} startTime - Lunch start time in HH:MM format
 * @property {string} endTime - Lunch end time in HH:MM format
 */

/**
 * @typedef {Object} AttendanceStatus
 * @property {'not_logged_in'|'logged_in'|'lunch'|'logged_out'|'overtime'} currentStatus - Current attendance state
 * @property {AttendanceAction} lastAction - Most recent attendance action
 * @property {AttendanceSummary} todaysSummary - Summary of today's attendance
 */

/**
 * @typedef {Object} AttendanceAction
 * @property {string} action - Description of the action
 * @property {Date} timestamp - When the action occurred
 */

/**
 * @typedef {Object} AttendanceSummary
 * @property {Date} [checkInTime] - Check-in timestamp
 * @property {Date} [lunchStartTime] - Lunch start timestamp
 * @property {Date} [lunchEndTime] - Lunch end timestamp
 * @property {Date} [checkOutTime] - Check-out timestamp
 * @property {Date} [overtimeStartTime] - Overtime start timestamp
 */

/**
 * @typedef {Object} Notification
 * @property {string} id - Unique notification identifier
 * @property {'system'|'supervisor'|'management'} type - Source type of notification
 * @property {'normal'|'urgent'|'safety_alert'} priority - Priority level
 * @property {string} title - Notification title
 * @property {string} message - Notification content
 * @property {Date} timestamp - When notification was created
 * @property {boolean} isRead - Whether notification has been read
 * @property {NotificationSender} [sender] - Information about sender
 */

/**
 * @typedef {Object} NotificationSender
 * @property {string} name - Name of sender
 * @property {string} role - Role/title of sender
 */

/**
 * @typedef {Object} GeofenceStatus
 * @property {boolean} isWithinGeofence - Whether worker is inside geofence
 * @property {number} [distanceFromSite] - Distance from site in meters
 * @property {Date} lastValidationTime - When location was last validated
 * @property {string} [validationError] - Error message if validation failed
 */

/**
 * @typedef {Object} DashboardData
 * @property {string} workerId - Unique worker identifier
 * @property {ProjectInfo} projectInfo - Project and site information
 * @property {SupervisorInfo} supervisorInfo - Supervisor contact information
 * @property {ShiftInfo} shiftInfo - Working hours and shift details
 * @property {AttendanceStatus} attendanceStatus - Current attendance status
 * @property {Notification[]} notifications - List of notifications
 * @property {GeofenceStatus} geofenceStatus - Location validation status
 * @property {Date} lastUpdated - When data was last refreshed
 */

/**
 * @typedef {Object} DashboardError
 * @property {string} type - Error type identifier
 * @property {string} message - Human-readable error message
 * @property {boolean} canRetry - Whether operation can be retried
 * @property {string} [details] - Additional error details
 */

/**
 * @typedef {Object} DashboardState
 * @property {DashboardData} [data] - Dashboard data
 * @property {boolean} isLoading - Whether data is being loaded
 * @property {DashboardError} [error] - Current error state
 * @property {Date} [lastUpdated] - When data was last updated
 * @property {boolean} isOffline - Whether app is in offline mode
 * @property {boolean} hasCache - Whether cached data is available
 */

/**
 * @callback UpdateCallback
 * @param {DashboardData} data - Updated dashboard data
 */

/**
 * @callback LocationCallback
 * @param {GeofenceStatus} status - Updated location status
 */

/**
 * @callback AttendanceCallback
 * @param {AttendanceStatus} status - Updated attendance status
 */

/**
 * @callback NotificationCallback
 * @param {Notification} notification - New notification
 */

export {};
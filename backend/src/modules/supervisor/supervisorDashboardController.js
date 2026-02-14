import supervisorDashboardService from './supervisorDashboardService.js';

/**
 * Get complete supervisor dashboard data
 * @route GET /api/supervisor/:id/dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Complete dashboard data including projects, workforce count, attendance, approvals, and alerts
 */
export const getSupervisorDashboard = async (req, res) => {
  try {
    const { id: supervisorId } = req.params;

    // Use service layer to get dashboard data
    const dashboardData = await supervisorDashboardService.getDashboardData(Number(supervisorId));

    return res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('getSupervisorDashboard error:', error);
    
    // Handle specific error types
    if (error.message === 'Supervisor not found') {
      return res.status(404).json({
        success: false,
        message: 'Supervisor not found'
      });
    }
    
    if (error.message === 'User does not have supervisor role') {
      return res.status(403).json({
        success: false,
        message: 'User does not have supervisor role'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error fetching supervisor dashboard data',
      error: error.message
    });
  }
};

// Additional endpoints can be added here for specific dashboard components
// For example: getWorkforceCount, getAttendanceSummary, getPendingApprovals, getAlerts
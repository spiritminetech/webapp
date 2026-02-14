// Mock the alert service first
jest.mock('./alertService.js', () => ({
  default: {
    getAlertsForSupervisor: jest.fn(),
    acknowledgeAlert: jest.fn(),
    logAlertAction: jest.fn()
  }
}));

import { getAlerts, acknowledgeAlert } from './supervisorController.js';
import alertService from './alertService.js';

describe('Supervisor Alert Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      user: {},
      body: {}
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('getAlerts', () => {
    it('should return alerts for supervisor with summary', async () => {
      const mockAlerts = [
        {
          id: 1,
          type: 'geofence_violation',
          priority: 'critical',
          message: 'Test alert 1',
          isRead: false,
          timestamp: new Date()
        },
        {
          id: 2,
          type: 'worker_absence',
          priority: 'warning',
          message: 'Test alert 2',
          isRead: true,
          timestamp: new Date()
        }
      ];

      req.params.id = '123';
      req.query.limit = '50';
      
      alertService.getAlertsForSupervisor.mockResolvedValue(mockAlerts);

      await getAlerts(req, res);

      expect(alertService.getAlertsForSupervisor).toHaveBeenCalledWith(123, {});
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          alerts: mockAlerts,
          summary: expect.objectContaining({
            total: 2,
            unread: 1,
            critical: 1,
            warning: 1,
            info: 0
          }),
          pagination: expect.objectContaining({
            total: 2,
            limit: 50,
            hasMore: false
          })
        })
      );
    });

    it('should handle service errors', async () => {
      req.params.id = '123';
      alertService.getAlertsForSupervisor.mockRejectedValue(new Error('Service error'));

      await getAlerts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error retrieving alerts'
      });
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge alert successfully', async () => {
      const mockAcknowledgedAlert = {
        id: 1,
        type: 'geofence_violation',
        priority: 'critical',
        message: 'Test alert',
        isRead: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: 123
      };

      req.params.id = '1';
      req.user.id = 123;
      req.body.notes = 'Handled the issue';

      alertService.acknowledgeAlert.mockResolvedValue(mockAcknowledgedAlert);
      alertService.logAlertAction.mockResolvedValue();

      await acknowledgeAlert(req, res);

      expect(alertService.acknowledgeAlert).toHaveBeenCalledWith(1, 123);
      expect(alertService.logAlertAction).toHaveBeenCalledWith(
        1, 
        123, 
        'acknowledged_with_notes', 
        { notes: 'Handled the issue' }
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Alert acknowledged successfully',
          alert: mockAcknowledgedAlert
        })
      );
    });

    it('should handle missing alert ID', async () => {
      req.params.id = '';
      req.user.id = 123;

      await acknowledgeAlert(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Alert ID is required'
      });
    });

    it('should handle service errors', async () => {
      req.params.id = '1';
      req.user.id = 123;

      alertService.acknowledgeAlert.mockRejectedValue(new Error('Database connection failed'));

      await acknowledgeAlert(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Server error acknowledging alert'
      });
    });
  });
});
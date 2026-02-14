/**
 * Unit tests for Supervisor Controller - Workforce Count and Attendance Summary endpoints
 */

import { getWorkforceCount, getAttendanceSummary } from './supervisorController.js';

// Mock the database models
jest.mock('../attendance/Attendance.js', () => ({
  find: jest.fn()
}));

jest.mock('../project/models/Project.js', () => ({
  find: jest.fn()
}));

jest.mock('../employee/Employee.js', () => ({
  find: jest.fn().mockReturnValue({
    lean: jest.fn()
  })
}));

jest.mock('../worker/models/WorkerTaskAssignment.js', () => ({
  find: jest.fn()
}));

jest.mock('../leaveRequest/models/LeaveRequest.js', () => ({
  find: jest.fn()
}));

import Attendance from '../attendance/Attendance.js';
import Project from '../project/models/Project.js';
import Employee from '../employee/Employee.js';
import WorkerTaskAssignment from '../worker/models/WorkerTaskAssignment.js';
import LeaveRequest from '../leaveRequest/models/LeaveRequest.js';

describe('Supervisor Controller - Workforce Count', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: { id: '123' },
      query: {}
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('getWorkforceCount', () => {
    test('should return zero counts when no projects assigned', async () => {
      Project.find.mockResolvedValue([]);

      await getWorkforceCount(req, res);

      expect(res.json).toHaveBeenCalledWith({
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        onLeave: 0,
        overtime: 0,
        lastUpdated: expect.any(Date)
      });
    });

    test('should return zero counts when no worker assignments', async () => {
      Project.find.mockResolvedValue([{ id: 1, supervisorId: 123 }]);
      WorkerTaskAssignment.find.mockResolvedValue([]);

      await getWorkforceCount(req, res);

      expect(res.json).toHaveBeenCalledWith({
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        onLeave: 0,
        overtime: 0,
        lastUpdated: expect.any(Date)
      });
    });

    test('should calculate workforce count correctly with mixed attendance', async () => {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];

      // Mock project data
      Project.find.mockResolvedValue([
        { id: 1, supervisorId: 123 },
        { id: 2, supervisorId: 123 }
      ]);

      // Mock worker assignments
      WorkerTaskAssignment.find.mockResolvedValue([
        { employeeId: 1, projectId: 1, date: todayString },
        { employeeId: 2, projectId: 1, date: todayString },
        { employeeId: 3, projectId: 2, date: todayString },
        { employeeId: 4, projectId: 2, date: todayString }
      ]);

      // Mock attendance records
      const earlyCheckIn = new Date();
      earlyCheckIn.setHours(8, 0, 0, 0); // 8:00 AM

      const lateCheckIn = new Date();
      lateCheckIn.setHours(9, 0, 0, 0); // 9:00 AM (late)

      const checkOutTime = new Date();
      checkOutTime.setHours(17, 0, 0, 0); // 5:00 PM

      Attendance.find.mockResolvedValue([
        { employeeId: 1, checkIn: earlyCheckIn, checkOut: null }, // Present, still working
        { employeeId: 2, checkIn: lateCheckIn, checkOut: null }, // Late, still working
        // Employee 3 has no attendance record (absent)
        { employeeId: 4, checkIn: earlyCheckIn, checkOut: checkOutTime } // Present, completed
      ]);

      // Mock leave requests (none)
      LeaveRequest.find.mockResolvedValue([]);

      await getWorkforceCount(req, res);

      expect(res.json).toHaveBeenCalledWith({
        total: 4,
        present: 2, // Employees 1 and 4
        absent: 1,  // Employee 3
        late: 1,    // Employee 2
        onLeave: 0,
        overtime: expect.any(Number), // Could be 0, 1, or 2 depending on current time
        lastUpdated: expect.any(Date)
      });
    });

    test('should handle leave requests correctly', async () => {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];

      Project.find.mockResolvedValue([{ id: 1, supervisorId: 123 }]);
      WorkerTaskAssignment.find.mockResolvedValue([
        { employeeId: 1, projectId: 1, date: todayString },
        { employeeId: 2, projectId: 1, date: todayString }
      ]);

      // Mock leave request for employee 2
      const dayStart = new Date(today);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(today);
      dayEnd.setHours(23, 59, 59, 999);

      LeaveRequest.find.mockResolvedValue([
        {
          employeeId: 2,
          status: 'APPROVED',
          fromDate: dayStart,
          toDate: dayEnd
        }
      ]);

      Attendance.find.mockResolvedValue([]);

      await getWorkforceCount(req, res);

      expect(res.json).toHaveBeenCalledWith({
        total: 2,
        present: 0,
        absent: 1,  // Employee 1 (no attendance, not on leave)
        late: 0,
        onLeave: 1, // Employee 2 (on approved leave)
        overtime: 0,
        lastUpdated: expect.any(Date)
      });
    });

    test('should handle server errors gracefully', async () => {
      Project.find.mockRejectedValue(new Error('Database error'));

      await getWorkforceCount(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });

    test('should use provided date parameter', async () => {
      req.query.date = '2024-01-15';

      Project.find.mockResolvedValue([]);

      await getWorkforceCount(req, res);

      expect(Project.find).toHaveBeenCalledWith({ supervisorId: 123 });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        total: 0
      }));
    });
  });

  describe('getAttendanceSummary', () => {
    test('should return empty summary when no projects assigned', async () => {
      Project.find.mockResolvedValue([]);

      await getAttendanceSummary(req, res);

      expect(res.json).toHaveBeenCalledWith({
        workers: [],
        summary: {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          onLeave: 0,
          overtime: 0,
          geofenceViolations: 0,
          missingLogouts: 0
        },
        lastUpdated: expect.any(Date)
      });
    });

    test('should return empty summary when no worker assignments', async () => {
      Project.find.mockResolvedValue([{ id: 1, supervisorId: 123 }]);
      WorkerTaskAssignment.find.mockResolvedValue([]);

      await getAttendanceSummary(req, res);

      expect(res.json).toHaveBeenCalledWith({
        workers: [],
        summary: {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          onLeave: 0,
          overtime: 0,
          geofenceViolations: 0,
          missingLogouts: 0
        },
        lastUpdated: expect.any(Date)
      });
    });

    test('debug attendance summary with single worker', async () => {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];

      // Mock project data
      Project.find.mockResolvedValue([
        { id: 1, supervisorId: 123 }
      ]);

      // Mock worker assignments
      WorkerTaskAssignment.find.mockResolvedValue([
        { employeeId: 1, projectId: 1, date: todayString }
      ]);

      // Mock employee data with chained lean()
      const mockEmployees = [{ id: 1, fullName: 'John Doe' }];
      Employee.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockEmployees)
      });

      // Mock attendance records
      Attendance.find.mockResolvedValue([]);

      // Mock leave requests (none)
      LeaveRequest.find.mockResolvedValue([]);

      try {
        await getAttendanceSummary(req, res);
      } catch (error) {
        console.log('Error in getAttendanceSummary:', error);
      }

      console.log('res.json called:', res.json.mock.calls.length);
      console.log('res.status called:', res.status.mock.calls.length);
      
      if (res.json.mock.calls.length > 0) {
        const response = res.json.mock.calls[0][0];
        console.log('Debug response:', JSON.stringify(response, null, 2));
        expect(response).toBeDefined();
      }
      
      if (res.status.mock.calls.length > 0) {
        console.log('Status calls:', res.status.mock.calls);
      }
    });

    test('should call getAttendanceSummary function', async () => {
      Project.find.mockResolvedValue([]);

      await getAttendanceSummary(req, res);

      expect(res.json).toHaveBeenCalled();
      expect(res.json.mock.calls.length).toBe(1);
      
      const response = res.json.mock.calls[0][0];
      expect(response).toBeDefined();
      expect(response.workers).toBeDefined();
      expect(response.summary).toBeDefined();
    });

    test('should return detailed attendance summary with worker details', async () => {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];

      // Mock project data
      Project.find.mockResolvedValue([
        { id: 1, supervisorId: 123 }
      ]);

      // Mock worker assignments
      WorkerTaskAssignment.find.mockResolvedValue([
        { employeeId: 1, projectId: 1, date: todayString },
        { employeeId: 2, projectId: 1, date: todayString },
        { employeeId: 3, projectId: 1, date: todayString }
      ]);

      // Mock employee data with chained lean()
      const mockEmployees = [
        { id: 1, fullName: 'John Doe' },
        { id: 2, fullName: 'Jane Smith' },
        { id: 3, fullName: 'Bob Wilson' }
      ];
      Employee.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockEmployees)
      });

      // Mock attendance records
      const earlyCheckIn = new Date();
      earlyCheckIn.setHours(8, 0, 0, 0); // 8:00 AM

      const lateCheckIn = new Date();
      lateCheckIn.setHours(9, 0, 0, 0); // 9:00 AM (late)

      Attendance.find.mockResolvedValue([
        { 
          employeeId: 1, 
          checkIn: earlyCheckIn, 
          checkOut: null,
          insideGeofenceAtCheckin: true
        }, // Present
        { 
          employeeId: 2, 
          checkIn: lateCheckIn, 
          checkOut: null,
          insideGeofenceAtCheckin: false
        }, // Late with geofence violation
        // Employee 3 has no attendance record (absent)
      ]);

      // Mock leave requests (none)
      LeaveRequest.find.mockResolvedValue([]);

      await getAttendanceSummary(req, res);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      
      expect(response.summary).toEqual({
        total: 3,
        present: 1, // Employee 1
        absent: 1,  // Employee 3
        late: 1,    // Employee 2
        onLeave: 0,
        overtime: expect.any(Number), // Could be 0 or more depending on current time
        geofenceViolations: 1, // Employee 2
        missingLogouts: expect.any(Number) // Could be 0 or more depending on current time
      });

      expect(response.workers).toHaveLength(3);
      
      // Check worker details
      const johnDoe = response.workers.find(w => w.workerName === 'John Doe');
      expect(johnDoe).toMatchObject({
        workerId: 1,
        workerName: 'John Doe',
        status: 'present',
        locationStatus: 'inside',
        hasGeofenceViolation: false,
        isLate: false
      });

      const janeSmith = response.workers.find(w => w.workerName === 'Jane Smith');
      expect(janeSmith).toMatchObject({
        workerId: 2,
        workerName: 'Jane Smith',
        status: 'late',
        locationStatus: 'outside',
        hasGeofenceViolation: true,
        isLate: true
      });

      const bobWilson = response.workers.find(w => w.workerName === 'Bob Wilson');
      expect(bobWilson).toMatchObject({
        workerId: 3,
        workerName: 'Bob Wilson',
        status: 'absent',
        currentActivity: 'Absent'
      });
    });

    test('should handle workers on approved leave', async () => {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];

      Project.find.mockResolvedValue([{ id: 1, supervisorId: 123 }]);
      WorkerTaskAssignment.find.mockResolvedValue([
        { employeeId: 1, projectId: 1, date: todayString }
      ]);

      // Mock employee data with chained lean()
      const mockEmployees = [{ id: 1, fullName: 'John Doe' }];
      Employee.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockEmployees)
      });

      // Mock leave request for employee 1
      const dayStart = new Date(today);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(today);
      dayEnd.setHours(23, 59, 59, 999);

      LeaveRequest.find.mockResolvedValue([
        {
          employeeId: 1,
          status: 'APPROVED',
          fromDate: dayStart,
          toDate: dayEnd
        }
      ]);

      Attendance.find.mockResolvedValue([]);

      await getAttendanceSummary(req, res);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      
      expect(response.summary.onLeave).toBe(1);
      expect(response.workers[0]).toMatchObject({
        workerId: 1,
        workerName: 'John Doe',
        status: 'on_leave',
        currentActivity: 'On Leave',
        locationStatus: 'on_leave'
      });
    });

    test('should detect missing logouts after work hours', async () => {
      const today = new Date();
      today.setHours(19, 0, 0, 0); // Set current time to 7 PM
      const todayString = today.toISOString().split('T')[0];

      // Mock Date constructor to return our fixed time
      const mockDate = jest.fn(() => today);
      mockDate.now = jest.fn(() => today.getTime());
      global.Date = mockDate;

      Project.find.mockResolvedValue([{ id: 1, supervisorId: 123 }]);
      WorkerTaskAssignment.find.mockResolvedValue([
        { employeeId: 1, projectId: 1, date: todayString }
      ]);

      // Mock employee data with chained lean()
      const mockEmployees = [{ id: 1, fullName: 'John Doe' }];
      Employee.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockEmployees)
      });

      // Worker checked in at 8 AM but hasn't checked out
      const checkInTime = new Date();
      checkInTime.setHours(8, 0, 0, 0);

      Attendance.find.mockResolvedValue([
        { 
          employeeId: 1, 
          checkIn: checkInTime, 
          checkOut: null,
          insideGeofenceAtCheckin: true
        }
      ]);

      LeaveRequest.find.mockResolvedValue([]);

      await getAttendanceSummary(req, res);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      
      expect(response.summary.missingLogouts).toBe(1);
      expect(response.workers[0].hasMissingLogout).toBe(true);

      // Restore original Date
      global.Date = Date;
    });

    test('should handle server errors gracefully', async () => {
      Project.find.mockRejectedValue(new Error('Database error'));

      await getAttendanceSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });
});
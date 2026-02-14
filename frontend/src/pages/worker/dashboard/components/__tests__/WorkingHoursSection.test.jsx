import React from 'react';
import { render, screen } from '@testing-library/react';
import WorkingHoursSection from '../WorkingHoursSection.jsx';

describe('WorkingHoursSection', () => {
  describe('No Shift Information Edge Case', () => {
    test('displays "No shift information available" when no shift info provided', () => {
      render(<WorkingHoursSection shiftInfo={null} />);

      expect(screen.getByText('Working Hours')).toBeInTheDocument();
      expect(screen.getByText('No shift information available for today')).toBeInTheDocument();
      expect(screen.getByText('Please contact your supervisor for shift details')).toBeInTheDocument();
    });

    test('displays placeholder when shiftInfo is undefined', () => {
      render(<WorkingHoursSection />);

      expect(screen.getByText('No shift information available for today')).toBeInTheDocument();
    });
  });

  describe('Shift Schedule Display', () => {
    const mockShiftInfo = {
      shiftId: 'shift-123',
      startTime: '08:00',
      endTime: '17:00',
      lunchBreak: {
        startTime: '12:00',
        endTime: '13:00'
      },
      overtimeStatus: 'active',
      overtimeAuthorized: true
    };

    test('displays shift start and end times in 24-hour format', () => {
      render(<WorkingHoursSection shiftInfo={mockShiftInfo} />);

      expect(screen.getByText('Working Hours')).toBeInTheDocument();
      expect(screen.getByText('08:00')).toBeInTheDocument();
      expect(screen.getByText('17:00')).toBeInTheDocument();
      expect(screen.getByText('Start Time')).toBeInTheDocument();
      expect(screen.getByText('End Time')).toBeInTheDocument();
    });

    test('handles missing start time gracefully', () => {
      const shiftWithoutStart = {
        ...mockShiftInfo,
        startTime: null
      };

      render(<WorkingHoursSection shiftInfo={shiftWithoutStart} />);

      expect(screen.getByText('--:--')).toBeInTheDocument();
      expect(screen.getByText('17:00')).toBeInTheDocument();
    });

    test('handles missing end time gracefully', () => {
      const shiftWithoutEnd = {
        ...mockShiftInfo,
        endTime: undefined
      };

      render(<WorkingHoursSection shiftInfo={shiftWithoutEnd} />);

      expect(screen.getByText('08:00')).toBeInTheDocument();
      expect(screen.getByText('--:--')).toBeInTheDocument();
    });

    test('formats time strings correctly', () => {
      const shiftWithVariousFormats = {
        ...mockShiftInfo,
        startTime: '8:30',
        endTime: '17:30'
      };

      render(<WorkingHoursSection shiftInfo={shiftWithVariousFormats} />);

      // Should display the times as provided since they're already in valid format
      expect(screen.getByText('8:30')).toBeInTheDocument();
      expect(screen.getByText('17:30')).toBeInTheDocument();
    });
  });

  describe('Lunch Break Information Display', () => {
    const mockShiftWithLunch = {
      shiftId: 'shift-123',
      startTime: '08:00',
      endTime: '17:00',
      lunchBreak: {
        startTime: '12:00',
        endTime: '13:00'
      },
      overtimeStatus: 'inactive',
      overtimeAuthorized: false
    };

    test('displays lunch break start and end times', () => {
      render(<WorkingHoursSection shiftInfo={mockShiftWithLunch} />);

      expect(screen.getByText('Lunch Break')).toBeInTheDocument();
      expect(screen.getByText('Lunch Start')).toBeInTheDocument();
      expect(screen.getByText('Lunch End')).toBeInTheDocument();
      
      // Should show lunch times
      const lunchTimes = screen.getAllByText('12:00');
      expect(lunchTimes).toHaveLength(1);
      const lunchEndTimes = screen.getAllByText('13:00');
      expect(lunchEndTimes).toHaveLength(1);
    });

    test('does not display lunch section when no lunch break scheduled', () => {
      const shiftWithoutLunch = {
        ...mockShiftWithLunch,
        lunchBreak: null
      };

      render(<WorkingHoursSection shiftInfo={shiftWithoutLunch} />);

      expect(screen.queryByText('Lunch Break')).not.toBeInTheDocument();
      expect(screen.queryByText('Lunch Start')).not.toBeInTheDocument();
    });

    test('does not display lunch section when lunch break is empty', () => {
      const shiftWithEmptyLunch = {
        ...mockShiftWithLunch,
        lunchBreak: {}
      };

      render(<WorkingHoursSection shiftInfo={shiftWithEmptyLunch} />);

      expect(screen.queryByText('Lunch Break')).not.toBeInTheDocument();
    });

    test('displays lunch section when only start time is provided', () => {
      const shiftWithPartialLunch = {
        ...mockShiftWithLunch,
        lunchBreak: {
          startTime: '12:00',
          endTime: null
        }
      };

      render(<WorkingHoursSection shiftInfo={shiftWithPartialLunch} />);

      expect(screen.getByText('Lunch Break')).toBeInTheDocument();
      expect(screen.getByText('12:00')).toBeInTheDocument();
      expect(screen.getByText('--:--')).toBeInTheDocument();
    });
  });

  describe('Overtime Status Display', () => {
    test('displays "Overtime: Active" when overtime status is active', () => {
      const shiftWithActiveOvertime = {
        shiftId: 'shift-123',
        startTime: '08:00',
        endTime: '17:00',
        lunchBreak: null,
        overtimeStatus: 'active',
        overtimeAuthorized: true
      };

      render(<WorkingHoursSection shiftInfo={shiftWithActiveOvertime} />);

      expect(screen.getByText('Overtime Status')).toBeInTheDocument();
      expect(screen.getByText('Overtime: Active')).toBeInTheDocument();
    });

    test('displays "Overtime: Inactive" when overtime status is inactive', () => {
      const shiftWithInactiveOvertime = {
        shiftId: 'shift-123',
        startTime: '08:00',
        endTime: '17:00',
        lunchBreak: null,
        overtimeStatus: 'inactive',
        overtimeAuthorized: false
      };

      render(<WorkingHoursSection shiftInfo={shiftWithInactiveOvertime} />);

      expect(screen.getByText('Overtime: Inactive')).toBeInTheDocument();
    });

    test('displays warning when overtime is active but not authorized', () => {
      const shiftWithUnauthorizedOvertime = {
        shiftId: 'shift-123',
        startTime: '08:00',
        endTime: '17:00',
        lunchBreak: null,
        overtimeStatus: 'active',
        overtimeAuthorized: false
      };

      render(<WorkingHoursSection shiftInfo={shiftWithUnauthorizedOvertime} />);

      expect(screen.getByText('Overtime: Active')).toBeInTheDocument();
      expect(screen.getByText('Overtime active but not pre-authorized')).toBeInTheDocument();
    });

    test('does not display warning when overtime is active and authorized', () => {
      const shiftWithAuthorizedOvertime = {
        shiftId: 'shift-123',
        startTime: '08:00',
        endTime: '17:00',
        lunchBreak: null,
        overtimeStatus: 'active',
        overtimeAuthorized: true
      };

      render(<WorkingHoursSection shiftInfo={shiftWithAuthorizedOvertime} />);

      expect(screen.getByText('Overtime: Active')).toBeInTheDocument();
      expect(screen.queryByText('Overtime active but not pre-authorized')).not.toBeInTheDocument();
    });

    test('handles unknown overtime status', () => {
      const shiftWithUnknownOvertime = {
        shiftId: 'shift-123',
        startTime: '08:00',
        endTime: '17:00',
        lunchBreak: null,
        overtimeStatus: 'unknown',
        overtimeAuthorized: false
      };

      render(<WorkingHoursSection shiftInfo={shiftWithUnknownOvertime} />);

      expect(screen.getByText('Overtime: Unknown')).toBeInTheDocument();
    });
  });

  describe('Component Props and Styling', () => {
    const mockShiftInfo = {
      shiftId: 'shift-123',
      startTime: '08:00',
      endTime: '17:00',
      lunchBreak: {
        startTime: '12:00',
        endTime: '13:00'
      },
      overtimeStatus: 'active',
      overtimeAuthorized: true
    };

    test('applies custom className', () => {
      const { container } = render(
        <WorkingHoursSection 
          shiftInfo={mockShiftInfo} 
          className="custom-class"
        />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    test('renders with default className when none provided', () => {
      const { container } = render(
        <WorkingHoursSection shiftInfo={mockShiftInfo} />
      );

      expect(container.querySelector('.working-hours-section')).toBeInTheDocument();
    });
  });

  describe('Time Formatting Edge Cases', () => {
    test('handles invalid time strings gracefully', () => {
      const shiftWithInvalidTimes = {
        shiftId: 'shift-123',
        startTime: 'invalid-time',
        endTime: '25:99', // Invalid time
        lunchBreak: {
          startTime: 'not-a-time',
          endTime: '13:00'
        },
        overtimeStatus: 'active',
        overtimeAuthorized: true
      };

      render(<WorkingHoursSection shiftInfo={shiftWithInvalidTimes} />);

      // Should display the invalid times as-is rather than crashing
      expect(screen.getByText('invalid-time')).toBeInTheDocument();
      expect(screen.getByText('25:99')).toBeInTheDocument();
      expect(screen.getByText('not-a-time')).toBeInTheDocument();
    });

    test('handles empty string times', () => {
      const shiftWithEmptyTimes = {
        shiftId: 'shift-123',
        startTime: '',
        endTime: '',
        lunchBreak: {
          startTime: '',
          endTime: ''
        },
        overtimeStatus: 'inactive',
        overtimeAuthorized: false
      };

      render(<WorkingHoursSection shiftInfo={shiftWithEmptyTimes} />);

      // Should display placeholder for empty times
      const placeholders = screen.getAllByText('--:--');
      expect(placeholders.length).toBeGreaterThan(0);
    });
  });

  describe('Complete Shift Information Display', () => {
    test('displays all shift information when fully populated', () => {
      const completeShiftInfo = {
        shiftId: 'shift-123',
        startTime: '07:30',
        endTime: '16:30',
        lunchBreak: {
          startTime: '12:00',
          endTime: '13:00'
        },
        overtimeStatus: 'active',
        overtimeAuthorized: true
      };

      render(<WorkingHoursSection shiftInfo={completeShiftInfo} />);

      // Check all sections are present
      expect(screen.getByText('Working Hours')).toBeInTheDocument();
      expect(screen.getByText('Start Time')).toBeInTheDocument();
      expect(screen.getByText('End Time')).toBeInTheDocument();
      expect(screen.getByText('Lunch Break')).toBeInTheDocument();
      expect(screen.getByText('Overtime Status')).toBeInTheDocument();

      // Check all times are displayed
      expect(screen.getByText('07:30')).toBeInTheDocument();
      expect(screen.getByText('16:30')).toBeInTheDocument();
      expect(screen.getByText('12:00')).toBeInTheDocument();
      expect(screen.getByText('13:00')).toBeInTheDocument();
      expect(screen.getByText('Overtime: Active')).toBeInTheDocument();
    });
  });
});
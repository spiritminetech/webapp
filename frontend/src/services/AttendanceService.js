import ApiService from './ApiService.js';
import appConfig from '../config/app.config.js';

/**
 * Attendance Service
 * Handles all attendance-related API calls
 */
class AttendanceService extends ApiService {
  constructor() {
    super(appConfig.api.endpoints.attendance);
  }

  async checkIn(data) {
    try {
      const response = await this.client.post(`${this.endpoint}/check-in`, data);
      appConfig.log('Check-in successful');
      return response.data;
    } catch (error) {
      this.handleError('checkIn', error);
      throw error;
    }
  }

  async checkOut(data) {
    try {
      const response = await this.client.post(`${this.endpoint}/check-out`, data);
      appConfig.log('Check-out successful');
      return response.data;
    } catch (error) {
      this.handleError('checkOut', error);
      throw error;
    }
  }

  async getAttendanceHistory(params = {}) {
    try {
      const response = await this.client.get(`${this.endpoint}/history`, { params });
      return response.data;
    } catch (error) {
      this.handleError('getAttendanceHistory', error);
      throw error;
    }
  }

  async getTodayAttendance() {
    try {
      const response = await this.client.get(`${this.endpoint}/today`);
      return response.data;
    } catch (error) {
      this.handleError('getTodayAttendance', error);
      throw error;
    }
  }
}

// Export singleton instance
const attendanceService = new AttendanceService();
export default attendanceService;
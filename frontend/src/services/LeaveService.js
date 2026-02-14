import ApiService from './ApiService.js';
import appConfig from '../config/app.config.js';

/**
 * Leave Request Service
 * Handles all leave request-related API calls
 */
class LeaveService extends ApiService {
  constructor() {
    super(appConfig.api.endpoints.leaveRequests);
  }

  async submitLeaveRequest(formData) {
    try {
      const response = await this.uploadFile(this.endpoint, formData);
      appConfig.log('Leave request submitted successfully');
      return response.data;
    } catch (error) {
      this.handleError('submitLeaveRequest', error);
      throw error;
    }
  }

  async getMyLeaveRequests(params = {}) {
    try {
      const response = await this.client.get(`${this.endpoint}/my-requests`, { params });
      return response.data;
    } catch (error) {
      this.handleError('getMyLeaveRequests', error);
      throw error;
    }
  }

  async getPendingRequests(params = {}) {
    try {
      const response = await this.client.get(`${this.endpoint}/pending`, { params });
      return response.data;
    } catch (error) {
      this.handleError('getPendingRequests', error);
      throw error;
    }
  }

  async approveLeaveRequest(requestId, data) {
    try {
      const response = await this.client.post(`${this.endpoint}/${requestId}/approve`, data);
      appConfig.log('Leave request approved');
      return response.data;
    } catch (error) {
      this.handleError('approveLeaveRequest', error);
      throw error;
    }
  }

  async rejectLeaveRequest(requestId, data) {
    try {
      const response = await this.client.post(`${this.endpoint}/${requestId}/reject`, data);
      appConfig.log('Leave request rejected');
      return response.data;
    } catch (error) {
      this.handleError('rejectLeaveRequest', error);
      throw error;
    }
  }
}

// Export singleton instance
const leaveService = new LeaveService();
export default leaveService;
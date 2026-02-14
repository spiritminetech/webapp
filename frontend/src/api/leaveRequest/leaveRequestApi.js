import axios from 'axios';
import appConfig from '../../config/app.config.js';

const API = axios.create({
  baseURL: `${appConfig.api.baseURL}/api/leave-requests`,
  timeout: appConfig.api.timeout
});

// Attach auth token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem(appConfig.storage.token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* Worker APIs */
export const createLeaveRequest = (formData) =>
  API.post('/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const getMyLeaveRequests = () =>
  API.get('/my');

/* Supervisor APIs */
export const getPendingLeaveRequests = () =>
  API.get('/pending');

export const approveLeaveRequest = (id) =>
  API.post(`/${id}/approve`);

export const rejectLeaveRequest = (id, payload) =>
  API.post(`/${id}/reject`, payload);
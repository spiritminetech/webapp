import axios from "axios";
import appConfig from "../config/app.config.js";

const BASE_URL = `${appConfig.api.baseURL}/api`;

// Create axios instance with centralized config
const api = axios.create({
  baseURL: BASE_URL,
  timeout: appConfig.api.timeout
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(appConfig.storage.token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getProjects = (employeeId) => api.get(`/projects/getAssignedProjects?employeeId=${employeeId}`);
export const submitAttendance = (employeeId, projectId, session, lat, lon) =>
  api.post(`/attendance/submit`, { employeeId, projectId, session, latitude: lat, longitude: lon });
export const logLocation = (employeeId, projectId, lat, lon) =>
  api.post(`/attendance/log-location`, { employeeId, projectId, latitude: lat, longitude: lon });
export const getAttendanceHistory = (employeeId, projectId) =>
  api.get(`/attendance/history?employeeId=${employeeId}&projectId=${projectId}`);



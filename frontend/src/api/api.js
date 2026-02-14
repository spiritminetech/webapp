// api.js - Centralized API Configuration
import axios from "axios";
import appConfig from "../config/app.config.js";

const api = axios.create({
  baseURL: appConfig.api.baseURL,
  timeout: appConfig.api.timeout
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(appConfig.storage.token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

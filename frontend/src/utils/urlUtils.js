import appConfig from '../config/app.config.js';

/**
 * URL Utilities
 * Professional URL management for ERP system
 */

export class UrlUtils {
  /**
   * Get full API URL
   * @param {string} endpoint - API endpoint
   * @returns {string} Full URL
   */
  static getApiUrl(endpoint = '') {
    return appConfig.getFullApiUrl(endpoint);
  }

  /**
   * Get upload URL for files
   * @param {string} type - Upload type (tasks, drivers, leave, etc.)
   * @param {string} filename - Optional filename
   * @returns {string} Upload URL
   */
  static getUploadUrl(type, filename = '') {
    return appConfig.getUploadUrl(type, filename);
  }

  /**
   * Build query string from object
   * @param {Object} params - Query parameters
   * @returns {string} Query string
   */
  static buildQueryString(params) {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        searchParams.append(key, value);
      }
    });
    
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Parse query string to object
   * @param {string} queryString - Query string
   * @returns {Object} Parsed parameters
   */
  static parseQueryString(queryString = window.location.search) {
    const params = new URLSearchParams(queryString);
    const result = {};
    
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    
    return result;
  }

  /**
   * Validate URL
   * @param {string} url - URL to validate
   * @returns {boolean} Is valid URL
   */
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file extension from URL
   * @param {string} url - File URL
   * @returns {string} File extension
   */
  static getFileExtension(url) {
    return url.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Check if file type is allowed
   * @param {string} fileType - MIME type
   * @returns {boolean} Is allowed
   */
  static isAllowedFileType(fileType) {
    return appConfig.upload.allowedTypes.includes(fileType);
  }

  /**
   * Format file size
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted size
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if file size is within limit
   * @param {number} fileSize - File size in bytes
   * @returns {boolean} Is within limit
   */
  static isFileSizeValid(fileSize) {
    return fileSize <= appConfig.upload.maxFileSize;
  }
}

// Export individual functions for convenience
export const {
  getApiUrl,
  getUploadUrl,
  buildQueryString,
  parseQueryString,
  isValidUrl,
  getFileExtension,
  isAllowedFileType,
  formatFileSize,
  isFileSizeValid
} = UrlUtils;

export default UrlUtils;
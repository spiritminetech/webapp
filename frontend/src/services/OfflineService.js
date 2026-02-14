import workerTaskService from './WorkerTaskService.js';
import appConfig from '../config/app.config.js';

/**
 * Offline Data Management Service
 * Handles caching, queuing, and synchronization for offline functionality
 */
class OfflineService {
  constructor() {
    this.storage = window.localStorage;
    this.syncQueue = [];
    this.cacheKeys = {
      tasks: 'cached_tasks',
      syncQueue: 'sync_queue',
      lastSync: 'last_sync',
      offlineMode: 'offline_mode'
    };
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
    this.maxQueueSize = 100;
    
    this.initializeOfflineMode();
  }

  /**
   * Initialize offline mode detection
   */
  initializeOfflineMode() {
    // Load sync queue from storage
    this.loadSyncQueue();
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.setOfflineMode(false);
      this.syncQueuedOperations();
    });
    
    window.addEventListener('offline', () => {
      this.setOfflineMode(true);
    });
    
    // Set initial offline state
    this.setOfflineMode(!navigator.onLine);
  }

  /**
   * Check if currently offline
   * @returns {boolean} True if offline
   */
  isOffline() {
    return !navigator.onLine || this.storage.getItem(this.cacheKeys.offlineMode) === 'true';
  }

  /**
   * Set offline mode state
   * @param {boolean} offline - Offline state
   */
  setOfflineMode(offline) {
    this.storage.setItem(this.cacheKeys.offlineMode, offline.toString());
    
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('offlineStateChanged', {
      detail: { offline }
    }));
    
    appConfig.log(`Offline mode: ${offline ? 'ON' : 'OFF'}`);
  }

  /**
   * Cache task data for offline access
   * @param {Object} taskData - Task data to cache
   */
  cacheTaskData(taskData) {
    try {
      const cacheData = {
        data: taskData,
        timestamp: Date.now(),
        version: '1.0'
      };
      
      this.storage.setItem(this.cacheKeys.tasks, JSON.stringify(cacheData));
      this.storage.setItem(this.cacheKeys.lastSync, Date.now().toString());
      
      appConfig.log('Task data cached successfully');
    } catch (error) {
      appConfig.error('Failed to cache task data:', error);
    }
  }

  /**
   * Get cached task data
   * @returns {Object|null} Cached task data or null if expired/not found
   */
  getCachedTaskData() {
    try {
      const cached = this.storage.getItem(this.cacheKeys.tasks);
      if (!cached) return null;
      
      const cacheData = JSON.parse(cached);
      const isExpired = Date.now() - cacheData.timestamp > this.cacheExpiry;
      
      if (isExpired) {
        this.clearCachedTaskData();
        return null;
      }
      
      appConfig.log('Retrieved cached task data');
      return cacheData.data;
    } catch (error) {
      appConfig.error('Failed to retrieve cached task data:', error);
      return null;
    }
  }

  /**
   * Clear cached task data
   */
  clearCachedTaskData() {
    this.storage.removeItem(this.cacheKeys.tasks);
    appConfig.log('Cached task data cleared');
  }

  /**
   * Queue an operation for later synchronization
   * @param {Object} operation - Operation to queue
   */
  queueOperation(operation) {
    try {
      const queuedOperation = {
        ...operation,
        id: this.generateOperationId(),
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3
      };
      
      this.syncQueue.push(queuedOperation);
      
      // Limit queue size
      if (this.syncQueue.length > this.maxQueueSize) {
        this.syncQueue = this.syncQueue.slice(-this.maxQueueSize);
        appConfig.warn('Sync queue size limit reached, removing oldest operations');
      }
      
      this.saveSyncQueue();
      
      appConfig.log('Operation queued for sync:', {
        type: operation.type,
        id: queuedOperation.id
      });
      
      // Dispatch event for UI updates
      window.dispatchEvent(new CustomEvent('operationQueued', {
        detail: { operation: queuedOperation, queueSize: this.syncQueue.length }
      }));
    } catch (error) {
      appConfig.error('Failed to queue operation:', error);
    }
  }

  /**
   * Get queued operations count
   * @returns {number} Number of queued operations
   */
  getQueuedOperationsCount() {
    return this.syncQueue.length;
  }

  /**
   * Get queued operations by type
   * @param {string} type - Operation type
   * @returns {Array} Filtered operations
   */
  getQueuedOperationsByType(type) {
    return this.syncQueue.filter(op => op.type === type);
  }

  /**
   * Sync all queued operations
   * @returns {Promise<Object>} Sync results
   */
  async syncQueuedOperations() {
    if (this.isOffline() || this.syncQueue.length === 0) {
      return { success: true, synced: 0, failed: 0 };
    }

    appConfig.log(`Starting sync of ${this.syncQueue.length} queued operations`);
    
    const results = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };

    // Create a copy of the queue to work with
    const operationsToSync = [...this.syncQueue];
    
    for (const operation of operationsToSync) {
      try {
        await this.executeQueuedOperation(operation);
        this.removeFromQueue(operation.id);
        results.synced++;
        
        appConfig.log(`Synced operation: ${operation.type} (${operation.id})`);
      } catch (error) {
        operation.retryCount++;
        
        if (operation.retryCount >= operation.maxRetries) {
          this.removeFromQueue(operation.id);
          results.failed++;
          results.errors.push({
            operation: operation.type,
            error: error.message
          });
          
          appConfig.error(`Failed to sync operation after ${operation.maxRetries} retries:`, {
            type: operation.type,
            id: operation.id,
            error: error.message
          });
        } else {
          appConfig.warn(`Sync failed, will retry (${operation.retryCount}/${operation.maxRetries}):`, {
            type: operation.type,
            id: operation.id,
            error: error.message
          });
        }
      }
    }

    this.saveSyncQueue();
    
    // Dispatch sync completion event
    window.dispatchEvent(new CustomEvent('syncCompleted', {
      detail: results
    }));
    
    appConfig.log('Sync completed:', results);
    return results;
  }

  /**
   * Execute a queued operation
   * @param {Object} operation - Operation to execute
   * @returns {Promise} Operation result
   */
  async executeQueuedOperation(operation) {
    switch (operation.type) {
      case 'startTask':
        return await workerTaskService.startTask(operation.data.assignmentId, operation.data.location);
      
      case 'submitProgress':
        return await workerTaskService.submitProgress(operation.data);
      
      case 'uploadPhotos':
        return await workerTaskService.uploadPhotos(
          operation.data.assignmentId,
          operation.data.photos,
          operation.data.captions,
          operation.data.location
        );
      
      case 'reportIssue':
        return await workerTaskService.reportIssue(operation.data);
      
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Remove operation from sync queue
   * @param {string} operationId - Operation ID to remove
   */
  removeFromQueue(operationId) {
    this.syncQueue = this.syncQueue.filter(op => op.id !== operationId);
    this.saveSyncQueue();
  }

  /**
   * Clear all queued operations
   */
  clearSyncQueue() {
    this.syncQueue = [];
    this.storage.removeItem(this.cacheKeys.syncQueue);
    appConfig.log('Sync queue cleared');
  }

  /**
   * Load sync queue from storage
   */
  loadSyncQueue() {
    try {
      const stored = this.storage.getItem(this.cacheKeys.syncQueue);
      if (stored) {
        this.syncQueue = JSON.parse(stored);
        appConfig.log(`Loaded ${this.syncQueue.length} operations from sync queue`);
      }
    } catch (error) {
      appConfig.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  /**
   * Save sync queue to storage
   */
  saveSyncQueue() {
    try {
      this.storage.setItem(this.cacheKeys.syncQueue, JSON.stringify(this.syncQueue));
    } catch (error) {
      appConfig.error('Failed to save sync queue:', error);
    }
  }

  /**
   * Generate unique operation ID
   * @returns {string} Unique ID
   */
  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get cache status information
   * @returns {Object} Cache status
   */
  getCacheStatus() {
    const cachedTasks = this.storage.getItem(this.cacheKeys.tasks);
    const lastSync = this.storage.getItem(this.cacheKeys.lastSync);
    
    return {
      hasCachedData: !!cachedTasks,
      lastSync: lastSync ? new Date(parseInt(lastSync)) : null,
      queuedOperations: this.syncQueue.length,
      isOffline: this.isOffline(),
      cacheSize: this.calculateCacheSize()
    };
  }

  /**
   * Calculate approximate cache size
   * @returns {number} Cache size in bytes
   */
  calculateCacheSize() {
    let totalSize = 0;
    
    Object.values(this.cacheKeys).forEach(key => {
      const item = this.storage.getItem(key);
      if (item) {
        totalSize += item.length;
      }
    });
    
    return totalSize;
  }

  /**
   * Clear all offline data
   */
  clearAllOfflineData() {
    Object.values(this.cacheKeys).forEach(key => {
      this.storage.removeItem(key);
    });
    
    this.syncQueue = [];
    appConfig.log('All offline data cleared');
  }
}

// Export singleton instance
const offlineService = new OfflineService();
export default offlineService;
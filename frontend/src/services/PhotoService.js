import workerTaskService from './WorkerTaskService.js';
import appConfig from '../config/app.config.js';

/**
 * Photo Management Service
 * Handles photo compression, optimization, and upload for worker tasks
 */
class PhotoService {
  constructor() {
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
    this.maxDimensions = { width: 1920, height: 1080 };
    this.compressionQuality = 0.8;
    this.maxPhotosPerTask = 5;
  }

  /**
   * Compress a photo file for optimal upload
   * @param {File} file - Original photo file
   * @param {Object} options - Compression options
   * @returns {Promise<Blob>} Compressed photo blob
   */
  async compressPhoto(file, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          try {
            // Calculate new dimensions
            const { width, height } = this.calculateOptimalDimensions(
              img.width, 
              img.height, 
              options.maxWidth || this.maxDimensions.width,
              options.maxHeight || this.maxDimensions.height
            );
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error('Failed to compress image'));
                }
              }, 
              'image/jpeg', 
              options.quality || this.compressionQuality
            );
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image for compression'));
        };
        
        img.src = URL.createObjectURL(file);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Calculate optimal dimensions while maintaining aspect ratio
   * @param {number} srcWidth - Source width
   * @param {number} srcHeight - Source height
   * @param {number} maxWidth - Maximum width
   * @param {number} maxHeight - Maximum height
   * @returns {Object} Optimal dimensions {width, height}
   */
  calculateOptimalDimensions(srcWidth, srcHeight, maxWidth, maxHeight) {
    const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
    return {
      width: Math.round(srcWidth * ratio),
      height: Math.round(srcHeight * ratio)
    };
  }

  /**
   * Validate photo files before processing
   * @param {Array} files - Array of photo files
   * @returns {Object} Validation result {valid, errors}
   */
  validatePhotos(files) {
    const errors = [];
    
    if (!files || files.length === 0) {
      errors.push('No photos selected');
      return { valid: false, errors };
    }
    
    if (files.length > this.maxPhotosPerTask) {
      errors.push(`Maximum ${this.maxPhotosPerTask} photos allowed per task`);
    }
    
    files.forEach((file, index) => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        errors.push(`File ${index + 1}: Must be an image file`);
      }
      
      // Check file size
      if (file.size > this.maxFileSize) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        const maxSizeMB = (this.maxFileSize / (1024 * 1024)).toFixed(1);
        errors.push(`File ${index + 1}: Size ${sizeMB}MB exceeds maximum ${maxSizeMB}MB`);
      }
      
      // Check file format
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        errors.push(`File ${index + 1}: Format ${file.type} not supported. Use JPEG, PNG, or WebP`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Process and upload photos for a task
   * @param {number} assignmentId - Task assignment ID
   * @param {Array} photoFiles - Array of photo files
   * @param {Array} captions - Array of photo captions
   * @param {Object} location - Current location
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Upload result
   */
  async uploadTaskPhotos(assignmentId, photoFiles, captions = [], location = null, onProgress = null) {
    try {
      // Validate photos
      const validation = this.validatePhotos(photoFiles);
      if (!validation.valid) {
        throw new Error(`Photo validation failed: ${validation.errors.join(', ')}`);
      }

      // Compress photos
      const compressedPhotos = [];
      const totalFiles = photoFiles.length;
      
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];
        
        // Update progress for compression
        if (onProgress) {
          onProgress({
            stage: 'compressing',
            current: i + 1,
            total: totalFiles,
            percentage: Math.round(((i + 1) / totalFiles) * 50) // 50% for compression
          });
        }
        
        try {
          const compressedBlob = await this.compressPhoto(file);
          
          // Create a new File object from the compressed blob
          const compressedFile = new File(
            [compressedBlob], 
            `compressed_${file.name}`, 
            { type: 'image/jpeg' }
          );
          
          compressedPhotos.push(compressedFile);
          
          appConfig.log(`Photo ${i + 1} compressed:`, {
            original: `${(file.size / 1024).toFixed(1)}KB`,
            compressed: `${(compressedFile.size / 1024).toFixed(1)}KB`,
            reduction: `${(((file.size - compressedFile.size) / file.size) * 100).toFixed(1)}%`
          });
        } catch (compressionError) {
          appConfig.error(`Failed to compress photo ${i + 1}:`, compressionError);
          // Use original file if compression fails
          compressedPhotos.push(file);
        }
      }

      // Upload compressed photos
      const uploadResult = await workerTaskService.uploadPhotos(
        assignmentId,
        compressedPhotos,
        captions,
        location,
        (progressEvent) => {
          if (onProgress) {
            const uploadPercentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress({
              stage: 'uploading',
              current: totalFiles,
              total: totalFiles,
              percentage: 50 + Math.round(uploadPercentage * 0.5) // 50% + upload progress
            });
          }
        }
      );

      return uploadResult;
    } catch (error) {
      appConfig.error('Photo upload failed:', error);
      throw error;
    }
  }

  /**
   * Create photo preview URL
   * @param {File} file - Photo file
   * @returns {string} Preview URL
   */
  createPreviewUrl(file) {
    return URL.createObjectURL(file);
  }

  /**
   * Revoke photo preview URL to free memory
   * @param {string} url - Preview URL to revoke
   */
  revokePreviewUrl(url) {
    URL.revokeObjectURL(url);
  }

  /**
   * Get photo metadata
   * @param {File} file - Photo file
   * @returns {Promise<Object>} Photo metadata
   */
  async getPhotoMetadata(file) {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          name: file.name,
          size: file.size,
          type: file.type,
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height,
          lastModified: file.lastModified
        });
      };
      
      img.onerror = () => {
        resolve({
          name: file.name,
          size: file.size,
          type: file.type,
          width: 0,
          height: 0,
          aspectRatio: 1,
          lastModified: file.lastModified,
          error: 'Failed to load image metadata'
        });
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Batch process multiple photos with progress tracking
   * @param {Array} files - Array of photo files
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Array>} Array of processed photos
   */
  async batchProcessPhotos(files, onProgress = null) {
    const processedPhotos = [];
    const total = files.length;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Get metadata
        const metadata = await this.getPhotoMetadata(file);
        
        // Compress if needed
        let processedFile = file;
        if (file.size > this.maxFileSize * 0.8) { // Compress if > 80% of max size
          processedFile = await this.compressPhoto(file);
        }
        
        processedPhotos.push({
          original: file,
          processed: processedFile,
          metadata,
          previewUrl: this.createPreviewUrl(file)
        });
        
        if (onProgress) {
          onProgress({
            current: i + 1,
            total,
            percentage: Math.round(((i + 1) / total) * 100)
          });
        }
      } catch (error) {
        appConfig.error(`Failed to process photo ${i + 1}:`, error);
        
        // Add with error state
        processedPhotos.push({
          original: file,
          processed: file,
          metadata: { error: error.message },
          previewUrl: null
        });
      }
    }
    
    return processedPhotos;
  }
}

// Export singleton instance
const photoService = new PhotoService();
export default photoService;
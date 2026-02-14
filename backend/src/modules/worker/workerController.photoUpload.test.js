// Test file for worker photo upload functionality
import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { uploadWorkerTaskPhotos } from './workerController.js';
import WorkerTaskAssignment from './models/WorkerTaskAssignment.js';
import WorkerTaskPhoto from './models/WorkerTaskPhoto.js';
import Employee from '../employee/Employee.js';
import upload from '../../middleware/upload.js';

// Mock the dependencies
jest.mock('./models/WorkerTaskAssignment.js');
jest.mock('./models/WorkerTaskPhoto.js');
jest.mock('../employee/Employee.js');

const app = express();
app.use(express.json());
app.use('/test-upload', upload.array('photos', 5), uploadWorkerTaskPhotos);

describe('Worker Photo Upload - Multiple File Handling', () => {
  let mockEmployee;
  let mockAssignment;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockEmployee = {
      id: 1,
      fullName: 'Test Worker',
      status: 'ACTIVE'
    };

    mockAssignment = {
      id: 101,
      employeeId: 1,
      projectId: 1,
      taskId: 15,
      status: 'in_progress'
    };

    // Mock Employee.findOne
    Employee.findOne.mockResolvedValue(mockEmployee);
    
    // Mock WorkerTaskAssignment.findOne
    WorkerTaskAssignment.findOne.mockResolvedValue(mockAssignment);
    
    // Mock WorkerTaskPhoto.countDocuments
    WorkerTaskPhoto.countDocuments.mockResolvedValue(0);
    
    // Mock WorkerTaskPhoto.findOne for ID generation
    WorkerTaskPhoto.findOne.mockResolvedValue({ id: 100 });
    
    // Mock WorkerTaskPhoto.insertMany
    WorkerTaskPhoto.insertMany.mockResolvedValue([]);
  });

  afterEach(() => {
    // Clean up any test files
    const uploadsDir = path.join(process.cwd(), 'uploads', 'tasks');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      files.forEach(file => {
        if (file.startsWith('test-')) {
          fs.unlinkSync(path.join(uploadsDir, file));
        }
      });
    }
  });

  test('should handle single photo upload successfully with proper naming convention', async () => {
    const mockReq = {
      user: { userId: 1, companyId: 1 },
      body: { assignmentId: '101' },
      files: [{
        filename: '1706356200000.jpg', // Original multer filename
        originalname: 'photo1.jpg',
        mimetype: 'image/jpeg',
        size: 1024000,
        path: '/uploads/tasks/1706356200000.jpg'
      }]
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Mock fs.renameSync to simulate successful file rename
    const mockRenameSync = jest.spyOn(require('fs'), 'renameSync').mockImplementation(() => {});

    await uploadWorkerTaskPhotos(mockReq, mockRes);

    // Verify file was renamed with proper convention
    expect(mockRenameSync).toHaveBeenCalledWith(
      '/uploads/tasks/1706356200000.jpg',
      expect.stringMatching(/\/uploads\/tasks\/task_101_\d+_1\.jpg$/)
    );

    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: {
        uploadedPhotos: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            photoUrl: expect.stringMatching(/^\/uploads\/tasks\/task_101_\d+_1\.jpg$/),
            caption: '',
            uploadedAt: expect.any(Date),
            fileSize: 1024000
          })
        ]),
        totalPhotos: 1,
        maxPhotos: 5
      },
      message: "Photos uploaded successfully"
    });

    mockRenameSync.mockRestore();
  });

  test('should handle multiple photos upload (max 5) with proper naming convention', async () => {
    const mockFiles = Array.from({ length: 5 }, (_, i) => ({
      filename: `${1706356200000 + i}.jpg`, // Original multer filenames
      originalname: `photo${i + 1}.jpg`,
      mimetype: 'image/jpeg',
      size: 1024000 + i * 1000,
      path: `/uploads/tasks/${1706356200000 + i}.jpg`
    }));

    const mockReq = {
      user: { userId: 1, companyId: 1 },
      body: { 
        assignmentId: '101',
        captions: JSON.stringify(['Photo 1', 'Photo 2', 'Photo 3', 'Photo 4', 'Photo 5'])
      },
      files: mockFiles
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Mock fs.renameSync to simulate successful file renames
    const mockRenameSync = jest.spyOn(require('fs'), 'renameSync').mockImplementation(() => {});

    await uploadWorkerTaskPhotos(mockReq, mockRes);

    // Verify all files were renamed with proper convention and indexing
    expect(mockRenameSync).toHaveBeenCalledTimes(5);
    expect(mockRenameSync).toHaveBeenNthCalledWith(1, 
      `/uploads/tasks/${1706356200000}.jpg`,
      expect.stringMatching(/\/uploads\/tasks\/task_101_\d+_1\.jpg$/)
    );
    expect(mockRenameSync).toHaveBeenNthCalledWith(5, 
      `/uploads/tasks/${1706356200004}.jpg`,
      expect.stringMatching(/\/uploads\/tasks\/task_101_\d+_5\.jpg$/)
    );

    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: {
        uploadedPhotos: expect.arrayContaining([
          expect.objectContaining({
            caption: 'Photo 1',
            fileSize: 1024000,
            photoUrl: expect.stringMatching(/^\/uploads\/tasks\/task_101_\d+_1\.jpg$/)
          }),
          expect.objectContaining({
            caption: 'Photo 2',
            fileSize: 1025000,
            photoUrl: expect.stringMatching(/^\/uploads\/tasks\/task_101_\d+_2\.jpg$/)
          }),
          expect.objectContaining({
            caption: 'Photo 5',
            fileSize: 1028000,
            photoUrl: expect.stringMatching(/^\/uploads\/tasks\/task_101_\d+_5\.jpg$/)
          })
        ]),
        totalPhotos: 5,
        maxPhotos: 5
      },
      message: "Photos uploaded successfully"
    });

    expect(WorkerTaskPhoto.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          caption: 'Photo 1',
          fileSize: 1024000,
          originalName: 'photo1.jpg',
          mimeType: 'image/jpeg',
          photoUrl: expect.stringMatching(/^\/uploads\/tasks\/task_101_\d+_1\.jpg$/)
        })
      ])
    );

    mockRenameSync.mockRestore();
  });

  test('should reject upload when exceeding 5 photos limit', async () => {
    const mockFiles = Array.from({ length: 6 }, (_, i) => ({
      filename: `test-photo-${i + 1}.jpg`,
      originalname: `photo${i + 1}.jpg`,
      mimetype: 'image/jpeg',
      size: 1024000,
      path: `/uploads/tasks/test-photo-${i + 1}.jpg`
    }));

    const mockReq = {
      user: { userId: 1, companyId: 1 },
      body: { assignmentId: '101' },
      files: mockFiles
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await uploadWorkerTaskPhotos(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Maximum 5 photos allowed per upload",
      error: "TOO_MANY_PHOTOS"
    });
  });

  test('should reject upload when total photos would exceed 5', async () => {
    // Mock existing photos count
    WorkerTaskPhoto.countDocuments.mockResolvedValue(3);

    const mockFiles = Array.from({ length: 3 }, (_, i) => ({
      filename: `test-photo-${i + 1}.jpg`,
      originalname: `photo${i + 1}.jpg`,
      mimetype: 'image/jpeg',
      size: 1024000,
      path: `/uploads/tasks/test-photo-${i + 1}.jpg`
    }));

    const mockReq = {
      user: { userId: 1, companyId: 1 },
      body: { assignmentId: '101' },
      files: mockFiles
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await uploadWorkerTaskPhotos(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Cannot upload 3 photos. Maximum 5 photos per task (3 already uploaded)",
      error: "PHOTO_LIMIT_EXCEEDED"
    });
  });

  test('should validate file types correctly', async () => {
    const mockFiles = [
      {
        filename: 'test-photo.txt',
        originalname: 'document.txt',
        mimetype: 'text/plain',
        size: 1024,
        path: '/uploads/tasks/test-photo.txt'
      }
    ];

    const mockReq = {
      user: { userId: 1, companyId: 1 },
      body: { assignmentId: '101' },
      files: mockFiles
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await uploadWorkerTaskPhotos(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid file type. Only JPEG and PNG files are allowed",
      error: "INVALID_FILE_TYPE"
    });
  });

  test('should validate file sizes correctly', async () => {
    const mockFiles = [
      {
        filename: 'test-large-photo.jpg',
        originalname: 'large-photo.jpg',
        mimetype: 'image/jpeg',
        size: 15 * 1024 * 1024, // 15MB - exceeds 10MB limit
        path: '/uploads/tasks/test-large-photo.jpg'
      }
    ];

    const mockReq = {
      user: { userId: 1, companyId: 1 },
      body: { assignmentId: '101' },
      files: mockFiles
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await uploadWorkerTaskPhotos(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "File size too large. Maximum 10MB per file",
      error: "FILE_TOO_LARGE"
    });
  });

  test('should handle captions as comma-separated string', async () => {
    const mockFiles = [
      {
        filename: 'test-photo-1.jpg',
        originalname: 'photo1.jpg',
        mimetype: 'image/jpeg',
        size: 1024000,
        path: '/uploads/tasks/test-photo-1.jpg'
      },
      {
        filename: 'test-photo-2.jpg',
        originalname: 'photo2.jpg',
        mimetype: 'image/jpeg',
        size: 1024000,
        path: '/uploads/tasks/test-photo-2.jpg'
      }
    ];

    const mockReq = {
      user: { userId: 1, companyId: 1 },
      body: { 
        assignmentId: '101',
        captions: 'First photo, Second photo'
      },
      files: mockFiles
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await uploadWorkerTaskPhotos(mockReq, mockRes);

    expect(WorkerTaskPhoto.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          caption: 'First photo'
        }),
        expect.objectContaining({
          caption: 'Second photo'
        })
      ])
    );
  });

  test('should handle location data correctly', async () => {
    const mockFiles = [
      {
        filename: 'test-photo-1.jpg',
        originalname: 'photo1.jpg',
        mimetype: 'image/jpeg',
        size: 1024000,
        path: '/uploads/tasks/test-photo-1.jpg'
      }
    ];

    const locationData = {
      latitude: 40.7128,
      longitude: -74.0060,
      timestamp: '2024-01-27T11:30:00Z'
    };

    const mockReq = {
      user: { userId: 1, companyId: 1 },
      body: { 
        assignmentId: '101',
        location: JSON.stringify(locationData)
      },
      files: mockFiles
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await uploadWorkerTaskPhotos(mockReq, mockRes);

    expect(WorkerTaskPhoto.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          location: expect.objectContaining({
            latitude: 40.7128,
            longitude: -74.0060,
            timestamp: '2024-01-27T11:30:00Z'
          })
        })
      ])
    );
  });

  test('should handle file rename errors gracefully', async () => {
    const mockFiles = [
      {
        filename: '1706356200000.jpg',
        originalname: 'photo1.jpg',
        mimetype: 'image/jpeg',
        size: 1024000,
        path: '/uploads/tasks/1706356200000.jpg'
      }
    ];

    const mockReq = {
      user: { userId: 1, companyId: 1 },
      body: { assignmentId: '101' },
      files: mockFiles
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Mock fs.renameSync to throw an error
    const mockRenameSync = jest.spyOn(require('fs'), 'renameSync').mockImplementation(() => {
      throw new Error('Permission denied');
    });

    // Mock console.error to verify error logging
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await uploadWorkerTaskPhotos(mockReq, mockRes);

    // Verify error was logged
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining('Error renaming file'),
      expect.any(Error)
    );

    // Verify upload still succeeds with original filename
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: {
        uploadedPhotos: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            photoUrl: '/uploads/tasks/1706356200000.jpg', // Original filename used as fallback
            caption: '',
            uploadedAt: expect.any(Date),
            fileSize: 1024000
          })
        ]),
        totalPhotos: 1,
        maxPhotos: 5
      },
      message: "Photos uploaded successfully"
    });

    mockRenameSync.mockRestore();
    mockConsoleError.mockRestore();
  });

  test('should reject upload when no files provided', async () => {
    const mockReq = {
      user: { userId: 1, companyId: 1 },
      body: { assignmentId: '101' },
      files: []
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await uploadWorkerTaskPhotos(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "No photos provided",
      error: "NO_PHOTOS_PROVIDED"
    });
  });

  test('should reject upload for unauthorized assignment', async () => {
    WorkerTaskAssignment.findOne.mockResolvedValue(null);

    const mockFiles = [
      {
        filename: 'test-photo-1.jpg',
        originalname: 'photo1.jpg',
        mimetype: 'image/jpeg',
        size: 1024000,
        path: '/uploads/tasks/test-photo-1.jpg'
      }
    ];

    const mockReq = {
      user: { userId: 1, companyId: 1 },
      body: { assignmentId: '101' },
      files: mockFiles
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await uploadWorkerTaskPhotos(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Task assignment not found or unauthorized",
      error: "ASSIGNMENT_UNAUTHORIZED"
    });
  });
});
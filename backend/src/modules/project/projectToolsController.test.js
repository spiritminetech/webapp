import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import { getProjectToolsAndMaterials, getProjectTools, getProjectMaterials } from './projectToolsController.js';
import Tool from './models/Tool.js';
import Material from './models/Material.js';
import Employee from '../employee/Employee.js';
import WorkerTaskAssignment from '../worker/models/WorkerTaskAssignment.js';

// Mock the models
jest.mock('./models/Tool.js');
jest.mock('./models/Material.js');
jest.mock('../employee/Employee.js');
jest.mock('../worker/models/WorkerTaskAssignment.js');

describe('Project Tools Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: {
        userId: 1,
        companyId: 1
      },
      query: {},
      params: {}
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('getProjectToolsAndMaterials', () => {
    test('should return tools and materials for worker project', async () => {
      // Mock employee
      const mockEmployee = { id: 1, fullName: 'John Doe' };
      Employee.findOne.mockResolvedValue(mockEmployee);

      // Mock task assignment
      const mockAssignment = { projectId: 1 };
      WorkerTaskAssignment.findOne.mockResolvedValue(mockAssignment);

      // Mock tools
      const mockTools = [
        {
          id: 1,
          name: 'Drill',
          category: 'power_tools',
          quantity: 2,
          unit: 'pieces',
          allocated: true,
          location: 'Tool Storage A',
          condition: 'good',
          status: 'available'
        }
      ];
      Tool.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTools)
      });

      // Mock materials
      const mockMaterials = [
        {
          id: 10,
          name: 'Ceiling Panels',
          category: 'finishing',
          quantity: 50,
          unit: 'pieces',
          allocated: 50,
          used: 37,
          remaining: 13,
          location: 'Material Storage B',
          status: 'allocated'
        }
      ];
      Material.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockMaterials)
      });

      await getProjectToolsAndMaterials(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          projectId: 1,
          tools: [
            {
              id: 1,
              name: 'Drill',
              category: 'power_tools',
              quantity: 2,
              unit: 'pieces',
              allocated: true,
              location: 'Tool Storage A',
              condition: 'good',
              status: 'available'
            }
          ],
          materials: [
            {
              id: 10,
              name: 'Ceiling Panels',
              category: 'finishing',
              quantity: 50,
              unit: 'pieces',
              allocated: 50,
              used: 37,
              remaining: 13,
              location: 'Material Storage B',
              status: 'allocated'
            }
          ],
          summary: {
            totalTools: 1,
            allocatedTools: 1,
            totalMaterials: 1,
            allocatedMaterials: 1
          }
        }
      });
    });

    test('should return 404 when employee not found', async () => {
      Employee.findOne.mockResolvedValue(null);

      await getProjectToolsAndMaterials(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Employee not found'
      });
    });

    test('should return 404 when no task assignment found', async () => {
      const mockEmployee = { id: 1, fullName: 'John Doe' };
      Employee.findOne.mockResolvedValue(mockEmployee);
      WorkerTaskAssignment.findOne.mockResolvedValue(null);

      await getProjectToolsAndMaterials(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No project assignment found for today'
      });
    });

    test('should use projectId from query if provided', async () => {
      req.query.projectId = '2';
      
      const mockEmployee = { id: 1, fullName: 'John Doe' };
      Employee.findOne.mockResolvedValue(mockEmployee);

      Tool.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([])
      });
      Material.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([])
      });

      await getProjectToolsAndMaterials(req, res);

      expect(Tool.find).toHaveBeenCalledWith({
        companyId: 1,
        projectId: '2'
      });
      expect(Material.find).toHaveBeenCalledWith({
        companyId: 1,
        projectId: '2'
      });
    });

    test('should handle server errors', async () => {
      Employee.findOne.mockRejectedValue(new Error('Database error'));

      await getProjectToolsAndMaterials(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server error'
      });
    });
  });

  describe('getProjectTools', () => {
    test('should return tools for specific project', async () => {
      req.params.projectId = '1';
      
      const mockEmployee = { id: 1, fullName: 'John Doe' };
      Employee.findOne.mockResolvedValue(mockEmployee);

      const mockTools = [
        { id: 1, name: 'Drill', category: 'power_tools' }
      ];
      Tool.find.mockResolvedValue(mockTools);

      await getProjectTools(req, res);

      expect(Tool.find).toHaveBeenCalledWith({
        companyId: 1,
        projectId: 1
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockTools
      });
    });

    test('should filter by category and status', async () => {
      req.params.projectId = '1';
      req.query.category = 'power_tools';
      req.query.status = 'available';
      
      const mockEmployee = { id: 1, fullName: 'John Doe' };
      Employee.findOne.mockResolvedValue(mockEmployee);

      Tool.find.mockResolvedValue([]);

      await getProjectTools(req, res);

      expect(Tool.find).toHaveBeenCalledWith({
        companyId: 1,
        projectId: 1,
        category: 'power_tools',
        status: 'available'
      });
    });
  });

  describe('getProjectMaterials', () => {
    test('should return materials for specific project', async () => {
      req.params.projectId = '1';
      
      const mockEmployee = { id: 1, fullName: 'John Doe' };
      Employee.findOne.mockResolvedValue(mockEmployee);

      const mockMaterials = [
        { id: 10, name: 'Ceiling Panels', category: 'finishing' }
      ];
      Material.find.mockResolvedValue(mockMaterials);

      await getProjectMaterials(req, res);

      expect(Material.find).toHaveBeenCalledWith({
        companyId: 1,
        projectId: 1
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockMaterials
      });
    });

    test('should filter by category and status', async () => {
      req.params.projectId = '1';
      req.query.category = 'finishing';
      req.query.status = 'allocated';
      
      const mockEmployee = { id: 1, fullName: 'John Doe' };
      Employee.findOne.mockResolvedValue(mockEmployee);

      Material.find.mockResolvedValue([]);

      await getProjectMaterials(req, res);

      expect(Material.find).toHaveBeenCalledWith({
        companyId: 1,
        projectId: 1,
        category: 'finishing',
        status: 'allocated'
      });
    });
  });
});
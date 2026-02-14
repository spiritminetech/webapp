import mongoose from 'mongoose';
import Tool from './Tool.js';

describe('Tool Model', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/test_db', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Tool.deleteMany({});
  });

  test('should create a tool with required fields', async () => {
    const toolData = {
      id: 1,
      companyId: 1,
      projectId: 1,
      name: 'Drill',
      quantity: 2,
      unit: 'pieces'
    };

    const tool = new Tool(toolData);
    const savedTool = await tool.save();

    expect(savedTool.id).toBe(1);
    expect(savedTool.companyId).toBe(1);
    expect(savedTool.projectId).toBe(1);
    expect(savedTool.name).toBe('Drill');
    expect(savedTool.quantity).toBe(2);
    expect(savedTool.unit).toBe('pieces');
    expect(savedTool.category).toBe('other'); // default value
    expect(savedTool.allocated).toBe(false); // default value
    expect(savedTool.condition).toBe('good'); // default value
    expect(savedTool.status).toBe('available'); // default value
  });

  test('should validate required fields', async () => {
    const tool = new Tool({});
    
    let error;
    try {
      await tool.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.id).toBeDefined();
    expect(error.errors.companyId).toBeDefined();
    expect(error.errors.projectId).toBeDefined();
    expect(error.errors.name).toBeDefined();
    expect(error.errors.quantity).toBeDefined();
  });

  test('should accept valid categories', async () => {
    const validCategories = ['power_tools', 'hand_tools', 'safety_equipment', 'measuring_tools', 'other'];
    
    for (const category of validCategories) {
      const tool = new Tool({
        id: Math.floor(Math.random() * 1000),
        companyId: 1,
        projectId: 1,
        name: `Test Tool ${category}`,
        category: category,
        quantity: 1,
        unit: 'pieces'
      });

      const savedTool = await tool.save();
      expect(savedTool.category).toBe(category);
    }
  });

  test('should accept valid conditions', async () => {
    const validConditions = ['excellent', 'good', 'fair', 'poor', 'needs_repair'];
    
    for (const condition of validConditions) {
      const tool = new Tool({
        id: Math.floor(Math.random() * 1000),
        companyId: 1,
        projectId: 1,
        name: `Test Tool ${condition}`,
        condition: condition,
        quantity: 1,
        unit: 'pieces'
      });

      const savedTool = await tool.save();
      expect(savedTool.condition).toBe(condition);
    }
  });

  test('should accept valid statuses', async () => {
    const validStatuses = ['available', 'in_use', 'maintenance', 'damaged', 'lost'];
    
    for (const status of validStatuses) {
      const tool = new Tool({
        id: Math.floor(Math.random() * 1000),
        companyId: 1,
        projectId: 1,
        name: `Test Tool ${status}`,
        status: status,
        quantity: 1,
        unit: 'pieces'
      });

      const savedTool = await tool.save();
      expect(savedTool.status).toBe(status);
    }
  });

  test('should enforce unique id constraint', async () => {
    const toolData = {
      id: 1,
      companyId: 1,
      projectId: 1,
      name: 'Drill',
      quantity: 2,
      unit: 'pieces'
    };

    const tool1 = new Tool(toolData);
    await tool1.save();

    const tool2 = new Tool(toolData);
    
    let error;
    try {
      await tool2.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.code).toBe(11000); // MongoDB duplicate key error
  });

  test('should validate minimum quantity', async () => {
    const tool = new Tool({
      id: 1,
      companyId: 1,
      projectId: 1,
      name: 'Test Tool',
      quantity: -1,
      unit: 'pieces'
    });

    let error;
    try {
      await tool.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.quantity).toBeDefined();
  });
});
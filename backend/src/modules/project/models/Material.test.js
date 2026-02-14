import mongoose from 'mongoose';
import Material from './Material.js';

describe('Material Model', () => {
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
    await Material.deleteMany({});
  });

  test('should create a material with required fields', async () => {
    const materialData = {
      id: 1,
      companyId: 1,
      projectId: 1,
      name: 'Ceiling Panels',
      quantity: 50,
      unit: 'pieces'
    };

    const material = new Material(materialData);
    const savedMaterial = await material.save();

    expect(savedMaterial.id).toBe(1);
    expect(savedMaterial.companyId).toBe(1);
    expect(savedMaterial.projectId).toBe(1);
    expect(savedMaterial.name).toBe('Ceiling Panels');
    expect(savedMaterial.quantity).toBe(50);
    expect(savedMaterial.unit).toBe('pieces');
    expect(savedMaterial.category).toBe('other'); // default value
    expect(savedMaterial.allocated).toBe(0); // default value
    expect(savedMaterial.used).toBe(0); // default value
    expect(savedMaterial.remaining).toBe(0); // calculated value
    expect(savedMaterial.status).toBe('available'); // default value
  });

  test('should calculate remaining quantity correctly', async () => {
    const material = new Material({
      id: 1,
      companyId: 1,
      projectId: 1,
      name: 'Test Material',
      quantity: 100,
      unit: 'pieces',
      allocated: 80,
      used: 30
    });

    const savedMaterial = await material.save();
    expect(savedMaterial.remaining).toBe(50); // 80 - 30 = 50
  });

  test('should update remaining quantity on save', async () => {
    const material = new Material({
      id: 1,
      companyId: 1,
      projectId: 1,
      name: 'Test Material',
      quantity: 100,
      unit: 'pieces',
      allocated: 80,
      used: 30
    });

    await material.save();
    expect(material.remaining).toBe(50);

    // Update used quantity
    material.used = 40;
    await material.save();
    expect(material.remaining).toBe(40); // 80 - 40 = 40
  });

  test('should validate required fields', async () => {
    const material = new Material({});
    
    let error;
    try {
      await material.save();
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
    const validCategories = ['concrete', 'steel', 'wood', 'electrical', 'plumbing', 'finishing', 'hardware', 'other'];
    
    for (const category of validCategories) {
      const material = new Material({
        id: Math.floor(Math.random() * 1000),
        companyId: 1,
        projectId: 1,
        name: `Test Material ${category}`,
        category: category,
        quantity: 1,
        unit: 'pieces'
      });

      const savedMaterial = await material.save();
      expect(savedMaterial.category).toBe(category);
    }
  });

  test('should accept valid statuses', async () => {
    const validStatuses = ['available', 'allocated', 'consumed', 'damaged', 'expired'];
    
    for (const status of validStatuses) {
      const material = new Material({
        id: Math.floor(Math.random() * 1000),
        companyId: 1,
        projectId: 1,
        name: `Test Material ${status}`,
        status: status,
        quantity: 1,
        unit: 'pieces'
      });

      const savedMaterial = await material.save();
      expect(savedMaterial.status).toBe(status);
    }
  });

  test('should enforce unique id constraint', async () => {
    const materialData = {
      id: 1,
      companyId: 1,
      projectId: 1,
      name: 'Test Material',
      quantity: 50,
      unit: 'pieces'
    };

    const material1 = new Material(materialData);
    await material1.save();

    const material2 = new Material(materialData);
    
    let error;
    try {
      await material2.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.code).toBe(11000); // MongoDB duplicate key error
  });

  test('should validate minimum quantities', async () => {
    const material = new Material({
      id: 1,
      companyId: 1,
      projectId: 1,
      name: 'Test Material',
      quantity: -1,
      unit: 'pieces'
    });

    let error;
    try {
      await material.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.quantity).toBeDefined();
  });

  test('should validate minimum allocated and used quantities', async () => {
    const material = new Material({
      id: 1,
      companyId: 1,
      projectId: 1,
      name: 'Test Material',
      quantity: 100,
      unit: 'pieces',
      allocated: -5,
      used: -3
    });

    let error;
    try {
      await material.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.allocated).toBeDefined();
    expect(error.errors.used).toBeDefined();
  });
});
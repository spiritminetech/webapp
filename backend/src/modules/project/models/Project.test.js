import mongoose from 'mongoose';
import Project from './Project.js';

describe('Project Model', () => {
  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test_db';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Clean up and close connection
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear the projects collection before each test
    await Project.deleteMany({});
  });

  describe('Geofence Structure', () => {
    it('should create a project with valid geofence structure', async () => {
      const projectData = {
        id: 1,
        companyId: 1,
        projectCode: 'TEST-001',
        projectName: 'Test Project',
        geofence: {
          center: {
            latitude: 40.7128,
            longitude: -74.0060
          },
          radius: 150,
          strictMode: true,
          allowedVariance: 15
        }
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject.geofence).toBeDefined();
      expect(savedProject.geofence.center.latitude).toBe(40.7128);
      expect(savedProject.geofence.center.longitude).toBe(-74.0060);
      expect(savedProject.geofence.radius).toBe(150);
      expect(savedProject.geofence.strictMode).toBe(true);
      expect(savedProject.geofence.allowedVariance).toBe(15);
    });

    it('should use default values for geofence fields when not provided', async () => {
      const projectData = {
        id: 2,
        companyId: 1,
        projectCode: 'TEST-002',
        projectName: 'Test Project 2',
        geofence: {
          center: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        }
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject.geofence.radius).toBe(100); // Default value
      expect(savedProject.geofence.strictMode).toBe(true); // Default value
      expect(savedProject.geofence.allowedVariance).toBe(10); // Default value
    });

    it('should require latitude and longitude in geofence center', async () => {
      const projectData = {
        id: 3,
        companyId: 1,
        projectCode: 'TEST-003',
        projectName: 'Test Project 3',
        geofence: {
          center: {
            latitude: 40.7128
            // Missing longitude
          }
        }
      };

      const project = new Project(projectData);
      
      await expect(project.save()).rejects.toThrow();
    });

    it('should allow project creation without geofence structure', async () => {
      const projectData = {
        id: 4,
        companyId: 1,
        projectCode: 'TEST-004',
        projectName: 'Test Project 4'
        // No geofence structure
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject.geofence).toBeUndefined();
      expect(savedProject.projectName).toBe('Test Project 4');
    });

    it('should maintain backward compatibility with existing latitude/longitude fields', async () => {
      const projectData = {
        id: 5,
        companyId: 1,
        projectCode: 'TEST-005',
        projectName: 'Test Project 5',
        latitude: 40.7128,
        longitude: -74.0060,
        geofenceRadius: 200,
        geofence: {
          center: {
            latitude: 40.7130, // Slightly different from legacy fields
            longitude: -74.0058
          },
          radius: 150
        }
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      // Both old and new fields should be preserved
      expect(savedProject.latitude).toBe(40.7128);
      expect(savedProject.longitude).toBe(-74.0060);
      expect(savedProject.geofenceRadius).toBe(200);
      expect(savedProject.geofence.center.latitude).toBe(40.7130);
      expect(savedProject.geofence.center.longitude).toBe(-74.0058);
      expect(savedProject.geofence.radius).toBe(150);
    });
  });

  describe('Work Areas Structure', () => {
    it('should create a project with work areas', async () => {
      const projectData = {
        id: 6,
        companyId: 1,
        projectCode: 'TEST-006',
        projectName: 'Test Project with Work Areas',
        geofence: {
          center: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        },
        workAreas: [
          {
            name: 'Zone A Construction',
            zone: 'A',
            floor: 'Floor 3',
            description: 'Main construction area for ceiling installation',
            coordinates: {
              latitude: 40.7130,
              longitude: -74.0058
            }
          },
          {
            name: 'Zone B Electrical',
            zone: 'B',
            floor: 'Floor 2',
            description: 'Electrical work area',
            coordinates: {
              latitude: 40.7125,
              longitude: -74.0062
            }
          }
        ]
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject.workAreas).toBeDefined();
      expect(savedProject.workAreas).toHaveLength(2);
      
      const zoneA = savedProject.workAreas[0];
      expect(zoneA.name).toBe('Zone A Construction');
      expect(zoneA.zone).toBe('A');
      expect(zoneA.floor).toBe('Floor 3');
      expect(zoneA.description).toBe('Main construction area for ceiling installation');
      expect(zoneA.coordinates.latitude).toBe(40.7130);
      expect(zoneA.coordinates.longitude).toBe(-74.0058);

      const zoneB = savedProject.workAreas[1];
      expect(zoneB.name).toBe('Zone B Electrical');
      expect(zoneB.zone).toBe('B');
      expect(zoneB.floor).toBe('Floor 2');
      expect(zoneB.description).toBe('Electrical work area');
      expect(zoneB.coordinates.latitude).toBe(40.7125);
      expect(zoneB.coordinates.longitude).toBe(-74.0062);
    });

    it('should allow project creation with empty work areas array', async () => {
      const projectData = {
        id: 7,
        companyId: 1,
        projectCode: 'TEST-007',
        projectName: 'Test Project with Empty Work Areas',
        geofence: {
          center: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        },
        workAreas: []
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject.workAreas).toBeDefined();
      expect(savedProject.workAreas).toHaveLength(0);
    });

    it('should allow project creation without work areas field', async () => {
      const projectData = {
        id: 8,
        companyId: 1,
        projectCode: 'TEST-008',
        projectName: 'Test Project without Work Areas',
        geofence: {
          center: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        }
        // No workAreas field
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject.workAreas).toBeUndefined();
      expect(savedProject.projectName).toBe('Test Project without Work Areas');
    });

    it('should allow work areas with partial data', async () => {
      const projectData = {
        id: 9,
        companyId: 1,
        projectCode: 'TEST-009',
        projectName: 'Test Project with Partial Work Areas',
        geofence: {
          center: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        },
        workAreas: [
          {
            name: 'Zone C',
            zone: 'C'
            // Missing floor, description, and coordinates
          },
          {
            name: 'Zone D',
            zone: 'D',
            floor: 'Floor 1',
            coordinates: {
              latitude: 40.7120
              // Missing longitude
            }
          }
        ]
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject.workAreas).toHaveLength(2);
      expect(savedProject.workAreas[0].name).toBe('Zone C');
      expect(savedProject.workAreas[0].zone).toBe('C');
      expect(savedProject.workAreas[0].floor).toBeUndefined();
      expect(savedProject.workAreas[0].description).toBeUndefined();
      expect(savedProject.workAreas[0].coordinates).toBeUndefined();

      expect(savedProject.workAreas[1].name).toBe('Zone D');
      expect(savedProject.workAreas[1].coordinates.latitude).toBe(40.7120);
      expect(savedProject.workAreas[1].coordinates.longitude).toBeUndefined();
    });
  });
});
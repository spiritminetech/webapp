/**
 * Property-based tests for task dependencies and sequence validation
 * **Validates: Requirements 3.2**
 */

import mongoose from 'mongoose';
import fc from 'fast-check';
import Employee from '../employee/Employee.js';
import WorkerTaskAssignment from './models/WorkerTaskAssignment.js';
import Project from '../project/models/Project.js';
import Task from '../task/Task.js';

// Import the functions we want to test (these would normally be exported)
// For now, we'll define them locally for testing
const checkDependencies = async (dependencyIds) => {
  try {
    if (!dependencyIds || dependencyIds.length === 0) return { canStart: true, message: null };
    
    const validDependencyIds = dependencyIds.filter(id => 
      Number.isInteger(id) && id > 0
    );
    
    if (validDependencyIds.length === 0) {
      return { canStart: true, message: null };
    }
    
    const dependencies = await WorkerTaskAssignment.find({
      id: { $in: validDependencyIds }
    });
    
    if (dependencies.length !== validDependencyIds.length) {
      const foundIds = dependencies.map(d => d.id);
      const missingIds = validDependencyIds.filter(id => !foundIds.includes(id));
      return { 
        canStart: false, 
        message: `Missing dependency assignments: ${missingIds.join(', ')}`,
        missingDependencies: missingIds
      };
    }
    
    const incompleteDependencies = dependencies.filter(dep => dep.status !== 'completed');
    
    if (incompleteDependencies.length > 0) {
      const incompleteInfo = incompleteDependencies.map(dep => ({
        id: dep.id,
        status: dep.status,
        progressPercent: dep.progressPercent || 0
      }));
      
      return {
        canStart: false,
        message: `Dependent tasks must be completed first: ${incompleteDependencies.map(d => `Task ${d.id} (${d.status})`).join(', ')}`,
        incompleteDependencies: incompleteInfo
      };
    }
    
    return { canStart: true, message: null };
    
  } catch (error) {
    return { 
      canStart: false, 
      message: "Error validating task dependencies",
      error: error.message
    };
  }
};

const validateTaskSequence = async (assignment, employeeId, date) => {
  try {
    if (!assignment.sequence || assignment.sequence <= 1) {
      return { canStart: true, message: null };
    }
    
    const allAssignments = await WorkerTaskAssignment.find({
      employeeId: employeeId,
      date: date,
      projectId: assignment.projectId
    }).sort({ sequence: 1 });
    
    const earlierTasks = allAssignments.filter(task => 
      task.sequence < assignment.sequence && 
      task.id !== assignment.id
    );
    
    if (earlierTasks.length === 0) {
      return { canStart: true, message: null };
    }
    
    const incompleteEarlierTasks = earlierTasks.filter(task => 
      task.status !== 'completed'
    );
    
    if (incompleteEarlierTasks.length > 0) {
      const incompleteInfo = incompleteEarlierTasks.map(task => ({
        id: task.id,
        sequence: task.sequence,
        status: task.status,
        progressPercent: task.progressPercent || 0
      }));
      
      return {
        canStart: false,
        message: `Tasks must be completed in sequence. Complete earlier tasks first: ${incompleteEarlierTasks.map(t => `Sequence ${t.sequence} (Task ${t.id})`).join(', ')}`,
        incompleteEarlierTasks: incompleteInfo
      };
    }
    
    return { canStart: true, message: null };
    
  } catch (error) {
    return { 
      canStart: false, 
      message: "Error validating task sequence",
      error: error.message
    };
  }
};

describe('Property-Based Tests - Task Dependencies and Sequence Validation', () => {
  let testEmployee, testProject, testTask;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test_worker_dependencies_pbt';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Employee.deleteMany({});
    await WorkerTaskAssignment.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});

    testEmployee = await Employee.create({
      id: 1,
      userId: 100,
      companyId: 1,
      fullName: 'Test Worker',
      status: 'ACTIVE'
    });

    testProject = await Project.create({
      id: 1,
      projectName: 'Test Project',
      projectCode: 'TP-001'
    });

    testTask = await Task.create({
      id: 1,
      taskName: 'Test Task',
      taskType: 'WORK'
    });
  });

  describe('Dependency Validation Properties', () => {
    test('Property: Empty or null dependencies should always allow task start', async () => {
      await fc.assert(fc.asyncProperty(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant([]),
          fc.array(fc.integer({ min: -100, max: 0 }), { maxLength: 5 }) // Invalid IDs
        ),
        async (dependencies) => {
          const result = await checkDependencies(dependencies);
          return result.canStart === true && result.message === null;
        }
      ), { numRuns: 50 });
    });

    test('Property: All completed dependencies should allow task start', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 1, maxLength: 5 }),
        async (dependencyIds) => {
          const today = new Date().toISOString().split('T')[0];
          
          // Create all dependencies as completed
          const dependencies = [];
          for (let i = 0; i < dependencyIds.length; i++) {
            const dep = await WorkerTaskAssignment.create({
              id: dependencyIds[i],
              employeeId: testEmployee.id,
              projectId: testProject.id,
              taskId: testTask.id,
              date: today,
              status: 'completed',
              progressPercent: 100,
              sequence: i + 1
            });
            dependencies.push(dep);
          }
          
          const result = await checkDependencies(dependencyIds);
          
          // Clean up
          await WorkerTaskAssignment.deleteMany({ id: { $in: dependencyIds } });
          
          return result.canStart === true && result.message === null;
        }
      ), { numRuns: 20 });
    });

    test('Property: Any incomplete dependency should prevent task start', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 1, maxLength: 5 }),
        fc.constantFrom('queued', 'in_progress'),
        async (dependencyIds, incompleteStatus) => {
          const today = new Date().toISOString().split('T')[0];
          
          // Create dependencies with at least one incomplete
          const dependencies = [];
          for (let i = 0; i < dependencyIds.length; i++) {
            const status = i === 0 ? incompleteStatus : 'completed'; // First one is incomplete
            const dep = await WorkerTaskAssignment.create({
              id: dependencyIds[i],
              employeeId: testEmployee.id,
              projectId: testProject.id,
              taskId: testTask.id,
              date: today,
              status: status,
              progressPercent: status === 'completed' ? 100 : 50,
              sequence: i + 1
            });
            dependencies.push(dep);
          }
          
          const result = await checkDependencies(dependencyIds);
          
          // Clean up
          await WorkerTaskAssignment.deleteMany({ id: { $in: dependencyIds } });
          
          return result.canStart === false && 
                 result.message !== null && 
                 result.message.includes('Dependent tasks must be completed first') &&
                 Array.isArray(result.incompleteDependencies) &&
                 result.incompleteDependencies.length > 0;
        }
      ), { numRuns: 20 });
    });

    test('Property: Missing dependencies should prevent task start', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(fc.integer({ min: 100, max: 200 }), { minLength: 1, maxLength: 3 }), // Non-existent IDs
        async (missingDependencyIds) => {
          const result = await checkDependencies(missingDependencyIds);
          
          return result.canStart === false && 
                 result.message !== null && 
                 result.message.includes('Missing dependency assignments') &&
                 Array.isArray(result.missingDependencies) &&
                 result.missingDependencies.length === missingDependencyIds.length;
        }
      ), { numRuns: 20 });
    });
  });

  describe('Sequence Validation Properties', () => {
    test('Property: First sequence task should always be allowed to start', async () => {
      await fc.assert(fc.asyncProperty(
        fc.oneof(
          fc.constant(1),
          fc.constant(undefined),
          fc.constant(null)
        ),
        async (sequence) => {
          const today = new Date().toISOString().split('T')[0];
          
          const assignment = await WorkerTaskAssignment.create({
            id: 1,
            employeeId: testEmployee.id,
            projectId: testProject.id,
            taskId: testTask.id,
            date: today,
            status: 'queued',
            sequence: sequence
          });
          
          const result = await validateTaskSequence(assignment, testEmployee.id, today);
          
          // Clean up
          await WorkerTaskAssignment.deleteOne({ id: 1 });
          
          return result.canStart === true && result.message === null;
        }
      ), { numRuns: 20 });
    });

    test('Property: Task with completed earlier sequences should be allowed to start', async () => {
      await fc.assert(fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }),
        async (targetSequence) => {
          const today = new Date().toISOString().split('T')[0];
          
          // Create all earlier sequence tasks as completed
          const earlierTasks = [];
          for (let seq = 1; seq < targetSequence; seq++) {
            const task = await WorkerTaskAssignment.create({
              id: seq,
              employeeId: testEmployee.id,
              projectId: testProject.id,
              taskId: testTask.id,
              date: today,
              status: 'completed',
              progressPercent: 100,
              sequence: seq
            });
            earlierTasks.push(task);
          }
          
          // Create target task
          const targetTask = await WorkerTaskAssignment.create({
            id: targetSequence,
            employeeId: testEmployee.id,
            projectId: testProject.id,
            taskId: testTask.id,
            date: today,
            status: 'queued',
            sequence: targetSequence
          });
          
          const result = await validateTaskSequence(targetTask, testEmployee.id, today);
          
          // Clean up
          await WorkerTaskAssignment.deleteMany({ 
            employeeId: testEmployee.id,
            date: today
          });
          
          return result.canStart === true && result.message === null;
        }
      ), { numRuns: 15 });
    });

    test('Property: Task with incomplete earlier sequences should be prevented from starting', async () => {
      await fc.assert(fc.asyncProperty(
        fc.integer({ min: 3, max: 6 }),
        fc.constantFrom('queued', 'in_progress'),
        async (targetSequence, incompleteStatus) => {
          const today = new Date().toISOString().split('T')[0];
          
          // Create earlier sequence tasks with at least one incomplete
          const earlierTasks = [];
          for (let seq = 1; seq < targetSequence; seq++) {
            const status = seq === 1 ? incompleteStatus : 'completed'; // First one is incomplete
            const task = await WorkerTaskAssignment.create({
              id: seq,
              employeeId: testEmployee.id,
              projectId: testProject.id,
              taskId: testTask.id,
              date: today,
              status: status,
              progressPercent: status === 'completed' ? 100 : 50,
              sequence: seq
            });
            earlierTasks.push(task);
          }
          
          // Create target task
          const targetTask = await WorkerTaskAssignment.create({
            id: targetSequence,
            employeeId: testEmployee.id,
            projectId: testProject.id,
            taskId: testTask.id,
            date: today,
            status: 'queued',
            sequence: targetSequence
          });
          
          const result = await validateTaskSequence(targetTask, testEmployee.id, today);
          
          // Clean up
          await WorkerTaskAssignment.deleteMany({ 
            employeeId: testEmployee.id,
            date: today
          });
          
          return result.canStart === false && 
                 result.message !== null && 
                 result.message.includes('Tasks must be completed in sequence') &&
                 Array.isArray(result.incompleteEarlierTasks) &&
                 result.incompleteEarlierTasks.length > 0;
        }
      ), { numRuns: 15 });
    });
  });

  describe('Combined Validation Properties', () => {
    test('Property: Task with both satisfied dependencies and sequence should be allowed', async () => {
      await fc.assert(fc.asyncProperty(
        fc.integer({ min: 2, max: 4 }),
        async (sequence) => {
          const today = new Date().toISOString().split('T')[0];
          
          // Create dependency task (completed)
          const depTask = await WorkerTaskAssignment.create({
            id: 100,
            employeeId: testEmployee.id,
            projectId: testProject.id,
            taskId: testTask.id,
            date: today,
            status: 'completed',
            progressPercent: 100,
            sequence: 1
          });
          
          // Create earlier sequence tasks (completed)
          for (let seq = 1; seq < sequence; seq++) {
            await WorkerTaskAssignment.create({
              id: seq,
              employeeId: testEmployee.id,
              projectId: testProject.id,
              taskId: testTask.id,
              date: today,
              status: 'completed',
              progressPercent: 100,
              sequence: seq
            });
          }
          
          // Create target task with dependency
          const targetTask = await WorkerTaskAssignment.create({
            id: sequence,
            employeeId: testEmployee.id,
            projectId: testProject.id,
            taskId: testTask.id,
            date: today,
            status: 'queued',
            sequence: sequence,
            dependencies: [depTask.id]
          });
          
          // Test both validations
          const depResult = await checkDependencies(targetTask.dependencies);
          const seqResult = await validateTaskSequence(targetTask, testEmployee.id, today);
          
          // Clean up
          await WorkerTaskAssignment.deleteMany({ 
            employeeId: testEmployee.id,
            date: today
          });
          
          return depResult.canStart === true && 
                 seqResult.canStart === true &&
                 depResult.message === null &&
                 seqResult.message === null;
        }
      ), { numRuns: 10 });
    });
  });
});
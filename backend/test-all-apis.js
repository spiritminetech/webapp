import mongoose from 'mongoose';
import appConfig from './src/config/app.config.js';
import supervisorDashboardService from './src/modules/supervisor/supervisorDashboardService.js';
import alertService from './src/modules/supervisor/alertService.js';
import WorkerTaskAssignment from './src/modules/worker/models/WorkerTaskAssignment.js';

/**
 * Test all supervisor APIs to verify they return correct data
 */

// Connect to MongoDB
mongoose.connect(appConfig.database.uri, { 
  dbName: appConfig.database.name,
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  testAllAPIs();
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function testAllAPIs() {
  try {
    console.log('🧪 Testing All Supervisor APIs...\n');

    const supervisorId = 4;
    const todayDateString = new Date().toISOString().split('T')[0];

    // Test 1: Projects API
    console.log('1️⃣ Testing Projects API...');
    const projects = await supervisorDashboardService.getAssignedProjects(supervisorId);
    console.log(`   Found ${projects.length} projects`);
    
    // Add worker counts to projects
    const projectsWithWorkerCounts = await Promise.all(
      projects.map(async (project) => {
        const workerCount = await WorkerTaskAssignment.countDocuments({
          projectId: project.id,
          date: todayDateString
        });
        
        return {
          ...project.toObject(),
          workerCount
        };
      })
    );
    
    console.log('   Projects with worker counts:');
    projectsWithWorkerCounts.forEach(p => {
      console.log(`     - ${p.projectName} (ID: ${p.id}): ${p.workerCount} workers`);
    });

    // Test 2: Alerts API
    console.log('\n2️⃣ Testing Alerts API...');
    const alerts = await alertService.getAlertsForSupervisor(supervisorId, { isRead: false });
    console.log(`   Found ${alerts.length} unread alerts`);
    
    if (alerts.length > 0) {
      console.log('   Alert summary:');
      const priorityCounts = alerts.reduce((acc, alert) => {
        acc[alert.priority] = (acc[alert.priority] || 0) + 1;
        return acc;
      }, {});
      console.log(`     - Critical: ${priorityCounts.critical || 0}`);
      console.log(`     - Warning: ${priorityCounts.warning || 0}`);
      console.log(`     - Info: ${priorityCounts.info || 0}`);
    }

    // Test 3: Workforce Count API
    console.log('\n3️⃣ Testing Workforce Count API...');
    const projectIds = projects.map(p => p.id);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const workforceData = await supervisorDashboardService.getWorkforceCount(projectIds, todayStart, todayEnd);
    console.log('   Workforce count:', workforceData);

    // Test 4: Complete Dashboard API
    console.log('\n4️⃣ Testing Complete Dashboard API...');
    const dashboardData = await supervisorDashboardService.getDashboardData(supervisorId);
    
    console.log('   Dashboard summary:');
    console.log(`     - Projects: ${dashboardData.projects.length}`);
    console.log(`     - Alerts: ${dashboardData.alerts.total}`);
    console.log(`     - Workforce Total: ${dashboardData.workforceCount.total}`);

    // Create the exact response format that the HTTP API should return
    console.log('\n📡 Expected HTTP API Response Format:');
    const httpResponse = {
      success: true,
      data: {
        projects: projectsWithWorkerCounts,
        alerts: alerts,
        workforceCount: workforceData,
        pendingApprovals: dashboardData.pendingApprovals || { total: 0, items: [] },
        attendanceRecords: dashboardData.attendanceRecords || []
      }
    };
    
    console.log('Projects API should return:');
    console.log(JSON.stringify({ success: true, data: projectsWithWorkerCounts }, null, 2));
    
    console.log('\nAlerts API should return:');
    console.log(JSON.stringify({ success: true, alerts: alerts }, null, 2));

  } catch (error) {
    console.error('❌ Error testing APIs:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️ Process interrupted');
  mongoose.connection.close();
  process.exit(0);
});
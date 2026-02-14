import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = 'http://localhost:5001/api';

const testTasksTodayAPI = async () => {
  try {
    console.log('🔍 Testing Tasks Today API with authentication...\n');

    // Step 1: Login to get token
    console.log('1️⃣ Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'testworker@company.com',
        password: 'password123'
      })
    });

    const loginData = await loginResponse.json();

    if (!loginData.success) {
      console.error('❌ Login failed:', loginData.message);
      return;
    }

    console.log('✅ Login successful');
    const token = loginData.token;

    // Step 2: Test the tasks today API
    console.log('\n2️⃣ Fetching today\'s tasks...');
    const tasksResponse = await fetch(`${BASE_URL}/worker/tasks/today`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const tasksData = await tasksResponse.json();

    console.log('✅ Tasks API Response:');
    console.log('   Success:', tasksData.success);
    
    if (tasksData.success && tasksData.data) {
      const { project, supervisor, tasks, dailySummary } = tasksData.data;
      
      console.log('\n📋 Project Info:');
      console.log(`   Name: ${project?.name}`);
      console.log(`   Code: ${project?.code}`);
      console.log(`   Location: ${project?.location}`);
      
      console.log('\n👤 Supervisor:');
      console.log(`   Name: ${supervisor?.name}`);
      console.log(`   Phone: ${supervisor?.phone}`);
      
      console.log('\n📝 Tasks:');
      if (tasks && tasks.length > 0) {
        tasks.forEach((task, index) => {
          console.log(`   Task ${index + 1}:`);
          console.log(`     Name: ${task.taskName}`);
          console.log(`     Status: ${task.status}`);
          console.log(`     Progress: ${task.progress?.percentage || 0}%`);
          console.log(`     Work Area: ${task.workArea}`);
          console.log(`     Can Start: ${task.canStart}`);
          console.log('');
        });
      } else {
        console.log('   No tasks found');
      }
      
      console.log('📊 Daily Summary:');
      if (dailySummary) {
        console.log(`   Total Tasks: ${dailySummary.totalTasks}`);
        console.log(`   Completed: ${dailySummary.completedTasks}`);
        console.log(`   In Progress: ${dailySummary.inProgressTasks}`);
        console.log(`   Hours Worked: ${dailySummary.totalHoursWorked}`);
      }
    } else {
      console.log('   Error:', tasksData.message);
    }

  } catch (error) {
    console.error('❌ Error testing tasks API:', error.message);
  }
};

// Run the test
testTasksTodayAPI();
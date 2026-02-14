// Test script to debug worker login flow
// Run this in browser console to check the current state

console.log("=== WORKER LOGIN DEBUG ===");

// Check current URL
console.log("1. Current URL:", window.location.href);

// Check localStorage
console.log("2. LocalStorage Data:");
console.log("- token:", localStorage.getItem('token'));
console.log("- user:", JSON.parse(localStorage.getItem('user') || 'null'));
console.log("- currentProject:", JSON.parse(localStorage.getItem('currentProject') || 'null'));

// Check if user is a worker
const user = JSON.parse(localStorage.getItem('user') || 'null');
if (user) {
  console.log("3. User Role Check:");
  console.log("- User exists:", !!user);
  console.log("- User role:", user.company?.role || 'No role found');
  console.log("- Is Worker:", user.company?.role === 'WORKER');
}

// Check token payload
const token = localStorage.getItem('token');
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log("4. Token Payload:");
    console.log("- Role:", payload.role);
    console.log("- Permissions:", payload.permissions);
    console.log("- Has WORKER_TASK_VIEW:", payload.permissions?.includes('WORKER_TASK_VIEW'));
  } catch (e) {
    console.log("4. Token Payload: Failed to decode", e);
  }
}

// Instructions
console.log("\n5. Next Steps:");
console.log("- If you're on /worker/tasks but should be on /worker/project-selection:");
console.log("  1. Clear currentProject: localStorage.removeItem('currentProject')");
console.log("  2. Navigate to project selection: window.location.href = '/worker/project-selection'");
console.log("- If you're stuck in a redirect loop, check browser Network tab for redirects");

console.log("=== END DEBUG ===");
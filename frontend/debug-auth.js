// Debug script to test authentication flow
// Run this in browser console after login

console.log("=== AUTH DEBUG ===");

// Check localStorage
console.log("1. LocalStorage Data:");
console.log("- token:", localStorage.getItem('token'));
console.log("- user:", JSON.parse(localStorage.getItem('user') || 'null'));
console.log("- currentProject:", JSON.parse(localStorage.getItem('currentProject') || 'null'));

// Check token payload
const token = localStorage.getItem('token');
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log("2. Token Payload:");
    console.log(payload);
  } catch (e) {
    console.log("2. Token Payload: Failed to decode", e);
  }
}

// Check AuthContext (if available)
if (window.React && window.React.useContext) {
  console.log("3. AuthContext would need to be checked in component");
} else {
  console.log("3. AuthContext: Not accessible from console");
}

console.log("=== END DEBUG ===");
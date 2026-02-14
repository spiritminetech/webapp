import React from 'react';

const SimpleTasksPage = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>My Tasks</h1>
      <p>Welcome to the tasks page!</p>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Today's Tasks</h2>
        <div style={{ 
          border: '1px solid #ddd', 
          padding: '15px', 
          borderRadius: '8px',
          marginBottom: '10px'
        }}>
          <h3>Sample Task 1</h3>
          <p>Description: Complete project documentation</p>
          <p>Status: In Progress</p>
        </div>
        
        <div style={{ 
          border: '1px solid #ddd', 
          padding: '15px', 
          borderRadius: '8px',
          marginBottom: '10px'
        }}>
          <h3>Sample Task 2</h3>
          <p>Description: Review code changes</p>
          <p>Status: Pending</p>
        </div>
      </div>
      
      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <p><strong>Debug Info:</strong></p>
        <p>Current URL: {window.location.pathname}</p>
        <p>Component: SimpleTasksPage</p>
        <p>This page is rendering correctly!</p>
      </div>
    </div>
  );
};

export default SimpleTasksPage;
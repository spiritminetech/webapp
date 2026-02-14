// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import PermissionRoute from "./components/guards/PermissionRoute";

// Pages
import Login from "./pages/login/Login.js";
import Tasks from "./pages/driver/Tasks.js";
import TaskDetails from "./pages/driver/TaskDetails";
import PickupConfirmation from "./pages/driver/pickupConfirmation";
import DropConfirmation from "./pages/driver/DropConfirmation";
import TripSummary from "./pages/driver/TripSummary";
import TripHistory from "./pages/driver/TripHistory.jsx";
import DriverProfile from "./pages/driver/DriverProfile";
import NotFound from "./pages/NotFound/NotFound.js";

import TodayTrip from "./pages/worker/TodayTrip";
import TaskDetailsScreen from "./pages/worker/TaskDetailsScreen";
import DashboardContainer from "./pages/worker/dashboard/DashboardContainer";

import GeoFenceAttendance from "./pages/attendance/GeoFenceAttendance";
import AttendanceHistory from "./pages/attendance/AttendanceHistory";

import SupervisorDashboard from "./pages/supervisor/SupervisorDashboard";
import TaskAssignmentScreen from "./pages/supervisor/TaskAssignmentScreen";
import WorkerTaskReviewToday from "./pages/supervisor/WorkerTaskReviewToday";
import SupervisorDailyProgress from "./pages/supervisor/SupervisorDailyProgress";


import LeaveRequestForm from './pages/worker/leave/LeaveRequestForm.jsx';
import PendingLeaveRequests from './pages/supervisor/PendingLeaveRequests.jsx';

// Layout components
import TopHeader from "./components/topheader/TopHeader.js";
import SideNav from "./components/sidenav/SideNav.js";
import Unauthorized from "./pages/unauthorized/Unauthorized.jsx";

import ProjectSelectionPage from "./pages/ProjectSelectionPage.jsx";

// Layout
function AppLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(true);

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);
  const closeSidebar = () => setSidebarCollapsed(true);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`${sidebarCollapsed ? "" : "opacity-70 bg-gray-800 bg-opacity-20"}`}>
        <TopHeader onToggleSidebar={toggleSidebar} />
      </div>
      <div className="p-4 flex">
        <SideNav collapsed={sidebarCollapsed} onClose={closeSidebar} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

// Routes Component
function AppRoutes() {
  const { user } = useAuth();

  return (
   <Routes key={location.pathname}>
  <Route path="/" element={<Navigate to="/login" replace />} />

  {/* Public Routes */}
  <Route path="/login" element={<Login />} />
  <Route path="/unauthorized" element={<Unauthorized />} />


      {/* Protected Routes */}


     <Route
        path="/driver/tasks"
        element={
          <PermissionRoute permission="DRIVER_TASK_VIEW">
            <AppLayout>
              <Tasks />
            </AppLayout>
          </PermissionRoute>
        }
      />

      <Route
        path="/driver/tasks/:taskId"
        element={
          <PermissionRoute permission="DRIVER_TASK_VIEW">
            <AppLayout>
              <TaskDetails />
            </AppLayout>
          </PermissionRoute>
        }
      />

      <Route
        path="/driver/tasks/:taskId/pickup"
        element={
          <PermissionRoute permission="DRIVER_TASK_VIEW">
            <AppLayout>
              <PickupConfirmation />
            </AppLayout>
          </PermissionRoute>
        }
      />

      <Route
        path="/driver/tasks/:taskId/drop"
        element={
          <PermissionRoute permission="DRIVER_TASK_VIEW">
            <AppLayout>
              <DropConfirmation />
            </AppLayout>
          </PermissionRoute>
        }
      />

      <Route
        path="/driver/tasks/:taskId/summary"
        element={
          <PermissionRoute permission="DRIVER_TASK_VIEW">
            <AppLayout>
              <TripSummary />
            </AppLayout>
          </PermissionRoute>
        }
      />

      <Route
        path="/driver/trip-history"
        element={
          <PermissionRoute permission="DRIVER_HISTORY_VIEW">
            <AppLayout>
              <TripHistory />
            </AppLayout>
          </PermissionRoute>
        }
      />

      <Route
  path="/worker/project-selection"
  element={
    <PermissionRoute permission="WORKER_TASK_VIEW">
      <AppLayout>
        <ProjectSelectionPage />
      </AppLayout>
    </PermissionRoute>
  }
/>

      {/* Worker */}
      <Route
        path="/worker/dashboard"
        element={
          <PermissionRoute permission="WORKER_TASK_VIEW">
            <AppLayout>
              <DashboardContainer key={location.pathname} />
            </AppLayout>
          </PermissionRoute>
        }
      />

      <Route
        path="/worker/tasks"
        element={
          <PermissionRoute permission="WORKER_TASK_VIEW">
            <AppLayout>
              <TaskDetailsScreen />
            </AppLayout>
          </PermissionRoute>
        }
      />

      {/* Redirect old routes for backward compatibility */}
      <Route
        path="/worker/my-task"
        element={<Navigate to="/worker/tasks" replace />}
      />
      
      <Route
        path="/worker/task-details"
        element={<Navigate to="/worker/tasks" replace />}
      />

      <Route
        path="/worker/task/:taskId/start"
        element={
          <PermissionRoute permission="WORKER_TASK_VIEW">
            <AppLayout>
              <TaskDetailsScreen />
            </AppLayout>
          </PermissionRoute>
        }
      />

      <Route
        path="/worker/task/:taskId/progress"
        element={
          <PermissionRoute permission="WORKER_TASK_VIEW">
            <AppLayout>
              <TaskDetailsScreen />
            </AppLayout>
          </PermissionRoute>
        }
      />

      <Route
        path="/worker/task/:taskId/photo"
        element={
          <PermissionRoute permission="WORKER_TASK_VIEW">
            <AppLayout>
              <TaskDetailsScreen />
            </AppLayout>
          </PermissionRoute>
        }
      />

      <Route
        path="/worker/task/:taskId/issue"
        element={
          <PermissionRoute permission="WORKER_TASK_VIEW">
            <AppLayout>
              <TaskDetailsScreen />
            </AppLayout>
          </PermissionRoute>
        }
      />

      <Route
        path="/worker/task/:taskId/details"
        element={
          <PermissionRoute permission="WORKER_TASK_VIEW">
            <AppLayout>
              <TaskDetailsScreen />
            </AppLayout>
          </PermissionRoute>
        }
      />

      <Route
        path="/worker/today-trip"
        element={
          <PermissionRoute permission="WORKER_TRIP_VIEW">
            <AppLayout>
              <TodayTrip />
            </AppLayout>
          </PermissionRoute>
        }
      />

      {/* Attendance */}
      <Route
        path="/attendance"
        element={
          <PermissionRoute permission="COMMON_ATTENDANCE_VIEW">
            <AppLayout>
              <GeoFenceAttendance />
            </AppLayout>
          </PermissionRoute>
        }
      />

      

      <Route
        path="/attendance/history"
        element={
          <PermissionRoute permission="COMMON_ATTENDANCE_VIEW">
            <AppLayout>
              <AttendanceHistory />
            </AppLayout>
          </PermissionRoute>
        }
      />

   

      {/* Supervisor */}
      <Route
        path="/supervisor/dashboard"
        element={
          <PermissionRoute permission="SUPERVISOR_DASHBOARD_VIEW">
            <AppLayout>
              <SupervisorDashboard />
            </AppLayout>
          </PermissionRoute>
        }
      />

      <Route
        path="/supervisor/tasks"
        element={
          <PermissionRoute permission="SUPERVISOR_TASK_ASSIGN">
            <AppLayout>
              <TaskAssignmentScreen />
            </AppLayout>
          </PermissionRoute>
        }
      />

      <Route
        path="/supervisor/review-tasks"
        element={
          <PermissionRoute permission="SUPERVISOR_TASK_REVIEW">
            <AppLayout>
              <WorkerTaskReviewToday />
            </AppLayout>
          </PermissionRoute>
        }
      />

      <Route
        path="/supervisor/daily-progress"
        element={
          <PermissionRoute permission="SUPERVISOR_PROGRESS_VIEW">
            <AppLayout>
              <SupervisorDailyProgress />
            </AppLayout>
          </PermissionRoute>
        }
      />

      {/* Profile */}
      <Route
        path="/profile"
        element={
          <PermissionRoute permission="PROFILE_VIEW">
            <AppLayout>
              <DriverProfile />
            </AppLayout>
          </PermissionRoute>
        }
      />

       <Route
        path="/leave/request"
        element={
          <PermissionRoute permission="LEAVE_REQUEST_VIEW">
            <AppLayout>
              <LeaveRequestForm />
            </AppLayout>
          </PermissionRoute>
        }
      />

       <Route
        path="/leave/pending/request"
        element={
          <PermissionRoute permission="LEAVE_PENDING_VIEW">
            <AppLayout>
              <PendingLeaveRequests />
            </AppLayout>
          </PermissionRoute>
        }
      />




 

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// Top-level App
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}



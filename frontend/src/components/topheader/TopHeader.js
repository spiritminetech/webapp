// TopHeader.jsx
import React, { useState, useEffect } from "react";
import { Dropdown, Avatar, Button } from "antd";
import { 
  MoonOutlined, 
  UserOutlined, 
  LogoutOutlined, 
  ReloadOutlined,
  WifiOutlined,
  DisconnectOutlined,
  HomeOutlined
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { SIDEBAR_CONFIG } from "../../config/sidebarConfig";

// ✅ Helper functions
const getAuthUser = () => {
  return JSON.parse(localStorage.getItem("user")) || null;
};

const logout = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  window.dispatchEvent(new Event("userDataUpdated"));
};

const TopHeader = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userData, setUserData] = useState(getAuthUser());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Listen to updates (e.g., login or company switch)
  useEffect(() => {
    const handleUpdate = () => setUserData(getAuthUser());
    window.addEventListener("userDataUpdated", handleUpdate);
    return () => window.removeEventListener("userDataUpdated", handleUpdate);
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 🔹 Determine current page label from sidebarConfig recursively
  const findLabel = (items, pathname) => {
    for (const item of items) {
      if (item.path === pathname) return item.label;
      if (item.children) {
        const label = findLabel(item.children, pathname);
        if (label) return label;
      }
    }
    return "";
  };

  const currentPage = findLabel(SIDEBAR_CONFIG, location.pathname);

  // Handle home navigation based on user role
  const handleHomeNavigation = () => {
    const userRole = userData?.role?.toLowerCase();
    
    if (userRole === 'worker') {
      navigate('/worker/tasks');
    } else if (userRole === 'supervisor') {
      navigate('/supervisor/dashboard');
    } else if (userRole === 'driver') {
      navigate('/driver/tasks');
    } else {
      // Default fallback - try to determine from current path
      if (location.pathname.startsWith('/worker/')) {
        navigate('/worker/tasks');
      } else if (location.pathname.startsWith('/supervisor/')) {
        navigate('/supervisor/dashboard');
      } else if (location.pathname.startsWith('/driver/')) {
        navigate('/driver/tasks');
      } else {
        // Ultimate fallback
        navigate('/worker/tasks');
      }
    }
  };

  // Handle refresh functionality for ALL pages
  const handleRefresh = () => {
    const currentPath = location.pathname;
    
    // Worker pages
    if (currentPath === '/worker/tasks') {
      window.dispatchEvent(new CustomEvent('refreshTasks'));
    } else if (currentPath === '/worker/today-trip') {
      window.dispatchEvent(new CustomEvent('refreshTodayTrip'));
    } else if (currentPath.includes('/worker/task/')) {
      window.dispatchEvent(new CustomEvent('refreshTaskDetails'));
    } 
    // Attendance pages
    else if (currentPath === '/attendance/geofence') {
      window.dispatchEvent(new CustomEvent('refreshAttendance'));
    } else if (currentPath === '/attendance/history') {
      window.dispatchEvent(new CustomEvent('refreshAttendanceHistory'));
    } 
    // Leave request pages
    else if (currentPath.includes('/leave')) {
      window.dispatchEvent(new CustomEvent('refreshLeaveRequest'));
    }
    // Supervisor pages
    else if (currentPath === '/supervisor/dashboard') {
      window.dispatchEvent(new CustomEvent('refreshSupervisorDashboard'));
    } else if (currentPath.includes('/supervisor/')) {
      window.dispatchEvent(new CustomEvent('refreshSupervisorPage'));
    }
    // Driver pages
    else if (currentPath === '/driver/tasks') {
      window.dispatchEvent(new CustomEvent('refreshDriverTasks'));
    } else if (currentPath.includes('/driver/')) {
      window.dispatchEvent(new CustomEvent('refreshDriverPage'));
    }
    // Project selection
    else if (currentPath === '/worker/project-selection') {
      window.dispatchEvent(new CustomEvent('refreshProjectSelection'));
    }
    // Generic pages - try custom event first, then reload
    else {
      // Try to dispatch a generic refresh event
      window.dispatchEvent(new CustomEvent('refreshPage'));
      
      // If no listener handles it, fall back to page reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  const userMenuItems = [
    {
      key: "user-info",
      label: (
        <div className="px-2 py-1 flex flex-col">
          <div className="flex items-center space-x-3 mb-1">
            <Avatar
              size="large"
              src={userData?.avatar}
              icon={!userData?.avatar && <UserOutlined />}
              className="border-2 border-gray-200"
            />
            <div className="flex flex-col">
              <span className="font-semibold">{userData?.role || "User"}</span>
              <span className="text-gray-500 text-sm">{userData?.company?.name || ""}</span>
            </div>
          </div>
          <div className="text-gray-500 text-sm">{userData?.email}</div>
        </div>
      ),
      disabled: true,
    },
    { type: "divider" },
    {
      key: "/profile",
      icon: <UserOutlined />,
      label: "Profile",
      onClick: () => navigate("/profile"),
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Sign Out",
      onClick: () => {
        logout();
        navigate("/login");
      },
    },
  ];

  const HamburgerIcon = () => (
    <div className="w-6 h-6 flex flex-col justify-between cursor-pointer">
      <div className="w-full h-0.5 bg-white rounded"></div>
      <div className="w-full h-0.5 bg-white rounded"></div>
      <div className="w-full h-0.5 bg-white rounded"></div>
    </div>
  );

  return (
    <header className="app-header bg-gradient-to-r from-blue-400 to-purple-500 px-4 sm:px-6 py-3 flex justify-between items-center shadow-md">
      {/* Left */}
      <div className="flex items-center space-x-3 sm:space-x-4 flex-1">
        <img src="/logo.jpg" alt="Logo" className="h-8 w-auto" />
        <div className="text-white text-lg font-bold hidden sm:block">ERP</div>
        <div
          onClick={onToggleSidebar}
          className="cursor-pointer p-2 hover:bg-blue-300 rounded-lg transition-colors"
        >
          <HamburgerIcon />
        </div>
      </div>

      {/* Center */}
      <div className="flex-1 flex justify-center">
        <div className="text-white text-lg font-semibold">
          {location.pathname === '/worker/tasks' ? "Today's Tasks" : 
           location.pathname.includes('/worker/task/') && location.pathname.includes('/details') ? 'Task Details' :
           location.pathname.includes('/worker/task/') && location.pathname.includes('/start') ? 'Start Task' :
           location.pathname.includes('/worker/task/') && location.pathname.includes('/progress') ? 'Update Progress' :
           location.pathname.includes('/worker/task/') && location.pathname.includes('/photo') ? 'Add Photos' :
           location.pathname.includes('/worker/task/') && location.pathname.includes('/issue') ? 'Report Issue' :
           location.pathname === '/worker/today-trip' ? 'Today Trip' :
           location.pathname === '/worker/project-selection' ? 'Select Project' :
           currentPage}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 justify-end">
        {/* Show home, wifi, and refresh icons for ALL pages (except login) */}
        {location.pathname !== '/login' && (
          <>
            <Button
              type="text"
              icon={<HomeOutlined />}
              className="text-white hover:bg-white hover:bg-opacity-20"
              onClick={() => handleHomeNavigation()}
              title="Go to Home"
            />
            <div className="text-white text-lg" title={isOnline ? "Online" : "Offline"}>
              {isOnline ? <WifiOutlined /> : <DisconnectOutlined />}
            </div>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              className="text-white hover:bg-white hover:bg-opacity-20"
              onClick={() => handleRefresh()}
              title="Refresh Page"
            />
          </>
        )}
        
        <Button
          type="text"
          icon={<MoonOutlined />}
          className="text-white hover:bg-white hover:bg-opacity-20 hidden sm:flex"
        />

        <Dropdown
          menu={{ items: userMenuItems }}
          placement="bottomRight"
          trigger={["click"]}
        >
          <div
            className="flex items-center cursor-pointer bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-1 transition-all"
            onClick={(e) => e.preventDefault()}
          >
            <Avatar
              size="default"
              src={userData?.avatar}
              icon={!userData?.avatar && <UserOutlined />}
              className="border-2 border-white"
            />
          </div>
        </Dropdown>
      </div>
    </header>
  );
};

export default TopHeader;



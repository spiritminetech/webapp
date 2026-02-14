import React, { useMemo, useState, useEffect } from "react";
import { Menu } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { SIDEBAR_CONFIG } from "../../config/sidebarConfig";
import { DoubleLeftOutlined, LogoutOutlined } from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";
import "./SideNav.css";

// ---------------- Helpers ----------------

const findItem = (items, key) => {
  for (const item of items) {
    if (item.key === key) return item;
    if (item.children) {
      const found = findItem(item.children, key);
      if (found) return found;
    }
  }
  return null;
};

const findOpenKeys = (items, path, parents = []) => {
  for (const item of items) {
    if (item.path && path.startsWith(item.path)) return parents;
    if (item.children) {
      const found = findOpenKeys(item.children, path, [...parents, item.key]);
      if (found.length) return found;
    }
  }
  return [];
};

const normalizePath = (path) => path.replace(/\/$/, "");

const SideNav = ({ collapsed, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, permissions = [] } = useAuth();

  console.log("SideNav - User:", user);
  console.log("SideNav - Permissions:", permissions);

  // ---------------- Permission Filtering ----------------

  const filterMenu = (items) =>
    items
      .filter((item) => {
        if (!item.permission) return true;         
        return permissions.includes(item.permission);
      })
      .map((item) => {
        const children = item.children ? filterMenu(item.children) : [];
        return {
          ...item,
          icon: item.icon ? React.createElement(item.icon) : null,
          children: children.length > 0 ? children : undefined,
        };
      })
      .filter((item) => !item.children || item.children.length > 0);

  const menuItems = useMemo(
    () => filterMenu(SIDEBAR_CONFIG),
    [permissions]
  );

  // ---------------- Open Keys ----------------

  const [openKeys, setOpenKeys] = useState(() =>
    findOpenKeys(menuItems, location.pathname)
  );

  useEffect(() => {
    setOpenKeys(findOpenKeys(menuItems, location.pathname));
  }, [location.pathname, menuItems]);

  // ---------------- Handlers ----------------

  const handleMenuClick = ({ key }) => {
    console.log('SideNav: Menu clicked', { key, currentPath: location.pathname });
    const clickedItem = findItem(menuItems, key);
    console.log('SideNav: Found item', clickedItem);
    
    if (!clickedItem?.path) {
      console.log('SideNav: No path found');
      return;
    }
    
    console.log('SideNav: Attempting navigation to', clickedItem.path);
    
    // Special handling for dashboard navigation issues
    if (location.pathname === '/worker/dashboard') {
      console.log('SideNav: Using window.location for dashboard navigation');
      window.location.href = clickedItem.path;
      return;
    }
    
    // Normal React Router navigation for other pages
    try {
      navigate(clickedItem.path);
      console.log('SideNav: React Router navigate called');
    } catch (error) {
      console.error('SideNav: React Router navigate failed', error);
      // Fallback to window.location
      window.location.href = clickedItem.path;
    }
    
    onClose?.();
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
    onClose?.();
  };

  // ---------------- Render ----------------

  return (
    <>
      {/* Backdrop overlay */}
      {!collapsed && (
        <div
          className="sidenav-overlay"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`sidenav-container ${!collapsed ? 'open' : ''}`}
      >
        {/* Header */}
        <div className="sidenav-header">
          <img src="/logo.jpg" alt="Logo" className="sidenav-logo" />
          <div className="sidenav-brand">
            <div className="sidenav-brand-title">ITOOOO</div>
            <div className="sidenav-brand-subtitle">
              react.writecabthemes.com
            </div>
          </div>
          <div className="sidenav-close" onClick={onClose}>
            <DoubleLeftOutlined />
          </div>
        </div>

        {/* Menu */}
        <div className="flex-1 overflow-y-auto sidenav-menu">
          <Menu
            mode="inline"
            items={menuItems}
            selectedKeys={[normalizePath(location.pathname)]}
            openKeys={openKeys}
            onOpenChange={setOpenKeys}
            onClick={handleMenuClick}
          />
        </div>

        {/* Logout */}
        <div className="sidenav-footer">
          <div
            onClick={handleLogout}
            className="sidenav-logout"
          >
            <LogoutOutlined />
            Logout
          </div>
        </div>
      </div>
    </>
  );
};

export default SideNav;

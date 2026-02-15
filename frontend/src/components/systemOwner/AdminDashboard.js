import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
// import '../../App.css'; // Make sure to import your CSS
import Sidebar from './layout/Sidebar';

const AdminDashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarVisible(!sidebarVisible);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handleMenuClick = () => {
    if (isMobile) {
      setSidebarVisible(true);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const closeSidebar = () => {
    setSidebarVisible(false);
  };

  return (
    <div className="app-container">
      <Sidebar 
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        onClose={closeSidebar}
        show={sidebarVisible}
      />
      
      <div className={`main-content ${!sidebarCollapsed && !isMobile ? 'with-sidebar' : ''} ${isMobile ? 'mobile-view' : ''}`}>
        <Dashboard onMenuClick={handleMenuClick} />
      </div>
    </div>
  );
};

export default AdminDashboard;
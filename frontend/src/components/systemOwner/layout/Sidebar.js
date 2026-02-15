import React from 'react';
import { Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { 
  Speedometer2, 
  People, 
  Gear, 
  BarChart,
  Bell,
  FileText,
  Calendar,
  BoxArrowLeft
} from 'react-bootstrap-icons';
import '../../../stylesheet/systemOwner/layout/Sidebar.css';

const Sidebar = ({ collapsed, onToggleCollapse, onClose  }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', icon: <Speedometer2 />, label: 'Dashboard' },
    { path: '/admin-clients', icon: <People />, label: 'Clients' },
    { path: '/analytics', icon: <BarChart />, label: 'Analytics' },
    { path: '/reports', icon: <FileText />, label: 'Reports' },
    { path: '/calendar', icon: <Calendar />, label: 'Calendar' },
    { path: '/notifications', icon: <Bell />, label: 'Notifications' },
    { path: '/settings', icon: <Gear />, label: 'Settings' },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed ? (
          <h3 className="brand">AdminDash</h3>
        ) : (
          <h3 className="brand-collapsed">AD</h3>
        )}
      </div>

      <Nav className="flex-column sidebar-nav">
        {menuItems.map((item) => (
          <Nav.Item key={item.path}>
            <Nav.Link 
              as={Link} 
              to={item.path}
              className={location.pathname === item.path ? 'active' : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      <div className="sidebar-footer">
        <Nav.Link as={Link} to="/logout" className="logout-link">
          <BoxArrowLeft />
          {!collapsed && <span>Logout</span>}
        </Nav.Link>
      </div>
    </aside>
  );
};

export default Sidebar;
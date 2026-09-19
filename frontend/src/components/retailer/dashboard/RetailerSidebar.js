import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaHome,
  FaShoppingCart,
  FaUsers,
  FaBox,
  FaChartLine,
  FaUserCircle,
  FaCalendarCheck,
  FaStore,
  FaTruck,
  FaThLarge,
  FaLayerGroup,
} from 'react-icons/fa';
import './RetailerSidebar.css';

const RetailerSidebar = ({ currentUser }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [activeMenu, setActiveMenu] = useState('Dashboard');

  // Sidebar menu items with icons
  const menuItems = [
    { icon: <FaHome size={20} />, label: 'Dashboard', active: true, badge: null },
    { icon: <FaLayerGroup size={20} />, label: 'Bulk Update', path: '/retailer/items/bulk-delete', active: false, badge: null },
    { icon: <FaThLarge size={20} />, label: 'Ecommerce', active: false, badge: 'New' },
    { icon: <FaUsers size={20} />, label: 'Customers', active: false, badge: null },
    { icon: <FaBox size={20} />, label: 'Products', active: false, badge: null },
    { icon: <FaShoppingCart size={20} />, label: 'Sales', active: false, badge: null },
    { icon: <FaChartLine size={20} />, label: 'Analytics', active: false, badge: null },
  ];

  const managementItems = [
    { icon: <FaCalendarCheck size={20} />, label: 'Attendance', path: '/attendance' },
    { icon: <FaStore size={20} />, label: 'Store' },
    { icon: <FaTruck size={20} />, label: 'Suppliers' },
  ];

  const handleMenuItemClick = (item) => {
    if (item.path) {
      setActiveMenu(item.label);
      navigate(item.path);
    }
  };

  return (
    <aside
      className={`dashboard-sidebar ${isHovered ? 'expanded' : 'collapsed'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="dashboard-sidebar-inner">
        {/* Logo */}
        <div className="dashboard-sidebar-header">
          <div className="dashboard-sidebar-logo">
            <img
              src="/logo/logo.png"
              alt="Ams Logo"
              className="dashboard-sidebar-logo-image"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <span className="dashboard-sidebar-logo-text">Ams</span>
          </div>
        </div>

        {/* Menu */}
        <nav className="dashboard-sidebar-menu">
          <div className="dashboard-sidebar-menu-label">Main</div>
          {menuItems.map((item, index) => (
            <div
              key={index}
              className={`dashboard-sidebar-item ${item.active ? 'active' : ''}`}
              onClick={() => handleMenuItemClick(item)}
            >
              {item.active && <div className="dashboard-sidebar-item-active-before" />}
              <span className="dashboard-sidebar-item-icon">{item.icon}</span>
              <span className="dashboard-sidebar-item-label">{item.label}</span>
              {item.badge && (
                <span
                  className={`dashboard-sidebar-item-badge ${
                    item.badge === 'New' ? 'badge-orange' : ''
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </div>
          ))}

          <hr className="dashboard-sidebar-divider" />
          <div className="dashboard-sidebar-menu-label">Management</div>
          {managementItems.map((item, index) => (
            <div
              key={index}
              className="dashboard-sidebar-item"
              onClick={() => handleMenuItemClick(item)}
            >
              <span className="dashboard-sidebar-item-icon">{item.icon}</span>
              <span className="dashboard-sidebar-item-label">{item.label}</span>
            </div>
          ))}
        </nav>

        {/* User Footer */}
        <div className="dashboard-sidebar-user">
          <div className="dashboard-sidebar-user-avatar">
            <FaUserCircle size={18} />
          </div>
          <div className="dashboard-sidebar-user-info">
            <p className="dashboard-sidebar-user-name">{currentUser?.name || 'User'}</p>
            <p className="dashboard-sidebar-user-email">
              {currentUser?.email || 'user@company.com'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default RetailerSidebar;
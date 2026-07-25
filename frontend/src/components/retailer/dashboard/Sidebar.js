// import React from 'react';
// import { Nav } from 'react-bootstrap';

// const Sidebar = ({ user, isAdminOrSupervisor }) => {
//   return (
//     <aside className="app-sidebar bg-body-secondary shadow" data-bs-theme="dark">
//       <div className="sidebar-brand">
//         <a href="./index.html" className="brand-link">
//           <img src="/assets/img/AdminLTELogo.png" alt="Logo" className="brand-image opacity-75 shadow" />
//           <span className="brand-text fw-light">Sarathi-A/c Software</span>
//         </a>
//       </div>
      
//       <div className="sidebar-wrapper">
//         <nav className="mt-2">
//           <ul className="nav sidebar-menu flex-column">
//             <li className="nav-item menu-open">
//               <a href="#" className="nav-link active">
//                 <i className="nav-icon bi bi-speedometer"></i>
//                 <p>
//                   Dashboard
//                   <i className="nav-arrow bi bi-chevron-right"></i>
//                 </p>
//               </a>
//               <ul className="nav nav-treeview">
//                 <li className="nav-item">
//                   <a href="/retailerDashboard/indexv1" className="nav-link active">
//                     <i className="nav-icon bi bi-circle"></i>
//                     <p>Dashboard v1</p>
//                   </a>
//                 </li>
//               </ul>
//             </li>
            
//             {/* Other menu items */}
//           </ul>
//         </nav>
//       </div>
//     </aside>
//   );
// };

// export default Sidebar;

//----------------------------------------------------------------end

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaHome, 
  FaShoppingCart, 
  FaUsers, 
  FaBox, 
  FaChartLine, 
  FaUserCircle,
  FaStore,
  FaTag,
  FaTruck,
  FaThLarge,
  FaCog,
  FaFileInvoice,
  FaCalendarAlt,
  FaClipboardList
} from 'react-icons/fa';

const Sidebar = ({ user, isAdminOrSupervisor }) => {
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  // Sidebar styles
  const styles = {
    sidebar: {
      width: isHovered ? '240px' : '64px',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e8ecf1',
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: '72px',
      height: 'calc(100vh - 72px)',
      overflow: 'hidden',
      flexShrink: 0,
      boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
      zIndex: 50,
    },
    sidebarInner: {
      width: isHovered ? '240px' : '64px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    sidebarHeader: {
      padding: '16px 12px',
      borderBottom: '1px solid #e8ecf1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60px',
      flexShrink: 0,
    },
    sidebarLogo: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      overflow: 'hidden',
    },
    sidebarLogoIcon: {
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontWeight: '700',
      fontSize: '14px',
      flexShrink: 0,
    },
    sidebarLogoText: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1a202c',
      whiteSpace: 'nowrap',
      opacity: isHovered ? 1 : 0,
      transition: 'opacity 0.3s ease',
    },
    sidebarMenu: {
      flex: 1,
      padding: '12px 8px',
      overflowY: 'auto',
    },
    sidebarMenuLabel: {
      fontSize: '10px',
      fontWeight: '600',
      color: '#9ca3af',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      padding: '8px 12px',
      marginTop: '4px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textAlign: 'left',
      opacity: isHovered ? 1 : 0,
      transition: 'opacity 0.3s ease',
    },
    sidebarMenuItem: {
      display: 'flex',
      alignItems: 'center',
      padding: '10px 12px',
      borderRadius: '10px',
      color: '#4a5568',
      textDecoration: 'none',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      marginBottom: '2px',
      gap: '12px',
      position: 'relative',
      justifyContent: 'flex-start',
    },
    sidebarMenuItemActive: {
      backgroundColor: '#eff6ff',
      color: '#2563eb',
    },
    sidebarMenuItemActiveBefore: {
      content: '""',
      position: 'absolute',
      left: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      width: '3px',
      height: '24px',
      backgroundColor: '#2563eb',
      borderRadius: '0 4px 4px 0',
    },
    sidebarMenuItemHover: {
      backgroundColor: '#f7fafc',
    },
    sidebarMenuIcon: {
      fontSize: '20px',
      width: '24px',
      textAlign: 'center',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sidebarMenuLabelText: {
      fontSize: '14px',
      fontWeight: '500',
      whiteSpace: 'nowrap',
      opacity: isHovered ? 1 : 0,
      transition: 'opacity 0.3s ease',
    },
    sidebarMenuBadge: {
      marginLeft: 'auto',
      backgroundColor: '#2563eb',
      color: '#ffffff',
      fontSize: '10px',
      padding: '2px 8px',
      borderRadius: '12px',
      fontWeight: '600',
      opacity: isHovered ? 1 : 0,
      transition: 'opacity 0.3s ease',
    },
    sidebarMenuBadgeOrange: {
      backgroundColor: '#f59e0b',
    },
    sidebarDivider: {
      border: 'none',
      borderTop: '1px solid #e8ecf1',
      margin: '8px 12px',
      opacity: isHovered ? 1 : 0.5,
      transition: 'opacity 0.3s ease',
    },
    sidebarUser: {
      padding: '12px 12px',
      borderTop: '1px solid #e8ecf1',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexShrink: 0,
      justifyContent: 'flex-start',
    },
    sidebarUserAvatar: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      backgroundColor: '#e8ecf1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      color: '#4a5568',
      flexShrink: 0,
    },
    sidebarUserInfo: {
      flex: 1,
      minWidth: 0,
      opacity: isHovered ? 1 : 0,
      transition: 'opacity 0.3s ease',
    },
    sidebarUserName: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#1a202c',
      margin: 0,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    sidebarUserEmail: {
      fontSize: '11px',
      color: '#6b7280',
      margin: 0,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
  };

  // Check if a menu item is active
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Main menu items
  const mainMenuItems = [
    { icon: <FaHome size={20} />, label: 'Dashboard', path: '/retailerDashboard/indexv1', active: true },
    { icon: <FaThLarge size={20} />, label: 'Ecommerce', path: '/ecommerce', active: false, badge: 'New' },
    { icon: <FaUsers size={20} />, label: 'Customers', path: '/customers', active: false },
    { icon: <FaBox size={20} />, label: 'Products', path: '/products', active: false },
    { icon: <FaShoppingCart size={20} />, label: 'Sales', path: '/sales', active: false },
    { icon: <FaFileInvoice size={20} />, label: 'Invoices', path: '/invoices', active: false },
    { icon: <FaCalendarAlt size={20} />, label: 'Calendar', path: '/calendar', active: false },
    { icon: <FaChartLine size={20} />, label: 'Analytics', path: '/analytics', active: false },
  ];

  // Management menu items
  const managementItems = [
    { icon: <FaStore size={20} />, label: 'Store', path: '/store' },
    { icon: <FaTag size={20} />, label: 'Categories', path: '/categories' },
    { icon: <FaTruck size={20} />, label: 'Suppliers', path: '/suppliers' },
    { icon: <FaClipboardList size={20} />, label: 'Reports', path: '/reports' },
    { icon: <FaCog size={20} />, label: 'Settings', path: '/settings' },
  ];

  return (
    <div 
      style={styles.sidebar}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.sidebarInner}>
        {/* Sidebar Header with Logo */}
        <div style={styles.sidebarHeader}>
          <div style={styles.sidebarLogo}>
            <div style={styles.sidebarLogoIcon}>P</div>
            <span style={styles.sidebarLogoText}>Probilz</span>
          </div>
        </div>

        {/* Sidebar Menu */}
        <nav style={styles.sidebarMenu}>
          <div style={styles.sidebarMenuLabel}>Main</div>
          {mainMenuItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              style={{
                ...styles.sidebarMenuItem,
                ...(isActive(item.path) ? styles.sidebarMenuItemActive : {})
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.backgroundColor = styles.sidebarMenuItemHover.backgroundColor;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {isActive(item.path) && <div style={styles.sidebarMenuItemActiveBefore} />}
              <span style={styles.sidebarMenuIcon}>{item.icon}</span>
              <span style={styles.sidebarMenuLabelText}>{item.label}</span>
              {item.badge && (
                <span style={{
                  ...styles.sidebarMenuBadge,
                  ...(item.badge === 'New' ? styles.sidebarMenuBadgeOrange : {})
                }}>
                  {item.badge}
                </span>
              )}
            </Link>
          ))}

          <hr style={styles.sidebarDivider} />

          <div style={styles.sidebarMenuLabel}>Management</div>
          {managementItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              style={{
                ...styles.sidebarMenuItem,
                ...(isActive(item.path) ? styles.sidebarMenuItemActive : {})
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.backgroundColor = styles.sidebarMenuItemHover.backgroundColor;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {isActive(item.path) && <div style={styles.sidebarMenuItemActiveBefore} />}
              <span style={styles.sidebarMenuIcon}>{item.icon}</span>
              <span style={styles.sidebarMenuLabelText}>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Sidebar User Profile */}
        <div style={styles.sidebarUser}>
          <div style={styles.sidebarUserAvatar}>
            <FaUserCircle size={18} />
          </div>
          <div style={styles.sidebarUserInfo}>
            <p style={styles.sidebarUserName}>{user?.name || 'User'}</p>
            <p style={styles.sidebarUserEmail}>{user?.email || 'user@company.com'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import {
//   FaHome,
//   FaShoppingCart,
//   FaUsers,
//   FaBox,
//   FaChartLine,
//   FaUserCircle,
//   FaCalendarCheck,
//   FaStore,
//   FaTruck,
//   FaThLarge,
//   FaLayerGroup,
// } from 'react-icons/fa';
// import './RetailerSidebar.css';

// const RetailerSidebar = ({ currentUser }) => {
//   const navigate = useNavigate();
//   const [isHovered, setIsHovered] = useState(false);
//   const [activeMenu, setActiveMenu] = useState('Dashboard');

//   // Sidebar menu items with icons
//   const menuItems = [
//     { icon: <FaHome size={20} />, label: 'Dashboard', active: true, badge: null },
//     { icon: <FaLayerGroup size={20} />, label: 'Bulk Update', path: '/retailer/items/bulk-delete', active: false, badge: null },
//     { icon: <FaThLarge size={20} />, label: 'Ecommerce', active: false, badge: 'New' },
//     { icon: <FaUsers size={20} />, label: 'Customers', active: false, badge: null },
//     { icon: <FaBox size={20} />, label: 'Products', active: false, badge: null },
//     { icon: <FaShoppingCart size={20} />, label: 'Sales', active: false, badge: null },
//     { icon: <FaChartLine size={20} />, label: 'Analytics', active: false, badge: null },
//   ];

//   const managementItems = [
//     { icon: <FaCalendarCheck size={20} />, label: 'Attendance', path: '/attendance' },
//     { icon: <FaStore size={20} />, label: 'Store' },
//     { icon: <FaTruck size={20} />, label: 'Suppliers' },
//   ];

//   const handleMenuItemClick = (item) => {
//     if (item.path) {
//       setActiveMenu(item.label);
//       navigate(item.path);
//     }
//   };

//   return (
//     <aside
//       className={`dashboard-sidebar ${isHovered ? 'expanded' : 'collapsed'}`}
//       onMouseEnter={() => setIsHovered(true)}
//       onMouseLeave={() => setIsHovered(false)}
//     >
//       <div className="dashboard-sidebar-inner">
//         {/* Logo */}
//         <div className="dashboard-sidebar-header">
//           <div className="dashboard-sidebar-logo">
//             <img
//               src="/logo/logo.png"
//               alt="Ams Logo"
//               className="dashboard-sidebar-logo-image"
//               onError={(e) => {
//                 e.target.style.display = 'none';
//               }}
//             />
//             <span className="dashboard-sidebar-logo-text">Ams</span>
//           </div>
//         </div>

//         {/* Menu */}
//         <nav className="dashboard-sidebar-menu">
//           <div className="dashboard-sidebar-menu-label">Main</div>
//           {menuItems.map((item, index) => (
//             <div
//               key={index}
//               className={`dashboard-sidebar-item ${item.active ? 'active' : ''}`}
//               onClick={() => handleMenuItemClick(item)}
//             >
//               {item.active && <div className="dashboard-sidebar-item-active-before" />}
//               <span className="dashboard-sidebar-item-icon">{item.icon}</span>
//               <span className="dashboard-sidebar-item-label">{item.label}</span>
//               {item.badge && (
//                 <span
//                   className={`dashboard-sidebar-item-badge ${
//                     item.badge === 'New' ? 'badge-orange' : ''
//                   }`}
//                 >
//                   {item.badge}
//                 </span>
//               )}
//             </div>
//           ))}

//           <hr className="dashboard-sidebar-divider" />
//           <div className="dashboard-sidebar-menu-label">Management</div>
//           {managementItems.map((item, index) => (
//             <div
//               key={index}
//               className="dashboard-sidebar-item"
//               onClick={() => handleMenuItemClick(item)}
//             >
//               <span className="dashboard-sidebar-item-icon">{item.icon}</span>
//               <span className="dashboard-sidebar-item-label">{item.label}</span>
//             </div>
//           ))}
//         </nav>

//         {/* User Footer */}
//         <div className="dashboard-sidebar-user">
//           <div className="dashboard-sidebar-user-avatar">
//             <FaUserCircle size={18} />
//           </div>
//           <div className="dashboard-sidebar-user-info">
//             <p className="dashboard-sidebar-user-name">{currentUser?.name || 'User'}</p>
//             <p className="dashboard-sidebar-user-email">
//               {currentUser?.email || 'user@company.com'}
//             </p>
//           </div>
//         </div>
//       </div>
//     </aside>
//   );
// };

// export default RetailerSidebar;

//----------------------------------------end1

// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import {
//   FaHome,
//   FaShoppingCart,
//   FaUsers,
//   FaBox,
//   FaChartLine,
//   FaUserCircle,
//   FaCalendarCheck,
//   FaStore,
//   FaTruck,
//   FaThLarge,
//   FaLayerGroup,
//   FaChevronDown,
// } from 'react-icons/fa';
// import './RetailerSidebar.css';

// const RetailerSidebar = ({ currentUser }) => {
//   const navigate = useNavigate();
//   const [isHovered, setIsHovered] = useState(false);
//   const [activeMenu, setActiveMenu] = useState('Dashboard');
//   const [expandedMenu, setExpandedMenu] = useState(null);

//   // Sidebar menu items with icons
//   const menuItems = [
//     { key: 'dashboard', icon: <FaHome size={18} />, label: 'Dashboard', path: '/retailer/dashboard' },
//     { key: 'bulk', icon: <FaLayerGroup size={18} />, label: 'Bulk Update', path: '/retailer/items/bulk-delete' },
//     {
//       key: 'ecommerce',
//       icon: <FaThLarge size={18} />,
//       label: 'Ecommerce',
//       badge: 'New',
//       children: [
//         { label: 'Products', path: '/retailer/ecommerce/products' },
//         { label: 'Orders', path: '/retailer/ecommerce/orders' },
//         { label: 'Customers', path: '/retailer/ecommerce/customers' },
//       ],
//     },
//     { key: 'customers', icon: <FaUsers size={18} />, label: 'Customers' },
//     { key: 'products', icon: <FaBox size={18} />, label: 'Products' },
//     { key: 'sales', icon: <FaShoppingCart size={18} />, label: 'Sales' },
//     { key: 'analytics', icon: <FaChartLine size={18} />, label: 'Analytics' },
//   ];

//   const managementItems = [
//     { key: 'attendance', icon: <FaCalendarCheck size={18} />, label: 'Attendance', path: '/attendance' },
//     { key: 'store', icon: <FaStore size={18} />, label: 'Store' },
//     { key: 'suppliers', icon: <FaTruck size={18} />, label: 'Suppliers' },
//   ];

//   const handleMenuItemClick = (item) => {
//     // If item has children → toggle expand instead of navigating
//     if (item.children && item.children.length > 0) {
//       setExpandedMenu(expandedMenu === item.key ? null : item.key);
//       return;
//     }
//     if (item.path) {
//       setActiveMenu(item.label);
//       navigate(item.path);
//     }
//   };

//   const handleChildClick = (parentKey, child) => {
//     setActiveMenu(child.label);
//     if (child.path) navigate(child.path);
//   };

//   const renderMenuItem = (item, index) => {
//     const isActive = activeMenu === item.label;
//     const hasChildren = item.children && item.children.length > 0;
//     const isExpanded = expandedMenu === item.key;

//     return (
//       <div key={item.key || index} className="wp-menu-item-wrapper">
//         <div
//           className={`wp-menu-item ${isActive ? 'active' : ''} ${hasChildren ? 'has-children' : ''} ${isExpanded ? 'expanded' : ''}`}
//           onClick={() => handleMenuItemClick(item)}
//         >
//           <span className="wp-menu-icon">{item.icon}</span>
//           <span className="wp-menu-label">{item.label}</span>

//           {item.badge && (
//             <span className={`wp-menu-badge ${item.badge === 'New' ? 'badge-new' : ''}`}>
//               {item.badge}
//             </span>
//           )}

//           {hasChildren && (
//             <span className={`wp-menu-chevron ${isExpanded ? 'rotated' : ''}`}>
//               <FaChevronDown size={10} />
//             </span>
//           )}
//         </div>

//         {/* Submenu */}
//         {hasChildren && isExpanded && (
//           <div className="wp-submenu">
//             {item.children.map((child, ci) => (
//               <div
//                 key={ci}
//                 className={`wp-submenu-item ${activeMenu === child.label ? 'active' : ''}`}
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   handleChildClick(item.key, child);
//                 }}
//               >
//                 <span className="wp-submenu-label">{child.label}</span>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     );
//   };

//   return (
//     <aside
//       className={`dashboard-sidebar ${isHovered ? 'expanded' : 'collapsed'}`}
//       onMouseEnter={() => setIsHovered(true)}
//       onMouseLeave={() => setIsHovered(false)}
//     >
//       <div className="dashboard-sidebar-inner">
//         {/* Logo / Brand */}
//         <div className="dashboard-sidebar-header">
//           <div className="dashboard-sidebar-logo">
//             <img
//               src="/logo/logo.png"
//               alt="Ams Logo"
//               className="dashboard-sidebar-logo-image"
//               onError={(e) => {
//                 e.target.style.display = 'none';
//               }}
//             />
//             <span className="dashboard-sidebar-logo-text">Ams</span>
//           </div>
//         </div>

//         {/* Menu */}
//         <nav className="dashboard-sidebar-menu">
//           <div className="dashboard-sidebar-menu-label">Main</div>
//           {menuItems.map((item, index) => renderMenuItem(item, index))}

//           <hr className="dashboard-sidebar-divider" />
//           <div className="dashboard-sidebar-menu-label">Management</div>
//           {managementItems.map((item, index) => renderMenuItem(item, index))}
//         </nav>

//         {/* User Footer */}
//         <div className="dashboard-sidebar-user">
//           <div className="dashboard-sidebar-user-avatar">
//             <FaUserCircle size={18} />
//           </div>
//           <div className="dashboard-sidebar-user-info">
//             <p className="dashboard-sidebar-user-name">{currentUser?.name || 'User'}</p>
//             <p className="dashboard-sidebar-user-email">
//               {currentUser?.email || 'user@company.com'}
//             </p>
//           </div>
//         </div>
//       </div>
//     </aside>
//   );
// };

// export default RetailerSidebar;

//-------------------------------------end2

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
  FaChevronDown,
  FaBook,
  FaClipboardList,
} from 'react-icons/fa';
import './RetailerSidebar.css';

const RetailerSidebar = ({ currentUser }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [expandedMenu, setExpandedMenu] = useState(null);

  // Sidebar menu items with icons
  const menuItems = [
    { key: 'dashboard', icon: <FaHome size={18} />, label: 'Dashboard', path: '/retailer/dashboard' },
    { key: 'daybook', icon: <FaBook size={18} />, label: 'Day Book', path: '/retailer/day-book' },
    { key: 'bulk', icon: <FaLayerGroup size={18} />, label: 'Bulk Update', path: '/retailer/items/bulk-delete' },
    {
      key: 'ecommerce',
      icon: <FaThLarge size={18} />,
      label: 'Ecommerce',
      badge: 'New',
      children: [
        { label: 'Products', path: '/retailer/ecommerce/products' },
        { label: 'Orders', path: '/retailer/ecommerce/orders' },
        { label: 'Customers', path: '/retailer/ecommerce/customers' },
      ],
    },
    { key: 'customers', icon: <FaUsers size={18} />, label: 'Customers' },
    { key: 'products', icon: <FaBox size={18} />, label: 'Products' },
    { key: 'sales', icon: <FaShoppingCart size={18} />, label: 'Sales' },
    { key: 'analytics', icon: <FaChartLine size={18} />, label: 'Analytics' },
  ];

  const managementItems = [
    { key: 'attendance', icon: <FaCalendarCheck size={18} />, label: 'Attendance', path: '/attendance' },
    { key: 'store', icon: <FaStore size={18} />, label: 'Store' },
    { key: 'suppliers', icon: <FaTruck size={18} />, label: 'Suppliers' },
    { key: 'audit', icon: <FaClipboardList size={18} />, label: 'Audit Reports', path: '/retailer/audit/reports' },
  ];

  const handleMenuItemClick = (item) => {
    // If item has children → toggle expand instead of navigating
    if (item.children && item.children.length > 0) {
      setExpandedMenu(expandedMenu === item.key ? null : item.key);
      return;
    }
    if (item.path) {
      setActiveMenu(item.label);
      navigate(item.path);
    }
  };

  const handleChildClick = (parentKey, child) => {
    setActiveMenu(child.label);
    if (child.path) navigate(child.path);
  };

  const renderMenuItem = (item, index) => {
    const isActive = activeMenu === item.label;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenu === item.key;

    return (
      <div key={item.key || index} className="wp-menu-item-wrapper">
        <div
          className={`wp-menu-item ${isActive ? 'active' : ''} ${hasChildren ? 'has-children' : ''} ${isExpanded ? 'expanded' : ''}`}
          onClick={() => handleMenuItemClick(item)}
        >
          <span className="wp-menu-icon">{item.icon}</span>
          <span className="wp-menu-label">{item.label}</span>

          {item.badge && (
            <span className={`wp-menu-badge ${item.badge === 'New' ? 'badge-new' : ''}`}>
              {item.badge}
            </span>
          )}

          {hasChildren && (
            <span className={`wp-menu-chevron ${isExpanded ? 'rotated' : ''}`}>
              <FaChevronDown size={10} />
            </span>
          )}
        </div>

        {/* Submenu */}
        {hasChildren && isExpanded && (
          <div className="wp-submenu">
            {item.children.map((child, ci) => (
              <div
                key={ci}
                className={`wp-submenu-item ${activeMenu === child.label ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleChildClick(item.key, child);
                }}
              >
                <span className="wp-submenu-label">{child.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`dashboard-sidebar ${isHovered ? 'expanded' : 'collapsed'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="dashboard-sidebar-inner">
        {/* Logo / Brand */}
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
          {menuItems.map((item, index) => renderMenuItem(item, index))}

          <hr className="dashboard-sidebar-divider" />
          <div className="dashboard-sidebar-menu-label">Management</div>
          {managementItems.map((item, index) => renderMenuItem(item, index))}
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
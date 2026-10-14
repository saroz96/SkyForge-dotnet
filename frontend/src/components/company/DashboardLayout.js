// // DashboardLayout.js
// import React from 'react';
// import { Navbar, Nav } from 'react-bootstrap';
// import axios from 'axios';
// import { Link } from 'react-router-dom';
// import { useAuth } from '../../context/AuthContext';

// const DashboardLayout = ({ children, user, isAdminOrSupervisor }) => {
//   const { logout } = useAuth();

//   return (
//     <>
//       <Navbar bg="light" expand="lg" className="mb-4">
//         <Navbar.Brand as={Link} to="/dashboard">
//           <i className="fas fa-tachometer-alt me-2"></i>
//           Dashboard | {user?.name}
//         </Navbar.Brand>
//         <Navbar.Toggle aria-controls="basic-navbar-nav" />
//         <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
//           <Nav>
//             {isAdminOrSupervisor && (
//               <Nav.Link as={Link} to="/backup">
//                 <i className="fas fa-plus-circle me-1"></i>Backup
//               </Nav.Link>
//             )}
//             {isAdminOrSupervisor && (
//               <Nav.Link as={Link} to="/split/company">
//                 <i className="fas fa-plus-circle me-1"></i>Split Financial Year
//               </Nav.Link>
//             )}
//             {isAdminOrSupervisor && (
//               <Nav.Link as={Link} to="/company/new">
//                 <i className="fas fa-plus-circle me-1"></i>Create Company
//               </Nav.Link>
//             )}
//             <Nav.Link onClick={logout}>
//               <i className="fas fa-sign-out-alt me-1"></i>Logout
//             </Nav.Link>
//           </Nav>
//         </Navbar.Collapse>
//       </Navbar>
//       {children}
//     </>
//   );
// };

// export default DashboardLayout;

//----------------------------------------------end1

// DashboardLayout.js
import React from 'react';
import { Navbar, Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const DashboardLayout = ({ children, user, isAdminOrSupervisor }) => {
  const { logout } = useAuth();

  // Determine if the current user is any admin (system or client)
  const isAnyAdmin =
    user?.isAdmin === true ||
    user?.role === 'Admin' ||
    user?.role === 'Administrator' ||
    user?.isSystemAdmin === true ||
    user?.isClientAdmin === true ||
    isAdminOrSupervisor;

  return (
    <>
      <Navbar bg="light" expand="lg" className="mb-4">
        <Navbar.Brand as={Link} to="/dashboard">
          <i className="fas fa-tachometer-alt me-2"></i>
          Dashboard | {user?.name}
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
          <Nav>
            {/* 👇 NEW: Approved Devices link — visible to admins */}
            {isAnyAdmin && (
              <Nav.Link as={Link} to="/company/approved-devices">
                <i className="fas fa-shield-alt me-1"></i>Approved Devices
              </Nav.Link>
            )}

            {isAdminOrSupervisor && (
              <Nav.Link as={Link} to="/backup">
                <i className="fas fa-plus-circle me-1"></i>Backup
              </Nav.Link>
            )}
            {isAdminOrSupervisor && (
              <Nav.Link as={Link} to="/split/company">
                <i className="fas fa-plus-circle me-1"></i>Split Financial Year
              </Nav.Link>
            )}
            {isAdminOrSupervisor && (
              <Nav.Link as={Link} to="/company/new">
                <i className="fas fa-plus-circle me-1"></i>Create Company
              </Nav.Link>
            )}
            <Nav.Link onClick={logout}>
              <i className="fas fa-sign-out-alt me-1"></i>Logout
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
      {children}
    </>
  );
};

export default DashboardLayout;
// // import React, { useState, useEffect } from 'react';
// // import { useParams, useNavigate, Link } from 'react-router-dom';
// // import axios from 'axios';
// // import {
// //   FaUser,
// //   FaEnvelope,
// //   FaUserTag,
// //   FaToggleOn,
// //   FaUserShield,
// //   FaArrowLeft,
// //   FaCalendarAlt,
// //   FaBuilding,
// //   FaInfoCircle,
// //   FaCheckCircle,
// //   FaTimesCircle
// // } from 'react-icons/fa';
// // import NotificationToast from '../NotificationToast';
// // import Header from '../retailer/Header';
// // import Skeleton from 'react-loading-skeleton';
// // import 'react-loading-skeleton/dist/skeleton.css';

// // const ViewAdmin = () => {
// //   const { id } = useParams();
// //   const navigate = useNavigate();
// //   const [user, setUser] = useState(null);
// //   const [company, setCompany] = useState(null);
// //   const [fiscalYear, setFiscalYear] = useState(null);
// //   const [currentCompanyName, setCurrentCompanyName] = useState('');
// //   const [currentUser, setCurrentUser] = useState(null);
// //   const [loading, setLoading] = useState(true);
// //   const [error, setError] = useState(null);
// //   const [notification, setNotification] = useState({
// //     show: false,
// //     message: '',
// //     type: 'success'
// //   });

// //   // Get company ID from localStorage or session
// //   const getCurrentCompanyId = () => {
// //     return localStorage.getItem('currentCompanyId') || sessionStorage.getItem('currentCompanyId');
// //   };

// //   const api = axios.create({
// //     baseURL: process.env.REACT_APP_API_BASE_URL,
// //     withCredentials: true,
// //   });

// //   // Add authorization header to all requests
// //   api.interceptors.request.use(
// //     (config) => {
// //       const token = localStorage.getItem('token');
// //       if (token) {
// //         config.headers.Authorization = `Bearer ${token}`;
// //       }
// //       // Add company ID header if available
// //       const companyId = getCurrentCompanyId();
// //       if (companyId) {
// //         config.headers['X-Company-Id'] = companyId;
// //       }
// //       return config;
// //     },
// //     (error) => {
// //       return Promise.reject(error);
// //     }
// //   );

// //   useEffect(() => {
// //     const fetchUserDetails = async () => {
// //       try {
// //         setLoading(true);

// //         // Get company ID - if not found, redirect to company selection
// //         const companyId = getCurrentCompanyId();
// //         if (!companyId) {
// //           setError('No company selected. Please select a company first.');
// //           setTimeout(() => {
// //             navigate('/company-selection');
// //           }, 2000);
// //           return;
// //         }

// //         // Make API call with companyId as query parameter
// //         const response = await api.get(`/api/User/admin/users/view/${id}`, {
// //           params: { companyId: companyId }
// //         });

// //         if (response.data.success) {
// //           const data = response.data.data;
// //           setUser(data.user);
// //           setCompany(data.company);
// //           setFiscalYear(data.currentFiscalYear);
// //           setCurrentCompanyName(data.currentCompanyName);
// //           setCurrentUser({
// //             isAdminOrSupervisor: data.isAdminOrSupervisor
// //           });
// //         } else {
// //           setError(response.data.error || 'Failed to load user details');
// //           if (response.status === 403 || response.data.error?.includes('permission')) {
// //             setTimeout(() => navigate('/dashboard'), 2000);
// //           }
// //         }
// //       } catch (err) {
// //         console.error('Error fetching user details:', err);
// //         const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to load user details';
// //         setError(errorMessage);

// //         if (err.response?.status === 403 || errorMessage.includes('permission')) {
// //           setTimeout(() => navigate('/dashboard'), 2000);
// //         } else if (err.response?.status === 401) {
// //           setTimeout(() => navigate('/login'), 2000);
// //         }
// //       } finally {
// //         setLoading(false);
// //       }
// //     };

// //     if (id) {
// //       fetchUserDetails();
// //     }
// //   }, [id, navigate]);

// //   const formatDate = (dateString, format = 'full') => {
// //     if (!dateString) return 'N/A';

// //     try {
// //       const date = new Date(dateString);
// //       if (isNaN(date.getTime())) return 'Invalid Date';

// //       if (format === 'full') {
// //         return date.toLocaleString('en-US', {
// //           year: 'numeric',
// //           month: 'long',
// //           day: 'numeric',
// //           hour: '2-digit',
// //           minute: '2-digit'
// //         });
// //       } else if (format === 'date') {
// //         return date.toLocaleDateString('en-US', {
// //           year: 'numeric',
// //           month: 'long',
// //           day: 'numeric'
// //         });
// //       }
// //       return date.toLocaleString();
// //     } catch (error) {
// //       return 'Invalid Date';
// //     }
// //   };

// //   const getRoleBadgeClass = (role) => {
// //     switch (role?.toLowerCase()) {
// //       case 'admin':
// //         return 'bg-danger';
// //       case 'supervisor':
// //         return 'bg-warning text-dark';
// //       case 'user':
// //         return 'bg-info text-dark';
// //       default:
// //         return 'bg-secondary';
// //     }
// //   };

// //   const LoadingSkeleton = () => (
// //     <div className="container mt-5">
// //       <div className="card mt-4 shadow-lg p-4">
// //         <div className="row justify-content-center">
// //           <div className="col-lg-8">
// //             <div className="card shadow-sm border-0">
// //               <div className="card-header bg-primary text-white">
// //                 <Skeleton height={30} width={200} baseColor="#ffffff" highlightColor="#f0f0f0" />
// //               </div>
// //               <div className="card-body p-4">
// //                 <div className="mb-4">
// //                   <Skeleton height={20} width={150} />
// //                   <Skeleton height={15} width={250} className="mt-2" />
// //                 </div>
// //                 <div className="row mb-4">
// //                   <div className="col-md-6">
// //                     <Skeleton height={20} width={100} />
// //                     <Skeleton height={25} width={80} className="mt-2" />
// //                   </div>
// //                   <div className="col-md-6">
// //                     <Skeleton height={20} width={100} />
// //                     <Skeleton height={25} width={80} className="mt-2" />
// //                   </div>
// //                 </div>
// //                 <div className="mb-4">
// //                   <Skeleton height={20} width={150} />
// //                   <Skeleton height={15} width={200} className="mt-2" />
// //                   <Skeleton height={15} width={200} className="mt-2" />
// //                 </div>
// //               </div>
// //               <div className="card-footer text-end">
// //                 <Skeleton height={40} width={150} />
// //               </div>
// //             </div>
// //           </div>
// //         </div>
// //       </div>
// //     </div>
// //   );

// //   const ErrorDisplay = () => (
// //     <div className="container mt-4">
// //       <div className="alert alert-danger shadow-sm">
// //         <div className="d-flex align-items-center mb-3">
// //           <FaTimesCircle className="me-2" size={24} />
// //           <h5 className="mb-0">Error</h5>
// //         </div>
// //         <p className="mb-2">{error}</p>
// //         <div className="mt-3">
// //           <button
// //             className="btn btn-sm btn-outline-danger me-2"
// //             onClick={() => window.location.reload()}
// //           >
// //             Try Again
// //           </button>
// //           <button
// //             className="btn btn-sm btn-secondary"
// //             onClick={() => navigate('/dashboard')}
// //           >
// //             Go to Dashboard
// //           </button>
// //         </div>
// //       </div>
// //     </div>
// //   );

// //   if (loading) {
// //     return (
// //       <div className="container-fluid">
// //         <Header />
// //         <LoadingSkeleton />
// //       </div>
// //     );
// //   }

// //   if (error) {
// //     return (
// //       <div className="container-fluid">
// //         <Header />
// //         <ErrorDisplay />
// //       </div>
// //     );
// //   }

// //   return (
// //     <div className="container-fluid">
// //       <Header />

// //       <div className="container mt-5">
// //         <div className="row justify-content-center">
// //           <div className="col-lg-8">


// //             {/* User Details Card */}
// //             {user && (
// //               <div className="card shadow-sm border-0">
// //                 <div className="card-header bg-primary text-white">
// //                   <h4 className="mb-0">
// //                     <FaUser className="me-2" />
// //                     {user.name}
// //                   </h4>
// //                 </div>

// //                 <div className="card-body p-4">
// //                   {/* Email - Full width */}
// //                   <div className="mb-4 pb-2 border-bottom">
// //                     <div className="d-flex align-items-center">
// //                       <FaEnvelope className="text-secondary me-2" size={18} />
// //                       <h6 className="mb-0 text-muted">Email Address</h6>
// //                     </div>
// //                     <p className="mt-2 mb-0 fs-5">{user.email}</p>
// //                   </div>

// //                   {/* Role and Status - In same row */}
// //                   <div className="row mb-4 pb-2 border-bottom">
// //                     {/* Role Column */}
// //                     <div className="col-md-6">
// //                       <div className="d-flex align-items-center">
// //                         <FaUserTag className="text-secondary me-2" size={18} />
// //                         <h6 className="mb-0 text-muted">Role</h6>
// //                       </div>
// //                       <div className="mt-2">
// //                         <span className={`badge ${getRoleBadgeClass(user.role)} fs-6 px-3 py-2`}>
// //                           <FaUserShield className="me-1" size={12} />
// //                           {user.role || 'User'}
// //                         </span>
// //                       </div>
// //                     </div>

// //                     {/* Status Column */}
// //                     <div className="col-md-6">
// //                       <div className="d-flex align-items-center">
// //                         <FaToggleOn className="text-secondary me-2" size={18} />
// //                         <h6 className="mb-0 text-muted">Account Status</h6>
// //                       </div>
// //                       <div className="mt-2">
// //                         {user.isActive ? (
// //                           <span className="badge bg-success fs-6 px-3 py-2">
// //                             <FaCheckCircle className="me-1" />
// //                             Active
// //                           </span>
// //                         ) : (
// //                           <span className="badge bg-danger fs-6 px-3 py-2">
// //                             <FaTimesCircle className="me-1" />
// //                             Inactive
// //                           </span>
// //                         )}
// //                       </div>
// //                     </div>
// //                   </div>

// //                   {/* Timestamps */}
// //                   <div className="mb-3">
// //                     <small className="text-muted d-block">
// //                       <FaCalendarAlt className="me-1" size={12} />
// //                       Created: {formatDate(user.createdAt)}
// //                     </small>
// //                     {user.updatedAt && (
// //                       <small className="text-muted d-block mt-1">
// //                         <FaCalendarAlt className="me-1" size={12} />
// //                         Last Updated: {formatDate(user.updatedAt)}
// //                       </small>
// //                     )}
// //                     {user.lastLogin && (
// //                       <small className="text-muted d-block mt-1">
// //                         <FaCalendarAlt className="me-1" size={12} />
// //                         Last Login: {formatDate(user.lastLogin)}
// //                       </small>
// //                     )}
// //                   </div>
// //                 </div>

// //                 {/* Footer with Back Button */}
// //                 {currentUser?.isAdminOrSupervisor && (
// //                   <div className="card-footer bg-white text-end py-3">
// //                     <Link
// //                       to="/auth/admin/users/list"
// //                       className="btn btn-outline-primary px-4"
// //                     >
// //                       <FaArrowLeft className="me-2" />
// //                       Back to User List
// //                     </Link>
// //                   </div>
// //                 )}
// //               </div>
// //             )}
// //           </div>
// //         </div>
// //       </div>

// //       <NotificationToast
// //         show={notification.show}
// //         message={notification.message}
// //         type={notification.type}
// //         onClose={() => setNotification({ ...notification, show: false })}
// //       />
// //     </div>
// //   );
// // };

// // export default ViewAdmin;

// //------------------------------------------------------end


// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate, Link } from 'react-router-dom';
// import axios from 'axios';
// import {
//   FaUser,
//   FaEnvelope,
//   FaUserTag,
//   FaToggleOn,
//   FaUserShield,
//   FaArrowLeft,
//   FaCalendarAlt,
//   FaBuilding,
//   FaInfoCircle,
//   FaCheckCircle,
//   FaTimesCircle
// } from 'react-icons/fa';
// import NotificationToast from '../NotificationToast';
// import Header from '../retailer/Header';
// import Skeleton from 'react-loading-skeleton';
// import 'react-loading-skeleton/dist/skeleton.css';

// const ViewAdmin = () => {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const [user, setUser] = useState(null);
//   const [company, setCompany] = useState(null);
//   const [fiscalYear, setFiscalYear] = useState(null);
//   const [currentCompanyName, setCurrentCompanyName] = useState('');
//   const [currentUser, setCurrentUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [notification, setNotification] = useState({
//     show: false,
//     message: '',
//     type: 'success',
//     duration: 3000
//   });

//   // Get company ID from localStorage or session
//   const getCurrentCompanyId = () => {
//     return localStorage.getItem('currentCompanyId') || sessionStorage.getItem('currentCompanyId');
//   };

//   const api = axios.create({
//     baseURL: process.env.REACT_APP_API_BASE_URL,
//     withCredentials: true,
//   });

//   // Add authorization header to all requests
//   api.interceptors.request.use(
//     (config) => {
//       const token = localStorage.getItem('token');
//       if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//       }
//       // Add company ID header if available
//       const companyId = getCurrentCompanyId();
//       if (companyId) {
//         config.headers['X-Company-Id'] = companyId;
//       }
//       return config;
//     },
//     (error) => {
//       return Promise.reject(error);
//     }
//   );

//   useEffect(() => {
//     const fetchUserDetails = async () => {
//       try {
//         setLoading(true);

//         // Get company ID - if not found, redirect to company selection
//         const companyId = getCurrentCompanyId();
//         if (!companyId) {
//           setError('No company selected. Please select a company first.');
//           setTimeout(() => {
//             navigate('/company-selection');
//           }, 2000);
//           return;
//         }

//         // Make API call with companyId as query parameter
//         const response = await api.get(`/api/User/admin/users/view/${id}`, {
//           params: { companyId: companyId }
//         });

//         if (response.data.success) {
//           const data = response.data.data;
//           setUser(data.user);
//           setCompany(data.company);
//           setFiscalYear(data.currentFiscalYear);
//           setCurrentCompanyName(data.currentCompanyName);
//           setCurrentUser({
//             isAdminOrSupervisor: data.isAdminOrSupervisor
//           });
//         } else {
//           setError(response.data.error || 'Failed to load user details');
//           if (response.status === 403 || response.data.error?.includes('permission')) {
//             setTimeout(() => navigate('/dashboard'), 2000);
//           }
//         }
//       } catch (err) {
//         console.error('Error fetching user details:', err);
//         const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to load user details';
//         setError(errorMessage);

//         if (err.response?.status === 403 || errorMessage.includes('permission')) {
//           setTimeout(() => navigate('/dashboard'), 2000);
//         } else if (err.response?.status === 401) {
//           setTimeout(() => navigate('/login'), 2000);
//         }
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (id) {
//       fetchUserDetails();
//     }
//   }, [id, navigate]);

//   const formatDate = (dateString, format = 'full') => {
//     if (!dateString) return 'N/A';

//     try {
//       const date = new Date(dateString);
//       if (isNaN(date.getTime())) return 'Invalid Date';

//       if (format === 'full') {
//         return date.toLocaleString('en-US', {
//           year: 'numeric',
//           month: 'long',
//           day: 'numeric',
//           hour: '2-digit',
//           minute: '2-digit'
//         });
//       } else if (format === 'date') {
//         return date.toLocaleDateString('en-US', {
//           year: 'numeric',
//           month: 'long',
//           day: 'numeric'
//         });
//       }
//       return date.toLocaleString();
//     } catch (error) {
//       return 'Invalid Date';
//     }
//   };

//   const getRoleBadgeClass = (role) => {
//     switch (role?.toLowerCase()) {
//       case 'admin':
//         return 'bg-danger';
//       case 'supervisor':
//         return 'bg-warning text-dark';
//       case 'user':
//         return 'bg-info text-dark';
//       default:
//         return 'bg-secondary';
//     }
//   };

//   const LoadingSkeleton = () => (
//     <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
//       <div className="card-header bg-white py-0">
//         <Skeleton height={30} width={200} />
//       </div>
//       <div className="card-body p-2 p-md-3">
//         <div className="mb-3">
//           <Skeleton height={20} width={150} />
//           <Skeleton height={15} width={250} className="mt-2" />
//         </div>
//         <div className="row mb-3">
//           <div className="col-md-6">
//             <Skeleton height={20} width={100} />
//             <Skeleton height={25} width={80} className="mt-2" />
//           </div>
//           <div className="col-md-6">
//             <Skeleton height={20} width={100} />
//             <Skeleton height={25} width={80} className="mt-2" />
//           </div>
//         </div>
//         <div className="mb-3">
//           <Skeleton height={20} width={150} />
//           <Skeleton height={15} width={200} className="mt-2" />
//           <Skeleton height={15} width={200} className="mt-2" />
//         </div>
//       </div>
//       <div className="card-footer bg-white text-end py-2">
//         <Skeleton height={30} width={150} />
//       </div>
//     </div>
//   );

//   const ErrorDisplay = () => (
//     <div className="alert alert-danger text-center py-1 mb-2 small" style={{ fontSize: '0.75rem' }}>
//       <FaTimesCircle className="me-2" size={16} />
//       {error}
//       <div className="mt-2">
//         <button
//           className="btn btn-sm btn-outline-danger me-2"
//           onClick={() => window.location.reload()}
//           style={{ padding: '2px 8px', fontSize: '0.7rem' }}
//         >
//           Try Again
//         </button>
//         <button
//           className="btn btn-sm btn-secondary"
//           onClick={() => navigate('/dashboard')}
//           style={{ padding: '2px 8px', fontSize: '0.7rem' }}
//         >
//           Go to Dashboard
//         </button>
//       </div>
//     </div>
//   );

//   if (loading) {
//     return (
//       <div className="container-fluid">
//         <Header />
//         <div className="container mt-4">
//           <div className="row justify-content-center">
//             <div className="col-lg-8">
//               <LoadingSkeleton />
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="container-fluid">
//         <Header />
//         <div className="container mt-4">
//           <div className="row justify-content-center">
//             <div className="col-lg-8">
//               <div className="card mt-2 shadow-lg p-0 expanded-card ledger-card compact">
//                 <div className="card-body p-3">
//                   <ErrorDisplay />
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="container-fluid">
//       <Header />

//       <div className="container mt-4">
//         <div className="row justify-content-center">
//           <div className="col-lg-8">
//             {/* User Details Card */}
//             {user && (
//               <div className="card mt-2 shadow-lg p-0 animate__animated animate__fadeInUp expanded-card ledger-card compact">
//                 <div className="card-header bg-white py-0">
//                   <h1 className="h4 mb-0 text-center text-primary">
//                     <FaUser className="me-2" />
//                     User Details
//                   </h1>
//                 </div>

//                 <div className="card-body p-2 p-md-3">
//                   {/* Email */}
//                   <div className="mb-3 pb-2 border-bottom">
//                     <div className="d-flex align-items-center">
//                       <FaEnvelope className="text-secondary me-2" size={14} />
//                       <h6 className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>Email Address</h6>
//                     </div>
//                     <p className="mt-1 mb-0" style={{ fontSize: '0.875rem' }}>{user.email}</p>
//                   </div>

//                   {/* Role and Status - In same row */}
//                   <div className="row mb-3 pb-2 border-bottom">
//                     {/* Role Column */}
//                     <div className="col-md-6">
//                       <div className="d-flex align-items-center">
//                         <FaUserTag className="text-secondary me-2" size={14} />
//                         <h6 className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>Role</h6>
//                       </div>
//                       <div className="mt-1">
//                         <span className={`badge ${getRoleBadgeClass(user.role)}`} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
//                           <FaUserShield className="me-1" size={10} />
//                           {user.role || 'User'}
//                         </span>
//                       </div>
//                     </div>

//                     {/* Status Column */}
//                     <div className="col-md-6">
//                       <div className="d-flex align-items-center">
//                         <FaToggleOn className="text-secondary me-2" size={14} />
//                         <h6 className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>Account Status</h6>
//                       </div>
//                       <div className="mt-1">
//                         {user.isActive ? (
//                           <span className="badge bg-success" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
//                             <FaCheckCircle className="me-1" size={10} />
//                             Active
//                           </span>
//                         ) : (
//                           <span className="badge bg-danger" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
//                             <FaTimesCircle className="me-1" size={10} />
//                             Inactive
//                           </span>
//                         )}
//                       </div>
//                     </div>
//                   </div>

//                   {/* Timestamps */}
//                   <div className="mb-2">
//                     <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>
//                       <FaCalendarAlt className="me-1" size={10} />
//                       Created: {formatDate(user.createdAt)}
//                     </small>
//                     {user.updatedAt && (
//                       <small className="text-muted d-block mt-1" style={{ fontSize: '0.65rem' }}>
//                         <FaCalendarAlt className="me-1" size={10} />
//                         Last Updated: {formatDate(user.updatedAt)}
//                       </small>
//                     )}
//                     {user.lastLogin && (
//                       <small className="text-muted d-block mt-1" style={{ fontSize: '0.65rem' }}>
//                         <FaCalendarAlt className="me-1" size={10} />
//                         Last Login: {formatDate(user.lastLogin)}
//                       </small>
//                     )}
//                   </div>
//                 </div>

//                 {/* Footer with Back Button */}
//                 {currentUser?.isAdminOrSupervisor && (
//                   <div className="card-footer bg-white text-end py-2">
//                     <Link
//                       to="/auth/admin/users/list"
//                       className="btn btn-outline-primary btn-sm"
//                       style={{ height: '30px', padding: '0 16px', fontSize: '0.75rem' }}
//                     >
//                       <FaArrowLeft className="me-1" size={12} />
//                       Back to List
//                     </Link>
//                   </div>
//                 )}
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       <NotificationToast
//         show={notification.show}
//         message={notification.message}
//         type={notification.type}
//         duration={notification.duration}
//         onClose={() => setNotification({ ...notification, show: false })}
//       />
//     </div>
//   );
// };

// export default ViewAdmin;